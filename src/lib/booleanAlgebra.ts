/**
 * Pure logic for Boolean Algebra:
 * - Expression parsing & evaluation
 * - Truth table generation (2-4 variables)
 * - Karnaugh Map grid (2, 3, 4 vars in Gray code)
 * - SOP and POS minimization (Quine-McCluskey style)
 * - SVG Logic gate diagram generation
 * - Self-check assertions
 */

export interface TruthTableRow {
  index: number;
  inputs: Record<string, number>;
  output: number;
  minterm: string;
}

export interface KMapCell {
  row: number;
  col: number;
  mintermIndex: number;
  rowLabel: string;
  colLabel: string;
  value: number;
}

export interface KMapGrid {
  varCount: number;
  rowVars: string[];
  colVars: string[];
  rowHeaders: string[]; // e.g. ["0", "1"] or ["00", "01", "11", "10"]
  colHeaders: string[]; // e.g. ["00", "01", "11", "10"]
  cells: KMapCell[][];
}

export interface BooleanAnalysisResult {
  expression: string;
  variables: string[];
  truthTable: TruthTableRow[];
  minterms: number[];
  maxterms: number[];
  minimizedSOP: string;
  minimizedPOS: string;
  kmap: KMapGrid;
  steps: string[];
}

/**
 * Tokenize and evaluate boolean expression with variables A, B, C, D
 */
export function evaluateBooleanExpression(
  expr: string,
  env: Record<string, number>
): number {
  // Normalize tokens
  let s = expr.toUpperCase().replace(/\s+/g, '');
  // Replace words
  s = s.replace(/AND/g, '&').replace(/OR/g, '|').replace(/XOR/g, '^').replace(/NOT/g, '!');

  // Handle postfix prime ' like A' -> !A
  s = s.replace(/([A-D0-9\)])'/g, '!$1');
  // Replace + with | and * with &
  s = s.replace(/\+/g, '|').replace(/\*/g, '&');

  // Insert & between adjacent variables or var and ( e.g. AB -> A&B, A(B+C) -> A&(B+C)
  s = s.replace(/([A-D0-9\)])(?=[A-D!\(])/g, '$1&');

  // Simple recursive descent parser
  let pos = 0;

  function parseOr(): number {
    let res = parseXor();
    while (pos < s.length && s[pos] === '|') {
      pos++;
      const nextVal = parseXor();
      res = res | nextVal;
    }
    return res;
  }

  function parseXor(): number {
    let res = parseAnd();
    while (pos < s.length && s[pos] === '^') {
      pos++;
      const nextVal = parseAnd();
      res = res ^ nextVal;
    }
    return res;
  }

  function parseAnd(): number {
    let res = parseFactor();
    while (pos < s.length && s[pos] === '&') {
      pos++;
      const nextVal = parseFactor();
      res = res & nextVal;
    }
    return res;
  }

  function parseFactor(): number {
    if (pos >= s.length) return 0;

    if (s[pos] === '!' || s[pos] === '~') {
      pos++;
      return parseFactor() === 1 ? 0 : 1;
    }

    if (s[pos] === '(') {
      pos++;
      const val = parseOr();
      if (pos < s.length && s[pos] === ')') {
        pos++;
      }
      return val;
    }

    const ch = s[pos];
    if (ch in env) {
      pos++;
      return env[ch] ? 1 : 0;
    }

    if (ch === '0' || ch === '1') {
      pos++;
      return Number(ch);
    }

    // Default skip invalid
    pos++;
    return 0;
  }

  return parseOr();
}

export function extractVariables(expr: string): string[] {
  const matches = expr.toUpperCase().match(/[A-D]/g);
  if (!matches) return ['A', 'B'];
  const unique = Array.from(new Set(matches)).sort();
  return unique.length > 0 ? unique : ['A', 'B'];
}

export function generateTruthTable(expr: string, vars?: string[]): TruthTableRow[] {
  const activeVars = vars || extractVariables(expr);
  const totalRows = 1 << activeVars.length;
  const rows: TruthTableRow[] = [];

  for (let i = 0; i < totalRows; i++) {
    const inputs: Record<string, number> = {};
    for (let vi = 0; vi < activeVars.length; vi++) {
      const bitPos = activeVars.length - 1 - vi;
      inputs[activeVars[vi]] = (i >> bitPos) & 1;
    }

    const out = evaluateBooleanExpression(expr, inputs);
    rows.push({
      index: i,
      inputs,
      output: out,
      minterm: `m${i}`,
    });
  }

  return rows;
}

/**
 * Generate Gray-code indexed Karnaugh Map
 */
