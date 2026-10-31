/**
 * Pure logic for Bitwise Calculator, Shifts, Rotates, and C Code Generator
 * Includes step-by-step bit-level trace and self-check assertions.
 */

import { WordWidth, clampToWidth, getBit, formatBinary, formatHex } from './baseConverter';

export type BitwiseOp = 'AND' | 'OR' | 'XOR' | 'NOT' | 'SHL' | 'SHR' | 'SAR' | 'ROL' | 'ROR';

export interface BitwiseResult {
  operandA: bigint;
  operandB: bigint;
  op: BitwiseOp;
  shiftAmount: number;
  result: bigint;
  steps: string[];
  bitTrace: { bit: number; a: number; b?: number; res: number }[];
}

export function rotateLeft(val: bigint, shift: number, width: WordWidth): bigint {
  const w = BigInt(width);
  const s = BigInt(shift % width);
  if (s === 0n) return clampToWidth(val, width);
  const unsigned = clampToWidth(val, width);
  return clampToWidth((unsigned << s) | (unsigned >> (w - s)), width);
}

export function rotateRight(val: bigint, shift: number, width: WordWidth): bigint {
  const w = BigInt(width);
  const s = BigInt(shift % width);
  if (s === 0n) return clampToWidth(val, width);
  const unsigned = clampToWidth(val, width);
  return clampToWidth((unsigned >> s) | (unsigned << (w - s)), width);
}

export function arithmeticShiftRight(val: bigint, shift: number, width: WordWidth): bigint {
  const s = BigInt(Math.min(shift, width));
  const unsigned = clampToWidth(val, width);
  const signBit = (unsigned >> BigInt(width - 1)) & 1n;

  let shifted = unsigned >> s;
  if (signBit === 1n) {
    // Fill upper bits with 1
    const fillMask = ((1n << s) - 1n) << BigInt(width - shift);
    shifted |= fillMask;
  }
  return clampToWidth(shifted, width);
}

export function executeBitwiseOp(
  op: BitwiseOp,
  a: bigint,
  b: bigint,
  width: WordWidth,
  shiftAmount: number = 1
): BitwiseResult {
  const cleanA = clampToWidth(a, width);
  const cleanB = clampToWidth(b, width);
  let res = 0n;
  const steps: string[] = [];
  const bitTrace: { bit: number; a: number; b?: number; res: number }[] = [];

  switch (op) {
    case 'AND':
      res = cleanA & cleanB;
      steps.push(`Operation: A AND B (&) on ${width}-bit operands.`);
      steps.push(`Result is 1 only when BOTH corresponding bits of A and B are 1.`);
      break;
    case 'OR':
      res = cleanA | cleanB;
      steps.push(`Operation: A OR B (|) on ${width}-bit operands.`);
      steps.push(`Result is 1 when EITHER bit of A or B (or both) is 1.`);
      break;
    case 'XOR':
      res = cleanA ^ cleanB;
      steps.push(`Operation: A XOR B (^) on ${width}-bit operands.`);
      steps.push(`Result is 1 when bits of A and B DIFFER (odd parity).`);
      break;
    case 'NOT':
      res = clampToWidth(~cleanA, width);
      steps.push(`Operation: Bitwise Inversion / NOT (~A) on ${width}-bit operand.`);
      steps.push(`Each 0 bit becomes 1, and each 1 bit becomes 0.`);
      break;
    case 'SHL':
      res = clampToWidth(cleanA << BigInt(shiftAmount), width);
      steps.push(`Operation: Logical Shift Left (<< ${shiftAmount}) on Operand A.`);
      steps.push(`Bits shift left by ${shiftAmount}; empty positions on right filled with 0s.`);
      break;
    case 'SHR':
      res = clampToWidth(cleanA >> BigInt(shiftAmount), width);
      steps.push(`Operation: Logical Shift Right (>> ${shiftAmount}) on Operand A.`);
      steps.push(`Bits shift right by ${shiftAmount}; empty positions on left filled with 0s.`);
      break;
    case 'SAR':
      res = arithmeticShiftRight(cleanA, shiftAmount, width);
      steps.push(`Operation: Arithmetic Shift Right (ASR >> ${shiftAmount}) preserving sign bit.`);
      steps.push(`Empty positions on left are replicated with the MSB sign bit (${getBit(cleanA, width - 1)}).`);
      break;
    case 'ROL':
      res = rotateLeft(cleanA, shiftAmount, width);
      steps.push(`Operation: Rotate Left (ROL <<< ${shiftAmount}) on ${width}-bit word.`);
      steps.push(`Bits shifted out of MSB wrap around into LSB without loss.`);
      break;
    case 'ROR':
      res = rotateRight(cleanA, shiftAmount, width);
      steps.push(`Operation: Rotate Right (ROR >>> ${shiftAmount}) on ${width}-bit word.`);
      steps.push(`Bits shifted out of LSB wrap around into MSB without loss.`);
      break;
  }

  // Populate bit trace for inspection
  for (let i = width - 1; i >= 0; i--) {
    bitTrace.push({
      bit: i,
      a: getBit(cleanA, i),
      b: op !== 'NOT' && !['SHL', 'SHR', 'SAR', 'ROL', 'ROR'].includes(op) ? getBit(cleanB, i) : undefined,
      res: getBit(res, i),
    });
  }

  steps.push(`Operand A : ${formatHex(cleanA, width)} = ${formatBinary(cleanA, width, true)}`);
  if (op !== 'NOT' && !['SHL', 'SHR', 'SAR', 'ROL', 'ROR'].includes(op)) {
    steps.push(`Operand B : ${formatHex(cleanB, width)} = ${formatBinary(cleanB, width, true)}`);
  }
  steps.push(`Result    : ${formatHex(res, width)} = ${formatBinary(res, width, true)}`);

  return {
    operandA: cleanA,
    operandB: cleanB,
    op,
    shiftAmount,
    result: res,
    steps,
    bitTrace,
  };
}

