/**
 * Pure logic for SPI & I2C Bus Helpers
 * - SPI prescalers, bus speeds, and transfer-time estimation
 * - I2C pull-up resistor sizing from bus capacitance (Rp_min and Rp_max with E24 suggestions)
 * - Self-check assertions
 */

export interface SpiTimingParams {
  pclkHz: number; // e.g. 84000000 Hz or 16000000 Hz
  divider: number; // 2, 4, 8, 16, 32, 64, 128, 256
  wordSizeBits: 8 | 16;
  payloadBytes: number;
  interByteDelayUs: number; // inter-byte CS / SPI gap in microseconds
}

export interface SpiTimingResult {
  sckFrequencyHz: number;
  bitDurationNs: number;
  byteTransmissionTimeUs: number;
  totalTransferTimeMs: number;
  throughputKBSec: number;
  steps: string[];
}

export function calculateSpiTiming(params: SpiTimingParams): SpiTimingResult {
  const { pclkHz, divider, wordSizeBits, payloadBytes, interByteDelayUs } = params;
  const sckFrequencyHz = pclkHz / divider;
  const bitDurationNs = (1 / sckFrequencyHz) * 1e9;
  const wordDurationUs = (wordSizeBits / sckFrequencyHz) * 1e6;

  const wordsCount = Math.ceil(payloadBytes / (wordSizeBits / 8));
  const rawTransmissionTimeUs = wordsCount * wordDurationUs;
  const totalOverheadUs = Math.max(0, wordsCount - 1) * interByteDelayUs;
  const totalTransferTimeUs = rawTransmissionTimeUs + totalOverheadUs;
  const totalTransferTimeMs = totalTransferTimeUs / 1000;

  const throughputKBSec = totalTransferTimeMs > 0 ? (payloadBytes / (totalTransferTimeMs / 1000)) / 1024 : 0;

  const steps: string[] = [
    `1. Peripheral Clock (PCLK): ${pclkHz.toLocaleString()} Hz with Prescaler /${divider}.`,
    `2. Achieved SCK Frequency: ${sckFrequencyHz.toLocaleString()} Hz (${(sckFrequencyHz / 1e6).toFixed(3)} MHz).`,
    `3. 1-Bit Clock Period: ${bitDurationNs.toFixed(2)} ns.`,
    `4. Raw Single Word (${wordSizeBits}-bit) Time: ${wordDurationUs.toFixed(3)} µs.`,
    `5. Payload: ${payloadBytes} Bytes (${wordsCount} words) with ${interByteDelayUs} µs inter-word delay.`,
    `6. Total Estimated Transfer Time: ${totalTransferTimeMs.toFixed(3)} ms (${totalTransferTimeUs.toFixed(1)} µs).`,
    `7. Effective Sustained Throughput: ${throughputKBSec.toFixed(2)} kB/s.`,
  ];

  return {
    sckFrequencyHz,
    bitDurationNs,
    byteTransmissionTimeUs: wordDurationUs,
    totalTransferTimeMs,
    throughputKBSec,
    steps,
  };
}

export type I2cSpeedMode = 'standard' | 'fast' | 'fast_plus';

export interface I2cPullupParams {
  vddVolts: number; // e.g. 3.3V or 5.0V
  busCapacitancePf: number; // e.g. 50pF to 400pF
  mode: I2cSpeedMode; // standard (100k), fast (400k), fast_plus (1M)
}

export interface I2cPullupResult {
  mode: I2cSpeedMode;
  targetMaxFreqHz: number;
  maxRiseTimeNs: number;
  volVolts: number;
  iolMa: number;
  rpMinOhms: number;
  rpMaxOhms: number;
  recommendedE24: number[]; // Suggested standard E24 resistor values in Ohms
  isCapacitanceOutOfSpec: boolean;
  steps: string[];
}

// Standard E24 Resistor values (decade scaled)
const E24_BASE = [
  1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
  3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1
];

export function getE24ValuesInRange(minOhms: number, maxOhms: number): number[] {
  const values: number[] = [];
  const decades = [100, 1000, 10000];

  for (const dec of decades) {
    for (const base of E24_BASE) {
      const val = Math.round(base * dec);
      if (val >= minOhms && val <= maxOhms) {
        values.push(val);
      }
    }
  }

  return values;
}

