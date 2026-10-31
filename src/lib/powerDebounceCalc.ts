/**
 * Pure logic for Debounce Estimator & Duty-Cycled Battery-Life Calculator
 * Includes RC hardware calculations, software debounce timing,
 * average current integration, runtime projections, and self-check assertions.
 */

export interface RcDebounceParams {
  rOhms: number; // Pull-up / series resistor in Ohms (e.g. 10000 = 10k)
  cFarads: number; // Capacitor in Farads (e.g. 100e-9 = 100nF)
  vddVolts: number; // Supply voltage (e.g. 3.3V)
  vthVolts: number; // Schmitt Trigger input threshold (e.g. 2.0V or 0.7 * Vdd)
}

export interface RcDebounceResult {
  tauMs: number; // Time constant R * C in ms
  timeToThresholdMs: number; // Time to reach Vth in ms
  cutoffFrequencyHz: number; // fc = 1 / (2 * pi * R * C)
  recommendedSwitchWindowMs: string;
  steps: string[];
}

export function calculateRcDebounce(params: RcDebounceParams): RcDebounceResult {
  const { rOhms, cFarads, vddVolts, vthVolts } = params;
  const tauSec = rOhms * cFarads;
  const tauMs = tauSec * 1000;

  // Charging voltage: V(t) = Vdd * (1 - e^(-t / tau))
  // t = -tau * ln(1 - Vth / Vdd)
  let timeToThresholdMs = 0;
  if (vthVolts < vddVolts && vthVolts > 0) {
    const ratio = 1 - (vthVolts / vddVolts);
    const tSec = -tauSec * Math.log(ratio);
    timeToThresholdMs = tSec * 1000;
  } else {
    timeToThresholdMs = tauMs;
  }

  const cutoffFrequencyHz = tauSec > 0 ? 1 / (2 * Math.PI * tauSec) : 0;

  const steps: string[] = [
    `1. Resistor R = ${(rOhms / 1000).toFixed(1)} kΩ, Capacitor C = ${(cFarads * 1e9).toFixed(1)} nF (${(cFarads * 1e6).toFixed(3)} µF).`,
    `2. RC Time Constant (τ = R × C): ${tauMs.toFixed(3)} ms (${(tauSec * 1e6).toFixed(1)} µs).`,
    `3. Low-Pass Filter Cutoff Frequency (-3dB): fc = 1 / (2πRC) = ${cutoffFrequencyHz.toFixed(1)} Hz.`,
    `4. Input Threshold Vth = ${vthVolts.toFixed(2)} V on VDD = ${vddVolts.toFixed(2)} V:`,
    `   Time to trigger threshold: t = -RC × ln(1 - Vth/VDD) = ${timeToThresholdMs.toFixed(3)} ms.`,
    `5. Switch Mechanical Assessment: Most tactile push-buttons exhibit 2ms to 15ms bounce. A filter time of 5ms to 20ms provides robust noise immunity.`,
  ];

  return {
    tauMs,
    timeToThresholdMs,
    cutoffFrequencyHz,
    recommendedSwitchWindowMs: '5 - 20 ms',
    steps,
  };
}

export interface BatteryPreset {
  name: string;
  nominalVoltage: number;
  capacityMah: number;
  chemistry: string;
  selfDischargeAnnualPercent: number;
}

export const BATTERY_PRESETS: BatteryPreset[] = [
  { name: 'CR2032 Lithium Coin Cell', nominalVoltage: 3.0, capacityMah: 225, chemistry: 'Li-MnO2', selfDischargeAnnualPercent: 1.0 },
  { name: '2× AAA Alkaline Batteries', nominalVoltage: 3.0, capacityMah: 1000, chemistry: 'Alkaline', selfDischargeAnnualPercent: 3.0 },
  { name: '2× AA Alkaline Batteries', nominalVoltage: 3.0, capacityMah: 2400, chemistry: 'Alkaline', selfDischargeAnnualPercent: 3.0 },
  { name: '18650 Li-Ion Rechargeable', nominalVoltage: 3.7, capacityMah: 2600, chemistry: 'Li-Ion NMC', selfDischargeAnnualPercent: 5.0 },
  { name: 'LiPo Pouch Battery (Small)', nominalVoltage: 3.7, capacityMah: 500, chemistry: 'Li-Po', selfDischargeAnnualPercent: 5.0 },
];

export interface BatteryLifeParams {
  batteryCapacityMah: number;
  deratingFactorPercent: number; // e.g. 80% usable capacity
  activeCurrentMa: number; // mA
  activeDurationMs: number; // ms
  sleepCurrentUa: number; // µA
  sleepDurationSec: number; // seconds
}

