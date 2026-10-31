/**
 * Pure logic for multi-radix conversions and embedded bitwise manipulation
 * Uses BigInt for precision up to 64 bits.
 * Includes step-by-step working derivations and self-check assertions.
 */

export type WordWidth = 8 | 16 | 32 | 64;

export interface Float32Breakdown {
  sign: number;
  exponent: number;
  fraction: number;
  floatValue: number;
  isSpecial: boolean;
  specialText?: string;
  steps: string[];
}

export interface TwosComplementDerivation {
  originalValue: bigint;
  isNegative: boolean;
  absoluteMagnitude: bigint;
  invertedBits: bigint;
  finalTwosComplement: bigint;
  steps: string[];
}

export function getWordMask(width: WordWidth): bigint {
  switch (width) {
    case 8:
      return 0xffn;
    case 16:
      return 0xffffn;
    case 32:
      return 0xffffffffn;
    case 64:
      return 0xffffffffffffffffn;
  }
}

export function clampToWidth(val: bigint, width: WordWidth): bigint {
  const mask = getWordMask(width);
  return val & mask;
}

export function toSignedDecimal(val: bigint, width: WordWidth): bigint {
  const unsigned = clampToWidth(val, width);
  const signBit = 1n << BigInt(width - 1);
  if ((unsigned & signBit) !== 0n) {
    const modulus = 1n << BigInt(width);
    return unsigned - modulus;
  }
  return unsigned;
}

export function formatBinary(val: bigint, width: WordWidth, grouped = true): string {
  const unsigned = clampToWidth(val, width);
  const raw = unsigned.toString(2).padStart(width, '0');
  if (!grouped) return raw;

  // Group by 4-bit nibbles
  const nibbles: string[] = [];
  for (let i = 0; i < raw.length; i += 4) {
    nibbles.push(raw.slice(i, i + 4));
  }
  return nibbles.join(' ');
}

export function formatHex(val: bigint, width: WordWidth, prefix = true, uppercase = true): string {
  const unsigned = clampToWidth(val, width);
  const hexDigits = width / 4;
  let str = unsigned.toString(16).padStart(hexDigits, '0');
  if (uppercase) str = str.toUpperCase();
  return prefix ? `0x${str}` : str;
}

export function formatOctal(val: bigint, width: WordWidth, prefix = true): string {
  const unsigned = clampToWidth(val, width);
  const str = unsigned.toString(8);
  return prefix ? `0o${str}` : str;
}

export function parseInputToBigInt(input: string, width: WordWidth): bigint | null {
  const clean = input.trim().replace(/[\s_,]/g, '');
  if (!clean) return 0n;

  try {
    let result: bigint;
    if (clean.startsWith('0b') || clean.startsWith('0B')) {
      result = BigInt(clean);
    } else if (clean.startsWith('0x') || clean.startsWith('0X')) {
      result = BigInt(clean);
    } else if (clean.startsWith('0o') || clean.startsWith('0O')) {
      result = BigInt(clean);
    } else if (/^[0-9]+$/.test(clean)) {
      result = BigInt(clean);
    } else if (/^-[0-9]+$/.test(clean)) {
      // Negative decimal: handle two's complement
      const signedVal = BigInt(clean);
      const modulus = 1n << BigInt(width);
      result = (modulus + signedVal) % modulus;
    } else if (/^[a-fA-F0-9]+$/.test(clean) && /[a-fA-F]/.test(clean)) {
      // Looks like raw hex without 0x prefix
      result = BigInt('0x' + clean);
    } else {
      return null;
    }

    return clampToWidth(result, width);
  } catch {
    return null;
  }
}

export function getBit(val: bigint, index: number): number {
  return Number((val >> BigInt(index)) & 1n);
}

export function toggleBit(val: bigint, index: number, width: WordWidth): bigint {
  const mask = 1n << BigInt(index);
  return clampToWidth(val ^ mask, width);
}

export function setBit(val: bigint, index: number, state: boolean, width: WordWidth): bigint {
  const bitMask = 1n << BigInt(index);
  if (state) {
    return clampToWidth(val | bitMask, width);
  } else {
    return clampToWidth(val & ~bitMask, width);
  }
}

export function invertBits(val: bigint, width: WordWidth): bigint {
  const mask = getWordMask(width);
  return (~val) & mask;
}

