import React, { useState } from 'react';
import { 
  Binary, 
  Copy, 
  Check, 
  Bookmark, 
  Table, 
  Grid, 
  Sparkles, 
  Info,
  Maximize2
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { analyzeBooleanExpression, BooleanAnalysisResult } from '../../lib/booleanAlgebra';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const BooleanAlgebraView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [expression, setExpression] = useState<string>('A & B | !C');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const analysis: BooleanAnalysisResult = React.useMemo(() => {
    try {
      return analyzeBooleanExpression(expression.trim() || 'A & B');
    } catch {
      return analyzeBooleanExpression('A & B');
    }
  }, [expression]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `Boolean Minimization: ${analysis.expression}`;
    const content = [
      `# ${title}`,
      `- Expression: \`${analysis.expression}\``,
      `- Variables: ${analysis.variables.join(', ')}`,
      `- Minterms: Σm(${analysis.minterms.join(', ')})`,
      `- Maxterms: ΠM(${analysis.maxterms.join(', ')})`,
      `- Minimized SOP: \`${analysis.minimizedSOP}\``,
      `- Minimized POS: \`${analysis.minimizedPOS}\``,
      `\n### Truth Table Summary:`,
      `| Index | Inputs | Output |`,
      `| :--- | :--- | :--- |`,
      ...analysis.truthTable.map((r) => `| m${r.index} | ${JSON.stringify(r.inputs)} | **${r.output}** |`),
      `\n### Reduction Steps:\n` + analysis.steps.join('\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['boolean-algebra', 'kmap', 'logic']);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const presets = [
    { label: t.booleanAlgebra.halfAdderPreset, expr: 'A ^ B' },
    { label: t.booleanAlgebra.fullAdderPreset, expr: 'A&B | B&C | A&C' },
    { label: t.booleanAlgebra.muxPreset, expr: '!S&A | S&B' },
    { label: t.booleanAlgebra.xorPreset, expr: "!A&B | A&!B" },
    { label: 'Majority Gate 3-Var', expr: 'A&B | B&C | A&C' },
  ];

  const kmap = analysis.kmap;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Grid className="w-5 h-5 text-emerald-400" />
            <span>{t.booleanAlgebra.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.booleanAlgebra.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToNotes}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              savedToNotes
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-surface-subtle border-subtle text-secondary hover:text-primary hover:bg-hover'
            }`}
          >
            {savedToNotes ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5 text-amber-400" />}
            <span>{savedToNotes ? t.common.savedToNotes : t.common.saveToNotes}</span>
          </button>
        </div>
      </div>

      {/* Expression Input & Presets */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
        <label className="text-xs font-semibold uppercase text-secondary flex items-center gap-1.5">
          <span>{t.booleanAlgebra.expressionLabel}</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder={t.booleanAlgebra.expressionPlaceholder}
            className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-cyan-300 font-mono tracking-wide focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setExpression('A & B')}
            className="text-xs px-2.5 py-2 rounded bg-surface-subtle text-muted hover:text-primary border border-subtle shrink-0"
          >
            {t.common.clear}
          </button>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-muted font-mono mr-1">{t.common.presets}:</span>
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setExpression(p.expr)}
              className="text-xs px-2.5 py-1 rounded bg-canvas border border-subtle text-secondary hover:text-cyan-400 hover:border-cyan-500/50 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Minimized Forms Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Minimized SOP */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t.booleanAlgebra.minimizedSOP}</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopy(analysis.minimizedSOP, 'sop')}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover"
            >
              {copiedKey === 'sop' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'sop' ? t.common.copied : t.common.copyResult}</span>
            </button>
          </div>
          <div className="code-ltr text-lg font-mono font-bold text-emerald-400 bg-canvas p-3 rounded border border-subtle" dir="ltr">
            {analysis.minimizedSOP}
          </div>
          <div className="text-[11px] font-mono text-muted">
            Σm({analysis.minterms.join(', ') || '0'})
          </div>
        </div>

        {/* Minimized POS */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{t.booleanAlgebra.minimizedPOS}</span>
            </span>
            <button
              type="button"
              onClick={() => handleCopy(analysis.minimizedPOS, 'pos')}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover"
            >
              {copiedKey === 'pos' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'pos' ? t.common.copied : t.common.copyResult}</span>
            </button>
          </div>
          <div className="code-ltr text-lg font-mono font-bold text-cyan-400 bg-canvas p-3 rounded border border-subtle" dir="ltr">
            {analysis.minimizedPOS}
          </div>
          <div className="text-[11px] font-mono text-muted">
            ΠM({analysis.maxterms.join(', ') || '0'})
          </div>
        </div>
      </div>

      {/* Karnaugh Map (K-Map) Grid */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Grid className="w-4 h-4 text-amber-400" />
              <span>{t.booleanAlgebra.kmapTitle} ({kmap.varCount} Variables)</span>
            </h3>
            <p className="text-xs text-secondary">{t.booleanAlgebra.kmapHint}</p>
          </div>
          <span className="text-xs text-muted font-mono">
            Gray Code Order: 00 → 01 → 11 → 10
          </span>
        </div>

        {/* Interactive K-Map Matrix (Strictly LTR) */}
        <div className="code-ltr overflow-x-auto p-3 bg-canvas/70 rounded-lg border border-subtle" dir="ltr">
          <div className="inline-block min-w-max font-mono">
            {/* Header row with Col Vars */}
            <div className="flex items-center">
              {/* Corner header */}
              <div className="w-20 h-10 flex items-center justify-center border-b border-r border-subtle text-xs text-muted font-bold bg-surface">
                {kmap.rowVars.join('')} \ {kmap.colVars.join('')}
              </div>
              {/* Column labels */}
              {kmap.colHeaders.map((colH, ci) => (
                <div key={ci} className="w-16 h-10 flex items-center justify-center border-b border-subtle text-xs font-bold text-secondary bg-surface/50">
                  {colH}
                </div>
              ))}
            </div>

            {/* Matrix Rows */}
            {kmap.cells.map((rowCells, ri) => (
              <div key={ri} className="flex items-center">
                {/* Row label */}
                <div className="w-20 h-14 flex items-center justify-center border-r border-b border-subtle text-xs font-bold text-secondary bg-surface/50">
                  {kmap.rowHeaders[ri]}
                </div>
                {/* Cells */}
                {rowCells.map((cell) => (
                  <div
                    key={cell.mintermIndex}
                    className={`w-16 h-14 border-r border-b border-subtle flex flex-col items-center justify-between p-1.5 transition-colors ${
                      cell.value === 1
                        ? 'bg-emerald-500/20 text-emerald-400 font-extrabold'
                        : 'bg-canvas text-muted/60'
                    }`}
                  >
                    <span className="text-[9px] text-muted self-end">m{cell.mintermIndex}</span>
                    <span className="text-base font-bold">{cell.value}</span>
                    <span className="text-[8px] text-muted/80">{cell.rowLabel}{cell.colLabel}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Logic-Gate Schematic Diagram */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>{t.booleanAlgebra.schematicTitle}</span>
            </h3>
            <p className="text-xs text-secondary">{t.booleanAlgebra.schematicDesc}</p>
          </div>
          <span className="text-xs text-emerald-400 font-mono">
            SOP Gate Level
          </span>
        </div>

        {/* Logic Gate SVG Canvas */}
        <div className="code-ltr w-full bg-canvas rounded-lg p-4 border border-subtle overflow-x-auto flex justify-center" dir="ltr">
          <svg className="w-full max-w-2xl h-48 select-none" viewBox="0 0 600 180">
            {/* Background Grid Pattern subtle */}
            <defs>
              <pattern id="gateGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="600" height="180" fill="url(#gateGrid)" />

            {/* Input Rails */}
            <g className="text-xs font-mono font-bold" fill="#94a3b8">
              <text x="20" y="45">A</text>
              <line x1="35" y1="40" x2="160" y2="40" stroke="#475569" strokeWidth="2" />
              
              <text x="20" y="95">B</text>
              <line x1="35" y1="90" x2="160" y2="90" stroke="#475569" strokeWidth="2" />

              <text x="20" y="145">C</text>
              <line x1="35" y1="140" x2="160" y2="140" stroke="#475569" strokeWidth="2" />
            </g>

            {/* AND Gate 1 */}
            <g transform="translate(160, 20)">
              <path d="M 0 0 L 25 0 A 20 20 0 0 1 25 40 L 0 40 Z" fill="#111827" stroke="#10b981" strokeWidth="2" />
              <text x="12" y="24" fill="#10b981" fontSize="10" fontFamily="monospace">AND</text>
              <line x1="45" y1="20" x2="340" y2="65" stroke="#10b981" strokeWidth="2" />
            </g>

            {/* AND Gate 2 */}
            <g transform="translate(160, 95)">
              <path d="M 0 0 L 25 0 A 20 20 0 0 1 25 40 L 0 40 Z" fill="#111827" stroke="#06b6d4" strokeWidth="2" />
              <text x="12" y="24" fill="#06b6d4" fontSize="10" fontFamily="monospace">AND</text>
              <line x1="45" y1="20" x2="340" y2="85" stroke="#06b6d4" strokeWidth="2" />
            </g>

            {/* Final OR Gate */}
            <g transform="translate(340, 50)">
              <path d="M 0 0 Q 15 25 0 50 Q 30 50 45 25 Q 30 0 0 0 Z" fill="#111827" stroke="#f59e0b" strokeWidth="2" />
              <text x="12" y="30" fill="#f59e0b" fontSize="10" fontFamily="monospace">OR</text>
              <line x1="45" y1="25" x2="140" y2="25" stroke="#f59e0b" strokeWidth="2" />
            </g>

            {/* Output Wire & Label */}
            <g transform="translate(480, 75)">
              <circle cx="0" cy="0" r="4" fill="#10b981" />
              <text x="15" y="5" fill="#10b981" fontSize="13" fontWeight="bold" fontFamily="monospace">
                Y = {analysis.minimizedSOP}
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Evaluated Truth Table & Reduction Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Truth Table */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.booleanAlgebra.truthTableTitle}</span>
            </h3>
            <span className="text-xs font-mono text-muted">{analysis.truthTable.length} Rows</span>
          </div>

          <div className="code-ltr max-h-56 overflow-y-auto border border-subtle rounded" dir="ltr">
            <table className="w-full text-xs font-mono">
              <thead className="bg-canvas border-b border-subtle text-secondary sticky top-0">
                <tr>
                  <th className="p-2 text-left">#</th>
                  {analysis.variables.map((v) => (
                    <th key={v} className="p-2 text-center">{v}</th>
                  ))}
                  <th className="p-2 text-center text-primary">OUT (Y)</th>
                </tr>
              </thead>
              <tbody>
                {analysis.truthTable.map((row) => (
                  <tr
                    key={row.index}
                    className={`border-b border-subtle/50 hover:bg-hover ${
                      row.output === 1 ? 'bg-emerald-950/20 text-emerald-300' : 'text-secondary'
                    }`}
                  >
                    <td className="p-2 text-muted">m{row.index}</td>
                    {analysis.variables.map((v) => (
                      <td key={v} className="p-2 text-center">{row.inputs[v]}</td>
                    ))}
                    <td className="p-2 text-center font-bold text-primary">{row.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step-by-Step Reduction Steps */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.common.stepByStep}</span>
          </h3>

          <div className="code-ltr text-xs font-mono space-y-1.5 text-secondary max-h-56 overflow-y-auto" dir="ltr">
            {analysis.steps.map((st, i) => (
              <div key={i} className="p-2 bg-canvas rounded border border-subtle text-primary">
                {st}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
