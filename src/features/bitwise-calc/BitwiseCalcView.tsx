import React, { useState } from 'react';
import { 
  Cpu, 
  Copy, 
  Check, 
  Bookmark, 
  Code, 
  RotateCcw, 
  Info, 
  Layers, 
  ArrowRight,
  Terminal,
  Zap
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { WordWidth, clampToWidth, formatBinary, formatHex, parseInputToBigInt, toggleBit, getBit } from '../../lib/baseConverter';
import { BitwiseOp, executeBitwiseOp, generateCCode } from '../../lib/bitwiseCalc';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const BitwiseCalcView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [width, setWidth] = useState<WordWidth>(16);
  const [opA, setOpA] = useState<bigint>(0x0f3cn);
  const [opB, setOpB] = useState<bigint>(0x00f0n);
  const [op, setOp] = useState<BitwiseOp>('AND');
  const [shiftAmount, setShiftAmount] = useState<number>(2);
  const [selectedBitIndex, setSelectedBitIndex] = useState<number>(3);
  const [registerName, setRegisterName] = useState<string>('GPIO_ODR');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const isUnaryOrShift = op === 'NOT' || ['SHL', 'SHR', 'SAR', 'ROL', 'ROR'].includes(op);
  const isShiftOrRotate = ['SHL', 'SHR', 'SAR', 'ROL', 'ROR'].includes(op);

  const calcResult = executeBitwiseOp(op, opA, opB, width, shiftAmount);
  const cSnippets = generateCCode(calcResult.result, selectedBitIndex, width, registerName);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `Bitwise ${op} (${width}-bit): ${formatHex(calcResult.result, width)}`;
    const content = [
      `# ${title}`,
      `- Operation: \`${op}\``,
      `- Operand A: \`${formatHex(opA, width)}\` (\`${formatBinary(opA, width, true)}\`)`,
      !isUnaryOrShift ? `- Operand B: \`${formatHex(opB, width)}\` (\`${formatBinary(opB, width, true)}\`)` : '',
      isShiftOrRotate ? `- Shift/Rotate count: ${shiftAmount}` : '',
      `- Result: \`${formatHex(calcResult.result, width)}\` (\`${formatBinary(calcResult.result, width, true)}\`)`,
      `\n### Generated C Statements:\n\`\`\`c\n${cSnippets.setBit}\n${cSnippets.clearBit}\n${cSnippets.toggleBit}\n${cSnippets.readBit}\n\`\`\``,
      `\n### Derivation Steps:\n` + calcResult.steps.join('\n'),
    ].filter(Boolean).join('\n');

    await saveToolResultToNotes(title, content, ['bitwise', op, `${width}-bit`]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const bitLength = width;
  const bitArray = Array.from({ length: bitLength }, (_, i) => bitLength - 1 - i);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Cpu className="w-5 h-5 text-amber-400" />
            <span>{t.bitwiseCalc.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.bitwiseCalc.description}</p>
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

          {/* Width Selector */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-subtle">
            {([8, 16, 32, 64] as WordWidth[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setWidth(w);
                  setOpA((prev) => clampToWidth(prev, w));
                  setOpB((prev) => clampToWidth(prev, w));
                  if (selectedBitIndex >= w) setSelectedBitIndex(w - 1);
                }}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  width === w
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary hover:bg-hover'
                }`}
              >
                {w}-bit
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Operation Picker Bar */}
      <div className="bg-surface rounded-lg p-3 border border-subtle space-y-2">
        <div className="text-xs font-semibold uppercase text-secondary">
          {t.bitwiseCalc.operations}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['AND', 'OR', 'XOR', 'NOT', 'SHL', 'SHR', 'SAR', 'ROL', 'ROR'] as BitwiseOp[]).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOp(o)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-colors border ${
                op === o
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs'
                  : 'bg-canvas border-subtle text-secondary hover:text-primary hover:bg-hover'
              }`}
            >
              {o}
            </button>
          ))}
          {isShiftOrRotate && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-secondary font-mono">{t.bitwiseCalc.shiftAmount}:</span>
              <input
                type="number"
                min={0}
                max={width}
                value={shiftAmount}
                onChange={(e) => setShiftAmount(Math.max(0, Math.min(width, Number(e.target.value) || 0)))}
                className="w-16 px-2 py-1 bg-canvas border border-subtle rounded text-xs text-primary font-mono"
              />
            </div>
          )}
        </div>
      </div>

      {/* Operand A Section */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800">
              OPERAND A
            </span>
            <span className="text-xs text-secondary font-mono">
              Hex: {formatHex(opA, width)} | Dec: {opA.toString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={formatHex(opA, width)}
              onChange={(e) => {
                const parsed = parseInputToBigInt(e.target.value, width);
                if (parsed !== null) setOpA(parsed);
              }}
              className="code-ltr text-xs px-2 py-1 bg-canvas border border-subtle rounded font-mono text-cyan-300 w-32 focus:outline-none focus:border-cyan-500"
            />
            <button
              type="button"
              onClick={() => setOpA(0n)}
              className="text-xs px-2 py-1 rounded bg-surface-subtle text-muted hover:text-primary"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Bit Grid for Operand A */}
        <div className="code-ltr overflow-x-auto pb-1" dir="ltr">
          <div className="flex items-center gap-1">
            {bitArray.map((bitIdx) => {
              const bVal = getBit(opA, bitIdx);
              return (
                <button
                  key={bitIdx}
                  type="button"
                  onClick={() => setOpA(toggleBit(opA, bitIdx, width))}
                  className={`w-7 h-9 flex flex-col items-center justify-between py-1 rounded font-mono text-xs border transition-colors ${
                    bVal === 1
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-canvas border-subtle text-muted hover:border-secondary'
                  }`}
                  title={`Bit ${bitIdx}`}
                >
                  <span className="text-[9px] text-muted">{bitIdx}</span>
                  <span>{bVal}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operand B Section (if binary operation) */}
      {!isUnaryOrShift && (
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-purple-950/40 text-purple-400 border border-purple-800">
                OPERAND B
              </span>
              <span className="text-xs text-secondary font-mono">
                Hex: {formatHex(opB, width)} | Dec: {opB.toString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formatHex(opB, width)}
                onChange={(e) => {
                  const parsed = parseInputToBigInt(e.target.value, width);
                  if (parsed !== null) setOpB(parsed);
                }}
                className="code-ltr text-xs px-2 py-1 bg-canvas border border-subtle rounded font-mono text-purple-300 w-32 focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setOpB(0n)}
                className="text-xs px-2 py-1 rounded bg-surface-subtle text-muted hover:text-primary"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Bit Grid for Operand B */}
          <div className="code-ltr overflow-x-auto pb-1" dir="ltr">
            <div className="flex items-center gap-1">
              {bitArray.map((bitIdx) => {
                const bVal = getBit(opB, bitIdx);
                return (
                  <button
                    key={bitIdx}
                    type="button"
                    onClick={() => setOpB(toggleBit(opB, bitIdx, width))}
                    className={`w-7 h-9 flex flex-col items-center justify-between py-1 rounded font-mono text-xs border transition-colors ${
                      bVal === 1
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                        : 'bg-canvas border-subtle text-muted hover:border-secondary'
                    }`}
                    title={`Bit ${bitIdx}`}
                  >
                    <span className="text-[9px] text-muted">{bitIdx}</span>
                    <span>{bVal}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Calculation Result */}
      <div className="bg-surface rounded-lg p-5 border border-emerald-500/30 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800">
              RESULT [{op}]
            </span>
            <span className="code-ltr text-base font-mono font-bold text-emerald-400" dir="ltr">
              {formatHex(calcResult.result, width)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCopy(formatHex(calcResult.result, width), 'resHex')}
            className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2.5 py-1 rounded bg-surface-subtle border border-subtle"
          >
            {copiedKey === 'resHex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'resHex' ? t.common.copied : t.common.copyResult}</span>
          </button>
        </div>

        {/* Result Bit Grid */}
        <div className="code-ltr overflow-x-auto pb-1" dir="ltr">
          <div className="flex items-center gap-1">
            {bitArray.map((bitIdx) => {
              const bVal = getBit(calcResult.result, bitIdx);
              return (
                <div
                  key={bitIdx}
                  className={`w-7 h-9 flex flex-col items-center justify-between py-1 rounded font-mono text-xs border ${
                    bVal === 1
                      ? 'bg-emerald-500/25 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-canvas/50 border-subtle text-muted'
                  }`}
                >
                  <span className="text-[9px] text-muted">{bitIdx}</span>
                  <span>{bVal}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="code-ltr text-xs font-mono text-secondary pt-1 flex flex-wrap gap-4" dir="ltr">
          <span>Binary: <strong className="text-primary">{formatBinary(calcResult.result, width, true)}</strong></span>
          <span>Decimal: <strong className="text-primary">{calcResult.result.toString()}</strong></span>
        </div>
      </div>

      {/* C Code Generator for Embedded Registers */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-primary">{t.bitwiseCalc.codeGenerator}</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <span>{t.bitwiseCalc.registerName}:</span>
              <input
                type="text"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="code-ltr px-2 py-0.5 bg-canvas border border-subtle rounded font-mono text-cyan-300 w-28 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <span>{t.bitwiseCalc.selectedBit}:</span>
              <select
                value={selectedBitIndex}
                onChange={(e) => setSelectedBitIndex(Number(e.target.value))}
                className="code-ltr px-2 py-0.5 bg-canvas border border-subtle rounded font-mono text-primary text-xs"
              >
                {Array.from({ length: width }, (_, i) => (
                  <option key={i} value={i}>Bit {i}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Code Grid */}
        <div className="code-ltr grid grid-cols-1 md:grid-cols-2 gap-3" dir="ltr">
          {[
            { label: t.bitwiseCalc.setBitCode, code: cSnippets.setBit, key: 'cSet' },
            { label: t.bitwiseCalc.clearBitCode, code: cSnippets.clearBit, key: 'cClear' },
            { label: t.bitwiseCalc.toggleBitCode, code: cSnippets.toggleBit, key: 'cToggle' },
            { label: t.bitwiseCalc.readBitCode, code: cSnippets.readBit, key: 'cRead' },
          ].map((item) => (
            <div key={item.key} className="bg-canvas p-3 rounded border border-subtle space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted font-mono">
                <span>{item.label}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.code, item.key)}
                  className="text-secondary hover:text-cyan-400 flex items-center gap-1"
                >
                  {copiedKey === item.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === item.key ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="text-xs text-cyan-300 font-mono overflow-x-auto p-1 bg-surface/50 rounded">
                {item.code}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Step-by-Step Derivations */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between text-left text-sm font-semibold text-primary"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span>{t.common.stepByStep}</span>
          </div>
          <span className="text-xs text-secondary font-mono">{showSteps ? 'Hide' : 'Show'}</span>
        </button>

        {showSteps && (
          <div className="code-ltr text-xs font-mono space-y-1 text-secondary pt-2 border-t border-subtle" dir="ltr">
            {calcResult.steps.map((st, i) => (
              <div key={i} className="p-1.5 bg-canvas rounded border border-subtle text-primary">
                {st}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
