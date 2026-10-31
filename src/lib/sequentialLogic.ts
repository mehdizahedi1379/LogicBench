/**
 * Pure logic for Sequential Logic & Flip-Flop Laboratory
 * Supports SR Latch/Flip-Flop, D Flip-Flop, JK Flip-Flop, T Flip-Flop,
 * edge-triggering, async reset/preset, excitation tables, and self-checks.
 */

export type FlipFlopType = 'D' | 'JK' | 'T' | 'SR';

export interface FlipFlopInputs {
  clock: 0 | 1;
  d?: 0 | 1;
  j?: 0 | 1;
  k?: 0 | 1;
  t?: 0 | 1;
  s?: 0 | 1;
  r?: 0 | 1;
  enable?: 0 | 1;
  asyncReset?: 0 | 1; // Active-high clear
  asyncPreset?: 0 | 1; // Active-high set
}

export interface FlipFlopState {
  q: 0 | 1;
  qBar: 0 | 1;
  invalidState?: boolean; // e.g. S=1, R=1 in NOR latch
  metastable?: boolean;
}

export interface TransitionStep {
  cycle: number;
  time: number;
  inputs: FlipFlopInputs;
  previousState: FlipFlopState;
  nextState: FlipFlopState;
  explanation: string;
}

/**
 * Evaluates the next state of a flip-flop given inputs and previous state
 * Triggered on rising edge of clock (or async control).
 */
export function evaluateFlipFlop(
  type: FlipFlopType,
  inputs: FlipFlopInputs,
  currentState: FlipFlopState,
  isRisingEdge: boolean
): { nextState: FlipFlopState; explanation: string } {
  // Check Asynchronous inputs first (override clock)
  if (inputs.asyncReset === 1 && inputs.asyncPreset === 1) {
    return {
      nextState: { q: 1, qBar: 1, invalidState: true },
      explanation: 'Hazard: Both Async Preset and Async Clear are asserted simultaneously (Invalid condition).',
    };
  }
  if (inputs.asyncReset === 1) {
    return {
      nextState: { q: 0, qBar: 1 },
      explanation: 'Asynchronous Clear asserted: Q forced to 0 regardless of clock.',
    };
  }
  if (inputs.asyncPreset === 1) {
    return {
      nextState: { q: 1, qBar: 0 },
      explanation: 'Asynchronous Preset asserted: Q forced to 1 regardless of clock.',
    };
  }

  // If enable is 0, flip-flop preserves state on clock edge
  const enable = inputs.enable !== undefined ? inputs.enable : 1;
  if (enable === 0) {
    return {
      nextState: { ...currentState },
      explanation: 'Clock Enable (EN) is Low: Internal state frozen, ignoring clock transition.',
    };
  }

  // If not a rising clock edge, sequential flip-flops maintain state
  if (!isRisingEdge) {
    return {
      nextState: { ...currentState },
      explanation: 'No active clock rising edge: Q retains current state.',
    };
  }

  // Evaluate based on Flip-Flop architecture on Rising Edge
  switch (type) {
    case 'D': {
      const d = inputs.d ?? 0;
      return {
        nextState: { q: d, qBar: (1 - d) as 0 | 1 },
        explanation: `D Flip-Flop rising edge: Latched input D = ${d} into output Q.`,
      };
    }

    case 'JK': {
      const j = inputs.j ?? 0;
      const k = inputs.k ?? 0;
      if (j === 0 && k === 0) {
        return {
          nextState: { ...currentState },
          explanation: 'JK No Change (J=0, K=0): Q remains unchanged.',
        };
      }
      if (j === 0 && k === 1) {
        return {
          nextState: { q: 0, qBar: 1 },
          explanation: 'JK Reset (J=0, K=1): Output Q reset to 0.',
        };
      }
      if (j === 1 && k === 0) {
        return {
          nextState: { q: 1, qBar: 0 },
          explanation: 'JK Set (J=1, K=0): Output Q set to 1.',
        };
      }
      // j === 1 && k === 1 -> Toggle
      const toggledQ = (1 - currentState.q) as 0 | 1;
      return {
        nextState: { q: toggledQ, qBar: (1 - toggledQ) as 0 | 1 },
        explanation: `JK Toggle (J=1, K=1): Output Q inverted from ${currentState.q} to ${toggledQ}.`,
      };
    }

    case 'T': {
      const t = inputs.t ?? 0;
      if (t === 0) {
        return {
          nextState: { ...currentState },
          explanation: 'T Flip-Flop (T=0): Hold current state.',
        };
      }
      const toggledQ = (1 - currentState.q) as 0 | 1;
      return {
        nextState: { q: toggledQ, qBar: (1 - toggledQ) as 0 | 1 },
        explanation: `T Flip-Flop (T=1): Output Q toggled from ${currentState.q} to ${toggledQ}.`,
      };
    }

    case 'SR': {
      const s = inputs.s ?? 0;
      const r = inputs.r ?? 0;
      if (s === 0 && r === 0) {
        return {
          nextState: { ...currentState },
          explanation: 'SR Hold (S=0, R=0): No change in state.',
        };
      }
      if (s === 0 && r === 1) {
        return {
          nextState: { q: 0, qBar: 1 },
          explanation: 'SR Reset (S=0, R=1): Q reset to 0.',
        };
      }
      if (s === 1 && r === 0) {
        return {
          nextState: { q: 1, qBar: 0 },
          explanation: 'SR Set (S=1, R=0): Q set to 1.',
        };
      }
      // S=1, R=1 is invalid for basic SR
      return {
        nextState: { q: 0, qBar: 0, invalidState: true },
        explanation: 'SR Invalid State (S=1, R=1): Metastable/Forbidden condition! Both outputs forced low in NOR latch.',
      };
    }
  }
}