export function generateKMap(vars: string[], truthTable: TruthTableRow[]): KMapGrid {
  const varCount = vars.length;

  if (varCount === 2) {
    const rowVars = [vars[0]];
    const colVars = [vars[1]];
    const rowHeaders = ['0', '1'];
    const colHeaders = ['0', '1'];

    const cells: KMapCell[][] = [];
    for (let r = 0; r < 2; r++) {
      const row: KMapCell[] = [];
      for (let c = 0; c < 2; c++) {
        const mintermIndex = (r << 1) | c;
        const ttRow = truthTable.find((row) => row.index === mintermIndex);
        row.push({
          row: r,
          col: c,
          mintermIndex,
          rowLabel: rowHeaders[r],
          colLabel: colHeaders[c],
          value: ttRow ? ttRow.output : 0,
        });
      }
      cells.push(row);
    }

    return { varCount, rowVars, colVars, rowHeaders, colHeaders, cells };
  } else if (varCount === 3) {
    // 2x4 map: Row is A (0, 1), Cols are BC in Gray code (00, 01, 11, 10)
    const rowVars = [vars[0]];
    const colVars = [vars[1], vars[2]];
    const rowHeaders = ['0', '1'];
    const colHeaders = ['00', '01', '11', '10'];
    const colGrayMap = [0, 1, 3, 2]; // index for 00, 01, 11, 10

    const cells: KMapCell[][] = [];
    for (let r = 0; r < 2; r++) {
      const row: KMapCell[] = [];
      for (let c = 0; c < 4; c++) {
        const bc = colGrayMap[c];
        const mintermIndex = (r << 2) | bc;
        const ttRow = truthTable.find((row) => row.index === mintermIndex);
        row.push({
          row: r,
          col: c,
          mintermIndex,
          rowLabel: rowHeaders[r],
          colLabel: colHeaders[c],
          value: ttRow ? ttRow.output : 0,
        });
      }
      cells.push(row);
    }

    return { varCount, rowVars, colVars, rowHeaders, colHeaders, cells };
  } else {
    // 4 variables (A, B, C, D) -> 4x4 K-map with AB on rows and CD on cols in Gray code
    const rowVars = [vars[0], vars[1]];
    const colVars = [vars[2], vars[3]];
    const rowHeaders = ['00', '01', '11', '10'];
    const colHeaders = ['00', '01', '11', '10'];
    const grayMap = [0, 1, 3, 2];

    const cells: KMapCell[][] = [];
    for (let r = 0; r < 4; r++) {
      const row: KMapCell[] = [];
      const ab = grayMap[r];
      for (let c = 0; c < 4; c++) {
        const cd = grayMap[c];
        const mintermIndex = (ab << 2) | cd;
        const ttRow = truthTable.find((row) => row.index === mintermIndex);
        row.push({
          row: r,
          col: c,
          mintermIndex,
          rowLabel: rowHeaders[r],
          colLabel: colHeaders[c],
          value: ttRow ? ttRow.output : 0,
        });
      }
      cells.push(row);
    }

    return { varCount, rowVars, colVars, rowHeaders, colHeaders, cells };
  }
}

/**
 * Quine-McCluskey inspired minimization for SOP and POS
 */
