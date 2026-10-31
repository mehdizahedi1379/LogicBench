/**
 * Pure logic for ADC / DAC (Analog-to-Digital and Digital-to-Analog) Calculator
 * Includes resolution, LSB, quantization error, SNR, code-to-voltage, voltage-to-code,
 * step-by-step mathematical working, and self-check assertions.
 */

export interface AdcDacParams {
  resolutionBits: number; // e.g. 8, 10, 12, 14, 16, 24
  vref: number; // in Volts
  useDenominator2NMinus1?: boolean; // true for 2^N - 1, false for 2^N
}

export interface AdcDacSpec {
  totalCodes: number;
  maxCode: number;
  lsbVoltage: number; // in Volts
  lsbMicroVolts: number; // in µV
  lsbMilliVolts: number; // in mV
  quantizationErrorVolts: number; // ± 0.5 LSB in Volts
  rmsNoiseVolts: number; // V_lsb / sqrt(12)
  theoreticalSNR_dB: number; // 6.02 * N + 1.76
  steps: string[];
}

export interface VoltageToCodeResult {
  inputVoltage: number;
  code: number;
  codeHex: string;
  codeBin: string;
  reconstitutedVoltage: number;
  quantizationDeltaVolts: number;
  percentageFullScale: number;
  steps: string[];
}

export interface CodeToVoltageResult {
  inputCode: number;
  outputVoltage: number;
  percentageFullScale: number;
  steps: string[];
}

export function calculateAdcDacSpec(params: AdcDacParams): AdcDacSpec {
  const N = params.resolutionBits;
  const vref = params.vref;
  const totalCodes = Math.pow(2, N);
  const maxCode = totalCodes - 1;
  const denominator = params.useDenominator2NMinus1 ? maxCode : totalCodes;

  const lsbVoltage = vref / denominator;
  const lsbMilliVolts = lsbVoltage * 1000;
  const lsbMicroVolts = lsbVoltage * 1000000;
  const quantizationErrorVolts = lsbVoltage / 2;
  const rmsNoiseVolts = lsbVoltage / Math.sqrt(12);
  const theoreticalSNR_dB = 6.02 * N + 1.76;

  const steps: string[] = [
    `1. Total discrete quantization levels: 2^${N} = ${totalCodes.toLocaleString()} codes (Range: 0 to ${maxCode.toLocaleString()}).`,
    `2. Reference Voltage (Vref): ${vref.toFixed(4)} V.`,
    `3. 1 LSB Step Size: Vref / ${denominator} = ${lsbVoltage.toPrecision(6)} V (${lsbMilliVolts >= 1 ? `${lsbMilliVolts.toFixed(3)} mV` : `${lsbMicroVolts.toFixed(2)} µV`}).`,
    `4. Max Quantization Error: ±0.5 LSB = ±${(quantizationErrorVolts * 1000).toFixed(4)} mV (±${(quantizationErrorVolts * 1000000).toFixed(2)} µV).`,
    `5. Ideal Theoretical SNR: 6.02 × ${N} + 1.76 = ${theoreticalSNR_dB.toFixed(2)} dB.`,
    `6. RMS Quantization Noise Floor: V_lsb / √12 = ${(rmsNoiseVolts * 1000000).toFixed(2)} µV_rms.`,
  ];

  return {
    totalCodes,
    maxCode,
    lsbVoltage,
    lsbMicroVolts,
    lsbMilliVolts,
    quantizationErrorVolts,
    rmsNoiseVolts,
    theoreticalSNR_dB,
    steps,
  };
}

