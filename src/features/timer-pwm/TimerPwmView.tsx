import React, { useState } from 'react';
import { 
  Timer, 
  Copy, 
  Check, 
  Bookmark, 
  AlertTriangle, 
  Info, 
  Sliders, 
  RotateCcw,
  Zap,
  Cpu
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { MCU_PRESETS, McuPreset, McuTimerConfig } from '../../data/mcu-presets';
import { calculateTimerPwm, TimerPwmResult } from '../../lib/timerPwmCalc';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const TimerPwmView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  const [selectedMcuId, setSelectedMcuId] = useState<string>('atmega328p');
  const activeMcu: McuPreset = MCU_PRESETS.find((m) => m.id === selectedMcuId) || MCU_PRESETS[0];

  const [selectedTimerIndex, setSelectedTimerIndex] = useState<number>(0);
  const activeTimer: McuTimerConfig = activeMcu.timers[selectedTimerIndex] || activeMcu.timers[0];

  const [clockHz, setClockHz] = useState<number>(activeMcu.defaultClockHz);
  const [targetFreqHz, setTargetFreqHz] = useState<number>(1000); // 1 kHz default
  const [dutyCycle, setDutyCycle] = useState<number>(50); // 50% default
  const [isCenterAligned, setIsCenterAligned] = useState<boolean>(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  // Switch clock when MCU changes
  const handleMcuChange = (mcuId: string) => {
    setSelectedMcuId(mcuId);
    const m = MCU_PRESETS.find((p) => p.id === mcuId) || MCU_PRESETS[0];
    setSelectedTimerIndex(0);
    setClockHz(m.defaultClockHz);
  };

  const calcResult: TimerPwmResult = React.useMemo(() => {
    return calculateTimerPwm({
      clockHz,
      targetFrequencyHz: targetFreqHz,
      dutyCyclePercent: dutyCycle,
      timerConfig: activeTimer,
      isCenterAligned,
    }, activeMcu.datasheetNotice);
  }, [clockHz, targetFreqHz, dutyCycle, activeTimer, isCenterAligned, activeMcu.datasheetNotice]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `Timer/PWM Spec: ${activeMcu.name} @ ${targetFreqHz}Hz`;
    const content = [
      `# ${title}`,
      `- MCU: ${activeMcu.name} (${activeMcu.architecture})`,
      `- Timer: ${activeTimer.name} (${activeTimer.bitResolution}-bit)`,
      `- Input Clock: ${clockHz.toLocaleString()} Hz`,
      `- Target Frequency: ${targetFreqHz.toLocaleString()} Hz | Duty: ${dutyCycle}%`,
      `- Prescaler (PSC): ${calcResult.prescaler}`,
      `- TOP / Auto-Reload (${activeTimer.topRegisterName}): ${calcResult.topValue} (0x${calcResult.topValue.toString(16).toUpperCase()})`,
      `- Compare Match (${activeTimer.compareRegisterName}): ${calcResult.compareValue}`,
      `- Actual Achieved: ${calcResult.actualFrequencyHz.toFixed(3)} Hz (Error: ${calcResult.errorPercent.toFixed(4)}%)`,
      `- Alignment: ${isCenterAligned ? 'Center-Aligned / Dual-Slope' : 'Edge-Aligned / Fast PWM'}`,
      `\n### Hardware Assumptions:\n- Allowed Prescalers: ${calcResult.assumptions.allowedPrescalers}\n- ${calcResult.assumptions.datasheetNotice}`,
      `\n### Mathematical Working:\n` + calcResult.steps.join('\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['timer', 'pwm', activeMcu.id]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Timer className="w-5 h-5 text-amber-400" />
            <span>{t.timerPwm.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.timerPwm.description}</p>
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

      {/* MCU & Hardware Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MCU Selector */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <label className="text-xs font-semibold uppercase text-secondary flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t.timerPwm.mcuPreset}</span>
          </label>
          <select
            value={selectedMcuId}
            onChange={(e) => handleMcuChange(e.target.value)}
            className="w-full px-3 py-2 bg-canvas border border-subtle rounded text-xs text-primary font-medium focus:border-cyan-500 focus:outline-none"
          >
            {MCU_PRESETS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-muted font-mono">{activeMcu.architecture}</div>
        </div>

        {/* Timer Hardware Module */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <label className="text-xs font-semibold uppercase text-secondary">
            {t.timerPwm.timerModule}
          </label>
          <select
            value={selectedTimerIndex}
            onChange={(e) => setSelectedTimerIndex(Number(e.target.value))}
            className="w-full px-3 py-2 bg-canvas border border-subtle rounded text-xs text-primary font-medium focus:border-cyan-500 focus:outline-none"
          >
            {activeMcu.timers.map((tim, idx) => (
              <option key={idx} value={idx}>
                {tim.name} ({tim.bitResolution}-bit)
              </option>
            ))}
          </select>
          <div className="text-[11px] text-muted font-mono">
            TOP: {activeTimer.topRegisterName} | CC: {activeTimer.compareRegisterName}
          </div>
        </div>

        {/* Input Clock Frequency */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.timerPwm.clockFrequency}
            </label>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {(clockHz / 1e6).toFixed(2)} MHz
            </span>
          </div>
          <input
            type="number"
            value={clockHz}
            onChange={(e) => setClockHz(Math.max(1, Number(e.target.value) || 1))}
            className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
          />
          {/* Preset Clock Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {activeMcu.allowedClockPresets.map((clk) => (
              <button
                key={clk}
                type="button"
                onClick={() => setClockHz(clk)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  clockHz === clk ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-canvas border-subtle text-muted hover:text-primary'
                }`}
              >
                {clk / 1e6}M
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Target Parameters & Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Target Frequency */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.timerPwm.targetFrequency}
            </label>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {targetFreqHz >= 1000 ? `${(targetFreqHz / 1000).toFixed(2)} kHz` : `${targetFreqHz} Hz`}
            </span>
          </div>
          <input
            type="number"
            step="1"
            min="0.1"
            value={targetFreqHz}
            onChange={(e) => setTargetFreqHz(Math.max(0.001, Number(e.target.value) || 1))}
            className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-amber-300 focus:border-amber-500 focus:outline-none"
          />
          {/* Frequency Presets */}
          <div className="flex flex-wrap items-center gap-1">
            {[50, 490, 1000, 5000, 10000, 20000, 25000, 100000].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTargetFreqHz(f)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  targetFreqHz === f ? 'bg-amber-600 border-amber-500 text-white' : 'bg-canvas border-subtle text-muted hover:text-primary'
                }`}
              >
                {f >= 1000 ? `${f / 1000}k` : `${f}Hz`}
              </button>
            ))}
          </div>
        </div>

        {/* Duty Cycle Slider */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.timerPwm.dutyCycle}
            </label>
            <span className="text-xs font-mono text-emerald-400 font-bold">{dutyCycle}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={dutyCycle}
            onChange={(e) => setDutyCycle(Number(e.target.value))}
            className="w-full accent-emerald-500 h-2 bg-canvas rounded-lg cursor-pointer"
          />
          <div className="flex items-center justify-between text-[10px] text-muted font-mono">
            <span>0% (OFF)</span>
            <span>50% (Square)</span>
            <span>100% (HIGH)</span>
          </div>
        </div>

        {/* Counter Alignment Mode */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <label className="text-xs font-semibold uppercase text-secondary">
            {t.timerPwm.alignmentMode}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsCenterAligned(false)}
              className={`p-2.5 rounded border text-xs font-medium transition-colors ${
                !isCenterAligned
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs'
                  : 'bg-canvas border-subtle text-secondary hover:text-primary'
              }`}
            >
              Edge-Aligned
            </button>
            <button
              type="button"
              onClick={() => setIsCenterAligned(true)}
              className={`p-2.5 rounded border text-xs font-medium transition-colors ${
                isCenterAligned
                  ? 'bg-purple-600 border-purple-500 text-white shadow-xs'
                  : 'bg-canvas border-subtle text-secondary hover:text-primary'
              }`}
            >
              Center-Aligned
            </button>
          </div>
          <p className="text-[10px] text-muted">
            {isCenterAligned ? 'Dual-slope counter (counts up then down)' : 'Single-slope (counts up to TOP then resets to 0)'}
          </p>
        </div>
      </div>

      {/* Impossible Target Warning Banner */}
      {!calcResult.isAchievable && (
        <div className="bg-red-950/30 border border-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-300">{t.timerPwm.impossibleWarning}</h4>
            <p className="text-xs text-red-200 leading-relaxed">{calcResult.impossibleReason}</p>
            {calcResult.nearestAchievableFrequencyHz && (
              <div className="pt-1 flex items-center gap-2 text-xs">
                <span className="text-muted">{t.timerPwm.nearestSuggestion}:</span>
                <button
                  type="button"
                  onClick={() => setTargetFreqHz(Math.round(calcResult.nearestAchievableFrequencyHz!))}
                  className="px-2 py-0.5 rounded bg-red-900/40 border border-red-700 text-red-200 font-mono font-bold hover:bg-red-800"
                >
                  {calcResult.nearestAchievableFrequencyHz.toFixed(2)} Hz
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Calculated Results Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Prescaler */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.timerPwm.prescalerResult}</span>
            <button
              type="button"
              onClick={() => handleCopy(String(calcResult.prescaler), 'psc')}
              className="hover:text-primary"
            >
              {copiedKey === 'psc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-cyan-400" dir="ltr">
            /{calcResult.prescaler}
          </div>
          <p className="text-[10px] text-muted">Register: {calcResult.prescaler - 1} or enum</p>
        </div>

        {/* TOP / Auto-Reload */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.timerPwm.topResult} ({activeTimer.topRegisterName})</span>
            <button
              type="button"
              onClick={() => handleCopy(String(calcResult.topValue), 'top')}
              className="hover:text-primary"
            >
              {copiedKey === 'top' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-amber-400" dir="ltr">
            {calcResult.topValue}
          </div>
          <p className="code-ltr text-[10px] text-muted font-mono" dir="ltr">
            0x{calcResult.topValue.toString(16).toUpperCase()} (Max: {calcResult.assumptions.maxTop})
          </p>
        </div>

        {/* Compare Match */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.timerPwm.compareMatchResult}</span>
            <button
              type="button"
              onClick={() => handleCopy(String(calcResult.compareValue), 'ccr')}
              className="hover:text-primary"
            >
              {copiedKey === 'ccr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-emerald-400" dir="ltr">
            {calcResult.compareValue}
          </div>
          <p className="text-[10px] text-muted">{calcResult.effectiveDutyPercent.toFixed(2)}% effective duty</p>
        </div>

        {/* Achieved Frequency & Error */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.timerPwm.actualFrequency}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
              calcResult.errorPercent === 0
                ? 'bg-emerald-950/40 text-emerald-400'
                : calcResult.errorPercent < 1
                ? 'bg-cyan-950/40 text-cyan-400'
                : 'bg-amber-950/40 text-amber-400'
            }`}>
              {calcResult.errorPercent === 0 ? '0% Error' : `${calcResult.errorPercent.toFixed(3)}%`}
            </span>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-primary" dir="ltr">
            {calcResult.actualFrequencyHz.toFixed(2)} Hz
          </div>
          <p className="text-[10px] text-muted">Period: {(calcResult.actualPeriodSec * 1000).toFixed(4)} ms</p>
        </div>
      </div>

      {/* Hardware Assumptions & Datasheet Notice */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2 text-xs">
        <div className="flex items-center gap-2 text-secondary font-semibold uppercase font-mono">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t.common.assumptions}</span>
        </div>
        <div className="code-ltr text-[11px] font-mono text-secondary space-y-1" dir="ltr">
          <div>- Clock: {calcResult.assumptions.clockHz.toLocaleString()} Hz | Timer Resolution: {calcResult.assumptions.timerResolutionBits}-bit (Max TOP: {calcResult.assumptions.maxTop})</div>
          <div>- Allowed Prescalers: [{calcResult.assumptions.allowedPrescalers}]</div>
          <div className="text-amber-400 font-semibold">
            - ⚠️ Datasheet verification notice: {activeMcu.datasheetNotice}
          </div>
        </div>
      </div>

      {/* Step-by-Step Derivation */}
      <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="w-full flex items-center justify-between text-left text-sm font-semibold text-primary"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>{t.common.stepByStep}</span>
          </div>
          <span className="text-xs text-secondary font-mono">{showSteps ? 'Hide' : 'Show'}</span>
        </button>

        {showSteps && (
          <div className="code-ltr text-xs font-mono space-y-1 text-secondary pt-2 border-t border-subtle" dir="ltr">
            {calcResult.steps.map((st, i) => (
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
