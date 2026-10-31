import React, { useState } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Bookmark, 
  ArrowRight, 
  Sliders, 
  Info, 
  Activity,
  Maximize2
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  calculateAdcDacSpec, 
  convertVoltageToCode, 
  convertCodeToVoltage,
  AdcDacSpec 
} from '../../lib/adcdacCalc';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const AdcDacView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [resolutionBits, setResolutionBits] = useState<number>(12);
  const [vref, setVref] = useState<number>(3.3);
  const [inputVoltage, setInputVoltage] = useState<number>(1.65);
  const [inputCode, setInputCode] = useState<number>(2048);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [activeDirection, setActiveDirection] = useState<'v2c' | 'c2v'>('v2c');

  const spec: AdcDacSpec = React.useMemo(() => {
    return calculateAdcDacSpec({ resolutionBits, vref });
  }, [resolutionBits, vref]);

  const v2cResult = React.useMemo(() => {
    return convertVoltageToCode(inputVoltage, { resolutionBits, vref });
  }, [inputVoltage, resolutionBits, vref]);

  const c2vResult = React.useMemo(() => {
    return convertCodeToVoltage(inputCode, { resolutionBits, vref });
  }, [inputCode, resolutionBits, vref]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `ADC/DAC Spec: ${resolutionBits}-bit @ ${vref}V`;
    const content = [
      `# ${title}`,
      `- Resolution: ${resolutionBits}-bit (${spec.totalCodes.toLocaleString()} total levels)`,
      `- Vref: ${vref} V`,
      `- 1 LSB Step Size: ${spec.lsbMilliVolts >= 1 ? `${spec.lsbMilliVolts.toFixed(4)} mV` : `${spec.lsbMicroVolts.toFixed(2)} µV`}`,
      `- Max Quantization Error: ±0.5 LSB (±${(spec.quantizationErrorVolts * 1000).toFixed(4)} mV)`,
      `- Theoretical SNR: ${spec.theoreticalSNR_dB.toFixed(2)} dB`,
      `- RMS Noise Floor: ${(spec.rmsNoiseVolts * 1000000).toFixed(2)} µV_rms`,
      `\n### Sample Conversion:`,
      activeDirection === 'v2c'
        ? `- Analog In: ${inputVoltage}V -> Code: ${v2cResult.code} (${v2cResult.codeHex}), Reconstituted: ${v2cResult.reconstitutedVoltage.toFixed(5)}V`
        : `- Digital In: ${inputCode} -> Analog Out: ${c2vResult.outputVoltage.toFixed(5)}V`,
      `\n### Mathematical Working:\n` + spec.steps.join('\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['adc', 'dac', 'quantization', `${resolutionBits}-bit`]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const vrefPresets = [1.024, 1.8, 2.048, 2.5, 3.3, 5.0];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <span>{t.adcdacCalc.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.adcdacCalc.description}</p>
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

      {/* Converter Specifications Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Resolution Bits Picker */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.adcdacCalc.resolution}
            </label>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {resolutionBits}-bit ({spec.totalCodes.toLocaleString()} steps)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[8, 10, 12, 14, 16, 24].map((bits) => (
              <button
                key={bits}
                type="button"
                onClick={() => {
                  setResolutionBits(bits);
                  setInputCode((prev) => Math.min(prev, Math.pow(2, bits) - 1));
                }}
                className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors border ${
                  resolutionBits === bits
                    ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs'
                    : 'bg-canvas border-subtle text-secondary hover:text-primary hover:bg-hover'
                }`}
              >
                {bits}-bit
              </button>
            ))}
          </div>
        </div>

        {/* Reference Voltage (Vref) */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.adcdacCalc.referenceVoltage}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.001"
                min="0.1"
                max="50"
                value={vref}
                onChange={(e) => setVref(Math.max(0.1, Number(e.target.value) || 3.3))}
                className="code-ltr w-20 px-2 py-0.5 bg-canvas border border-subtle rounded text-xs font-mono text-amber-300 text-right focus:outline-none focus:border-amber-500"
              />
              <span className="text-xs font-mono text-muted">V</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {vrefPresets.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVref(v)}
                className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                  vref === v
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-canvas border-subtle text-secondary hover:text-primary hover:bg-hover'
                }`}
              >
                {v}V
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fundamental Specifications Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1 LSB Step Size */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.adcdacCalc.lsbStepSize}</span>
            <button
              type="button"
              onClick={() => handleCopy(`${spec.lsbVoltage.toPrecision(7)} V`, 'lsb')}
              className="hover:text-primary"
            >
              {copiedKey === 'lsb' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-cyan-400" dir="ltr">
            {spec.lsbMilliVolts >= 1
              ? `${spec.lsbMilliVolts.toFixed(3)} mV`
              : `${spec.lsbMicroVolts.toFixed(2)} µV`}
          </div>
          <div className="text-[11px] font-mono text-muted truncate">
            = {spec.lsbVoltage.toPrecision(6)} Volts
          </div>
        </div>

        {/* Quantization Error */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.adcdacCalc.quantizationError}</span>
            <button
              type="button"
              onClick={() => handleCopy(`±${spec.quantizationErrorVolts.toPrecision(5)} V`, 'qe')}
              className="hover:text-primary"
            >
              {copiedKey === 'qe' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-amber-400" dir="ltr">
            ±{(spec.quantizationErrorVolts * 1000).toFixed(3)} mV
          </div>
          <div className="text-[11px] font-mono text-muted">
            RMS Noise: {(spec.rmsNoiseVolts * 1000000).toFixed(1)} µV_rms
          </div>
        </div>

        {/* Theoretical SNR */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.adcdacCalc.theoreticalSNR}</span>
            <button
              type="button"
              onClick={() => handleCopy(`${spec.theoreticalSNR_dB.toFixed(2)} dB`, 'snr')}
              className="hover:text-primary"
            >
              {copiedKey === 'snr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-emerald-400" dir="ltr">
            {spec.theoreticalSNR_dB.toFixed(2)} dB
          </div>
          <div className="text-[11px] font-mono text-muted">
            6.02 × {resolutionBits} + 1.76 dB
          </div>
        </div>
      </div>

      {/* Interactive Conversion Simulator */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-5">
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-primary">Interactive Conversion Sandbox</h3>
          </div>

          <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-lg border border-subtle">
            <button
              type="button"
              onClick={() => setActiveDirection('v2c')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeDirection === 'v2c'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Voltage → Code (ADC)
            </button>
            <button
              type="button"
              onClick={() => setActiveDirection('c2v')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                activeDirection === 'c2v'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Code → Voltage (DAC)
            </button>
          </div>
        </div>

        {activeDirection === 'v2c' ? (
          /* ADC: Voltage to Code */
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="text-secondary font-semibold">
                  {t.adcdacCalc.voltageInput}: {inputVoltage.toFixed(4)} V
                </label>
                <span className="text-cyan-400 font-bold">{v2cResult.percentageFullScale.toFixed(2)}% of Full Scale</span>
              </div>
              <input
                type="range"
                min="0"
                max={vref}
                step={spec.lsbVoltage / 2}
                value={inputVoltage}
                onChange={(e) => setInputVoltage(Number(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-canvas rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                <span>0.0000 V</span>
                <span>Mid: {(vref / 2).toFixed(4)} V</span>
                <span>Vref: {vref.toFixed(4)} V</span>
              </div>
            </div>

            {/* ADC Conversion Output Display */}
            <div className="code-ltr grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2" dir="ltr">
              <div className="bg-canvas p-3 rounded border border-subtle">
                <span className="text-[10px] text-muted block mb-1">Decimal Code</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">{v2cResult.code}</span>
              </div>
              <div className="bg-canvas p-3 rounded border border-subtle">
                <span className="text-[10px] text-muted block mb-1">Hexadecimal</span>
                <span className="text-lg font-bold text-purple-400 font-mono">{v2cResult.codeHex}</span>
              </div>
              <div className="bg-canvas p-3 rounded border border-subtle">
                <span className="text-[10px] text-muted block mb-1">Reconstituted Voltage</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {v2cResult.reconstitutedVoltage.toFixed(4)} V
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* DAC: Code to Voltage */
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <label className="text-secondary font-semibold">
                  {t.adcdacCalc.codeInput}: {inputCode} (Max: {spec.maxCode})
                </label>
                <span className="text-purple-400 font-bold">{c2vResult.percentageFullScale.toFixed(2)}% of Full Scale</span>
              </div>
              <input
                type="range"
                min="0"
                max={spec.maxCode}
                step="1"
                value={inputCode}
                onChange={(e) => setInputCode(Number(e.target.value))}
                className="w-full accent-purple-500 h-2 bg-canvas rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                <span>Code 0</span>
                <span>Code {Math.floor(spec.maxCode / 2)}</span>
                <span>Code {spec.maxCode}</span>
              </div>
            </div>

            {/* DAC Output Display */}
            <div className="code-ltr bg-canvas p-4 rounded border border-subtle flex items-center justify-between" dir="ltr">
              <div>
                <span className="text-xs text-muted block mb-1">Generated Output Voltage</span>
                <span className="text-2xl font-bold font-mono text-purple-400">
                  {c2vResult.outputVoltage.toFixed(5)} V
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(`${c2vResult.outputVoltage.toFixed(5)} V`, 'dacOut')}
                className="px-3 py-1.5 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
              >
                {copiedKey === 'dacOut' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step-by-Step Derivation */}
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
            {spec.steps.map((st, i) => (
              <div key={i} className="p-2 bg-canvas rounded border border-subtle text-primary">
                {st}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
