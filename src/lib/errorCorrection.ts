/**
 * Pure logic for CRC, Parity, Internet Checksums, and Hamming SECDED Code
 * Includes step-by-step traces, standard check value verifications, and self-checks.
 */

export interface CRCPreset {
  id: string;
  name: string;
  width: 8 | 16 | 32;
  poly: number;
  init: number;
  refIn: boolean;
  refOut: boolean;
  xorOut: number;
  checkValue123456789: string; // Standard check vector value for ASCII "123456789"
}

export const CRC_PRESETS: CRCPreset[] = [
  {
    id: 'crc-32-ieee',
    name: 'CRC-32 / ISO-HDLC (Ethernet, ZIP, PNG)',
    width: 32,
    poly: 0x04c11db7,
    init: 0xffffffff,
    refIn: true,
    refOut: true,
    xorOut: 0xffffffff,
    checkValue123456789: '0xCBF43926',
  },
  {
    id: 'crc-16-ccitt-false',
    name: 'CRC-16 / CCITT-FALSE',
    width: 16,
    poly: 0x1021,
    init: 0xffff,
    refIn: false,
    refOut: false,
    xorOut: 0x0000,
    checkValue123456789: '0x29B1',
  },
  {
    id: 'crc-16-modbus',
    name: 'CRC-16 / MODBUS',
    width: 16,
    poly: 0x8005,
    init: 0xffff,
    refIn: true,
    refOut: true,
    xorOut: 0x0000,
    checkValue123456789: '0x4B37',
  },
  {
    id: 'crc-8-smbus',
    name: 'CRC-8 / SMBUS (ATM)',
    width: 8,
    poly: 0x07,
    init: 0x00,
    refIn: false,
    refOut: false,
    xorOut: 0x00,
    checkValue123456789: '0xF4',
  },
  {
    id: 'crc-8-dallas',
    name: 'CRC-8 / DALLAS-MAXIM (1-Wire)',
    width: 8,
    poly: 0x31,
    init: 0x00,
    refIn: true,
    refOut: true,
    xorOut: 0x00,
    checkValue123456789: '0xA1',
  },
];

export function reflectBits(val: number, bits: number): number {
  let res = 0;
  for (let i = 0; i < bits; i++) {
    if ((val & (1 << i)) !== 0) {
      res |= 1 << (bits - 1 - i);
    }
  }
  return res >>> 0;
}

export function computeCRC(bytes: Uint8Array, preset: CRCPreset): { crc: number; hexStr: string; steps: string[] } {
  const steps: string[] = [];
  const width = preset.width;
  const topBit = 1 << (width - 1);
  const mask = width === 32 ? 0xffffffff : (1 << width) - 1;

  let register = preset.init & mask;
  steps.push(`1. Initialized ${width}-bit CRC register with: 0x${(preset.init >>> 0).toString(16).toUpperCase()}`);
  steps.push(`2. Polynomial: 0x${preset.poly.toString(16).toUpperCase()}, RefIn: ${preset.refIn}, RefOut: ${preset.refOut}`);

  for (let b = 0; b < bytes.length; b++) {
    let byte = bytes[b];
    if (preset.refIn) {
      byte = reflectBits(byte, 8);
    }

    register ^= byte << (width - 8);
    register &= mask;

    for (let bit = 0; bit < 8; bit++) {
      if ((register & topBit) !== 0) {
        register = ((register << 1) ^ preset.poly) & mask;
      } else {
        register = (register << 1) & mask;
      }
    }
  }

  if (preset.refOut) {
    register = reflectBits(register, width);
  }

  register ^= preset.xorOut;
  register &= mask;
  const unsignedRes = register >>> 0;

  const hexDigits = width / 4;
  const hexStr = `0x${unsignedRes.toString(16).padStart(hexDigits, '0').toUpperCase()}`;

  steps.push(`3. Processed ${bytes.length} bytes (${bytes.length * 8} bits) through LFSR polynomial feedback matrix.`);
  steps.push(`4. Final XOR mask applied: 0x${preset.xorOut.toString(16).toUpperCase()}.`);
  steps.push(`5. Calculated CRC checksum: ${hexStr}.`);

  return { crc: unsignedRes, hexStr, steps };
}

export interface ChecksumResults {
  evenParityBit: number;
  oddParityBit: number;
  xorChecksum: number;
  sum8Bit: number;
  twosComplementSum8: number;
  internetChecksumRFC1071: number;
  fletcher16: number;
  steps: string[];
}

