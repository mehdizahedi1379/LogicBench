/**
 * Pure logic for Finite State Machine (FSM) Engine
 * Graph data structure, simulation step engine,
 * state table export, C code generation, and self-checks.
 */

export interface FsmState {
  id: string;
  name: string;
  x: number;
  y: number;
  isInitial?: boolean;
  isAccepting?: boolean;
  mooreOutput?: string; // Output associated with being in this state
}

export interface FsmTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  condition: string; // e.g. "0", "1", "x=1", "btn_pressed"
  mealyOutput?: string; // Output associated with taking this transition
}

export interface FsmGraph {
  states: FsmState[];
  transitions: FsmTransition[];
}

export interface FsmSimulationResult {
  currentStateId: string;
  previousStateId?: string;
  takenTransitionId?: string;
  output?: string;
  explanation: string;
}

/**
 * Executes a single step in the FSM given the current state and an input symbol
 */
export function stepFsm(
  graph: FsmGraph,
  currentStateId: string,
  inputSymbol: string
): FsmSimulationResult {
  const currentState = graph.states.find((s) => s.id === currentStateId);
  if (!currentState) {
    return {
      currentStateId,
      explanation: `Error: Current state ID "${currentStateId}" does not exist in graph.`,
    };
  }

  // Find matching transition from current state
  const matchingTransition = graph.transitions.find((t) => {
    if (t.fromStateId !== currentStateId) return false;
    const cond = t.condition.trim().toLowerCase();
    const input = inputSymbol.trim().toLowerCase();
    // Match exact or wildcards
    return cond === input || cond === '*' || cond === 'x';
  });

  if (!matchingTransition) {
    return {
      currentStateId,
      output: currentState.mooreOutput,
      explanation: `No transition found from State "${currentState.name}" on input "${inputSymbol}". Remaining in State "${currentState.name}".`,
    };
  }

  const nextState = graph.states.find((s) => s.id === matchingTransition.toStateId);
  if (!nextState) {
    return {
      currentStateId,
      explanation: `Error: Destination state for transition does not exist.`,
    };
  }

  const activeOutput = matchingTransition.mealyOutput || nextState.mooreOutput || '';

  return {
    currentStateId: nextState.id,
    previousStateId: currentState.id,
    takenTransitionId: matchingTransition.id,
    output: activeOutput,
    explanation: `Transition: "${currentState.name}" --[${matchingTransition.condition}${activeOutput ? ' / ' + activeOutput : ''}]--> "${nextState.name}".`,
  };
}

/**
 * Generates a Markdown formatted state transition table
 */
export function generateFsmStateTableMarkdown(graph: FsmGraph): string {
  const rows: string[] = [
    '| Current State | Input Condition | Next State | Moore Output | Mealy Output |',
    '| :--- | :--- | :--- | :--- | :--- |',
  ];

  for (const s of graph.states) {
    const transitions = graph.transitions.filter((t) => t.fromStateId === s.id);
    if (transitions.length === 0) {
      rows.push(`| **${s.name}** ${s.isInitial ? '(Init)' : ''} | *(None / Trap)* | **${s.name}** | ${s.mooreOutput || '-'} | - |`);
    } else {
      for (const t of transitions) {
        const dest = graph.states.find((st) => st.id === t.toStateId);
        rows.push(
          `| **${s.name}** ${s.isInitial ? '(Init)' : ''} | \`${t.condition}\` | **${dest ? dest.name : t.toStateId}** | ${s.mooreOutput || '-'} | ${t.mealyOutput || '-'} |`
        );
      }
    }
  }

  return rows.join('\n');
}

/**
 * Generates production-ready C code skeleton implementing this FSM
 */
export function generateFsmCCode(graph: FsmGraph, fsmName = 'LogicFSM'): string {
  const sanitize = (name: string) => name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const cleanFsmName = sanitize(fsmName);

  const stateEnums = graph.states
    .map((s) => `    ${cleanFsmName}_STATE_${sanitize(s.name)},`)
    .join('\n');

  const initialState = graph.states.find((s) => s.isInitial) || graph.states[0];
  const initialEnum = initialState ? `${cleanFsmName}_STATE_${sanitize(initialState.name)}` : '0';

  let switchCases = '';

  for (const s of graph.states) {
    const sEnum = `${cleanFsmName}_STATE_${sanitize(s.name)}`;
    const outgoing = graph.transitions.filter((t) => t.fromStateId === s.id);

    let transitionCode = '';
    if (outgoing.length === 0) {
      transitionCode = `            /* Terminal or loop state */\n            break;\n`;
    } else {
      transitionCode = outgoing
        .map((t) => {
          const dest = graph.states.find((st) => st.id === t.toStateId);
          const destEnum = dest ? `${cleanFsmName}_STATE_${sanitize(dest.name)}` : sEnum;
          const mealyAction = t.mealyOutput ? `\n                /* Action for output "${t.mealyOutput}" */` : '';
          return `            if (input == ${t.condition}) {${mealyAction}\n                fsm->current_state = ${destEnum};\n                break;\n            }`;
        })
        .join('\n');
    }

    const mooreAction = s.mooreOutput ? `\n            /* Moore State Action: ${s.mooreOutput} */` : '';

    switchCases += `        case ${sEnum}:${mooreAction}\n${transitionCode}\n            break;\n\n`;
  }

  return `/**
 * @file ${cleanFsmName.toLowerCase()}_fsm.h
 * Generated by LogicBench Finite State Machine Editor
 */

#ifndef ${cleanFsmName}_FSM_H
#define ${cleanFsmName}_FSM_H

#include <stdint.h>
#include <stdbool.h>

/* FSM State Enumeration */
typedef enum {
${stateEnums}
} ${cleanFsmName}_State_t;

/* FSM Instance Context */
typedef struct {
    ${cleanFsmName}_State_t current_state;
    uint32_t transition_count;
} ${cleanFsmName}_t;

/**
 * @brief Initialize the FSM to default initial state
 */
static inline void ${cleanFsmName.toLowerCase()}_init(${cleanFsmName}_t *fsm) {
    if (!fsm) return;
    fsm->current_state = ${initialEnum};
    fsm->transition_count = 0;
}

/**
 * @brief Step the FSM with an incoming input event
 * @param fsm Pointer to state machine context
 * @param input Discrete input condition / symbol
 */
static inline void ${cleanFsmName.toLowerCase()}_step(${cleanFsmName}_t *fsm, uint8_t input) {
    if (!fsm) return;
    fsm->transition_count++;

    switch (fsm->current_state) {
${switchCases}        default:
            fsm->current_state = ${initialEnum};
            break;
    }
}

#endif /* ${cleanFsmName}_FSM_H */
`;
}

