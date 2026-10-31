import React, { useState } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Bookmark, 
  Clock, 
  Info, 
  Activity, 
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  calculateSpiTiming, 
  calculateI2cPullup, 
  I2cSpeedMode 
} from '../../lib/spiI2cHelper';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const SpiI2cView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'spi' | 'i2c'>('spi');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // SPI State
  const [spiPclkHz, setSpiPclkHz] = useState<number>(84000000); // 84 MHz
  const [spiDivider, setSpiDivider] = useState<number>(4); // /4 -> 21MHz
  const [spiWordSize, setSpiWordSize] = useState<8 | 16>(8);
  const [spiPayloadBytes, setSpiPayloadBytes] = useState<number>(1024);
  const [spiInterByteDelayUs, setSpiInterByteDelayUs] = useState<number>(0.5);

  // I2C Pullup State
  const [i2cVdd, setI2cVdd] = useState<number>(3.3);
  const [i2cBusCapacitancePf, setI2cBusCapacitancePf] = useState<number>(120);
  const [i2cMode, setI2cMode] = useState<I2cSpeedMode>('fast');

  const spiResult = React.useMemo(() => {
    return calculateSpiTiming({
      pclkHz: spiPclkHz,
      divider: spiDivider,
      wordSizeBits: spiWordSize,
      payloadBytes: spiPayloadBytes,
      interByteDelayUs: spiInterByteDelayUs,
    });
  }, [spiPclkHz, spiDivider, spiWordSize, spiPayloadBytes, spiInterByteDelayUs]);

  const i2cResult = React.useMemo(() => {
    return calculateI2cPullup({
      vddVolts: i2cVdd,
      busCapacitancePf: i2cBusCapacitancePf,
      mode: i2cMode,
    });
  }, [i2cVdd, i2cBusCapacitancePf, i2cMode]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    let title = '';
    let content = '';

    if (activeTab === 'spi') {
      title = `SPI Timing: ${(spiResult.sckFrequencyHz / 1e6).toFixed(2)} MHz (${spiPayloadBytes} Bytes)`;
      content = [
        `# ${title}`,
        `- PCLK: ${spiPclkHz.toLocaleString()} Hz with Prescaler /${spiDivider}`,
        `- SCK Frequency: \`${(spiResult.sckFrequencyHz / 1e6).toFixed(3)} MHz\``,
        `- 1-Bit Period: \`${spiResult.bitDurationNs.toFixed(2)} ns\``,
        `- Word Size: ${spiWordSize}-bit | Payload: ${spiPayloadBytes} Bytes`,
        `- Inter-byte Delay: ${spiInterByteDelayUs} µs`,
        `- Total Transfer Time: \`${spiResult.totalTransferTimeMs.toFixed(3)} ms\``,
        `- Sustained Throughput: \`${spiResult.throughputKBSec.toFixed(2)} kB/s\``,
        `\n### Calculations:\n` + spiResult.steps.join('\n'),
      ].join('\n');
    } else {
      title = `I2C Pull-Up Sizing: ${i2cMode.toUpperCase()} @ ${i2cVdd}V (${i2cBusCapacitancePf}pF)`;
      content = [
        `# ${title}`,
        `- Supply Voltage: ${i2cVdd} V`,
        `- Bus Capacitance Cb: ${i2cBusCapacitancePf} pF`,
        `- Mode: ${i2cMode.toUpperCase()} (Max tr: ${i2cResult.maxRiseTimeNs} ns)`,
        `- Minimum Pull-up (Rp_min): \`${i2cResult.rpMinOhms.toLocaleString()} Ω\``,
        `- Maximum Pull-up (Rp_max): \`${i2cResult.rpMaxOhms.toLocaleString()} Ω\``,
        `- Recommended E24 Resistors: \`${i2cResult.recommendedE24.join(' Ω, ')} Ω\``,
        `\n### Mathematical Working:\n` + i2cResult.steps.join('\n'),
      ].join('\n');
    }

    await saveToolResultToNotes(title, content, ['bus', activeTab]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <span>{t.spiI2c.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.spiI2c.description}</p>
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

      {/* Mode Sub-Tabs: SPI vs I2C */}
      <div className="flex items-center gap-2 border-b border-subtle pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('spi')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'spi'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{t.spiI2c.tabSpi}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('i2c')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'i2c'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-secondary hover:text-primary hover:bg-surface-subtle'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t.spiI2c.tabI2c}</span>
        </button>
      </div>

      {/* TAB 1: SPI TIMING */}
      {activeTab === 'spi' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* PCLK Clock Input */}
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
              <label className="text-xs font-semibold uppercase text-secondary">
                {t.spiI2c.spiClockSource}
              </label>
              <input
                type="number"
                value={spiPclkHz}
                onChange={(e) => setSpiPclkHz(Math.max(1, Number(e.target.value) || 1))}
                className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1">
                {[16000000, 48000000, 84000000, 125000000].map((clk) => (
                  <button
                    key={clk}
                    type="button"
                    onClick={() => setSpiPclkHz(clk)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                      spiPclkHz === clk ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-canvas border-subtle text-muted'
                    }`}
                  >
                    {clk / 1e6}M
                  </button>
                ))}
              </div>
            </div>

            {/* Prescaler */}
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
              <label className="text-xs font-semibold uppercase text-secondary">
                {t.spiI2c.spiPrescaler}
              </label>
              <select
                value={spiDivider}
                onChange={(e) => setSpiDivider(Number(e.target.value))}
                className="w-full px-3 py-2 bg-canvas border border-subtle rounded text-xs text-primary font-mono focus:border-cyan-500 focus:outline-none"
              >
                {[2, 4, 8, 16, 32, 64, 128, 256].map((div) => (
                  <option key={div} value={div}>
                    /{div} ({((spiPclkHz / div) / 1e6).toFixed(2)} MHz)
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-muted font-mono">
                Word Size: 
                <button
                  type="button"
                  onClick={() => setSpiWordSize(spiWordSize === 8 ? 16 : 8)}
                  className="ml-2 font-bold text-cyan-400 underline"
                >
                  {spiWordSize}-bit
                </button>
              </div>
            </div>

            {/* Payload & Delays */}
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs text-secondary font-semibold">
                <span>{t.spiI2c.payloadSize}</span>
                <span className="font-mono text-primary">{spiPayloadBytes} Bytes</span>
              </div>
              <input
                type="number"
                min="1"
                value={spiPayloadBytes}
                onChange={(e) => setSpiPayloadBytes(Math.max(1, Number(e.target.value) || 1))}
                className="code-ltr w-full px-3 py-1 bg-canvas border border-subtle rounded text-xs font-mono text-primary"
              />
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{t.spiI2c.interByteDelay}:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={spiInterByteDelayUs}
                  onChange={(e) => setSpiInterByteDelayUs(Math.max(0, Number(e.target.value) || 0))}
                  className="code-ltr w-16 px-1.5 py-0.5 bg-canvas border border-subtle rounded text-xs font-mono text-right"
                />
              </div>
            </div>
          </div>

          {/* SPI Output Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
              <span className="text-[11px] uppercase font-mono text-muted">{t.spiI2c.sckFrequency}</span>
              <div className="code-ltr text-2xl font-mono font-bold text-cyan-400" dir="ltr">
                {(spiResult.sckFrequencyHz / 1e6).toFixed(3)} MHz
              </div>
              <p className="text-[10px] text-muted">1-Bit Period: {spiResult.bitDurationNs.toFixed(2)} ns</p>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
              <span className="text-[11px] uppercase font-mono text-muted">{t.spiI2c.transferDuration}</span>
              <div className="code-ltr text-2xl font-mono font-bold text-amber-400" dir="ltr">
                {spiResult.totalTransferTimeMs.toFixed(3)} ms
              </div>
              <p className="text-[10px] text-muted">Raw Byte: {spiResult.byteTransmissionTimeUs.toFixed(2)} µs</p>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
              <span className="text-[11px] uppercase font-mono text-muted">{t.spiI2c.sustainedThroughput}</span>
              <div className="code-ltr text-2xl font-mono font-bold text-emerald-400" dir="ltr">
                {spiResult.throughputKBSec.toFixed(1)} kB/s
              </div>
              <p className="text-[10px] text-muted">Effective payload transfer rate</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: I2C PULL-UP SIZING */}
      {activeTab === 'i2c' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supply Voltage */}
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-secondary">
                  {t.spiI2c.i2cVoltage}
                </label>
                <span className="text-xs font-mono text-amber-400 font-bold">{i2cVdd.toFixed(1)} V</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[1.8, 3.3, 5.0].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setI2cVdd(v)}
                    className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                      i2cVdd === v ? 'bg-amber-600 border-amber-500 text-white' : 'bg-canvas border-subtle text-secondary'
                    }`}
                  >
                    {v}V
                  </button>
                ))}
              </div>
            </div>

            {/* Bus Capacitance Cb */}
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase text-secondary">
                  {t.spiI2c.i2cBusCapacitance}
                </label>
                <span className="text-xs font-mono text-cyan-400 font-bold">{i2cBusCapacitancePf} pF</span>
              </div>
              <input
                type="range"
                min="20"
                max="500"
                value={i2cBusCapacitancePf}
                onChange={(e) => setI2cBusCapacitancePf(Number(e.target.value))}
                className="w-full accent-cyan-500 h-2 bg-canvas rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                <span>20 pF (Direct)</span>
                <span>200 pF (Cable)</span>
                <span>400 pF (Max Spec)</span>
              </div>
            </div>

            {/* Bus Speed Mode */}
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
              <label className="text-xs font-semibold uppercase text-secondary">
                {t.spiI2c.i2cMode}
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'standard' as const, label: '100k Sm' },
                  { id: 'fast' as const, label: '400k Fm' },
                  { id: 'fast_plus' as const, label: '1M Fm+' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setI2cMode(m.id)}
                    className={`py-1.5 text-xs font-medium rounded border transition-colors ${
                      i2cMode === m.id ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-canvas border-subtle text-secondary'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted font-mono">
                Max tr: {i2cResult.maxRiseTimeNs} ns
              </div>
            </div>
          </div>

          {/* I2C Pullup Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
              <span className="text-[11px] uppercase font-mono text-muted">{t.spiI2c.rpMin}</span>
              <div className="code-ltr text-2xl font-mono font-bold text-amber-400" dir="ltr">
                {i2cResult.rpMinOhms.toLocaleString()} Ω
              </div>
              <p className="text-[10px] text-muted">Prevents driver saturation overcurrent</p>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
              <span className="text-[11px] uppercase font-mono text-muted">{t.spiI2c.rpMax}</span>
              <div className="code-ltr text-2xl font-mono font-bold text-cyan-400" dir="ltr">
                {i2cResult.rpMaxOhms.toLocaleString()} Ω
              </div>
              <p className="text-[10px] text-muted">Satisfies RC rise time &le; {i2cResult.maxRiseTimeNs} ns</p>
            </div>

            <div className="bg-surface rounded-lg p-4 border border-emerald-500/30 space-y-1">
              <span className="text-[11px] uppercase font-mono text-emerald-400 font-bold">
                {t.spiI2c.recommendedResistors}
              </span>
              <div className="code-ltr text-xl font-mono font-bold text-primary truncate" dir="ltr">
                {i2cResult.recommendedE24.slice(0, 4).map((r) => `${r / 1000}k`).join(', ')} Ω
              </div>
              <p className="text-[10px] text-muted">Standard E24 values within safe margin</p>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Derivation */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between text-left text-sm font-semibold text-primary"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{t.common.stepByStep}</span>
          </div>
          <span className="text-xs text-secondary font-mono">{showSteps ? 'Hide' : 'Show'}</span>
        </button>

        {showSteps && (
          <div className="code-ltr text-xs font-mono space-y-1 text-secondary pt-2 border-t border-subtle" dir="ltr">
            {activeTab === 'spi' && spiResult.steps.map((st, i) => (
              <div key={i} className="p-2 bg-canvas rounded border border-subtle text-primary">
                {st}
              </div>
            ))}
            {activeTab === 'i2c' && i2cResult.steps.map((st, i) => (
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