export interface BatteryLifeResult {
  averageCurrentMa: number;
  averageCurrentUa: number;
  activeDutyPercent: number;
  usableCapacityMah: number;
  estimatedHours: number;
  estimatedDays: number;
  estimatedMonths: number;
  estimatedYears: number;
  steps: string[];
}

export function calculateDutyCycledBatteryLife(params: BatteryLifeParams): BatteryLifeResult {
  const {
    batteryCapacityMah,
    deratingFactorPercent,
    activeCurrentMa,
    activeDurationMs,
    sleepCurrentUa,
    sleepDurationSec,
  } = params;

  const tActiveSec = activeDurationMs / 1000;
  const tSleepSec = Math.max(0.001, sleepDurationSec);
  const tPeriodSec = tActiveSec + tSleepSec;

  const dutyFraction = tPeriodSec > 0 ? tActiveSec / tPeriodSec : 0;
  const activeDutyPercent = dutyFraction * 100;

  // I_avg = (I_active * t_active + I_sleep * t_sleep) / (t_active + t_sleep)
  const sleepCurrentMa = sleepCurrentUa / 1000;
  const totalChargePerCycleMaSec = (activeCurrentMa * tActiveSec) + (sleepCurrentMa * tSleepSec);
  const averageCurrentMa = totalChargePerCycleMaSec / tPeriodSec;
  const averageCurrentUa = averageCurrentMa * 1000;

  const usableCapacityMah = batteryCapacityMah * (deratingFactorPercent / 100);

  const estimatedHours = averageCurrentMa > 0 ? usableCapacityMah / averageCurrentMa : 0;
  const estimatedDays = estimatedHours / 24;
  const estimatedMonths = estimatedDays / 30.4375;
  const estimatedYears = estimatedDays / 365.25;

  const steps: string[] = [
    `1. Cycle Period: Active = ${activeDurationMs} ms (${tActiveSec.toFixed(3)} s) + Sleep = ${sleepDurationSec.toFixed(2)} s => Total = ${tPeriodSec.toFixed(3)} s.`,
    `2. Duty Cycle: Active ${activeDutyPercent.toFixed(4)}% | Sleep ${(100 - activeDutyPercent).toFixed(4)}%.`,
    `3. Current Consumption: Active = ${activeCurrentMa.toFixed(2)} mA | Sleep = ${sleepCurrentUa.toFixed(1)} µA (${sleepCurrentMa.toFixed(4)} mA).`,
    `4. Average Current: I_avg = (${activeCurrentMa}mA × ${tActiveSec.toFixed(3)}s + ${sleepCurrentMa.toFixed(4)}mA × ${tSleepSec.toFixed(2)}s) / ${tPeriodSec.toFixed(3)}s = ${averageCurrentMa.toFixed(4)} mA (${averageCurrentUa.toFixed(2)} µA).`,
    `5. Battery: ${batteryCapacityMah} mAh with ${deratingFactorPercent}% derating => Usable: ${usableCapacityMah.toFixed(1)} mAh.`,
    `6. Projected Endurance: ${estimatedDays.toFixed(1)} Days (~${estimatedMonths.toFixed(1)} Months / ${estimatedYears.toFixed(2)} Years).`,
  ];

  return {
    averageCurrentMa,
    averageCurrentUa,
    activeDutyPercent,
    usableCapacityMah,
    estimatedHours,
    estimatedDays,
    estimatedMonths,
    estimatedYears,
    steps,
  };
}

/**
 * Self-check assertions to verify debounce and battery calculations
 */
export function runPowerDebounceCalcSelfChecks(): boolean {
  try {
    // 1. RC: 10k, 100nF -> tau = 10000 * 100e-9 = 1ms
    const rcRes = calculateRcDebounce({ rOhms: 10000, cFarads: 100e-9, vddVolts: 3.3, vthVolts: 2.0 });
    console.assert(Math.abs(rcRes.tauMs - 1.0) < 1e-4, 'Self-check failed: 10k * 100nF tau should be 1.0 ms');

    // 2. Battery: 200mAh usable, average current 0.02 mA (20µA) -> 10,000 hours ≈ 416 days
    const battRes = calculateDutyCycledBatteryLife({
      batteryCapacityMah: 250,
      deratingFactorPercent: 80, // 200mAh
      activeCurrentMa: 20,
      activeDurationMs: 50, // 0.05s
      sleepCurrentUa: 10, // 0.01mA
      sleepDurationSec: 50, // 50s
    });
    console.assert(battRes.usableCapacityMah === 200, 'Self-check failed: Usable capacity should be 200mAh');
    console.assert(battRes.estimatedDays > 100, 'Self-check failed: Low duty cycle should give >100 days');

    return true;
  } catch (err) {
    console.error('Power/Debounce Calculator self-check error:', err);
    return false;
  }
}

runPowerDebounceCalcSelfChecks();
