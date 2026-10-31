/**
 * Pure logic for Combinational Logic Laboratory
 * Implements Half Adder, Full Adder, 4-Bit Ripple Carry Adder,
 * Multiplexers (2:1, 4:1, 8:1), Decoders (2:4, 3:8),
 * intermediate signal tracing, and self-checks.
 */

// ----------------------------------------------------
// ADDERS
// ----------------------------------------------------

export interface HalfAdderResult {
  sum: 0 | 1;
  carry: 0 | 1;
  equations: { sum: string; carry: string };
  steps: string[];
}

export function evaluateHalfAdder(a: 0 | 1, b: 0 | 1): HalfAdderResult {
  const sum = (a ^ b) as 0 | 1;
  const carry = (a & b) as 0 | 1;

  return {
    sum,
    carry,
    equations: {
      sum: 'S = A ⊕ B',
      carry: 'C = A · B',
    },
    steps: [
      `1. Inputs: A = ${a}, B = ${b}.`,
      `2. Sum: S = ${a} ⊕ ${b} = ${sum}.`,
      `3. Carry: C = ${a} · ${b} = ${carry}.`,
    ],
  };
}

export interface FullAdderResult {
  sum: 0 | 1;
  carryOut: 0 | 1;
  intermediate: {
    aXorB: 0 | 1;
    aAndB: 0 | 1;
    cinAndAxorB: 0 | 1;
  };
  equations: { sum: string; carry: string };
  steps: string[];
}

export function evaluateFullAdder(a: 0 | 1, b: 0 | 1, cin: 0 | 1): FullAdderResult {
  const aXorB = (a ^ b) as 0 | 1;
  const aAndB = (a & b) as 0 | 1;
  const sum = (aXorB ^ cin) as 0 | 1;
  const cinAndAxorB = (cin & aXorB) as 0 | 1;
  const carryOut = (aAndB | cinAndAxorB) as 0 | 1;

  return {
    sum,
    carryOut,
    intermediate: {
      aXorB,
      aAndB,
      cinAndAxorB,
    },
    equations: {
      sum: 'S = A ⊕ B ⊕ Cin',
      carry: 'Cout = (A · B) + (Cin · (A ⊕ B))',
    },
    steps: [
      `1. Inputs: A = ${a}, B = ${b}, Cin = ${cin}.`,
      `2. Stage 1 (Half Adder 1): Propagate P = A ⊕ B = ${a} ⊕ ${b} = ${aXorB}. Generate G = A · B = ${aAndB}.`,
      `3. Stage 2 (Half Adder 2): Sum S = P ⊕ Cin = ${aXorB} ⊕ ${cin} = ${sum}.`,
      `4. Stage 3 (Carry Logic): Cout = G + (Cin · P) = ${aAndB} + (${cin} · ${aXorB}) = ${carryOut}.`,
    ],
  };
}

export interface RippleCarryAdder4Result {
  aBits: [0 | 1, 0 | 1, 0 | 1, 0 | 1]; // [A0, A1, A2, A3] (LSB to MSB)
  bBits: [0 | 1, 0 | 1, 0 | 1, 0 | 1];
  cin: 0 | 1;
  sumBits: [0 | 1, 0 | 1, 0 | 1, 0 | 1];
  carries: [0 | 1, 0 | 1, 0 | 1, 0 | 1]; // [C1, C2, C3, C4=Cout]
  cout: 0 | 1;
  overflow: 0 | 1; // V = C3 ⊕ C4 (two's complement signed overflow)
  aDec: number;
  bDec: number;
  sumDec: number;
  isSignedOverflow: boolean;
  steps: string[];
}

