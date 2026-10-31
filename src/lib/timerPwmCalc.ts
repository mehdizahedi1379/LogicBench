/**
 * Pure logic for Microcontroller Timer / PWM Calculator
 * Calculates prescaler, auto-reload/TOP register, duty cycle compare match,
 * actual achieved frequency and error percentage.
 * Handles impossible targets gracefully with explanations and nearest achievable suggestions.
 */

import { McuPreset, McuTimerConfig } from '../data/mcu-presets';

export interface TimerPwmParams {
  clockHz: number;
  targetFrequencyHz: number;
  dutyCyclePercent: number; // 0 to 100
  timerConfig: McuTimerConfig;
  isCenterAligned?: boolean; // Center-aligned / Dual-slope vs Edge-aligned
}

export interface TimerPwmResult {
  prescaler: number;
  topValue: number; // ARR, ICR1, PR2, TOP
  compareValue: number; // CCRx, OCR1A
  actualFrequencyHz: number;
  actualPeriodSec: number;
  errorPercent: number;
  effectiveDutyPercent: number;
  isAchievable: boolean;
  impossibleReason?: string;
  nearestAchievableFrequencyHz?: number;
  assumptions: {
    clockHz: number;
    timerResolutionBits: number;
    maxTop: number;
    allowedPrescalers: string;
    alignment: string;
    datasheetNotice: string;
  };
  steps: string[];
}

