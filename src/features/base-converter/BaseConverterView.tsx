import React, { useState, useId } from 'react';
import { 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Binary, 
  Hash, 
  Bookmark, 
  FileText, 
  Layers, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  WordWidth,
  clampToWidth,
  formatBinary,
  formatHex,
  formatOctal,
  toSignedDecimal,
  parseInputToBigInt,
  getBit,
  toggleBit,
  invertBits,
  shiftLeft,
  shiftRight,
  toAsciiRepresentation,
  analyzeFloat32,
  swapEndianness,
  deriveTwosComplement,
  deriveEndiannessSteps,
} from '../../lib/baseConverter';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const BaseConverterView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [width, setWidth] = useState<WordWidth>(32);
  const [value, setValue] = useState<bigint>(0x1a4fn);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [activeStepTab, setActiveStepTab] = useState<'twos' | 'float' | 'endian'>('twos');

  const hexInputId = useId();
  const decInputId = useId();
  const binInputId = useId();
  const octInputId = useId();

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleInputChange = (raw: string) => {
    setInputError(null);
    if (!raw.trim()) {
      setValue(0n);
      return;
    }
    const parsed = parseInputToBigInt(raw, width);
    if (parsed !== null) {
      setValue(parsed);
    } else {
      setInputError(t.common.invalidInput);
    }
  };

  const handleWidthChange = (newWidth: WordWidth) => {
    setWidth(newWidth);
    setValue((prev) => clampToWidth(prev, newWidth));
  };

  const bitLength = width;
  const hexStr = formatHex(value, width);
  const binStr = formatBinary(value, width, true);
  const decUnsignedStr = value.toString(10);
  const decSignedStr = toSignedDecimal(value, width).toString(10);
  const octStr = formatOctal(value, width);
  const asciiStr = toAsciiRepresentation(value, width);
  const floatAnalysis = width >= 32 ? analyzeFloat32(value) : null;
  const swappedLE = swapEndianness(value, width);
  const twosDerivation = deriveTwosComplement(value, width);
  const endianSteps = deriveEndiannessSteps(value, width);

  const handleSaveToNotes = async () => {
    const noteTitle = `Base Conversion: ${hexStr} (${width}-bit)`;
    const content = [
      `# ${noteTitle}`,
      `- Hexadecimal: \`${hexStr}\``,
      `- Binary: \`${binStr}\``,
      `- Decimal Unsigned: \`${decUnsignedStr}\``,
      `- Decimal Signed (Two's Comp): \`${decSignedStr}\``,
      `- Octal: \`${octStr}\``,
      `- ASCII: \`${asciiStr}\``,
      `- Endian Swapped: \`${formatHex(swappedLE, width)}\``,
      floatAnalysis ? `- IEEE-754 Float32: \`${floatAnalysis.floatValue}\` (Sign: ${floatAnalysis.sign}, Exp: ${floatAnalysis.exponent}, Mantissa: 0x${floatAnalysis.fraction.toString(16)})\`\`` : '',
      `\n### Two's Complement Derivation:\n` + twosDerivation.steps.join('\n'),
    ].filter(Boolean).join('\n');

    await saveToolResultToNotes(noteTitle, content, ['base-converter', `${width}-bit`, 'radix']);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header & Word Width Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Binary className="w-5 h-5 text-cyan-400" />
            <span>{t.baseConverter.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.baseConverter.description}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Save to Notes Button */}
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

          {/* Word Width Segmented Buttons */}
          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-subtle shrink-0">
            {([8, 16, 32, 64] as WordWidth[]).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => handleWidthChange(w)}
                className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors ${
                  width === w
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-secondary hover:text-primary hover:bg-hover'
                }`}
              >
                {w}-bit
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Radix Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Hexadecimal */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={hexInputId} className="text-xs font-medium text-secondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{t.baseConverter.hexadecimal}</span>
            </label>
            <button
              type="button"
              onClick={() => handleCopy(hexStr, 'hex')}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover transition-colors"
            >
              {copiedKey === 'hex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'hex' ? t.common.copied : t.common.copyResult}</span>
            </button>
          </div>
          <input
            id={hexInputId}
            type="text"
            value={hexStr}
            onChange={(e) => handleInputChange(e.target.value)}
            className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-cyan-300 font-mono tabular-nums tracking-wide focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Decimal (Unsigned & Signed) */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={decInputId} className="text-xs font-medium text-secondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{t.baseConverter.decimalUnsigned} / Signed</span>
            </label>
            <button
              type="button"
              onClick={() => handleCopy(decUnsignedStr, 'dec')}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover transition-colors"
            >
              {copiedKey === 'dec' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'dec' ? t.common.copied : t.common.copyResult}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              id={decInputId}
              type="text"
              value={decUnsignedStr}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Unsigned"
              className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-amber-300 font-mono tabular-nums focus:border-amber-500 focus:outline-none"
            />
            <div className="code-ltr flex items-center px-3 py-2 bg-canvas/60 border border-subtle rounded text-sm text-secondary font-mono tabular-nums">
              <span className="text-xs text-muted mr-1.5">Signed:</span>
              <span className="text-primary font-semibold">{decSignedStr}</span>
            </div>
          </div>
        </div>

        {/* Binary */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label htmlFor={binInputId} className="text-xs font-medium text-secondary flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t.baseConverter.binary}</span>
            </label>
            <button
              type="button"
              onClick={() => handleCopy(binStr.replace(/\s+/g, ''), 'bin')}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover transition-colors"
            >
              {copiedKey === 'bin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'bin' ? t.common.copied : t.common.copyResult}</span>
            </button>
          </div>
          <input
            id={binInputId}
            type="text"
            value={binStr}
            onChange={(e) => handleInputChange(e.target.value)}
            className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-emerald-400 font-mono tabular-nums tracking-widest focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Octal */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor={octInputId} className="text-xs font-medium text-secondary flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-purple-400" />
              <span>{t.baseConverter.octal}</span>
            </label>
            <button
              type="button"
              onClick={() => handleCopy(octStr, 'oct')}
              className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-hover transition-colors"
            >
              {copiedKey === 'oct' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'oct' ? t.common.copied : t.common.copyResult}</span>
            </button>
          </div>
          <input
            id={octInputId}
            type="text"
            value={octStr}
            onChange={(e) => handleInputChange(e.target.value)}
            className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-purple-300 font-mono tabular-nums focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* ASCII & Endianness Swap */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-secondary">
              {t.baseConverter.asciiUtf8} &amp; Endianness
            </span>
            <span className="text-xs text-muted font-mono">{width / 8} Bytes</span>
          </div>
          <div className="code-ltr flex items-center justify-between px-3 py-2 bg-canvas border border-subtle rounded font-mono text-sm">
            <span className="text-primary font-bold tracking-wider">{asciiStr}</span>
            <span className="text-xs text-muted">
              LE Swap: <span className="text-cyan-400 font-mono">{formatHex(swappedLE, width)}</span>
            </span>
          </div>
        </div>
      </div>

      {inputError && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-800/50 px-3 py-2 rounded">
          {inputError}
        </div>
      )}

      {/* Interactive Bit Grid */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-primary">{t.baseConverter.interactiveBitGrid}</h3>
            <p className="text-xs text-secondary">{t.baseConverter.bitGridHint}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setValue(0n)}
              className="text-xs px-2.5 py-1 rounded bg-surface-subtle hover:bg-hover text-secondary hover:text-primary transition-colors flex items-center gap-1 border border-subtle"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.baseConverter.clear}</span>
            </button>
            <button
              type="button"
              onClick={() => setValue(invertBits(value, width))}
              className="text-xs px-2.5 py-1 rounded bg-surface-subtle hover:bg-hover text-secondary hover:text-primary transition-colors flex items-center gap-1 border border-subtle"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{t.baseConverter.invertAll}</span>
            </button>
          </div>
        </div>

        {/* Bit Cells Grid (Always LTR) */}
        <div className="code-ltr overflow-x-auto pb-1" dir="ltr">
          <div className="inline-flex flex-col gap-1.5 min-w-full">
            {Array.from({ length: Math.ceil(bitLength / 16) }, (_, rowIndex) => {
              const startBit = bitLength - 1 - rowIndex * 16;
              const rowBits = Array.from({ length: Math.min(16, startBit + 1) }, (_, bi) => startBit - bi);

              return (
                <div key={rowIndex} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted font-mono w-10 text-right shrink-0">
                    [{rowBits[0]}:{rowBits[rowBits.length - 1]}]
                  </span>
                  <div className="flex items-center gap-1">
                    {rowBits.map((bitIndex, idx) => {
                      const bitVal = getBit(value, bitIndex);
                      const isNibbleBoundary = (bitIndex + 1) % 4 === 0 && idx !== 0;

                      return (
                        <React.Fragment key={bitIndex}>
                          {isNibbleBoundary && <div className="w-1.5" />}
                          <button
                            type="button"
                            onClick={() => setValue(toggleBit(value, bitIndex, width))}
                            className={`w-7 h-9 flex flex-col items-center justify-between py-1 rounded font-mono text-xs border transition-colors ${
                              bitVal === 1
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-canvas border-subtle text-muted hover:border-secondary hover:text-secondary'
                            }`}
                            title={`Bit ${bitIndex} (2^${bitIndex} = ${(1n << BigInt(bitIndex)).toString()})`}
                          >
                            <span className="text-[9px] text-muted leading-none">{bitIndex}</span>
                            <span className="leading-none text-xs">{bitVal}</span>
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bitwise Transforms & Presets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bitwise Transforms */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {t.baseConverter.bitwiseOps}
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setValue(shiftLeft(value, width))}
              className="px-2.5 py-1.5 text-xs font-mono rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-3 h-3 text-cyan-400" />
              <span>SHL &lt;&lt; 1</span>
            </button>
            <button
              type="button"
              onClick={() => setValue(shiftRight(value, width))}
              className="px-2.5 py-1.5 text-xs font-mono rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-3 h-3 text-cyan-400" />
              <span>SHR &gt;&gt; 1</span>
            </button>
            <button
              type="button"
              onClick={() => setValue(swapEndianness(value, width))}
              className="px-2.5 py-1.5 text-xs font-mono rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>SWAP_ENDIAN</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <h4 className="text-xs font-semibold text-secondary uppercase tracking-wider">
            {t.baseConverter.presets}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: '0x00', val: 0n },
              { label: '0xFF', val: 0xffn },
              { label: '0xAA (1010)', val: width === 8 ? 0xaan : width === 16 ? 0xaaaan : 0xaaaa_aaaan },
              { label: '0x55 (0101)', val: width === 8 ? 0x55n : width === 16 ? 0x5555n : 0x5555_5555n },
              { label: 'MSB Set', val: 1n << BigInt(width - 1) },
              { label: 'LSB Set', val: 1n },
              { label: 'All 1s', val: clampToWidth(~0n, width) },
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setValue(clampToWidth(p.val, width))}
                className="px-2.5 py-1 text-xs font-mono rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-cyan-400 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* IEEE-754 Single-Precision Float32 Analyzer (if width >= 32) */}
      {floatAnalysis && (
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              <span>{t.baseConverter.float32Preview}</span>
            </h4>
            <div className="code-ltr text-sm font-mono font-bold text-pink-400">
              {floatAnalysis.isSpecial ? (
                <span className="bg-pink-950/40 text-pink-300 px-2 py-0.5 rounded border border-pink-800">
                  {floatAnalysis.specialText}
                </span>
              ) : (
                <span>{floatAnalysis.floatValue.toPrecision(7)}</span>
              )}
            </div>
          </div>

          <div className="code-ltr grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono pt-1" dir="ltr">
            <div className="bg-canvas p-2.5 rounded border border-subtle">
              <div className="text-muted text-[10px] mb-1">{t.baseConverter.signBit} (Bit 31)</div>
              <div className="text-primary font-bold">{floatAnalysis.sign} ({floatAnalysis.sign === 0 ? '+ Positive' : '- Negative'})</div>
            </div>
            <div className="bg-canvas p-2.5 rounded border border-subtle">
              <div className="text-muted text-[10px] mb-1">{t.baseConverter.exponent} (Bits 30-23)</div>
              <div className="text-primary font-bold">
                0x{floatAnalysis.exponent.toString(16).padStart(2, '0')} (Dec: {floatAnalysis.exponent}, Exp: {floatAnalysis.exponent - 127})
              </div>
            </div>
            <div className="bg-canvas p-2.5 rounded border border-subtle">
              <div className="text-muted text-[10px] mb-1">{t.baseConverter.fraction} (Bits 22-0)</div>
              <div className="text-primary font-bold truncate">
                0x{floatAnalysis.fraction.toString(16).padStart(6, '0')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Derivations (Expandable) */}
      <div className="bg-surface rounded-lg border border-subtle overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-primary">{t.common.stepByStep}</span>
          </div>
          {showSteps ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
        </button>

        {showSteps && (
          <div className="p-4 border-t border-subtle space-y-4 bg-canvas/30">
            {/* Step Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-subtle pb-2">
              <button
                type="button"
                onClick={() => setActiveStepTab('twos')}
                className={`text-xs px-3 py-1 rounded transition-colors font-medium ${
                  activeStepTab === 'twos' ? 'bg-cyan-500/20 text-cyan-400' : 'text-secondary hover:text-primary'
                }`}
              >
                Two&apos;s Complement
              </button>
              {floatAnalysis && (
                <button
                  type="button"
                  onClick={() => setActiveStepTab('float')}
                  className={`text-xs px-3 py-1 rounded transition-colors font-medium ${
                    activeStepTab === 'float' ? 'bg-pink-500/20 text-pink-400' : 'text-secondary hover:text-primary'
                  }`}
                >
                  IEEE-754 Single Precision
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveStepTab('endian')}
                className={`text-xs px-3 py-1 rounded transition-colors font-medium ${
                  activeStepTab === 'endian' ? 'bg-amber-500/20 text-amber-400' : 'text-secondary hover:text-primary'
                }`}
              >
                Endianness Swap
              </button>
            </div>

            {/* Step Content */}
            <div className="code-ltr text-xs font-mono space-y-1.5 text-secondary" dir="ltr">
              {activeStepTab === 'twos' && (
                <div className="space-y-1">
                  <div className="text-primary font-semibold mb-2">Two&apos;s Complement Calculation for {decSignedStr}:</div>
                  {twosDerivation.steps.map((st, i) => (
                    <div key={i} className="p-1.5 rounded bg-surface border border-subtle text-primary">
                      {st}
                    </div>
                  ))}
                </div>
              )}

              {activeStepTab === 'float' && floatAnalysis && (
                <div className="space-y-1">
                  <div className="text-primary font-semibold mb-2">IEEE-754 Extraction for 0x{hexStr}:</div>
                  {floatAnalysis.steps.map((st, i) => (
                    <div key={i} className="p-1.5 rounded bg-surface border border-subtle text-primary">
                      {st}
                    </div>
                  ))}
                </div>
              )}

              {activeStepTab === 'endian' && (
                <div className="space-y-1">
                  <div className="text-primary font-semibold mb-2">Byte-Level Endianness Reversal:</div>
                  {endianSteps.map((st, i) => (
                    <div key={i} className="p-1.5 rounded bg-surface border border-subtle text-primary">
                      {st}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