export function shiftLeft(val: bigint, width: WordWidth, count = 1): bigint {
  return clampToWidth(val << BigInt(count), width);
}

export function shiftRight(val: bigint, width: WordWidth, count = 1): bigint {
  return clampToWidth(val >> BigInt(count), width);
}

export function toAsciiRepresentation(val: bigint, width: WordWidth): string {
  const unsigned = clampToWidth(val, width);
  const bytesCount = width / 8;
  const chars: string[] = [];

  for (let i = bytesCount - 1; i >= 0; i--) {
    const byte = Number((unsigned >> BigInt(i * 8)) & 0xffn);
    if (byte >= 32 && byte <= 126) {
      chars.push(String.fromCharCode(byte));
    } else if (byte === 0) {
      chars.push('\\0');
    } else {
      chars.push('.');
    }
  }

  return chars.join('');
}

export function deriveTwosComplement(val: bigint, width: WordWidth): TwosComplementDerivation {
  const signed = toSignedDecimal(val, width);
  const isNegative = signed < 0n;
  const unsigned = clampToWidth(val, width);

  const steps: string[] = [];
  let absMag = isNegative ? -signed : signed;
  let inverted = 0n;
  let finalTwos = unsigned;

  if (!isNegative) {
    steps.push(`1. MSB (Bit ${width - 1}) is 0, indicating a positive number.`);
    steps.push(`2. In two's complement, positive values equal their direct unsigned binary magnitude.`);
    steps.push(`3. Binary value: ${formatBinary(unsigned, width, true)} = +${signed.toString(10)} in decimal.`);
  } else {
    absMag = -signed;
    inverted = clampToWidth(~absMag, width);
    finalTwos = clampToWidth(inverted + 1n, width);

    steps.push(`1. Decimal value is negative: ${signed.toString(10)}.`);
    steps.push(`2. Absolute magnitude: |${signed.toString(10)}| = ${absMag.toString(10)} (Binary: ${formatBinary(absMag, width, true)}).`);
    steps.push(`3. One's complement (invert all ${width} bits): ~${formatBinary(absMag, width, true)} = ${formatBinary(inverted, width, true)}.`);
    steps.push(`4. Two's complement (add 1 to inverted bits): ${formatBinary(inverted, width, true)} + 1 = ${formatBinary(finalTwos, width, true)}.`);
    steps.push(`5. Hexadecimal result: ${formatHex(finalTwos, width)}.`);
  }

  return {
    originalValue: signed,
    isNegative,
    absoluteMagnitude: absMag,
    invertedBits: inverted,
    finalTwosComplement: finalTwos,
    steps,
  };
}

export function analyzeFloat32(val: bigint): Float32Breakdown {
  const uint32 = Number(clampToWidth(val, 32));
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, uint32, false); // Big-endian
  const floatVal = view.getFloat32(0, false);

  const sign = (uint32 >>> 31) & 0x1;
  const exponent = (uint32 >>> 23) & 0xff;
  const fraction = uint32 & 0x7fffff;

  const steps: string[] = [];
  let isSpecial = false;
  let specialText: string | undefined;

  steps.push(`1. Bit 31 (Sign bit) = ${sign} (${sign === 0 ? 'Positive: (-1)^0 = +1' : 'Negative: (-1)^1 = -1'}).`);
  steps.push(`2. Bits 30..23 (Raw Exponent) = 0x${exponent.toString(16).padStart(2, '0')} (${exponent} decimal).`);

  if (exponent === 0xff) {
    isSpecial = true;
    specialText = fraction === 0 ? (sign === 0 ? '+Infinity' : '-Infinity') : 'NaN';
    steps.push(`3. Exponent is 255 (all 1s): Special IEEE-754 value detected: ${specialText}.`);
  } else if (exponent === 0 && fraction === 0) {
    isSpecial = true;
    specialText = sign === 0 ? '+0.0' : '-0.0';
    steps.push(`3. Exponent and fraction are zero: Floating-point zero (${specialText}).`);
  } else if (exponent === 0) {
    isSpecial = true;
    specialText = 'Subnormal';
    steps.push(`3. Exponent is 0 with non-zero fraction: Denormalized / Subnormal float.`);
    steps.push(`4. Formula: (-1)^${sign} × (0 + ${fraction}/2^23) × 2^(-126) ≈ ${floatVal.toExponential(6)}.`);
  } else {
    const unbiasedExp = exponent - 127;
    const mantissaFrac = fraction / Math.pow(2, 23);
    const fullMantissa = 1 + mantissaFrac;

    steps.push(`3. Unbias Exponent: e - 127 = ${exponent} - 127 = ${unbiasedExp}.`);
    steps.push(`4. Bits 22..0 (Fraction/Mantissa): 0x${fraction.toString(16).padStart(6, '0')} = ${mantissaFrac.toFixed(7)}.`);
    steps.push(`5. Normalized Significand (1 + fraction): 1 + ${mantissaFrac.toFixed(7)} = ${fullMantissa.toFixed(7)}.`);
    steps.push(`6. Final calculation: (-1)^${sign} × ${fullMantissa.toFixed(7)} × 2^(${unbiasedExp}) = ${floatVal.toPrecision(7)}.`);
  }

  return {
    sign,
    exponent,
    fraction,
    floatValue: floatVal,
    isSpecial,
    specialText,
    steps,
  };
}