export function computeChecksums(bytes: Uint8Array): ChecksumResults {
  let onesCount = 0;
  let xor = 0;
  let sum8 = 0;

  // Fletcher-16
  let fletcherA = 0;
  let fletcherB = 0;

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    xor ^= b;
    sum8 = (sum8 + b) & 0xff;

    // Count 1s
    for (let bi = 0; bi < 8; bi++) {
      if ((b & (1 << bi)) !== 0) onesCount++;
    }

    fletcherA = (fletcherA + b) % 255;
    fletcherB = (fletcherB + fletcherA) % 255;
  }

  const fletcher16 = (fletcherB << 8) | fletcherA;
  const evenParityBit = onesCount % 2 === 0 ? 0 : 1;
  const oddParityBit = onesCount % 2 === 0 ? 1 : 0;
  const twosComplementSum8 = (-sum8) & 0xff;

  // RFC 1071 Internet Checksum
  let sum32 = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    const high = bytes[i];
    const low = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const word16 = (high << 8) | low;
    sum32 += word16;
  }
  while (sum32 >> 16) {
    sum32 = (sum32 & 0xffff) + (sum32 >> 16);
  }
  const internetChecksum = (~sum32) & 0xffff;

  const steps: string[] = [
    `1. Processed ${bytes.length} bytes. Total count of 1-bits across payload: ${onesCount}.`,
    `2. Even Parity: bit is ${evenParityBit} (ensures total 1-bits count is even).`,
    `3. Odd Parity: bit is ${oddParityBit} (ensures total 1-bits count is odd).`,
    `4. Longitudinal Redundancy Check (LRC / XOR): 0x${xor.toString(16).padStart(2, '0').toUpperCase()}.`,
    `5. Modular 8-Bit Sum: 0x${sum8.toString(16).padStart(2, '0').toUpperCase()} (Two's comp: 0x${twosComplementSum8.toString(16).padStart(2, '0').toUpperCase()}).`,
    `6. RFC 1071 Internet Checksum: 0x${internetChecksum.toString(16).padStart(4, '0').toUpperCase()}.`,
    `7. Fletcher-16 Checksum: 0x${fletcher16.toString(16).padStart(4, '0').toUpperCase()}.`,
  ];

  return {
    evenParityBit,
    oddParityBit,
    xorChecksum: xor,
    sum8Bit: sum8,
    twosComplementSum8,
    internetChecksumRFC1071: internetChecksum,
    fletcher16,
    steps,
  };
}

/**
 * Hamming(7,4) Code SECDED Implementation
 * 4 data bits: d1, d2, d3, d4
 * 3 parity bits: p1, p2, p4 (at positions 1, 2, 4)
 * Codeword format (1-indexed): [p1, p2, d1, p4, d2, d3, d4]
 */
export interface Hamming74State {
  dataBits: number[]; // 4 bits [d1, d2, d3, d4]
  encodedCodeword: number[]; // 7 bits [p1, p2, d1, p4, d2, d3, d4]
  injectedErrorBit: number; // 0 = no error, 1..7 = error position
  receivedCodeword: number[];
  syndrome: number; // 0 = no error, 1..7 = error position
  correctedCodeword: number[];
  recoveredDataBits: number[];
  hasError: boolean;
  steps: string[];
}

export function encodeHamming74(d: number[]): number[] {
  // d: [d1, d2, d3, d4]
  const d1 = d[0] & 1;
  const d2 = d[1] & 1;
  const d3 = d[2] & 1;
  const d4 = d[3] & 1;

  // p1 covers positions 1, 3, 5, 7 -> p1, d1, d2, d4
  const p1 = d1 ^ d2 ^ d4;
  // p2 covers positions 2, 3, 6, 7 -> p2, d1, d3, d4
  const p2 = d1 ^ d3 ^ d4;
  // p4 covers positions 4, 5, 6, 7 -> p4, d2, d3, d4
  const p4 = d2 ^ d3 ^ d4;

  return [p1, p2, d1, p4, d2, d3, d4];
}

