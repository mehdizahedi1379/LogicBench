/**
 * Pure logic for UART Baud Rate & Error Calculator
 * Calculates divider, actual baud rate, error percentage, and framing stability.
 * Provides nearest achievable suggestions and self-check assertions.
 */

export interface UartBaudParams {
  clockHz: number;
  targetBaudRate: number;
  oversampling: 16 | 8; // 16x standard or 8x double-speed
}

export interface UartBaudResult {
  clockHz: number;
  targetBaudRate: number;
  oversampling: 16 | 8;
  integerDivider: number; // e.g. UBRR
  fractionalDivider?: number; // 4-bit fraction (0..15) for STM32
  actualBaudRate: number;
  errorPercent: number;
  isReliable: boolean;
  status: 'safe' | 'marginal' | 'unreliable';
  statusExplanation: string;
  nearestAchievableBaud: number;
  steps: string[];
}

export const COMMON_BAUD_RATES = [
  1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1000000, 2000000
];

export function calculateUartBaud(params: UartBaudParams): UartBaudResult {
  const { clockHz, targetBaudRate, oversampling } = params;

  if (clockHz <= 0 || targetBaudRate <= 0) {
    return {
      clockHz,
      targetBaudRate,
      oversampling,
      integerDivider: 0,
      actualBaudRate: 0,
      errorPercent: 100,
      isReliable: false,
      status: 'unreliable',
      statusExplanation: 'Clock and baud rate must be greater than zero.',
      nearestAchievableBaud: 0,
      steps: ['Invalid parameters.'],
    };
  }

  // Formula: Baud = F_clk / (oversampling * (Divider + 1))  [AVR style]
  // or F_clk / (oversampling * USARTDIV)  [STM32 style]
  const idealDividerFloat = (clockHz / (oversampling * targetBaudRate)) - 1;
  const roundedDivider = Math.max(0, Math.round(idealDividerFloat));

  // Compute fractional divider for STM32 (1/16th resolution)
  const idealUsartDiv = clockHz / (oversampling * targetBaudRate);
  const mantissa = Math.floor(idealUsartDiv);
  const fraction = Math.round((idealUsartDiv - mantissa) * 16);

  // Actual Baud Rate using integer divider
  const actualBaudRate = clockHz / (oversampling * (roundedDivider + 1));
  const errorPercent = ((actualBaudRate - targetBaudRate) / targetBaudRate) * 100;
  const absError = Math.abs(errorPercent);

  let status: 'safe' | 'marginal' | 'unreliable' = 'safe';
  let statusExplanation = '';

  if (absError <= 2.0) {
    status = 'safe';
    statusExplanation = `Reliable asynchronous reception. Error (${errorPercent >= 0 ? '+' : ''}${errorPercent.toFixed(2)}%) is well within the standard 2.5% tolerance for 8N1 frames.`;
  } else if (absError <= 3.0) {
    status = 'marginal';
    statusExplanation = `Marginal tolerance (${errorPercent >= 0 ? '+' : ''}${errorPercent.toFixed(2)}%). Frame errors may occur over long multi-byte bursts or across temperature drifts.`;
  } else {
    status = 'unreliable';
    statusExplanation = `High risk of framing errors! Error (${errorPercent >= 0 ? '+' : ''}${errorPercent.toFixed(2)}%) exceeds standard UART 8N1 tolerance (3.0%). Consider a different clock crystal (e.g. 11.0592 MHz, 14.7456 MHz) or switching to 8x oversampling.`;
  }

  const steps: string[] = [
    `1. Target Baud Rate: ${targetBaudRate.toLocaleString()} bps, Clock: ${clockHz.toLocaleString()} Hz.`,
    `2. Oversampling Mode: ${oversampling}× sampling per bit period.`,
    `3. Ideal Divisor Calculation: F_clk / (${oversampling} × Baud) - 1 = ${idealDividerFloat.toFixed(4)}.`,
    `4. Rounded Register Divisor (UBRR): ${roundedDivider} (0x${roundedDivider.toString(16).toUpperCase()}).`,
    `5. STM32 Fractional BRR: Mantissa = ${mantissa}, Fraction = ${fraction}/16 (BRR = 0x${((mantissa << 4) | (fraction & 0xf)).toString(16).toUpperCase()}).`,
    `6. Actual Achieved Baud Rate: ${actualBaudRate.toFixed(2)} bps.`,
    `7. Frequency Error: ${errorPercent >= 0 ? '+' : ''}${errorPercent.toFixed(3)}%.`,
    `8. Framing Stability Evaluation: ${status.toUpperCase()} (${statusExplanation}).`,
  ];

  return {
    clockHz,
    targetBaudRate,
    oversampling,
    integerDivider: roundedDivider,
    fractionalDivider: fraction,
    actualBaudRate,
    errorPercent,
    isReliable: absError <= 2.5,
    status,
    statusExplanation,
    nearestAchievableBaud: actualBaudRate,
    steps,
  };
}

export function generateBaudComparisonTable(clockHz: number, oversampling: 16 | 8 = 16) {
  return COMMON_BAUD_RATES.map((target) => {
    const res = calculateUartBaud({ clockHz, targetBaudRate: target, oversampling });
    return {
      targetBaud: target,
      divider: res.integerDivider,
      actualBaud: Math.round(res.actualBaudRate),
      errorPercent: res.errorPercent,
      status: res.status,
    };
  });
}

/**
 * Self-check assertions to verify UART calculations
 */
export function runUartBaudSelfChecks(): boolean {
  try {
    // 1. ATmega328P 16MHz clock at 9600 baud with 16x oversampling:
    // UBRR = (16000000 / (16 * 9600)) - 1 = 103.166 -> 103
    // Actual = 16000000 / (16 * 104) = 9615.38 -> +0.16% error
    const res9600 = calculateUartBaud({ clockHz: 16000000, targetBaudRate: 9600, oversampling: 16 });
    console.assert(res9600.integerDivider === 103, `Self-check failed: 16MHz 9600 baud UBRR should be 103, got ${res9600.integerDivider}`);
    console.assert(Math.abs(res9600.errorPercent - 0.16) < 0.05, `Self-check failed: 16MHz 9600 baud error should be ~0.16%`);
    console.assert(res9600.status === 'safe', 'Self-check failed: 9600 baud should be safe');

    // 2. ATmega328P 16MHz clock at 115200 baud with 16x oversampling:
    // UBRR = (16000000 / (16 * 115200)) - 1 = 7.68 -> 8
    // Actual = 16000000 / (16 * 9) = 111111 -> -3.55% error (unreliable!)
    const res115200 = calculateUartBaud({ clockHz: 16000000, targetBaudRate: 115200, oversampling: 16 });
    console.assert(res115200.integerDivider === 8, `Self-check failed: 16MHz 115200 UBRR should be 8, got ${res115200.integerDivider}`);
    console.assert(res115200.status === 'unreliable', 'Self-check failed: 16MHz 115200 should be flagged unreliable (-3.55%)');

    return true;
  } catch (err) {
    console.error('UART Baud Calculator self-check error:', err);
    return false;
  }
}

runUartBaudSelfChecks();