export function swapEndianness(val: bigint, width: WordWidth): bigint {
  const bytesCount = width / 8;
  let swapped = 0n;
  for (let i = 0; i < bytesCount; i++) {
    const byte = (val >> BigInt(i * 8)) & 0xffn;
    swapped = (swapped << 8n) | byte;
  }
  return swapped;
}

export function deriveEndiannessSteps(val: bigint, width: WordWidth): string[] {
  const unsigned = clampToWidth(val, width);
  const bytesCount = width / 8;
  const steps: string[] = [];

  const originalBytes: string[] = [];
  const swappedBytes: string[] = [];

  for (let i = bytesCount - 1; i >= 0; i--) {
    const byteVal = Number((unsigned >> BigInt(i * 8)) & 0xffn);
    originalBytes.push(`B${i}:0x${byteVal.toString(16).padStart(2, '0').toUpperCase()}`);
  }

  for (let i = 0; i < bytesCount; i++) {
    const byteVal = Number((unsigned >> BigInt(i * 8)) & 0xffn);
    swappedBytes.push(`B${i}:0x${byteVal.toString(16).padStart(2, '0').toUpperCase()}`);
  }

  steps.push(`1. Split ${width}-bit word into ${bytesCount} individual bytes: [${originalBytes.join(', ')}].`);
  steps.push(`2. Reverse byte order for endianness change (Big-Endian ⇄ Little-Endian).`);
  steps.push(`3. Reassembled bytes: [${swappedBytes.join(', ')}].`);
  steps.push(`4. Resulting value: ${formatHex(swapEndianness(val, width), width)}.`);

  return steps;
}

/**
 * Self-check assertions to verify mathematical and conversion correctness
 */
export function runBaseConverterSelfChecks(): boolean {
  try {
    // 1. Two's complement of -42 in 8-bit must be 0xD6 (214)
    const neg42 = parseInputToBigInt('-42', 8);
    console.assert(neg42 === 0xd6n, 'Self-check failed: -42 in 8-bit should be 0xD6');

    // 2. Signed decimal of 0xD6 in 8-bit must be -42
    const decSigned = toSignedDecimal(0xd6n, 8);
    console.assert(decSigned === -42n, 'Self-check failed: 0xD6 in 8-bit should be -42');

    // 3. IEEE-754 single precision for -6.25 is 0xC0C80000
    const floatBreakdown = analyzeFloat32(0xc0c80000n);
    console.assert(floatBreakdown.sign === 1, 'Self-check failed: -6.25 sign bit should be 1');
    console.assert(Math.abs(floatBreakdown.floatValue - (-6.25)) < 1e-6, 'Self-check failed: Float value should be -6.25');

    // 4. Endianness swap of 0x12345678 in 32-bit must be 0x78563412
    const swapped = swapEndianness(0x12345678n, 32);
    console.assert(swapped === 0x78563412n, 'Self-check failed: Endianness swap mismatch');

    return true;
  } catch (err) {
    console.error('Base Converter self-check error:', err);
    return false;
  }
}

// Execute self check on module load
runBaseConverterSelfChecks();