/**
 * Standard FSM Presets
 */
export const FSM_PRESETS: { name: string; description: string; graph: FsmGraph }[] = [
  {
    name: 'Sequence Detector (101)',
    description: 'Detects binary pattern "101" with overlapping sequence recognition.',
    graph: {
      states: [
        { id: 's0', name: 'S_IDLE', x: 80, y: 150, isInitial: true, mooreOutput: '0' },
        { id: 's1', name: 'S_GOT1', x: 250, y: 100, mooreOutput: '0' },
        { id: 's2', name: 'S_GOT10', x: 420, y: 150, mooreOutput: '0' },
        { id: 's3', name: 'S_MATCH', x: 250, y: 260, isAccepting: true, mooreOutput: '1' },
      ],
      transitions: [
        { id: 't1', fromStateId: 's0', toStateId: 's0', condition: '0' },
        { id: 't2', fromStateId: 's0', toStateId: 's1', condition: '1' },
        { id: 't3', fromStateId: 's1', toStateId: 's2', condition: '0' },
        { id: 't4', fromStateId: 's1', toStateId: 's1', condition: '1' },
        { id: 't5', fromStateId: 's2', toStateId: 's0', condition: '0' },
        { id: 't6', fromStateId: 's2', toStateId: 's3', condition: '1' },
        { id: 't7', fromStateId: 's3', toStateId: 's2', condition: '0' },
        { id: 't8', fromStateId: 's3', toStateId: 's1', condition: '1' },
      ],
    },
  },
  {
    name: 'Traffic Light Controller',
    description: 'Dual-phase North-South / East-West intersection controller with timers.',
    graph: {
      states: [
        { id: 'ns_green', name: 'NS_GREEN', x: 100, y: 120, isInitial: true, mooreOutput: 'NS:GRN, EW:RED' },
        { id: 'ns_yellow', name: 'NS_YELLOW', x: 340, y: 120, mooreOutput: 'NS:YEL, EW:RED' },
        { id: 'ew_green', name: 'EW_GREEN', x: 340, y: 280, mooreOutput: 'NS:RED, EW:GRN' },
        { id: 'ew_yellow', name: 'EW_YELLOW', x: 100, y: 280, mooreOutput: 'NS:RED, EW:YEL' },
      ],
      transitions: [
        { id: 'tt1', fromStateId: 'ns_green', toStateId: 'ns_yellow', condition: 'TIMEOUT' },
        { id: 'tt2', fromStateId: 'ns_yellow', toStateId: 'ew_green', condition: 'TIMEOUT' },
        { id: 'tt3', fromStateId: 'ew_green', toStateId: 'ew_yellow', condition: 'TIMEOUT' },
        { id: 'tt4', fromStateId: 'ew_yellow', toStateId: 'ns_green', condition: 'TIMEOUT' },
      ],
    },
  },
];

/**
 * Self-check assertions for FSM engine
 */
export function runFsmEngineSelfChecks(): boolean {
  try {
    const seqPreset = FSM_PRESETS[0];
    // Start at s0
    let curState = 's0';
    // Input 1 -> s1
    let step = stepFsm(seqPreset.graph, curState, '1');
    console.assert(step.currentStateId === 's1', 'Self-check failed: input 1 should move to s1');
    curState = step.currentStateId;

    // Input 0 -> s2
    step = stepFsm(seqPreset.graph, curState, '0');
    console.assert(step.currentStateId === 's2', 'Self-check failed: input 0 should move to s2');
    curState = step.currentStateId;

    // Input 1 -> s3 (match!)
    step = stepFsm(seqPreset.graph, curState, '1');
    console.assert(step.currentStateId === 's3', 'Self-check failed: input 1 should move to s3');
    console.assert(step.output === '1', 'Self-check failed: s3 output should be 1');

    // Verify C code generation
    const cCode = generateFsmCCode(seqPreset.graph, 'SeqDetector');
    console.assert(cCode.includes('SeqDetector_State_t'), 'Self-check failed: C code should contain state type');

    return true;
  } catch (err) {
    console.error('FSM Engine self-check error:', err);
    return false;
  }
}

runFsmEngineSelfChecks();
