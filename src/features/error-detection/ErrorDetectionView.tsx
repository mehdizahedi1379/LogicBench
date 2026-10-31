import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Bookmark, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Hash,
  Terminal,
  Activity
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  CRC_PRESETS, 
  CRCPreset, 
  computeCRC, 
  computeChecksums, 
  encodeHamming74, 
  decodeHamming74,
  Hamming74State
} from '../../lib/errorCorrection';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const ErrorDetectionView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'crc' | 'checksum' | 'hamming'>('crc');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // CRC & Checksum States
  const [selectedPresetId, setSelectedPresetId] = useState<string>('crc-32-ieee');
  const [rawInput, setRawInput] = useState<string>('123456789');
  const [isHexMode, setIsHexMode] = useState<boolean>(false);

  // Hamming(7,4) States
  const [hammingDataBits, setHammingDataBits] = useState<number[]>([1, 0, 1, 1]);
  const [injectedErrorPos, setInjectedErrorPos] = useState<number>(0); // 0 = clean, 1..7 = error position

  const activePreset = CRC_PRESETS.find((p) => p.id === selectedPresetId) || CRC_PRESETS[0];

  // Convert input string to bytes
  const inputBytes = React.useMemo(() => {
    if (isHexMode) {
      const clean = rawInput.replace(/[^0-9a-fA-F]/g, '');
      const byteList: number[] = [];
      for (let i = 0; i < clean.length; i += 2) {
        byteList.push(parseInt(clean.slice(i, i + 2) || '0', 16));
      }
      return new Uint8Array(byteList);
    } else {
      return new TextEncoder().encode(rawInput);
    }
  }, [rawInput, isHexMode]);

  const crcCalculation = React.useMemo(() => {
    return computeCRC(inputBytes, activePreset);
  }, [inputBytes, activePreset]);

  const checksumResults = React.useMemo(() => {
    return computeChecksums(inputBytes);
  }, [inputBytes]);

  const encodedHammingCodeword = React.useMemo(() => {
    return encodeHamming74(hammingDataBits);
  }, [hammingDataBits]);

  const hammingDecoded: Hamming74State = React.useMemo(() => {
    return decodeHamming74(encodedHammingCodeword, injectedErrorPos);
  }, [encodedHammingCodeword, injectedErrorPos]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    let title = '';
    let content = '';

    if (activeTab === 'crc') {
      title = `CRC Checksum: ${activePreset.name} -> ${crcCalculation.hexStr}`;
      content = [
        `# ${title}`,
        `- Preset: ${activePreset.name}`,
        `- Polynomial: 0x${activePreset.poly.toString(16).toUpperCase()}`,
        `- Input: "${rawInput}" (${inputBytes.length} bytes)`,
        `- Calculated CRC: \`${crcCalculation.hexStr}\``,
        `- Check Value for "123456789": \`${activePreset.checkValue123456789}\``,
        `\n### Step-by-Step CRC Execution:\n` + crcCalculation.steps.join('\n'),
      ].join('\n');
    } else if (activeTab === 'checksum') {
      title = `Checksum & Parity: "${rawInput}"`;
      content = [
        `# ${title}`,
        `- Input: "${rawInput}"`,
        `- Even Parity Bit: ${checksumResults.evenParityBit}`,
        `- Odd Parity Bit: ${checksumResults.oddParityBit}`,
        `- LRC / XOR: \`0x${checksumResults.xorChecksum.toString(16).toUpperCase()}\``,
        `- Internet Checksum (RFC 1071): \`0x${checksumResults.internetChecksumRFC1071.toString(16).toUpperCase()}\``,
        `- Fletcher-16: \`0x${checksumResults.fletcher16.toString(16).toUpperCase()}\``,
        `\n### Execution Trace:\n` + checksumResults.steps.join('\n'),
      ].join('\n');
    } else {
      title = `Hamming(7,4) SECDED: [${hammingDataBits.join('')}]`;
      content = [
        `# ${title}`,
        `- Original 4 Data Bits: \`[${hammingDataBits.join(', ')}]\``,
        `- Encoded 7-bit Codeword: \`[${encodedHammingCodeword.join(', ')}]\``,
        `- Injected Error Bit Position: ${injectedErrorPos === 0 ? 'Clean (None)' : `Bit ${injectedErrorPos}`}`,
        `- Received Codeword: \`[${hammingDecoded.receivedCodeword.join(', ')}]\``,
        `- Calculated Syndrome: ${hammingDecoded.syndrome}`,
        `- Recovered Data: \`[${hammingDecoded.recoveredDataBits.join(', ')}]\``,
        `\n### Hamming Derivation Steps:\n` + hammingDecoded.steps.join('\n'),
      ].join('\n');
    }

    await saveToolResultToNotes(title, content, ['error-correction', activeTab]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const isCheckValueMatch = rawInput === '123456789' && !isHexMode && crcCalculation.hexStr === activePreset.checkValue123456789;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>{t.errorCorrection.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.errorCorrection.description}</p>
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

      {/* Sub-Tabs: CRC vs Checksums vs Hamming */}
      <div className="flex items-center gap-2 border-b border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('crc')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'crc'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t.errorCorrection.tabCRC}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checksum')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'checksum'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>{t.errorCorrection.tabChecksum}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hamming')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'hamming'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t.errorCorrection.tabHamming}</span>
        </button>
      </div>

      {/* TAB 1: CRC POLYNOMIALS */}
      {activeTab === 'crc' && (
        <div className="space-y-6">
          {/* Preset Selector */}
          <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.errorCorrection.crcAlgorithm}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CRC_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPresetId(p.id)}
                  className={`p-2.5 rounded-lg border text-left transition-colors space-y-1 ${
                    selectedPresetId === p.id
                      ? 'border-cyan-500 bg-cyan-950/20 text-primary'
                      : 'border-subtle bg-canvas text-secondary hover:border-secondary hover:text-primary'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{p.name}</div>
                  <div className="code-ltr text-[11px] font-mono text-muted flex items-center justify-between" dir="ltr">
                    <span>Poly: 0x{p.poly.toString(16).toUpperCase()}</span>
                    <span>{p.width}-bit</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Data Payload */}
          <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase text-secondary">
                {t.errorCorrection.inputData}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsHexMode(false)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    !isHexMode ? 'bg-surface-subtle text-primary font-bold' : 'text-muted hover:text-secondary'
                  }`}
                >
                  {t.errorCorrection.inputFormatText}
                </button>
                <button
                  type="button"
                  onClick={() => setIsHexMode(true)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    isHexMode ? 'bg-surface-subtle text-primary font-bold' : 'text-muted hover:text-secondary'
                  }`}
                >
                  {t.errorCorrection.inputFormatHex}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHexMode(false);
                    setRawInput('123456789');
                  }}
                  className="text-xs px-2.5 py-1 rounded bg-canvas border border-subtle text-cyan-400 hover:text-cyan-300"
                >
                  {t.errorCorrection.standardCheckVector}
                </button>
              </div>
            </div>

            <input
              type="text"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={t.errorCorrection.inputDataPlaceholder}
              className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Calculated CRC Result Card */}
          <div className="bg-surface rounded-lg p-5 border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase text-secondary">
                  {t.errorCorrection.crcResult} ({activePreset.name})
                </span>
                <div className="code-ltr text-2xl font-mono font-bold text-cyan-400 mt-1" dir="ltr">
                  {crcCalculation.hexStr}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(crcCalculation.hexStr, 'crc')}
                  className="px-3 py-1.5 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  {copiedKey === 'crc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'crc' ? t.common.copied : t.common.copyResult}</span>
                </button>
              </div>
            </div>

            {/* Standard Vector Validation Indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-subtle text-xs">
              {isCheckValueMatch ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Standard Check Vector MATCH: &quot;123456789&quot; matches standardized {activePreset.checkValue123456789} exactly.</span>
                </div>
              ) : (
                <div className="text-muted text-[11px] font-mono">
                  Standard Check Vector for &quot;123456789&quot;: <strong className="text-secondary">{activePreset.checkValue123456789}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PARITY & CHECKSUMS */}
      {activeTab === 'checksum' && (
        <div className="space-y-6">
          {/* Payload Input */}
          <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.errorCorrection.inputData}
            </label>
            <input
              type="text"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="code-ltr w-full bg-canvas border border-subtle rounded px-3 py-2 text-sm text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Checksum Result Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface p-4 rounded-lg border border-subtle space-y-1">
              <span className="text-[11px] font-mono uppercase text-muted">{t.errorCorrection.evenParity}</span>
              <div className="code-ltr text-xl font-bold font-mono text-emerald-400" dir="ltr">
                {checksumResults.evenParityBit}
              </div>
              <p className="text-[10px] text-secondary">Adds bit so total 1s is even</p>
            </div>

            <div className="bg-surface p-4 rounded-lg border border-subtle space-y-1">
              <span className="text-[11px] font-mono uppercase text-muted">{t.errorCorrection.oddParity}</span>
              <div className="code-ltr text-xl font-bold font-mono text-amber-400" dir="ltr">
                {checksumResults.oddParityBit}
              </div>
              <p className="text-[10px] text-secondary">Adds bit so total 1s is odd</p>
            </div>

            <div className="bg-surface p-4 rounded-lg border border-subtle space-y-1">
              <span className="text-[11px] font-mono uppercase text-muted">LRC / XOR Checksum</span>
              <div className="code-ltr text-xl font-bold font-mono text-purple-400" dir="ltr">
                0x{checksumResults.xorChecksum.toString(16).padStart(2, '0').toUpperCase()}
              </div>
              <p className="text-[10px] text-secondary">Longitudinal bitwise XOR</p>
            </div>

            <div className="bg-surface p-4 rounded-lg border border-subtle space-y-1">
              <span className="text-[11px] font-mono uppercase text-muted">8-bit Modular Sum</span>
              <div className="code-ltr text-xl font-bold font-mono text-cyan-400" dir="ltr">
                0x{checksumResults.sum8Bit.toString(16).padStart(2, '0').toUpperCase()}
              </div>
              <p className="text-[10px] text-secondary">Two&apos;s comp: 0x{checksumResults.twosComplementSum8.toString(16).padStart(2, '0').toUpperCase()}</p>
            </div>
          </div>

          {/* 16-Bit Network & Storage Checksums */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface p-5 rounded-lg border border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase">
                  {t.errorCorrection.internetChecksum}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(`0x${checksumResults.internetChecksumRFC1071.toString(16).padStart(4, '0').toUpperCase()}`, 'rfc')}
                  className="text-xs text-muted hover:text-primary flex items-center gap-1"
                >
                  {copiedKey === 'rfc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="code-ltr text-2xl font-mono font-bold text-amber-400" dir="ltr">
                0x{checksumResults.internetChecksumRFC1071.toString(16).padStart(4, '0').toUpperCase()}
              </div>
              <p className="text-xs text-muted">Used in IPv4 header, TCP, and UDP packet checksum verification.</p>
            </div>

            <div className="bg-surface p-5 rounded-lg border border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-secondary uppercase">
                  {t.errorCorrection.fletcher16}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(`0x${checksumResults.fletcher16.toString(16).padStart(4, '0').toUpperCase()}`, 'fletcher')}
                  className="text-xs text-muted hover:text-primary flex items-center gap-1"
                >
                  {copiedKey === 'fletcher' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="code-ltr text-2xl font-mono font-bold text-purple-400" dir="ltr">
                0x{checksumResults.fletcher16.toString(16).padStart(4, '0').toUpperCase()}
              </div>
              <p className="text-xs text-muted">High-speed dual accumulator checksum used in network protocols.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HAMMING CODE SECDED */}
      {activeTab === 'hamming' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-lg p-5 border border-subtle space-y-2">
            <h3 className="text-sm font-bold text-primary">{t.errorCorrection.hammingTitle}</h3>
            <p className="text-xs text-secondary leading-relaxed">{t.errorCorrection.hammingDesc}</p>
          </div>

          {/* 4 Data Bits Input */}
          <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase">
                {t.errorCorrection.dataBits4}
              </span>
              <span className="text-xs text-muted font-mono">Click bits to toggle</span>
            </div>
            <div className="code-ltr flex items-center gap-2" dir="ltr">
              {[0, 1, 2, 3].map((idx) => {
                const b = hammingDataBits[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      const next = [...hammingDataBits];
                      next[idx] = next[idx] === 1 ? 0 : 1;
                      setHammingDataBits(next);
                    }}
                    className={`w-12 h-14 rounded-lg font-mono text-base font-bold border flex flex-col items-center justify-between p-1.5 transition-colors ${
                      b === 1
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-canvas border-subtle text-muted hover:border-secondary'
                    }`}
                  >
                    <span className="text-[10px] text-muted font-normal">d{idx + 1}</span>
                    <span>{b}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7-Bit Encoded Codeword & Error Injection */}
          <div className="bg-surface rounded-lg p-5 border border-subtle space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold uppercase text-secondary">
                  {t.errorCorrection.encodedCodeword7}
                </span>
                <p className="text-[11px] text-muted">{t.errorCorrection.injectErrorPrompt}</p>
              </div>

              <button
                type="button"
                onClick={() => setInjectedErrorPos(0)}
                className="text-xs px-2.5 py-1 rounded bg-surface-subtle border border-subtle text-secondary hover:text-primary self-start sm:self-auto"
              >
                Reset to Clean
              </button>
            </div>

            {/* Interactive Codeword Bit Cells (Positions 1 to 7) */}
            <div className="code-ltr flex flex-wrap items-center gap-2" dir="ltr">
              {hammingDecoded.receivedCodeword.map((bitVal, i) => {
                const bitPos = i + 1; // 1-indexed
                const isParity = bitPos === 1 || bitPos === 2 || bitPos === 4;
                const isFlipped = injectedErrorPos === bitPos;

                return (
                  <button
                    key={bitPos}
                    type="button"
                    onClick={() => setInjectedErrorPos(injectedErrorPos === bitPos ? 0 : bitPos)}
                    className={`w-14 h-16 rounded-lg font-mono border flex flex-col items-center justify-between p-1.5 transition-all ${
                      isFlipped
                        ? 'bg-red-500/30 border-red-500 text-red-300 scale-105 shadow-md ring-2 ring-red-500'
                        : isParity
                        ? 'bg-purple-950/20 border-purple-800/60 text-purple-300 hover:border-purple-500'
                        : 'bg-canvas border-subtle text-primary hover:border-cyan-500'
                    }`}
                  >
                    <span className="text-[10px] text-muted">
                      {isParity ? `p${bitPos}` : `d${bitPos === 3 ? 1 : bitPos === 5 ? 2 : bitPos === 6 ? 3 : 4}`} (Bit {bitPos})
                    </span>
                    <span className="text-lg font-bold">{bitVal}</span>
                    <span className="text-[9px] uppercase font-mono text-muted">
                      {isFlipped ? 'CORRUPT' : isParity ? 'Parity' : 'Data'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Syndrome Analysis & Auto-Correction Result */}
          <div className={`rounded-lg p-5 border space-y-3 ${
            hammingDecoded.hasError ? 'bg-amber-950/20 border-amber-500/50' : 'bg-surface border-emerald-500/40'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hammingDecoded.hasError ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-sm font-bold text-primary">
                  {hammingDecoded.hasError
                    ? `${t.errorCorrection.errorDetectedAt} ${hammingDecoded.syndrome}`
                    : t.errorCorrection.noErrorDetected}
                </span>
              </div>
              <div className="code-ltr text-xs font-mono px-2 py-0.5 rounded bg-canvas border border-subtle" dir="ltr">
                Syndrome: {hammingDecoded.syndrome} (0b{hammingDecoded.syndrome.toString(2).padStart(3, '0')})
              </div>
            </div>

            <div className="code-ltr grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-mono" dir="ltr">
              <div className="bg-canvas p-3 rounded border border-subtle">
                <span className="text-muted text-[10px] block mb-1">Corrected Codeword:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  [{hammingDecoded.correctedCodeword.join(', ')}]
                </span>
              </div>
              <div className="bg-canvas p-3 rounded border border-subtle">
                <span className="text-muted text-[10px] block mb-1">{t.errorCorrection.correctedData}:</span>
                <span className="text-cyan-400 font-bold text-sm">
                  [{hammingDecoded.recoveredDataBits.join(', ')}]
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Mathematical Derivations */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between text-left text-sm font-semibold text-primary"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>{t.common.stepByStep}</span>
          </div>
          <span className="text-xs text-secondary font-mono">{showSteps ? 'Hide' : 'Show'}</span>
        </button>

        {showSteps && (
          <div className="code-ltr text-xs font-mono space-y-1 text-secondary pt-2 border-t border-subtle" dir="ltr">
            {activeTab === 'crc' && crcCalculation.steps.map((st, i) => (
              <div key={i} className="p-1.5 bg-canvas rounded border border-subtle text-primary">
                {st}
              </div>
            ))}
            {activeTab === 'checksum' && checksumResults.steps.map((st, i) => (
              <div key={i} className="p-1.5 bg-canvas rounded border border-subtle text-primary">
                {st}
              </div>
            ))}
            {activeTab === 'hamming' && hammingDecoded.steps.map((st, i) => (
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