export function convertVoltageToCode(
  voltage: number,
  params: AdcDacParams
): VoltageToCodeResult {
  const spec = calculateAdcDacSpec(params);
  const clampedV = Math.max(0, Math.min(params.vref, voltage));
  const rawCode = clampedV / spec.lsbVoltage;
  const code = Math.max(0, Math.min(spec.maxCode, Math.round(rawCode)));

  const hexDigits = Math.ceil(params.resolutionBits / 4);
  const codeHex = `0x${code.toString(16).padStart(hexDigits, '0').toUpperCase()}`;
  const codeBin = `0b${code.toString(2).padStart(params.resolutionBits, '0')}`;
  const reconstitutedVoltage = code * spec.lsbVoltage;
  const quantizationDeltaVolts = reconstitutedVoltage - clampedV;
  const percentageFullScale = (clampedV / params.vref) * 100;

  const steps: string[] = [
    `1. Input Analog Voltage: ${voltage.toFixed(4)} V (Clamped to dynamic range [0, ${params.vref} V]: ${clampedV.toFixed(4)} V).`,
    `2. Ideal Fractional Code: Vin / V_lsb = ${clampedV.toFixed(4)} V / ${spec.lsbVoltage.toPrecision(5)} V = ${rawCode.toFixed(3)}.`,
    `3. Rounded Integer Digital Code: ${code} (${codeHex}, ${codeBin}).`,
    `4. Reconstituted Analog Value: Code × V_lsb = ${code} × ${spec.lsbVoltage.toPrecision(5)} V = ${reconstitutedVoltage.toFixed(5)} V.`,
    `5. Quantization Error Delta: ${quantizationDeltaVolts >= 0 ? '+' : ''}${(quantizationDeltaVolts * 1000).toFixed(3)} mV.`,
    `6. Relative Full-Scale Position: ${percentageFullScale.toFixed(2)}% of Vref.`,
  ];

  return {
    inputVoltage: clampedV,
    code,
    codeHex,
    codeBin,
    reconstitutedVoltage,
    quantizationDeltaVolts,
    percentageFullScale,
    steps,
  };
}

export function convertCodeToVoltage(
  code: number,
  params: AdcDacParams
): CodeToVoltageResult {
  const spec = calculateAdcDacSpec(params);
  const clampedCode = Math.max(0, Math.min(spec.maxCode, Math.round(code)));
  const outputVoltage = clampedCode * spec.lsbVoltage;
  const percentageFullScale = (clampedCode / spec.maxCode) * 100;

  const steps: string[] = [
    `1. Input Digital Code: ${code} (Clamped to 0..${spec.maxCode}: ${clampedCode}).`,
    `2. DAC Formula: Vout = Code × V_lsb = ${clampedCode} × ${spec.lsbVoltage.toPrecision(5)} V.`,
    `3. Generated Analog Output: ${outputVoltage.toFixed(5)} V.`,
    `4. Full-Scale Proportion: ${percentageFullScale.toFixed(2)}%.`,
  ];

  return {
    inputCode: clampedCode,
    outputVoltage,
    percentageFullScale,
    steps,
  };
}

/**
 * Self-check assertions to verify ADC / DAC precision and mathematical formulas
 */
export function runAdcDacSelfChecks(): boolean {
  try {
    // 1. 12-bit ADC at 3.3V reference
    const spec12Bit = calculateAdcDacSpec({ resolutionBits: 12, vref: 3.3 });
    // Total codes should be 4096
    console.assert(spec12Bit.totalCodes === 4096, 'Self-check failed: 12-bit total codes should be 4096');
    // LSB voltage ~ 3.3 / 4096 ≈ 0.80566 mV
    console.assert(Math.abs(spec12Bit.lsbMilliVolts - 0.80566) < 0.001, 'Self-check failed: 12-bit 3.3V LSB step size error');
    // SNR should be 6.02 * 12 + 1.76 = 74.0 dB
    console.assert(Math.abs(spec12Bit.theoreticalSNR_dB - 74.0) < 0.1, 'Self-check failed: SNR formula error');

    // 2. Voltage to code test: 1.65V (midscale) should yield code 2048
    const midConversion = convertVoltageToCode(1.65, { resolutionBits: 12, vref: 3.3 });
    console.assert(midConversion.code === 2048, `Self-check failed: 1.65V on 3.3V 12-bit should be 2048, got ${midConversion.code}`);

    return true;
  } catch (err) {
    console.error('ADC/DAC Calculator self-check error:', err);
    return false;
  }
}

runAdcDacSelfChecks();