export interface TruthTableRow {
  inputs: Record<string, string | number>;
  qNext: string;
  qBarNext: string;
  operation: string;
}

export function getFlipFlopTruthTable(type: FlipFlopType): TruthTableRow[] {
  switch (type) {
    case 'D':
      return [
        { inputs: { CLK: '↑', D: 0 }, qNext: '0', qBarNext: '1', operation: 'Reset (Q = 0)' },
        { inputs: { CLK: '↑', D: 1 }, qNext: '1', qBarNext: '0', operation: 'Set (Q = 1)' },
        { inputs: { CLK: '0 or 1', D: 'X' }, qNext: 'Q', qBarNext: 'Q̄', operation: 'No Change (Hold)' },
      ];
    case 'JK':
      return [
        { inputs: { CLK: '↑', J: 0, K: 0 }, qNext: 'Q', qBarNext: 'Q̄', operation: 'No Change (Hold)' },
        { inputs: { CLK: '↑', J: 0, K: 1 }, qNext: '0', qBarNext: '1', operation: 'Reset (Q = 0)' },
        { inputs: { CLK: '↑', J: 1, K: 0 }, qNext: '1', qBarNext: '0', operation: 'Set (Q = 1)' },
        { inputs: { CLK: '↑', J: 1, K: 1 }, qNext: 'Q̄', qBarNext: 'Q', operation: 'Toggle (Q = Q̄)' },
      ];
    case 'T':
      return [
        { inputs: { CLK: '↑', T: 0 }, qNext: 'Q', qBarNext: 'Q̄', operation: 'No Change (Hold)' },
        { inputs: { CLK: '↑', T: 1 }, qNext: 'Q̄', qBarNext: 'Q', operation: 'Toggle (Q = Q̄)' },
      ];
    case 'SR':
      return [
        { inputs: { CLK: '↑', S: 0, R: 0 }, qNext: 'Q', qBarNext: 'Q̄', operation: 'Hold (No Change)' },
        { inputs: { CLK: '↑', S: 0, R: 1 }, qNext: '0', qBarNext: '1', operation: 'Reset (Q = 0)' },
        { inputs: { CLK: '↑', S: 1, R: 0 }, qNext: '1', qBarNext: '0', operation: 'Set (Q = 1)' },
        { inputs: { CLK: '↑', S: 1, R: 1 }, qNext: '?', qBarNext: '?', operation: 'Forbidden / Invalid' },
      ];
  }
}