export function calculateI2cPullup(params: I2cPullupParams): I2cPullupResult {
  const { vddVolts, busCapacitancePf, mode } = params;

  let targetMaxFreqHz = 100000;
  let maxRiseTimeNs = 1000; // 1000ns for Standard Mode
  let maxAllowedCbPf = 400;
  let volVolts = 0.4;
  let iolMa = 3.0; // 3mA sink current

  if (mode === 'fast') {
    targetMaxFreqHz = 400000;
    maxRiseTimeNs = 300; // 300ns for Fast Mode
    maxAllowedCbPf = 400;
    volVolts = 0.4;
    iolMa = 3.0;
  } else if (mode === 'fast_plus') {
    targetMaxFreqHz = 1000000;
    maxRiseTimeNs = 120; // 120ns for Fast Mode Plus
    maxAllowedCbPf = 550;
    volVolts = 0.4;
    iolMa = 20.0; // 20mA for Fast-mode Plus
  }

  const isCapacitanceOutOfSpec = busCapacitancePf > maxAllowedCbPf;

  // Rp(min) = (Vdd - Vol) / Iol
  const rpMinOhms = Math.round(((vddVolts - volVolts) / (iolMa / 1000)));

  // Rp(max) = tr / (0.8473 * Cb)
  // tr in seconds, Cb in Farads -> 0.8473 comes from ln(Vdd - 0.3Vdd) - ln(Vdd - 0.7Vdd) = ln(0.7 / 0.3) ≈ 0.8472978
  const cbFarads = busCapacitancePf * 1e-12;
  const trSec = maxRiseTimeNs * 1e-9;
  const rpMaxOhms = Math.round(trSec / (0.8472978 * cbFarads));

  const recommendedE24 = getE24ValuesInRange(rpMinOhms, rpMaxOhms);

  const steps: string[] = [
    `1. I2C Bus Specification: ${mode.toUpperCase()} Mode (Max Clock: ${(targetMaxFreqHz / 1e3).toFixed(0)} kHz, Max Rise Time tr: ${maxRiseTimeNs} ns).`,
    `2. Supply Voltage (VDD): ${vddVolts.toFixed(2)} V, Bus Capacitance (Cb): ${busCapacitancePf} pF ${isCapacitanceOutOfSpec ? '⚠️ (Exceeds spec maximum ' + maxAllowedCbPf + ' pF!)' : '(Compliant with ≤ ' + maxAllowedCbPf + ' pF spec)'}.`,
    `3. Minimum Pull-Up Resistor (Rp_min) constraint (prevent output driver overcurrent):`,
    `   Rp_min = (VDD - VOL) / IOL = (${vddVolts.toFixed(2)}V - ${volVolts}V) / ${iolMa}mA = ${rpMinOhms.toLocaleString()} Ω.`,
    `4. Maximum Pull-Up Resistor (Rp_max) constraint (satisfy bus RC rise time threshold tr):`,
    `   Rp_max = tr / (0.8473 × Cb) = ${maxRiseTimeNs}ns / (0.8473 × ${busCapacitancePf}pF) = ${rpMaxOhms.toLocaleString()} Ω.`,
    `5. Valid Pull-Up Resistance Window: [${rpMinOhms.toLocaleString()} Ω  to  ${rpMaxOhms.toLocaleString()} Ω].`,
    `6. Recommended Standard E24 Values: ${recommendedE24.length > 0 ? recommendedE24.map((v) => (v >= 1000 ? `${v / 1000}kΩ` : `${v}Ω`)).slice(0, 6).join(', ') : 'None in standard range; consider lowering bus capacitance.'}.`,
  ];

  return {
    mode,
    targetMaxFreqHz,
    maxRiseTimeNs,
    volVolts,
    iolMa,
    rpMinOhms,
    rpMaxOhms,
    recommendedE24,
    isCapacitanceOutOfSpec,
    steps,
  };
}

/**
 * Self-check assertions to verify SPI and I2C helpers
 */
export function runSpiI2cHelperSelfChecks(): boolean {
  try {
    // 1. SPI: 84MHz PCLK, prescaler /4 -> SCK = 21MHz, 1-bit period = 47.62 ns
    const spiRes = calculateSpiTiming({
      pclkHz: 84000000,
      divider: 4,
      wordSizeBits: 8,
      payloadBytes: 1024,
      interByteDelayUs: 0,
    });
    console.assert(spiRes.sckFrequencyHz === 21000000, 'Self-check failed: SPI 84MHz / 4 should be 21MHz');

    // 2. I2C Pullup: 3.3V, 100pF, Standard Mode (100kHz, tr = 1000ns)
    // Rp_min = (3.3 - 0.4) / 0.003 = 2.9 / 0.003 ≈ 967 Ohms
    // Rp_max = 1000e-9 / (0.8473 * 100e-12) ≈ 11802 Ohms
    const i2cRes = calculateI2cPullup({ vddVolts: 3.3, busCapacitancePf: 100, mode: 'standard' });
    console.assert(Math.abs(i2cRes.rpMinOhms - 967) < 5, `Self-check failed: I2C Rp_min should be ~967 Ohms, got ${i2cRes.rpMinOhms}`);
    console.assert(Math.abs(i2cRes.rpMaxOhms - 11802) < 50, `Self-check failed: I2C Rp_max should be ~11.8k Ohms, got ${i2cRes.rpMaxOhms}`);

    return true;
  } catch (err) {
    console.error('SPI/I2C Helper self-check error:', err);
    return false;
  }
}

runSpiI2cHelperSelfChecks();