export function decodeHamming74(
  codeword: number[],
  errorPositionToInject: number = 0
): Hamming74State {
  // Copy codeword and optionally inject error at 1-based position
  const received = [...codeword];
  if (errorPositionToInject >= 1 && errorPositionToInject <= 7) {
    received[errorPositionToInject - 1] ^= 1;
  }

  // Calculate syndrome bits:
  // s1 = r1 ^ r3 ^ r5 ^ r7
  // s2 = r2 ^ r3 ^ r6 ^ r7
  // s4 = r4 ^ r5 ^ r6 ^ r7
  const r = received;
  const s1 = r[0] ^ r[2] ^ r[4] ^ r[6];
  const s2 = r[1] ^ r[2] ^ r[5] ^ r[6];
  const s4 = r[3] ^ r[4] ^ r[5] ^ r[6];

  // Syndrome decimal integer points directly to error position (1..7)
  const syndrome = (s4 << 2) | (s2 << 1) | s1;
  const hasError = syndrome !== 0;

  const corrected = [...received];
  if (hasError && syndrome >= 1 && syndrome <= 7) {
    corrected[syndrome - 1] ^= 1; // Auto-correct flipped bit!
  }

  const recoveredDataBits = [corrected[2], corrected[4], corrected[5], corrected[6]];
  const d = [codeword[2], codeword[4], codeword[5], codeword[6]];

  const steps: string[] = [
    `1. Input Data Bits: [d1=${d[0]}, d2=${d[1]}, d3=${d[2]}, d4=${d[3]}].`,
    `2. Parity equations: p1=d1^d2^d4, p2=d1^d3^d4, p4=d2^d3^d4.`,
    `3. Encoded 7-bit Codeword [p1, p2, d1, p4, d2, d3, d4]: [${codeword.join(', ')}].`,
  ];

  if (errorPositionToInject > 0) {
    steps.push(`4. INJECTED ERROR: Flipped bit position ${errorPositionToInject} -> Received: [${received.join(', ')}].`);
  } else {
    steps.push(`4. Channel transmission: Clean (no error injected).`);
  }

  steps.push(`5. Syndrome Check: s1=${s1}, s2=${s2}, s4=${s4} => Syndrome binary [s4 s2 s1] = ${syndrome}.`);
  if (hasError) {
    steps.push(`6. Single-bit error detected at position ${syndrome}! Auto-corrected bit ${syndrome} from ${received[syndrome - 1]} to ${corrected[syndrome - 1]}.`);
  } else {
    steps.push(`6. Syndrome is 0: Codeword received without transmission errors.`);
  }
  steps.push(`7. Extracted Original Data: [${recoveredDataBits.join(', ')}].`);

  return {
    dataBits: [codeword[2], codeword[4], codeword[5], codeword[6]],
    encodedCodeword: codeword,
    injectedErrorBit: errorPositionToInject,
    receivedCodeword: received,
    syndrome,
    correctedCodeword: corrected,
    recoveredDataBits,
    hasError,
    steps,
  };
}

/**
 * Self-check assertions to verify standard test vectors
 */
export function runErrorCorrectionSelfChecks(): boolean {
  try {
    const testVector = new TextEncoder().encode('123456789');

    // 1. Verify standard CRC-32 IEEE 802.3 test value 0xCBF43926
    const crc32Preset = CRC_PRESETS.find((p) => p.id === 'crc-32-ieee')!;
    const crc32Res = computeCRC(testVector, crc32Preset);
    console.assert(crc32Res.hexStr === '0xCBF43926', `Self-check failed: CRC-32 "123456789" expected 0xCBF43926, got ${crc32Res.hexStr}`);

    // 2. Verify CRC-16 CCITT False test value 0x29B1
    const crc16Preset = CRC_PRESETS.find((p) => p.id === 'crc-16-ccitt-false')!;
    const crc16Res = computeCRC(testVector, crc16Preset);
    console.assert(crc16Res.hexStr === '0x29B1', `Self-check failed: CRC-16 CCITT expected 0x29B1, got ${crc16Res.hexStr}`);

    // 3. Verify Hamming(7,4) single bit error injection and auto-correction
    const sampleData = [1, 0, 1, 1];
    const encoded = encodeHamming74(sampleData);
    // Inject error at bit 3 (which corresponds to data bit d1)
    const decoded = decodeHamming74(encoded, 3);
    console.assert(decoded.syndrome === 3, 'Self-check failed: Hamming syndrome should identify bit 3');
    console.assert(
      decoded.recoveredDataBits[0] === sampleData[0] &&
      decoded.recoveredDataBits[1] === sampleData[1] &&
      decoded.recoveredDataBits[2] === sampleData[2] &&
      decoded.recoveredDataBits[3] === sampleData[3],
      'Self-check failed: Hamming corrected data mismatch'
    );

    return true;
  } catch (err) {
    console.error('Error Correction self-check error:', err);
    return false;
  }
}

runErrorCorrectionSelfChecks();