/**
 * Characteristic and excitation equation strings
 */
export function getFlipFlopEquations(type: FlipFlopType): {
  characteristicEquation: string;
  excitationTable: { qCurrent: number; qTarget: number; requiredInputs: string }[];
} {
  switch (type) {
    case 'D':
      return {
        characteristicEquation: 'Q(t+1) = D',
        excitationTable: [
          { qCurrent: 0, qTarget: 0, requiredInputs: 'D = 0' },
          { qCurrent: 0, qTarget: 1, requiredInputs: 'D = 1' },
          { qCurrent: 1, qTarget: 0, requiredInputs: 'D = 0' },
          { qCurrent: 1, qTarget: 1, requiredInputs: 'D = 1' },
        ],
      };
    case 'JK':
      return {
        characteristicEquation: 'Q(t+1) = J · Q̄ + K̄ · Q',
        excitationTable: [
          { qCurrent: 0, qTarget: 0, requiredInputs: 'J = 0, K = X' },
          { qCurrent: 0, qTarget: 1, requiredInputs: 'J = 1, K = X' },
          { qCurrent: 1, qTarget: 0, requiredInputs: 'J = X, K = 1' },
          { qCurrent: 1, qTarget: 1, requiredInputs: 'J = X, K = 0' },
        ],
      };
    case 'T':
      return {
        characteristicEquation: 'Q(t+1) = T ⊕ Q = T · Q̄ + T̄ · Q',
        excitationTable: [
          { qCurrent: 0, qTarget: 0, requiredInputs: 'T = 0' },
          { qCurrent: 0, qTarget: 1, requiredInputs: 'T = 1' },
          { qCurrent: 1, qTarget: 0, requiredInputs: 'T = 1' },
          { qCurrent: 1, qTarget: 1, requiredInputs: 'T = 0' },
        ],
      };
    case 'SR':
      return {
        characteristicEquation: 'Q(t+1) = S + R̄ · Q  (where S · R = 0)',
        excitationTable: [
          { qCurrent: 0, qTarget: 0, requiredInputs: 'S = 0, R = X' },
          { qCurrent: 0, qTarget: 1, requiredInputs: 'S = 1, R = 0' },
          { qCurrent: 1, qTarget: 0, requiredInputs: 'S = 0, R = 1' },
          { qCurrent: 1, qTarget: 1, requiredInputs: 'S = X, R = 0' },
        ],
      };
  }
}

/**
 * Automated self-checks for sequential logic
 */
export function runSequentialLogicSelfChecks(): boolean {
  try {
    // 1. D flip-flop rising edge
    const dRes = evaluateFlipFlop('D', { clock: 1, d: 1 }, { q: 0, qBar: 1 }, true);
    console.assert(dRes.nextState.q === 1, 'Self-check failed: D FF should latch 1');

    // 2. JK toggle
    const jkRes = evaluateFlipFlop('JK', { clock: 1, j: 1, k: 1 }, { q: 1, qBar: 0 }, true);
    console.assert(jkRes.nextState.q === 0, 'Self-check failed: JK should toggle from 1 to 0');

    // 3. T toggle
    const tRes = evaluateFlipFlop('T', { clock: 1, t: 1 }, { q: 0, qBar: 1 }, true);
    console.assert(tRes.nextState.q === 1, 'Self-check failed: T should toggle from 0 to 1');

    // 4. Async clear
    const clrRes = evaluateFlipFlop('D', { clock: 1, d: 1, asyncReset: 1 }, { q: 1, qBar: 0 }, true);
    console.assert(clrRes.nextState.q === 0, 'Self-check failed: Async reset should force Q to 0');

    return true;
  } catch (err) {
    console.error('Sequential logic self-check error:', err);
    return false;
  }
}

runSequentialLogicSelfChecks();