export interface CCodeSnippets {
  maskDefinition: string;
  setBit: string;
  clearBit: string;
  toggleBit: string;
  readBit: string;
  bitfieldWrite: string;
}

export function generateCCode(
  valA: bigint,
  selectedBit: number = 0,
  width: WordWidth = 32,
  registerName: string = 'GPIO_ODR'
): CCodeSnippets {
  const typeSuffix = width === 64 ? 'ULL' : 'U';
  const maskHex = formatHex(valA, width);
  const bitMask = `(1${typeSuffix} << ${selectedBit})`;

  return {
    maskDefinition: `/* Bit Mask Definition */\n#define ${registerName}_BIT${selectedBit}_MASK ${bitMask}\n#define ${registerName}_CUSTOM_MASK ${maskHex}${typeSuffix}`,
    setBit: `/* Set bit ${selectedBit} */\n${registerName} |= (1${typeSuffix} << ${selectedBit});`,
    clearBit: `/* Clear bit ${selectedBit} */\n${registerName} &= ~(1${typeSuffix} << ${selectedBit});`,
    toggleBit: `/* Toggle bit ${selectedBit} */\n${registerName} ^= (1${typeSuffix} << ${selectedBit});`,
    readBit: `/* Check / Read bit ${selectedBit} */\nbool is_set = (${registerName} & (1${typeSuffix} << ${selectedBit})) != 0${typeSuffix};`,
    bitfieldWrite: `/* Multi-bit field write using mask */\n${registerName} = (${registerName} & ~${maskHex}${typeSuffix}) | (new_val & ${maskHex}${typeSuffix});`,
  };
}

/**
 * Self-check assertions to verify bitwise operations, shifts, and rotates
 */
export function runBitwiseCalcSelfChecks(): boolean {
  try {
    // 1. 0x0F & 0x33 = 0x03
    const andRes = executeBitwiseOp('AND', 0x0fn, 0x33n, 8);
    console.assert(andRes.result === 0x03n, 'Self-check failed: 0x0F & 0x33 should be 0x03');

    // 2. 0x0F | 0x30 = 0x3F
    const orRes = executeBitwiseOp('OR', 0x0fn, 0x30n, 8);
    console.assert(orRes.result === 0x3fn, 'Self-check failed: 0x0F | 0x30 should be 0x3F');

    // 3. 0xAA ^ 0xFF = 0x55
    const xorRes = executeBitwiseOp('XOR', 0xaan, 0xffn, 8);
    console.assert(xorRes.result === 0x55n, 'Self-check failed: 0xAA ^ 0xFF should be 0x55');

    // 4. Rotate 0x8001 right by 1 in 16-bit must be 0xC000
    const rorRes = rotateRight(0x8001n, 1, 16);
    console.assert(rorRes === 0xc000n, 'Self-check failed: ROR 0x8001 by 1 should be 0xC000');

    // 5. Arithmetic Shift Right on 0x80 in 8-bit by 1 must be 0xC0 (-128 >> 1 = -64)
    const asrRes = arithmeticShiftRight(0x80n, 1, 8);
    console.assert(asrRes === 0xc0n, 'Self-check failed: ASR 0x80 by 1 should be 0xC0');

    return true;
  } catch (err) {
    console.error('Bitwise Calculator self-check error:', err);
    return false;
  }
}

runBitwiseCalcSelfChecks();