export function evaluateRippleCarryAdder4(
  a: [0 | 1, 0 | 1, 0 | 1, 0 | 1],
  b: [0 | 1, 0 | 1, 0 | 1, 0 | 1],
  cin: 0 | 1
): RippleCarryAdder4Result {
  const sumBits: [0 | 1, 0 | 1, 0 | 1, 0 | 1] = [0, 0, 0, 0];
  const carries: [0 | 1, 0 | 1, 0 | 1, 0 | 1] = [0, 0, 0, 0];
  const steps: string[] = [];

  let currentCarry = cin;

  for (let i = 0; i < 4; i++) {
    const bitRes = evaluateFullAdder(a[i], b[i], currentCarry);
    sumBits[i] = bitRes.sum;
    carries[i] = bitRes.carryOut;
    steps.push(`Bit ${i}: A[${i}]=${a[i]}, B[${i}]=${b[i]}, C_in=${currentCarry} => Sum[${i}]=${bitRes.sum}, C_out=${bitRes.carryOut}`);
    currentCarry = bitRes.carryOut;
  }

  // Two's complement overflow is C3 ⊕ C4 (carries[2] ⊕ carries[3])
  const overflow = (carries[2] ^ carries[3]) as 0 | 1;
  const isSignedOverflow = overflow === 1;

  const aDec = a[0] + a[1] * 2 + a[2] * 4 + a[3] * 8;
  const bDec = b[0] + b[1] * 2 + b[2] * 4 + b[3] * 8;
  const sumDec = sumBits[0] + sumBits[1] * 2 + sumBits[2] * 4 + sumBits[3] * 8;

  return {
    aBits: a,
    bBits: b,
    cin,
    sumBits,
    carries,
    cout: carries[3],
    overflow,
    aDec,
    bDec,
    sumDec,
    isSignedOverflow,
    steps,
  };
}

// ----------------------------------------------------
// MULTIPLEXERS (MUX)
// ----------------------------------------------------

export interface MuxResult {
  type: '2:1' | '4:1' | '8:1';
  dataInputs: (0 | 1)[];
  selectInputs: (0 | 1)[];
  selectedChannel: number;
  outputY: 0 | 1;
  equation: string;
  steps: string[];
}

export function evaluateMux2To1(d0: 0 | 1, d1: 0 | 1, s: 0 | 1): MuxResult {
  const selectedChannel = s;
  const outputY = (s === 0 ? d0 : d1) as 0 | 1;
  return {
    type: '2:1',
    dataInputs: [d0, d1],
    selectInputs: [s],
    selectedChannel,
    outputY,
    equation: 'Y = (S̄ · D0) + (S · D1)',
    steps: [
      `1. Select line S = ${s}.`,
      `2. Active path: D${selectedChannel} = ${outputY}.`,
      `3. Output: Y = ${outputY}.`,
    ],
  };
}

export function evaluateMux4To1(
  data: [0 | 1, 0 | 1, 0 | 1, 0 | 1],
  select: [0 | 1, 0 | 1] // [S0, S1] where S1 is MSB
): MuxResult {
  const [s0, s1] = select;
  const selectedChannel = s0 + s1 * 2;
  const outputY = data[selectedChannel];

  return {
    type: '4:1',
    dataInputs: data,
    selectInputs: select,
    selectedChannel,
    outputY,
    equation: 'Y = (S̄1·S̄0·D0) + (S̄1·S0·D1) + (S1·S̄0·D2) + (S1·S0·D3)',
    steps: [
      `1. Select lines S1 = ${s1}, S0 = ${s0} => Binary 0b${s1}${s0} (Channel ${selectedChannel}).`,
      `2. Data inputs: D0=${data[0]}, D1=${data[1]}, D2=${data[2]}, D3=${data[3]}.`,
      `3. Selected input D${selectedChannel} = ${outputY} routed to Y.`,
    ],
  };
}

export function evaluateMux8To1(
  data: (0 | 1)[],
  select: [0 | 1, 0 | 1, 0 | 1] // [S0, S1, S2] where S2 is MSB
): MuxResult {
  const [s0, s1, s2] = select;
  const selectedChannel = s0 + s1 * 2 + s2 * 4;
  const outputY = (data[selectedChannel] ?? 0) as 0 | 1;

  return {
    type: '8:1',
    dataInputs: data,
    selectInputs: select,
    selectedChannel,
    outputY,
    equation: 'Y = Σ (m_i · D_i) for i = 0..7',
    steps: [
      `1. Select lines S2=${s2}, S1=${s1}, S0=${s0} => Channel 0b${s2}${s1}${s0} = ${selectedChannel}.`,
      `2. Routed input D${selectedChannel} (${outputY}) directly to output Y.`,
    ],
  };
}

// ----------------------------------------------------
// DECODERS
// ----------------------------------------------------