export function calculateTimerPwm(params: TimerPwmParams, datasheetNotice?: string): TimerPwmResult {
  const { clockHz, targetFrequencyHz, dutyCyclePercent, timerConfig, isCenterAligned = false } = params;
  const maxTop = Math.pow(2, timerConfig.bitResolution) - 1;
  const divisor = isCenterAligned ? 2 : 1; // Dual slope divides by 2

  // Determine allowed prescalers list
  let prescalers: number[] = [];
  if (timerConfig.isContinuousPrescaler) {
    const minP = timerConfig.minPrescaler || 1;
    const maxP = timerConfig.maxPrescaler || 65536;
    // Generate candidate prescalers: power of 2 steps + direct candidates
    const candidates = new Set<number>();
    for (let p = 1; p <= 16; p++) candidates.add(p);
    for (let p = 1; p <= maxP; p *= 2) candidates.add(p);
    candidates.add(64);
    candidates.add(256);
    candidates.add(1024);
    prescalers = Array.from(candidates).filter((p) => p >= minP && p <= maxP).sort((a, b) => a - b);
  } else {
    prescalers = [...timerConfig.allowedPrescalers];
  }

  // Quick sanity checks
  const maxPossibleFreq = clockHz / (divisor * 2);
  const minPrescaler = timerConfig.isContinuousPrescaler ? (timerConfig.minPrescaler || 1) : Math.min(...timerConfig.allowedPrescalers);
  const maxPrescaler = timerConfig.isContinuousPrescaler ? (timerConfig.maxPrescaler || 65536) : Math.max(...timerConfig.allowedPrescalers);
  const minPossibleFreq = clockHz / (divisor * maxPrescaler * (maxTop + 1));

  let isAchievable = true;
  let impossibleReason: string | undefined;
  let nearestAchievableFrequencyHz: number | undefined;

  if (targetFrequencyHz <= 0) {
    return {
      prescaler: 1,
      topValue: 0,
      compareValue: 0,
      actualFrequencyHz: 0,
      actualPeriodSec: 0,
      errorPercent: 100,
      effectiveDutyPercent: 0,
      isAchievable: false,
      impossibleReason: 'Target frequency must be strictly positive.',
      assumptions: {
        clockHz,
        timerResolutionBits: timerConfig.bitResolution,
        maxTop,
        allowedPrescalers: prescalers.slice(0, 8).join(', ') + (prescalers.length > 8 ? '...' : ''),
        alignment: isCenterAligned ? 'Center-Aligned (Dual-Slope)' : 'Edge-Aligned (Fast PWM)',
        datasheetNotice: datasheetNotice || 'Verify against manufacturer datasheet.',
      },
      steps: ['Invalid target frequency provided.'],
    };
  }

  if (targetFrequencyHz > maxPossibleFreq) {
    isAchievable = false;
    impossibleReason = `Target frequency (${targetFrequencyHz.toLocaleString()} Hz) exceeds theoretical Nyquist limit for clock ${clockHz.toLocaleString()} Hz (Max: ${maxPossibleFreq.toLocaleString()} Hz).`;
    nearestAchievableFrequencyHz = maxPossibleFreq;
  } else if (targetFrequencyHz < minPossibleFreq) {
    isAchievable = false;
    impossibleReason = `Target frequency (${targetFrequencyHz.toFixed(3)} Hz) is too slow for ${timerConfig.bitResolution}-bit timer with maximum prescaler ${maxPrescaler}. Minimum achievable is ${minPossibleFreq.toFixed(3)} Hz.`;
    nearestAchievableFrequencyHz = minPossibleFreq;
  }

  // Search for optimal prescaler and TOP (Auto-Reload) value
  let bestPrescaler = prescalers[0];
  let bestTop = 1;
  let bestActualFreq = 0;
  let minError = Infinity;

  if (timerConfig.isContinuousPrescaler) {
    // For 16-bit or 32-bit timers with continuous 1..65536 prescaler (e.g. STM32)
    // Formula: f_pwm = f_clk / (divisor * (PSC + 1) * (ARR + 1))
    // We want (PSC + 1) * (ARR + 1) = f_clk / (divisor * f_target)
    const idealTotalDivisor = clockHz / (divisor * targetFrequencyHz);

    // Try to keep ARR high for maximum PWM duty resolution
    let candidateARR = Math.min(maxTop, Math.round(idealTotalDivisor) - 1);
    if (candidateARR < 1) candidateARR = 1;

    let candidatePSC = Math.round(idealTotalDivisor / (candidateARR + 1)) - 1;
    if (candidatePSC < 0) candidatePSC = 0;
    if (candidatePSC > (timerConfig.maxPrescaler || 65536) - 1) {
      candidatePSC = (timerConfig.maxPrescaler || 65536) - 1;
      candidateARR = Math.round(idealTotalDivisor / (candidatePSC + 1)) - 1;
    }

    bestPrescaler = candidatePSC + 1;
    bestTop = Math.max(1, Math.min(maxTop, candidateARR));
    bestActualFreq = clockHz / (divisor * bestPrescaler * (bestTop + 1));
    minError = Math.abs((bestActualFreq - targetFrequencyHz) / targetFrequencyHz) * 100;
  } else {
    // Discrete prescalers (e.g. AVR 1, 8, 64, 256, 1024)
    for (const p of prescalers) {
      // f_pwm = f_clk / (divisor * p * (TOP + 1))
      // TOP + 1 = f_clk / (divisor * p * f_target)
      const idealTopFloat = (clockHz / (divisor * p * targetFrequencyHz)) - 1;
      const roundedTop = Math.round(idealTopFloat);

      if (roundedTop >= 1 && roundedTop <= maxTop) {
        const actualF = clockHz / (divisor * p * (roundedTop + 1));
        const err = Math.abs((actualF - targetFrequencyHz) / targetFrequencyHz) * 100;

        if (err < minError || (err === minError && roundedTop > bestTop)) {
          minError = err;
          bestPrescaler = p;
          bestTop = roundedTop;
          bestActualFreq = actualF;
        }
      }
    }

    if (minError === Infinity) {
      // Fallback to nearest bounds
      bestPrescaler = targetFrequencyHz > maxPossibleFreq ? minPrescaler : maxPrescaler;
      bestTop = targetFrequencyHz > maxPossibleFreq ? 1 : maxTop;
      bestActualFreq = clockHz / (divisor * bestPrescaler * (bestTop + 1));
      minError = Math.abs((bestActualFreq - targetFrequencyHz) / targetFrequencyHz) * 100;
    }
  }

  // Calculate duty cycle compare match
  const clampedDuty = Math.max(0, Math.min(100, dutyCyclePercent));
  const compareValue = Math.round((clampedDuty / 100) * bestTop);
  const effectiveDutyPercent = bestTop > 0 ? (compareValue / bestTop) * 100 : 0;
  const actualPeriodSec = bestActualFreq > 0 ? 1 / bestActualFreq : 0;

  const steps: string[] = [
    `1. Target frequency: ${targetFrequencyHz.toLocaleString()} Hz, Target period: ${(1 / targetFrequencyHz * 1000).toFixed(4)} ms.`,
    `2. MCU Timer input clock: ${clockHz.toLocaleString()} Hz (${(clockHz / 1e6).toFixed(2)} MHz).`,
    `3. Selected ${isCenterAligned ? 'Dual-Slope / Center-Aligned' : 'Fast PWM / Edge-Aligned'} mode (Divider factor = ${divisor}).`,
    `4. Optimal Prescaler (PSC): ${bestPrescaler} (Register = ${bestPrescaler - 1} or discrete index).`,
    `5. Computed Auto-Reload / TOP (${timerConfig.topRegisterName}): ${bestTop} (0x${bestTop.toString(16).toUpperCase()}).`,
    `6. Actual achieved frequency: ${bestActualFreq.toFixed(3)} Hz (Period: ${(actualPeriodSec * 1000).toFixed(4)} ms).`,
    `7. Frequency error: ${minError.toFixed(4)}%.`,
    `8. Duty cycle ${clampedDuty}% -> Compare Match (${timerConfig.compareRegisterName}): ${compareValue} / ${bestTop} (${effectiveDutyPercent.toFixed(2)}% effective).`,
  ];

  if (!isAchievable && impossibleReason) {
    steps.push(`⚠️ WARNING: Target not perfectly achievable. ${impossibleReason}`);
    if (nearestAchievableFrequencyHz) {
      steps.push(`Suggested nearest frequency: ${nearestAchievableFrequencyHz.toFixed(3)} Hz.`);
    }
  }

  return {
    prescaler: bestPrescaler,
    topValue: bestTop,
    compareValue,
    actualFrequencyHz: bestActualFreq,
    actualPeriodSec,
    errorPercent: minError,
    effectiveDutyPercent,
    isAchievable,
    impossibleReason,
    nearestAchievableFrequencyHz,
    assumptions: {
      clockHz,
      timerResolutionBits: timerConfig.bitResolution,
      maxTop,
      allowedPrescalers: prescalers.slice(0, 8).join(', ') + (prescalers.length > 8 ? '...' : ''),
      alignment: isCenterAligned ? 'Center-Aligned' : 'Edge-Aligned',
      datasheetNotice: datasheetNotice || 'Verify against manufacturer datasheet.',
    },
    steps,
  };
}

