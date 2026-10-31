/**
 * Pure logic for Register & Bitfield Definition and C Code Generation
 * Calculates masks, shifts, bit ranges, read-modify-write macros, and struct definitions.
 * Includes self-check assertions.
 */

export interface BitfieldDefinition {
  id: string;
  name: string;
  startBit: number; // LSB position (0 to width - 1)
  bitLength: number; // 1 to width
  access: 'RW' | 'RO' | 'WO' | 'W1C';
  resetValue: number;
  description: string;
}

export interface RegisterDefinition {
  name: string; // e.g. "USART_CR1" or "TIM_CCMR1"
  addressOffsetHex: string; // e.g. "0x00"
  widthBits: 8 | 16 | 32;
  description: string;
  fields: BitfieldDefinition[];
}

export interface GeneratedRegisterCode {
  headerDefines: string;
  readModifyWriteSnippets: { fieldName: string; readCode: string; writeCode: string }[];
  cStructSnippet: string;
  steps: string[];
}

export function calculateFieldMask(startBit: number, bitLength: number): bigint {
  const mask = ((1n << BigInt(bitLength)) - 1n) << BigInt(startBit);
  return mask;
}

export function validateBitfields(fields: BitfieldDefinition[], widthBits: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const claimedBits = new Map<number, string>();

  for (const f of fields) {
    if (f.startBit < 0 || f.startBit >= widthBits) {
      errors.push(`Field "${f.name}": start bit ${f.startBit} is out of bounds for ${widthBits}-bit register.`);
    }
    if (f.bitLength <= 0 || f.startBit + f.bitLength > widthBits) {
      errors.push(`Field "${f.name}": length ${f.bitLength} exceeds register width.`);
    }

    for (let b = f.startBit; b < f.startBit + f.bitLength; b++) {
      if (claimedBits.has(b)) {
        errors.push(`Bit conflict at bit ${b}: shared by "${claimedBits.get(b)}" and "${f.name}".`);
      } else {
        claimedBits.set(b, f.name);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export function generateRegisterCode(reg: RegisterDefinition): GeneratedRegisterCode {
  const width = reg.widthBits;
  const suffix = (width as number) === 64 ? 'ULL' : 'U';
  const hexDigits = width / 4;
  const steps: string[] = [
    `1. Register: ${reg.name} (Offset ${reg.addressOffsetHex}, Width: ${width}-bit).`,
    `2. Defined ${reg.fields.length} bitfields.`,
  ];

  // Header #defines
  const defineLines: string[] = [
    `/* Register Definitions for ${reg.name} */`,
    `#define ${reg.name}_OFFSET (${reg.addressOffsetHex})`,
    ``,
  ];

  const rmwSnippets: { fieldName: string; readCode: string; writeCode: string }[] = [];

  // Sort fields by startBit ascending
  const sorted = [...reg.fields].sort((a, b) => a.startBit - b.startBit);

  for (const f of sorted) {
    const maskVal = calculateFieldMask(f.startBit, f.bitLength);
    const maskHex = `0x${maskVal.toString(16).padStart(hexDigits, '0').toUpperCase()}${suffix}`;
    const cleanName = f.name.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

    defineLines.push(`/* Field: ${f.name} [Bits ${f.startBit + f.bitLength - 1}:${f.startBit}], Access: ${f.access} */`);
    defineLines.push(`#define ${reg.name}_${cleanName}_POS (${f.startBit}${suffix})`);
    defineLines.push(`#define ${reg.name}_${cleanName}_MASK (${maskHex})`);
    defineLines.push(`#define ${reg.name}_${cleanName}(val) (((val) << ${reg.name}_${cleanName}_POS) & ${reg.name}_${cleanName}_MASK)`);
    defineLines.push(``);

    const readCode = `/* Read ${f.name} */\nuint32_t ${f.name.toLowerCase()}_val = (${reg.name} & ${reg.name}_${cleanName}_MASK) >> ${reg.name}_${cleanName}_POS;`;
    const writeCode = `/* Read-Modify-Write ${f.name} */\n${reg.name} = (${reg.name} & ~${reg.name}_${cleanName}_MASK) | ((${f.name.toLowerCase()}_val << ${reg.name}_${cleanName}_POS) & ${reg.name}_${cleanName}_MASK);`;

    rmwSnippets.push({
      fieldName: f.name,
      readCode,
      writeCode,
    });

    steps.push(`Field "${f.name}" [${f.startBit + f.bitLength - 1}:${f.startBit}]: Mask = ${maskHex}, Shift = ${f.startBit}.`);
  }

  // Struct bitfield snippet
  const structLines: string[] = [
    `typedef union {`,
    `  uint${width}_t raw;`,
    `  struct {`,
  ];

  let currentBit = 0;
  for (const f of sorted) {
    if (f.startBit > currentBit) {
      const gap = f.startBit - currentBit;
      structLines.push(`    uint${width}_t _reserved_${currentBit} : ${gap};`);
    }
    structLines.push(`    uint${width}_t ${f.name.toLowerCase()} : ${f.bitLength}; /* ${f.description || f.access} */`);
    currentBit = f.startBit + f.bitLength;
  }
  if (currentBit < width) {
    structLines.push(`    uint${width}_t _reserved_end : ${width - currentBit};`);
  }
  structLines.push(`  } bits;`);
  structLines.push(`} ${reg.name.toLowerCase()}_t;`);

  return {
    headerDefines: defineLines.join('\n'),
    readModifyWriteSnippets: rmwSnippets,
    cStructSnippet: structLines.join('\n'),
    steps,
  };
}

/**
 * Self-check assertions to verify register and bitfield generation
 */
export function runRegisterBitfieldHelperSelfChecks(): boolean {
  try {
    // Test 3-bit field at bit 4 in 16-bit register
    // Mask should be (0b111 << 4) = 0x70 = 0x0070
    const mask = calculateFieldMask(4, 3);
    console.assert(mask === 0x70n, `Self-check failed: Field mask should be 0x70, got 0x${mask.toString(16)}`);

    const sampleReg: RegisterDefinition = {
      name: 'TIM_CR1',
      addressOffsetHex: '0x00',
      widthBits: 16,
      description: 'Timer Control Register 1',
      fields: [
        { id: '1', name: 'CEN', startBit: 0, bitLength: 1, access: 'RW', resetValue: 0, description: 'Counter enable' },
        { id: '2', name: 'UDIS', startBit: 1, bitLength: 1, access: 'RW', resetValue: 0, description: 'Update disable' },
        { id: '3', name: 'CMS', startBit: 5, bitLength: 2, access: 'RW', resetValue: 0, description: 'Center-aligned mode selection' },
      ],
    };

    const validation = validateBitfields(sampleReg.fields, 16);
    console.assert(validation.isValid, 'Self-check failed: sample TIM_CR1 should be valid');

    const code = generateRegisterCode(sampleReg);
    console.assert(code.headerDefines.includes('TIM_CR1_CEN_MASK'), 'Self-check failed: header defines should include TIM_CR1_CEN_MASK');
    console.assert(code.headerDefines.includes('0x0060U'), 'Self-check failed: CMS mask should be 0x0060');

    return true;
  } catch (err) {
    console.error('Register/Bitfield Helper self-check error:', err);
    return false;
  }
}

runRegisterBitfieldHelperSelfChecks();