export interface DecoderResult {
  type: '2:4' | '3:8';
  inputs: (0 | 1)[];
  enable: 0 | 1;
  activeLow: boolean;
  outputs: (0 | 1)[];
  activeLineIndex: number | null;
  steps: string[];
}

export function evaluateDecoder2To4(
  a0: 0 | 1,
  a1: 0 | 1,
  enable: 0 | 1 = 1,
  activeLow: boolean = false
): DecoderResult {
  const outputs: (0 | 1)[] = [0, 0, 0, 0];
  let activeLineIndex: number | null = null;

  if (enable === 1) {
    const idx = a0 + a1 * 2;
    activeLineIndex = idx;
    outputs[idx] = 1;
  }

  // If active-low outputs (common in 74HC139), invert all outputs
  const finalOutputs: (0 | 1)[] = activeLow
    ? (outputs.map((v) => (1 - v) as 0 | 1))
    : outputs;

  return {
    type: '2:4',
    inputs: [a0, a1],
    enable,
    activeLow,
    outputs: finalOutputs,
    activeLineIndex,
    steps: [
      `1. Enable EN = ${enable}.`,
      enable === 0
        ? '2. Decoder Disabled: All output lines inactive.'
        : `2. Address A1=${a1}, A0=${a0} => Decodes to line Y${activeLineIndex} active.`,
      `3. Outputs [Y0..Y3] = [${finalOutputs.join(', ')}].`,
    ],
  };
}

export function evaluateDecoder3To8(
  a0: 0 | 1,
  a1: 0 | 1,
  a2: 0 | 1,
  enable: 0 | 1 = 1,
  activeLow: boolean = false
): DecoderResult {
  const outputs: (0 | 1)[] = [0, 0, 0, 0, 0, 0, 0, 0];
  let activeLineIndex: number | null = null;

  if (enable === 1) {
    const idx = a0 + a1 * 2 + a2 * 4;
    activeLineIndex = idx;
    outputs[idx] = 1;
  }

  const finalOutputs: (0 | 1)[] = activeLow
    ? (outputs.map((v) => (1 - v) as 0 | 1))
    : outputs;

  return {
    type: '3:8',
    inputs: [a0, a1, a2],
    enable,
    activeLow,
    outputs: finalOutputs,
    activeLineIndex,
    steps: [
      `1. Enable EN = ${enable}.`,
      enable === 0
        ? '2. Decoder Disabled: All output lines inactive.'
        : `2. Address A2=${a2}, A1=${a1}, A0=${a0} (Index ${activeLineIndex}) => Y${activeLineIndex} asserted.`,
      `3. Output bus: [${finalOutputs.join(', ')}].`,
    ],
  };
}

/**
 * Self-check assertions for combinational logic
 */
export function runCombinationalLogicSelfChecks(): boolean {
  try {
    // 1. Full adder: 1 + 1 + 1 = Sum 1, Cout 1
    const faRes = evaluateFullAdder(1, 1, 1);
    console.assert(faRes.sum === 1 && faRes.carryOut === 1, 'Self-check failed: 1+1+1 should yield S=1, Cout=1');

    // 2. 4-bit adder: 7 (0111) + 1 (0001) = 8 (1000)
    const rcaRes = evaluateRippleCarryAdder4([1, 1, 1, 0], [1, 0, 0, 0], 0);
    console.assert(rcaRes.sumBits[0] === 0 && rcaRes.sumBits[3] === 1, 'Self-check failed: 7+1 should equal 8');

    // 3. Mux 4:1: channel 2 (S1=1, S0=0)
    const muxRes = evaluateMux4To1([0, 0, 1, 0], [0, 1]);
    console.assert(muxRes.outputY === 1, 'Self-check failed: MUX channel 2 should be selected');

    // 4. Decoder 3:8: index 5 (A0=1, A1=0, A2=1)
    const decRes = evaluateDecoder3To8(1, 0, 1, 1, false);
    console.assert(decRes.outputs[5] === 1 && decRes.outputs[4] === 0, 'Self-check failed: Decoder 3:8 line 5 should be 1');

    return true;
  } catch (err) {
    console.error('Combinational logic self-check error:', err);
    return false;
  }
}

runCombinationalLogicSelfChecks();
