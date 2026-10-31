import React, { useState } from 'react';
import { 
  Zap, 
  BatteryCharging, 
  Battery, 
  Copy, 
  Check, 
  Bookmark, 
  Info, 
  Sliders, 
  Clock, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  calculateRcDebounce, 
  calculateDutyCycledBatteryLife, 
  BATTERY_PRESETS, 
  BatteryPreset, 
  RcDebounceResult, 
  BatteryLifeResult 
} from '../../lib/powerDebounceCalc';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const PowerDebounceView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  // Mode tab: 'debounce' | 'battery'
  const [activeTab, setActiveTab] = useState<'debounce' | 'battery'>('debounce');

  // --- RC Debounce State ---
  const [rValue, setRValue] = useState<number>(10); // in kOhms by default
  const [rUnit, setRUnit] = useState<'ohm' | 'kohm' | 'mohm'>('kohm');
  const [cValue, setCValue] = useState<number>(100); // in nF by default
  const [cUnit, setCUnit] = useState<'pf' | 'nf' | 'uf'>('nf');
  const [vdd, setVdd] = useState<number>(3.3);
  const [vth, setVth] = useState<number>(2.0);

  // Compute actual Ohms and Farads
  const actualROhms = React.useMemo(() => {
    if (rUnit === 'ohm') return rValue;
    if (rUnit === 'kohm') return rValue * 1e3;
    return rValue * 1e6;
  }, [rValue, rUnit]);

  const actualCFarads = React.useMemo(() => {
    if (cUnit === 'pf') return cValue * 1e-12;
    if (cUnit === 'nf') return cValue * 1e-9;
    return cValue * 1e-6;
  }, [cValue, cUnit]);

  const rcResult: RcDebounceResult = React.useMemo(() => {
    return calculateRcDebounce({
      rOhms: Math.max(1, actualROhms),
      cFarads: Math.max(1e-12, actualCFarads),
      vddVolts: Math.max(0.1, vdd),
      vthVolts: Math.min(vdd - 0.01, Math.max(0.01, vth)),
    });
  }, [actualROhms, actualCFarads, vdd, vth]);

  // --- Battery Life State ---
  const [selectedPresetName, setSelectedPresetName] = useState<string>(BATTERY_PRESETS[0].name);
  const [batteryCapacity, setBatteryCapacity] = useState<number>(BATTERY_PRESETS[0].capacityMah);
  const [derating, setDerating] = useState<number>(80); // 80%

  const [activeCurrentMa, setActiveCurrentMa] = useState<number>(18.5); // e.g. RF transmit
  const [activeDurationMs, setActiveDurationMs] = useState<number>(25); // 25ms
  const [sleepCurrentUa, setSleepCurrentUa] = useState<number>(8.5); // 8.5µA deep sleep
  const [sleepDurationSec, setSleepDurationSec] = useState<number>(60); // 60s

  const handlePresetSelect = (preset: BatteryPreset) => {
    setSelectedPresetName(preset.name);
    setBatteryCapacity(preset.capacityMah);
  };

  const batteryResult: BatteryLifeResult = React.useMemo(() => {
    return calculateDutyCycledBatteryLife({
      batteryCapacityMah: Math.max(1, batteryCapacity),
      deratingFactorPercent: Math.min(100, Math.max(10, derating)),
      activeCurrentMa: Math.max(0.001, activeCurrentMa),
      activeDurationMs: Math.max(0.1, activeDurationMs),
      sleepCurrentUa: Math.max(0.01, sleepCurrentUa),
      sleepDurationSec: Math.max(0.1, sleepDurationSec),
    });
  }, [batteryCapacity, derating, activeCurrentMa, activeDurationMs, sleepCurrentUa, sleepDurationSec]);

  // UI helpers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    if (activeTab === 'debounce') {
      const title = `Debounce Filter: R=${rValue}${rUnit}, C=${cValue}${cUnit}`;
      const content = [
        `# RC Switch Debounce Filter Calculation`,
        `- Resistor R: ${rValue} ${rUnit} (${actualROhms.toLocaleString()} Ω)`,
        `- Capacitor C: ${cValue} ${cUnit} (${(actualCFarads * 1e9).toFixed(1)} nF)`,
        `- Supply VDD: ${vdd.toFixed(2)} V | Threshold Vth: ${vth.toFixed(2)} V`,
        `- Time Constant τ: ${rcResult.tauMs.toFixed(3)} ms`,
        `- Time to Threshold Vth: ${rcResult.timeToThresholdMs.toFixed(3)} ms`,
        `- Cutoff Frequency fc (-3dB): ${rcResult.cutoffFrequencyHz.toFixed(1)} Hz`,
        `- Recommended Switch Window: ${rcResult.recommendedSwitchWindowMs}`,
        `\n### Mathematical Working:\n` + rcResult.steps.join('\n'),
      ].join('\n');
      await saveToolResultToNotes(title, content, ['debounce', 'rc-filter', 'switch']);
    } else {
      const title = `Battery Runtime: ${selectedPresetName} (${batteryResult.estimatedDays.toFixed(1)} Days)`;
      const content = [
        `# Duty-Cycled Battery Life Projection`,
        `- Battery: ${selectedPresetName} (${batteryCapacity} mAh nominal, ${derating}% derated = ${batteryResult.usableCapacityMah.toFixed(1)} mAh usable)`,
        `- Active State: ${activeCurrentMa} mA for ${activeDurationMs} ms`,
        `- Sleep State: ${sleepCurrentUa} µA for ${sleepDurationSec} s`,
        `- Active Duty Cycle: ${batteryResult.activeDutyPercent.toFixed(4)}%`,
        `- Average Current: ${batteryResult.averageCurrentMa.toFixed(4)} mA (${batteryResult.averageCurrentUa.toFixed(2)} µA)`,
        `- Projected Runtime: ${batteryResult.estimatedHours.toFixed(1)} Hours / ${batteryResult.estimatedDays.toFixed(1)} Days (~${batteryResult.estimatedMonths.toFixed(1)} Months / ${batteryResult.estimatedYears.toFixed(2)} Years)`,
        `\n### Mathematical Working:\n` + batteryResult.steps.join('\n'),
      ].join('\n');
      await saveToolResultToNotes(title, content, ['battery', 'power', 'low-power', 'runtime']);
    }

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
            <span>{t.powerDebounce.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.powerDebounce.description}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveToNotes}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              savedToNotes
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : 'bg-card hover:bg-neutral-800 border-subtle text-primary'
            }`}
          >
            {savedToNotes ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            <span>{savedToNotes ? t.common.savedToNotes : t.common.saveToNotes}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab('debounce')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'debounce'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>{t.powerDebounce.tabDebounce}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('battery')}
          className={`px-4 py-2 text-xs font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'battery'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <BatteryCharging className="w-3.5 h-3.5" />
          <span>{t.powerDebounce.tabBattery}</span>
        </button>
      </div>

      {activeTab === 'debounce' ? (
        /* TAB 1: RC Switch Debounce */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Inputs */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Component Parameters</span>
              </h3>

              {/* Resistor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary flex justify-between">
                  <span>{t.powerDebounce.resistorValue} (R)</span>
                  <span className="code-ltr text-emerald-400 font-mono">{actualROhms.toLocaleString()} Ω</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10000000"
                    step="any"
                    value={rValue}
                    onChange={(e) => setRValue(parseFloat(e.target.value) || 1)}
                    className="col-span-2 px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs code-ltr focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={rUnit}
                    onChange={(e) => setRUnit(e.target.value as any)}
                    className="px-2 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs focus:outline-none"
                  >
                    <option value="ohm">Ω</option>
                    <option value="kohm">kΩ</option>
                    <option value="mohm">MΩ</option>
                  </select>
                </div>
              </div>

              {/* Capacitor */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary flex justify-between">
                  <span>{t.powerDebounce.capacitorValue} (C)</span>
                  <span className="code-ltr text-emerald-400 font-mono">{(actualCFarads * 1e9).toFixed(1)} nF</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    step="any"
                    value={cValue}
                    onChange={(e) => setCValue(parseFloat(e.target.value) || 1)}
                    className="col-span-2 px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs code-ltr focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={cUnit}
                    onChange={(e) => setCUnit(e.target.value as any)}
                    className="px-2 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs focus:outline-none"
                  >
                    <option value="pf">pF</option>
                    <option value="nf">nF</option>
                    <option value="uf">µF</option>
                  </select>
                </div>
              </div>

              {/* Voltages */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-subtle">
                <div className="space-y-1">
                  <label className="text-xs text-secondary">VDD Supply (V)</label>
                  <input
                    type="number"
                    min="0.5"
                    max="48"
                    step="0.1"
                    value={vdd}
                    onChange={(e) => setVdd(parseFloat(e.target.value) || 3.3)}
                    className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs code-ltr focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-secondary">{t.powerDebounce.thresholdVoltage} (Vth)</label>
                  <input
                    type="number"
                    min="0.1"
                    max={vdd - 0.1}
                    step="0.1"
                    value={vth}
                    onChange={(e) => setVth(parseFloat(e.target.value) || 2.0)}
                    className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs code-ltr focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Quick Vth Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-secondary">Quick Vth:</span>
                <button
                  type="button"
                  onClick={() => setVth(parseFloat((vdd * 0.7).toFixed(2)))}
                  className="px-2 py-0.5 text-[10px] bg-subtle hover:bg-neutral-700 rounded text-secondary hover:text-primary transition-colors"
                >
                  0.7×VDD (CMOS)
                </button>
                <button
                  type="button"
                  onClick={() => setVth(parseFloat((vdd * 0.5).toFixed(2)))}
                  className="px-2 py-0.5 text-[10px] bg-subtle hover:bg-neutral-700 rounded text-secondary hover:text-primary transition-colors"
                >
                  0.5×VDD (Mid)
                </button>
                <button
                  type="button"
                  onClick={() => setVth(2.0)}
                  className="px-2 py-0.5 text-[10px] bg-subtle hover:bg-neutral-700 rounded text-secondary hover:text-primary transition-colors"
                >
                  2.0V (TTL VIH)
                </button>
              </div>
            </div>

            {/* Design Guideline Box */}
            <div className="bg-card border border-subtle rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                <Info className="w-3.5 h-3.5" />
                <span>Hardware Debounce Best Practice</span>
              </div>
              <p className="text-secondary leading-relaxed">
                A mechanical switch contact bounces repeatedly for <strong className="text-primary font-mono">2ms - 15ms</strong> upon closure. 
                Combine this RC filter with a <strong className="text-primary">Schmitt trigger input buffer</strong> (e.g., 74HC14 or MCU Schmitt GPIO) to avoid spurious oscillations around the logic threshold.
              </p>
            </div>
          </div>

          {/* Right Metrics & Waveform */}
          <div className="lg:col-span-7 space-y-4">
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-card border border-subtle rounded-xl p-4 relative overflow-hidden">
                <div className="text-[11px] text-secondary uppercase font-semibold">{t.powerDebounce.timeConstantTau}</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1 code-ltr">
                  {rcResult.tauMs.toFixed(3)} <span className="text-xs font-normal text-secondary">ms</span>
                </div>
                <div className="text-[10px] text-secondary mt-1 code-ltr">
                  {(rcResult.tauMs * 1000).toFixed(1)} µs (63.2% VDD)
                </div>
              </div>

              <div className="bg-card border border-subtle rounded-xl p-4 relative overflow-hidden">
                <div className="text-[11px] text-secondary uppercase font-semibold">{t.powerDebounce.triggerTime}</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1 code-ltr">
                  {rcResult.timeToThresholdMs.toFixed(3)} <span className="text-xs font-normal text-secondary">ms</span>
                </div>
                <div className="text-[10px] text-secondary mt-1">To reach {vth.toFixed(2)}V</div>
              </div>

              <div className="bg-card border border-subtle rounded-xl p-4 relative overflow-hidden">
                <div className="text-[11px] text-secondary uppercase font-semibold">{t.powerDebounce.cutoffFrequency}</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1 code-ltr">
                  {rcResult.cutoffFrequencyHz >= 1000 
                    ? `${(rcResult.cutoffFrequencyHz / 1000).toFixed(2)} kHz`
                    : `${rcResult.cutoffFrequencyHz.toFixed(1)} Hz`
                  }
                </div>
                <div className="text-[10px] text-secondary mt-1">-3 dB Bandwidth</div>
              </div>
            </div>

            {/* Interactive Capacitor Charging SVG Waveform */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Capacitor Charging Response Curve V(t) = VDD(1 - e^&#123;-t/τ&#125;)</span>
                </span>
                <span className="text-[11px] font-mono text-secondary code-ltr">τ = {rcResult.tauMs.toFixed(2)}ms</span>
              </div>

              <div className="w-full h-44 bg-neutral-950/80 rounded-lg p-2 border border-subtle/50 relative overflow-hidden">
                <svg viewBox="0 0 400 160" className="w-full h-full">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="380" y2="20" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1="40" y1="55" x2="380" y2="55" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1="40" y1="90" x2="380" y2="90" stroke="#334155" strokeWidth="0.8" strokeDasharray="3 3" />
                  <line x1="40" y1="125" x2="380" y2="125" stroke="#334155" strokeWidth="1" />
                  <line x1="40" y1="10" x2="40" y2="125" stroke="#334155" strokeWidth="1" />

                  {/* VDD Line */}
                  <text x="35" y="24" fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">VDD</text>
                  
                  {/* Vth Threshold Line */}
                  {(() => {
                    const vthY = 125 - ((vth / vdd) * 105);
                    const tX = 40 + Math.min(330, (rcResult.timeToThresholdMs / (rcResult.tauMs * 4)) * 340);
                    return (
                      <>
                        <line x1="40" y1={vthY} x2="380" y2={vthY} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4 2" />
                        <text x="35" y={vthY + 3} fill="#f59e0b" fontSize="9" textAnchor="end" fontFamily="monospace">Vth</text>
                        {/* Intersection Marker */}
                        <circle cx={tX} cy={vthY} r="4" fill="#f59e0b" />
                        <line x1={tX} y1={vthY} x2={tX} y2="125" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 2" />
                        <text x={tX} y="138" fill="#f59e0b" fontSize="8" textAnchor="middle" fontFamily="monospace">
                          {rcResult.timeToThresholdMs.toFixed(2)}ms
                        </text>
                      </>
                    );
                  })()}

                  {/* Charging Curve Path: 4 time constants */}
                  {(() => {
                    const points: string[] = [];
                    for (let px = 0; px <= 340; px += 4) {
                      const tNorm = (px / 340) * 4; // 0 to 4 tau
                      const vNorm = 1 - Math.exp(-tNorm);
                      const cy = 125 - (vNorm * 105);
                      points.push(`${40 + px},${cy}`);
                    }
                    return (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.2"
                        points={points.join(' ')}
                      />
                    );
                  })()}

                  {/* Labels */}
                  <text x="40" y="148" fill="#94a3b8" fontSize="8" textAnchor="middle">0</text>
                  <text x="125" y="148" fill="#94a3b8" fontSize="8" textAnchor="middle">1τ ({rcResult.tauMs.toFixed(1)}ms)</text>
                  <text x="210" y="148" fill="#94a3b8" fontSize="8" textAnchor="middle">2τ</text>
                  <text x="295" y="148" fill="#94a3b8" fontSize="8" textAnchor="middle">3τ</text>
                  <text x="380" y="148" fill="#94a3b8" fontSize="8" textAnchor="middle">4τ</text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowSteps(!showSteps)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>{t.common.stepByStep} ({showSteps ? '−' : '+'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(`R=${actualROhms} Ohm, C=${actualCFarads} F => tau=${rcResult.tauMs.toFixed(3)}ms, t_th=${rcResult.timeToThresholdMs.toFixed(3)}ms`, 'rc')}
                  className="p-1 text-secondary hover:text-primary transition-colors"
                >
                  {copiedKey === 'rc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showSteps && (
                <div className="bg-neutral-900 border border-subtle rounded-lg p-3 text-xs font-mono space-y-1 text-secondary code-ltr">
                  {rcResult.steps.map((st, i) => (
                    <div key={i}>{st}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: Duty-Cycled Battery Life */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Inputs */}
          <div className="lg:col-span-5 space-y-4">
            {/* Battery Selection */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                <span>Battery Chemistry & Capacity</span>
              </h3>

              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-xs text-secondary">{t.powerDebounce.batteryPreset}</label>
                <div className="grid grid-cols-1 gap-1.5">
                  {BATTERY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                        selectedPresetName === preset.name
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                          : 'bg-input hover:bg-neutral-800 border-subtle text-primary'
                      }`}
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="font-mono text-[11px] text-secondary code-ltr">
                        {preset.capacityMah} mAh ({preset.nominalVoltage}V)
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacity and Derating */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-subtle">
                <div className="space-y-1">
                  <label className="text-xs text-secondary">{t.powerDebounce.batteryCapacity} (mAh)</label>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={batteryCapacity}
                    onChange={(e) => {
                      setBatteryCapacity(parseFloat(e.target.value) || 100);
                      setSelectedPresetName('Custom Battery');
                    }}
                    className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-secondary">Derating Factor (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={derating}
                    onChange={(e) => setDerating(parseFloat(e.target.value) || 80)}
                    className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Load Profile */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Duty-Cycled Load Profile</span>
              </h3>

              {/* Active State */}
              <div className="space-y-2 bg-neutral-900/40 p-3 rounded-lg border border-subtle/60">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Active State (CPU / Radio Tx)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-secondary">{t.powerDebounce.activeCurrent} (mA)</label>
                    <input
                      type="number"
                      min="0.001"
                      max="10000"
                      step="any"
                      value={activeCurrentMa}
                      onChange={(e) => setActiveCurrentMa(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-secondary">{t.powerDebounce.activeDuration} (ms)</label>
                    <input
                      type="number"
                      min="0.1"
                      max="60000"
                      step="any"
                      value={activeDurationMs}
                      onChange={(e) => setActiveDurationMs(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sleep State */}
              <div className="space-y-2 bg-neutral-900/40 p-3 rounded-lg border border-subtle/60">
                <div className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Sleep State (Deep Sleep / RTC)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-secondary">{t.powerDebounce.sleepCurrent} (µA)</label>
                    <input
                      type="number"
                      min="0.01"
                      max="100000"
                      step="any"
                      value={sleepCurrentUa}
                      onChange={(e) => setSleepCurrentUa(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-secondary">{t.powerDebounce.sleepDuration} (sec)</label>
                    <input
                      type="number"
                      min="0.1"
                      max="86400"
                      step="any"
                      value={sleepDurationSec}
                      onChange={(e) => setSleepDurationSec(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Results & Projections */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Battery Life Showcase Card */}
            <div className="bg-gradient-to-br from-card via-card to-emerald-950/20 border border-emerald-500/30 rounded-xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  {t.powerDebounce.estimatedRuntime}
                </span>
                <span className="text-xs font-mono text-secondary code-ltr">
                  Usable: {batteryResult.usableCapacityMah.toFixed(1)} mAh
                </span>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline gap-4">
                <div className="text-4xl md:text-5xl font-black font-mono text-emerald-400 tracking-tight code-ltr">
                  {batteryResult.estimatedDays >= 365 
                    ? `${batteryResult.estimatedYears.toFixed(2)} Years`
                    : batteryResult.estimatedDays >= 30
                    ? `${batteryResult.estimatedMonths.toFixed(1)} Months`
                    : `${batteryResult.estimatedDays.toFixed(1)} Days`
                  }
                </div>
                <div className="text-xs text-secondary font-mono code-ltr">
                  ({batteryResult.estimatedDays.toFixed(1)} days / {batteryResult.estimatedHours.toFixed(0)} hours)
                </div>
              </div>

              {/* Progress / Duty cycle metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-subtle">
                <div>
                  <div className="text-[10px] text-secondary uppercase font-medium">{t.powerDebounce.averageCurrent}</div>
                  <div className="text-sm font-bold font-mono text-primary mt-0.5 code-ltr">
                    {batteryResult.averageCurrentMa >= 1
                      ? `${batteryResult.averageCurrentMa.toFixed(3)} mA`
                      : `${batteryResult.averageCurrentUa.toFixed(1)} µA`
                    }
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-secondary uppercase font-medium">Active Duty</div>
                  <div className="text-sm font-bold font-mono text-amber-400 mt-0.5 code-ltr">
                    {batteryResult.activeDutyPercent.toFixed(4)}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-secondary uppercase font-medium">Sleep Duty</div>
                  <div className="text-sm font-bold font-mono text-sky-400 mt-0.5 code-ltr">
                    {(100 - batteryResult.activeDutyPercent).toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-secondary uppercase font-medium">Cycle Period</div>
                  <div className="text-sm font-bold font-mono text-primary mt-0.5 code-ltr">
                    {(sleepDurationSec + activeDurationMs / 1000).toFixed(2)} s
                  </div>
                </div>
              </div>
            </div>

            {/* Energy Breakdown Bar */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Charge Consumption Breakdown (Per Cycle)
              </span>

              {(() => {
                const activeCharge = activeCurrentMa * (activeDurationMs / 1000); // mA*s
                const sleepCharge = (sleepCurrentUa / 1000) * sleepDurationSec; // mA*s
                const totalCharge = activeCharge + sleepCharge;
                const activePct = totalCharge > 0 ? (activeCharge / totalCharge) * 100 : 0;
                const sleepPct = 100 - activePct;

                return (
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-neutral-900 rounded-full overflow-hidden flex">
                      <div 
                        style={{ width: `${activePct}%` }} 
                        className="bg-amber-400 h-full transition-all" 
                        title={`Active: ${activePct.toFixed(1)}%`}
                      />
                      <div 
                        style={{ width: `${sleepPct}%` }} 
                        className="bg-sky-400 h-full transition-all" 
                        title={`Sleep: ${sleepPct.toFixed(1)}%`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono code-ltr">
                      <div className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                        <span>Active: {activeCharge.toFixed(3)} mA·s ({activePct.toFixed(1)}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                        <span>Sleep: {sleepCharge.toFixed(3)} mA·s ({sleepPct.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Step-by-Step Mathematical Working */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowSteps(!showSteps)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <span>{t.common.stepByStep} ({showSteps ? '−' : '+'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(`Battery: ${selectedPresetName}, I_avg=${batteryResult.averageCurrentMa.toFixed(4)}mA, Runtime=${batteryResult.estimatedDays.toFixed(1)} days`, 'batt')}
                  className="p-1 text-secondary hover:text-primary transition-colors"
                >
                  {copiedKey === 'batt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showSteps && (
                <div className="bg-neutral-900 border border-subtle rounded-lg p-3 text-xs font-mono space-y-1 text-secondary code-ltr">
                  {batteryResult.steps.map((st, i) => (
                    <div key={i}>{st}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