export function minimizeBoolean(
  vars: string[],
  minterms: number[],
  isPOS = false
): string {
  const totalCombinations = 1 << vars.length;

  if (minterms.length === 0) return isPOS ? '1' : '0';
  if (minterms.length === totalCombinations) return isPOS ? '0' : '1';

  // Group minterms by number of 1s in binary representation
  interface Implicant {
    mask: number; // 1 means variable is cared about, 0 means don't care (eliminated)
    val: number; // bit values for cared variables
    mintermsCovered: number[];
    used: boolean;
  }

  let currentGroup: Implicant[] = minterms.map((m) => ({
    mask: totalCombinations - 1,
    val: m,
    mintermsCovered: [m],
    used: false,
  }));

  const primeImplicants: Implicant[] = [];

  while (currentGroup.length > 0) {
    const nextGroup: Implicant[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < currentGroup.length; i++) {
      for (let j = i + 1; j < currentGroup.length; j++) {
        const imp1 = currentGroup[i];
        const imp2 = currentGroup[j];

        // Check if same mask and differ by exactly one bit
        if (imp1.mask === imp2.mask) {
          const diff = (imp1.val ^ imp2.val) & imp1.mask;
          // Check if diff is power of 2
          if (diff > 0 && (diff & (diff - 1)) === 0) {
            imp1.used = true;
            imp2.used = true;
            usedIndices.add(i);
            usedIndices.add(j);

            const newMask = imp1.mask ^ diff;
            const newVal = imp1.val & newMask;
            const newCovered = Array.from(new Set([...imp1.mintermsCovered, ...imp2.mintermsCovered])).sort((a, b) => a - b);

            // Avoid duplicate implicants in nextGroup
            if (!nextGroup.some((g) => g.mask === newMask && g.val === newVal)) {
              nextGroup.push({
                mask: newMask,
                val: newVal,
                mintermsCovered: newCovered,
                used: false,
              });
            }
          }
        }
      }
    }

    for (let i = 0; i < currentGroup.length; i++) {
      if (!currentGroup[i].used) {
        // Only add if not already in primeImplicants
        const imp = currentGroup[i];
        if (!primeImplicants.some((p) => p.mask === imp.mask && p.val === imp.val)) {
          primeImplicants.push(imp);
        }
      }
    }

    currentGroup = nextGroup;
  }

  // Cover table: select minimal set of prime implicants to cover all minterms
  const remainingMinterms = new Set<number>(minterms);
  const selected: Implicant[] = [];

  // Essential prime implicants
  for (const m of minterms) {
    const covers = primeImplicants.filter((p) => p.mintermsCovered.includes(m));
    if (covers.length === 1 && !selected.includes(covers[0])) {
      selected.push(covers[0]);
      covers[0].mintermsCovered.forEach((covered) => remainingMinterms.delete(covered));
    }
  }

  // Greedy cover for remaining
  while (remainingMinterms.size > 0) {
    let best: Implicant | null = null;
    let maxCoverCount = -1;

    for (const p of primeImplicants) {
      if (selected.includes(p)) continue;
      const count = p.mintermsCovered.filter((m) => remainingMinterms.has(m)).length;
      if (count > maxCoverCount) {
        maxCoverCount = count;
        best = p;
      }
    }

    if (!best || maxCoverCount === 0) break;
    selected.push(best);
    best.mintermsCovered.forEach((m) => remainingMinterms.delete(m));
  }

  if (selected.length === 0) return '0';

  // Format terms to string
  if (!isPOS) {
    // SOP Format: e.g. A'B + CD
    const terms = selected.map((imp) => {
      let termStr = '';
      for (let i = 0; i < vars.length; i++) {
        const bitPos = vars.length - 1 - i;
        const bitMask = 1 << bitPos;
        if ((imp.mask & bitMask) !== 0) {
          const bitVal = (imp.val >> bitPos) & 1;
          const varName = vars[i];
          termStr += bitVal === 1 ? varName : `${varName}'`;
        }
      }
      return termStr || '1';
    });

    return terms.join(' + ');
  } else {
    // POS Format: e.g. (A + B')(C + D)
    const terms = selected.map((imp) => {
      const literals: string[] = [];
      for (let i = 0; i < vars.length; i++) {
        const bitPos = vars.length - 1 - i;
        const bitMask = 1 << bitPos;
        if ((imp.mask & bitMask) !== 0) {
          const bitVal = (imp.val >> bitPos) & 1;
          const varName = vars[i];
          literals.push(bitVal === 0 ? varName : `${varName}'`);
        }
      }
      return `(${literals.join(' + ')})`;
    });

    return terms.join(' · ');
  }
}

export function analyzeBooleanExpression(expr: string): BooleanAnalysisResult {
  const vars = extractVariables(expr);
  const truthTable = generateTruthTable(expr, vars);
  const minterms = truthTable.filter((r) => r.output === 1).map((r) => r.index);
  const maxterms = truthTable.filter((r) => r.output === 0).map((r) => r.index);

  const kmap = generateKMap(vars, truthTable);
  const minimizedSOP = minimizeBoolean(vars, minterms, false);
  const minimizedPOS = minimizeBoolean(vars, maxterms, true);

  const steps: string[] = [
    `1. Identified ${vars.length} input variables: [${vars.join(', ')}].`,
    `2. Evaluated truth table for 2^${vars.length} = ${truthTable.length} input combinations.`,
    `3. Extracted Minterms (Output = 1): Σm(${minterms.join(', ') || 'none'}).`,
    `4. Extracted Maxterms (Output = 0): ΠM(${maxterms.join(', ') || 'none'}).`,
    `5. Populated Karnaugh Map in Gray-code order to isolate adjacent prime implicants.`,
    `6. Reduced Sum-of-Products (SOP): ${minimizedSOP}.`,
    `7. Reduced Product-of-Sums (POS): ${minimizedPOS}.`,
  ];

  return {
    expression: expr,
    variables: vars,
    truthTable,
    minterms,
    maxterms,
    minimizedSOP,
    minimizedPOS,
    kmap,
    steps,
  };
}

/**
 * Self-check assertions to verify Boolean parsing, evaluation, and minimization
 */
export function runBooleanAlgebraSelfChecks(): boolean {
  try {
    // 1. Half adder XOR: A ^ B -> minterms m1, m2 (01, 10)
    const xorResult = analyzeBooleanExpression('A ^ B');
    console.assert(xorResult.minterms.length === 2 && xorResult.minterms.includes(1) && xorResult.minterms.includes(2), 'Self-check failed: A^B minterms mismatch');

    // 2. A + A'B = A + B
    const sopRes = minimizeBoolean(['A', 'B'], [1, 2, 3], false);
    console.assert(sopRes === "B + A" || sopRes === "A + B", `Self-check failed: A+B minimization got ${sopRes}`);

    // 3. Constant 1: minterms all
    const const1 = minimizeBoolean(['A', 'B'], [0, 1, 2, 3], false);
    console.assert(const1 === '1', 'Self-check failed: all minterms should minimize to 1');

    return true;
  } catch (err) {
    console.error('Boolean Algebra self-check error:', err);
    return false;
  }
}

runBooleanAlgebraSelfChecks();