/**
 * Self-check assertions to verify Timer/PWM calculation correctness
 */
export function runTimerPwmSelfChecks(): boolean {
  try {
    // 1. ATmega328P Timer1 16-bit: 16MHz clock, target 1000 Hz, 50% duty
    const atmegaTimer1: McuTimerConfig = {
      name: 'Timer1',
      bitResolution: 16,
      allowedPrescalers: [1, 8, 64, 256, 1024],
      topRegisterName: 'ICR1',
      compareRegisterName: 'OCR1A',
    };
    const res1kHz = calculateTimerPwm({
      clockHz: 16000000,
      targetFrequencyHz: 1000,
      dutyCyclePercent: 50,
      timerConfig: atmegaTimer1,
    });
    // With prescaler 8: 16MHz / (8 * (TOP + 1)) = 1000 -> TOP = 1999
    console.assert(res1kHz.prescaler === 8, 'Self-check failed: ATmega328P 1kHz prescaler should be 8');
    console.assert(res1kHz.topValue === 1999, `Self-check failed: ATmega328P 1kHz TOP should be 1999, got ${res1kHz.topValue}`);
    console.assert(res1kHz.errorPercent === 0, 'Self-check failed: 1kHz on 16MHz should have 0% error');

    // 2. Impossible target check: 20MHz target on 16MHz clock
    const impossible = calculateTimerPwm({
      clockHz: 16000000,
      targetFrequencyHz: 20000000,
      dutyCyclePercent: 50,
      timerConfig: atmegaTimer1,
    });
    console.assert(!impossible.isAchievable, 'Self-check failed: 20MHz on 16MHz should be flagged as unachievable');

    return true;
  } catch (err) {
    console.error('Timer/PWM Calculator self-check error:', err);
    return false;
  }
}

runTimerPwmSelfChecks();
