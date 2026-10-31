import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Activity, 
  Sliders, 
  Bookmark, 
  Check, 
  Copy, 
  Info, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  FlipFlopType, 
  FlipFlopInputs, 
  FlipFlopState, 
  evaluateFlipFlop, 
  getFlipFlopTruthTable, 
  getFlipFlopEquations 
} from '../../lib/sequentialLogic';
import { TimingDiagram } from '../../components/TimingDiagram/TimingDiagram';
import { SignalRow, WaveformTransition } from '../../lib/protocolWaveforms';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const FlipFlopLabView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  const [ffType, setFfType] = useState<FlipFlopType>('D');

  // Input states
  const [clock, setClock] = useState<0 | 1>(0);
  const [d, setD] = useState<0 | 1>(1);
  const [j, setJ] = useState<0 | 1>(1);
  const [k, setK] = useState<0 | 1>(0);
  const [tInput, setTInput] = useState<0 | 1>(1);
  const [s, setS] = useState<0 | 1>(1);
  const [r, setR] = useState<0 | 1>(0);
  const [enable, setEnable] = useState<0 | 1>(1);
  const [asyncReset, setAsyncReset] = useState<0 | 1>(0);
  const [asyncPreset, setAsyncPreset] = useState<0 | 1>(0);

  // State output: Q and Q_bar
  const [state, setState] = useState<FlipFlopState>({ q: 0, qBar: 1 });
  const [lastExplanation, setLastExplanation] = useState<string>('System initialized.');

  // Simulation run timer
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [clockFreqHz, setClockFreqHz] = useState<number>(1); // 1 Hz default

  // Waveform History Buffer
  const [simTime, setSimTime] = useState<number>(0);
  const [history, setHistory] = useState<{
    time: number;
    clock: 0 | 1;
    primaryInput: 0 | 1;
    secondaryInput?: 0 | 1;
    q: 0 | 1;
    qBar: 0 | 1;
  }[]>([
    { time: 0, clock: 0, primaryInput: 1, q: 0, qBar: 1 },
  ]);

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState<boolean>(false);

  // Single step clock edge (Rising edge transition)
  const handleStepClockRising = () => {
    // Current inputs
    const inputs: FlipFlopInputs = {
      clock: 1,
      d,
      j,
      k,
      t: tInput,
      s,
      r,
      enable,
      asyncReset,
      asyncPreset,
    };

    const res = evaluateFlipFlop(ffType, inputs, state, true);
    setState(res.nextState);
    setLastExplanation(res.explanation);
    setClock(1);

    const nextTime = simTime + 1;
    setSimTime(nextTime);

    const prim = ffType === 'D' ? d : ffType === 'T' ? tInput : ffType === 'JK' ? j : s;
    const sec = ffType === 'JK' ? k : ffType === 'SR' ? r : undefined;

    setHistory((prev) => [
      ...prev.slice(-30), // keep last 30 cycles
      { time: nextTime, clock: 1, primaryInput: prim, secondaryInput: sec, q: res.nextState.q, qBar: res.nextState.qBar },
    ]);
  };

  // Toggle clock manually
  const handleToggleClock = () => {
    const nextClk = (clock === 0 ? 1 : 0) as 0 | 1;
    const isRising = clock === 0 && nextClk === 1;

    const inputs: FlipFlopInputs = {
      clock: nextClk,
      d,
      j,
      k,
      t: tInput,
      s,
      r,
      enable,
      asyncReset,
      asyncPreset,
    };

    const res = evaluateFlipFlop(ffType, inputs, state, isRising);
    setState(res.nextState);
    setLastExplanation(res.explanation);
    setClock(nextClk);

    const nextTime = simTime + 0.5;
    setSimTime(nextTime);

    const prim = ffType === 'D' ? d : ffType === 'T' ? tInput : ffType === 'JK' ? j : s;
    const sec = ffType === 'JK' ? k : ffType === 'SR' ? r : undefined;

    setHistory((prev) => [
      ...prev.slice(-30),
      { time: nextTime, clock: nextClk, primaryInput: prim, secondaryInput: sec, q: res.nextState.q, qBar: res.nextState.qBar },
    ]);
  };

  // Reset simulation state
  const handleReset = () => {
    setIsRunning(false);
    setClock(0);
    setState({ q: 0, qBar: 1 });
    setSimTime(0);
    setHistory([{ time: 0, clock: 0, primaryInput: 0, q: 0, qBar: 1 }]);
    setLastExplanation('Simulation reset to initial state Q = 0.');
  };

  // Continuous Clock Runner
  useEffect(() => {
    if (!isRunning) return;
    const intervalMs = 1000 / (clockFreqHz * 2); // 2 transitions per cycle

    const timer = setInterval(() => {
      setClock((curClk) => {
        const nextClk = (curClk === 0 ? 1 : 0) as 0 | 1;
        const isRising = curClk === 0 && nextClk === 1;

        const inputs: FlipFlopInputs = {
          clock: nextClk,
          d,
          j,
          k,
          t: tInput,
          s,
          r,
          enable,
          asyncReset,
          asyncPreset,
        };

        const res = evaluateFlipFlop(ffType, inputs, state, isRising);
        setState(res.nextState);
        setLastExplanation(res.explanation);

        setSimTime((st) => {
          const nt = st + 0.5;
          const prim = ffType === 'D' ? d : ffType === 'T' ? tInput : ffType === 'JK' ? j : s;
          const sec = ffType === 'JK' ? k : ffType === 'SR' ? r : undefined;

          setHistory((prev) => [
            ...prev.slice(-30),
            { time: nt, clock: nextClk, primaryInput: prim, secondaryInput: sec, q: res.nextState.q, qBar: res.nextState.qBar },
          ]);
          return nt;
        });

        return nextClk;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, clockFreqHz, ffType, d, j, k, tInput, s, r, enable, asyncReset, asyncPreset, state]);

  // Convert history buffer into SignalRows for TimingDiagram
  const timingSignals: SignalRow[] = useMemo(() => {
    const clkTrans: WaveformTransition[] = history.map((h) => ({ time: h.time, value: h.clock }));
    const primName = ffType === 'D' ? 'D Input' : ffType === 'T' ? 'T Input' : ffType === 'JK' ? 'J Input' : 'S Input';
    const primTrans: WaveformTransition[] = history.map((h) => ({ time: h.time, value: h.primaryInput }));

    const sigs: SignalRow[] = [
      { name: 'CLK', type: 'digital', color: '#10b981', transitions: clkTrans },
      { name: primName, type: 'digital', color: '#06b6d4', transitions: primTrans },
    ];

    if (ffType === 'JK' || ffType === 'SR') {
      const secName = ffType === 'JK' ? 'K Input' : 'R Input';
      const secTrans: WaveformTransition[] = history.map((h) => ({ time: h.time, value: h.secondaryInput ?? 0 }));
      sigs.push({ name: secName, type: 'digital', color: '#a855f7', transitions: secTrans });
    }

    const qTrans: WaveformTransition[] = history.map((h) => ({ time: h.time, value: h.q }));
    const qBarTrans: WaveformTransition[] = history.map((h) => ({ time: h.time, value: h.qBar }));

    sigs.push({ name: 'Q Output', type: 'digital', color: '#f59e0b', transitions: qTrans });
    sigs.push({ name: 'Q̄ Output', type: 'digital', color: '#ec4899', transitions: qBarTrans });

    return sigs;
  }, [history, ffType]);

  const truthTable = useMemo(() => getFlipFlopTruthTable(ffType), [ffType]);
  const equations = useMemo(() => getFlipFlopEquations(ffType), [ffType]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `${ffType} Flip-Flop Sequential Simulation (Q=${state.q})`;
    const content = [
      `# ${title}`,
      `- Flip-Flop Type: ${ffType}`,
      `- Current Output: Q = ${state.q}, Q̄ = ${state.qBar}`,
      `- Clock: ${clock} (Frequency: ${clockFreqHz} Hz, Running: ${isRunning ? 'Yes' : 'No'})`,
      `- Characteristic Equation: ${equations.characteristicEquation}`,
      `- Enable: ${enable} | Async Reset: ${asyncReset} | Async Preset: ${asyncPreset}`,
      `\n### Status Explanation:\n${lastExplanation}`,
      `\n### Waveform History (${history.length} samples):\n` +
        history.map((h) => `T=${h.time.toFixed(1)}: CLK=${h.clock}, Input=${h.primaryInput}${h.secondaryInput !== undefined ? ',' + h.secondaryInput : ''} => Q=${h.q}, Q̄=${h.qBar}`).join('\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['sequential-logic', 'flip-flop', ffType.toLowerCase()]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>{t.flipflopLab.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.flipflopLab.description}</p>
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

      {/* Flip-Flop Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        {(['D', 'JK', 'T', 'SR'] as FlipFlopType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setFfType(type);
              handleReset();
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              ffType === type
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            <span>{type} Flip-Flop</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Clock & Inputs */}
        <div className="lg:col-span-5 space-y-4">
          {/* Clock Generator Controls */}
          <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.flipflopLab.clockControls}</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${clock === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-secondary'}`}>
                CLK = {clock}
              </span>
            </h3>

            {/* Stepping and Run/Pause Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleStepClockRising}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                title="Trigger Rising Clock Edge (↑)"
              >
                <StepForward className="w-3.5 h-3.5" />
                <span>Edge (↑)</span>
              </button>

              <button
                type="button"
                onClick={handleToggleClock}
                className="px-3 py-2 bg-input hover:bg-neutral-800 border border-subtle rounded-lg text-xs font-medium text-primary flex items-center justify-center gap-1.5 transition-colors"
                title="Toggle Clock state High/Low"
              >
                <span>Toggle ({clock ? '0' : '1'})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? t.flipflopLab.pause : t.flipflopLab.run}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-input hover:bg-neutral-800 border border-subtle rounded-lg text-xs font-medium text-secondary hover:text-primary flex items-center justify-center gap-1.5 transition-colors"
                title="Reset simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Frequency Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-subtle text-xs">
              <span className="text-secondary">{t.flipflopLab.frequency}:</span>
              <div className="flex items-center gap-1">
                {[0.5, 1, 2, 5].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setClockFreqHz(f)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      clockFreqHz === f
                        ? 'bg-emerald-500 text-white font-bold'
                        : 'bg-neutral-800 text-secondary hover:text-primary'
                    }`}
                  >
                    {f} Hz
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Input Switches */}
          <div className="bg-card border border-subtle rounded-xl p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.flipflopLab.inputs}</span>
            </h3>

            {/* Flip-flop specific inputs */}
            <div className="space-y-3">
              {ffType === 'D' && (
                <div className="flex items-center justify-between bg-neutral-900/60 p-3 rounded-lg border border-subtle">
                  <div>
                    <div className="text-xs font-semibold text-primary">Data Input (D)</div>
                    <div className="text-[10px] text-secondary">Latched into Q on clock rising edge</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setD((d === 0 ? 1 : 0) as 0 | 1)}
                    className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
                      d === 1 ? 'bg-cyan-500 justify-end' : 'bg-neutral-800 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white block shadow-sm" />
                  </button>
                </div>
              )}

              {ffType === 'JK' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-900/60 p-3 rounded-lg border border-subtle flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-primary">J (Set)</div>
                      <div className="text-[10px] text-secondary">J = {j}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setJ((j === 0 ? 1 : 0) as 0 | 1)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                        j === 1 ? 'bg-cyan-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
                    </button>
                  </div>

                  <div className="bg-neutral-900/60 p-3 rounded-lg border border-subtle flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-primary">K (Reset)</div>
                      <div className="text-[10px] text-secondary">K = {k}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setK((k === 0 ? 1 : 0) as 0 | 1)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                        k === 1 ? 'bg-purple-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
                    </button>
                  </div>
                </div>
              )}

              {ffType === 'T' && (
                <div className="flex items-center justify-between bg-neutral-900/60 p-3 rounded-lg border border-subtle">
                  <div>
                    <div className="text-xs font-semibold text-primary">Toggle Input (T)</div>
                    <div className="text-[10px] text-secondary">Inverts state when T = 1 on edge</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTInput((tInput === 0 ? 1 : 0) as 0 | 1)}
                    className={`w-12 h-7 rounded-full transition-colors flex items-center px-1 ${
                      tInput === 1 ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white block shadow-sm" />
                  </button>
                </div>
              )}

              {ffType === 'SR' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-900/60 p-3 rounded-lg border border-subtle flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-primary">S (Set)</div>
                      <div className="text-[10px] text-secondary">S = {s}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setS((s === 0 ? 1 : 0) as 0 | 1)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                        s === 1 ? 'bg-emerald-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
                    </button>
                  </div>

                  <div className="bg-neutral-900/60 p-3 rounded-lg border border-subtle flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-primary">R (Reset)</div>
                      <div className="text-[10px] text-secondary">R = {r}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setR((r === 0 ? 1 : 0) as 0 | 1)}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                        r === 1 ? 'bg-rose-500 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white block shadow-sm" />
                    </button>
                  </div>
                </div>
              )}

              {/* Asynchronous and Enable Controls */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setEnable((enable === 1 ? 0 : 1) as 0 | 1)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    enable === 1
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-neutral-900 border-subtle text-secondary'
                  }`}
                >
                  <div className="text-[10px] font-bold">ENABLE (EN)</div>
                  <div className="text-xs font-mono mt-0.5">{enable}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAsyncReset((asyncReset === 1 ? 0 : 1) as 0 | 1)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    asyncReset === 1
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : 'bg-neutral-900 border-subtle text-secondary'
                  }`}
                >
                  <div className="text-[10px] font-bold">ASYNC CLR</div>
                  <div className="text-xs font-mono mt-0.5">{asyncReset}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setAsyncPreset((asyncPreset === 1 ? 0 : 1) as 0 | 1)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    asyncPreset === 1
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                      : 'bg-neutral-900 border-subtle text-secondary'
                  }`}
                >
                  <div className="text-[10px] font-bold">ASYNC PRE</div>
                  <div className="text-xs font-mono mt-0.5">{asyncPreset}</div>
                </button>
              </div>
            </div>
          </div>

          {/* Current Status Banner */}
          <div className="bg-card border border-subtle rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-secondary font-semibold uppercase tracking-wider text-[11px]">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.flipflopLab.currentStatus}</span>
            </div>
            <p className="text-primary font-mono code-ltr text-xs leading-relaxed bg-neutral-950 p-2.5 rounded-lg border border-subtle">
              {lastExplanation}
            </p>
          </div>
        </div>

        {/* Right Column: Visual Schematic, Live Timing Diagram, and Tables */}
        <div className="lg:col-span-7 space-y-4">
          {/* Live Flip-Flop Circuit Schematic SVG with glowing wires */}
          <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Interactive Flip-Flop Schematic Symbol
              </span>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                  Q = {state.q}
                </span>
                <span className="px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/30 text-pink-400 font-bold">
                  Q̄ = {state.qBar}
                </span>
              </div>
            </div>

            <div className="w-full h-44 bg-neutral-950 rounded-lg border border-subtle relative flex items-center justify-center p-2">
              <svg viewBox="0 0 400 150" className="w-full h-full max-w-md">
                {/* Main IC Box */}
                <rect
                  x="130"
                  y="20"
                  width="140"
                  height="110"
                  rx="6"
                  fill="#090d16"
                  stroke="#334155"
                  strokeWidth="2"
                />
                <text x="200" y="40" fill="#94a3b8" fontSize="12" fontWeight="700" fontFamily="monospace" textAnchor="middle">
                  {ffType} FLIP-FLOP
                </text>

                {/* Clock Input Pin (Pin triangle for edge trigger) */}
                <line x1="80" y1="95" x2="130" y2="95" stroke={clock === 1 ? '#10b981' : '#475569'} strokeWidth="2.5" />
                <polyline points="130,87 142,95 130,103" fill="none" stroke="#64748b" strokeWidth="2" />
                <text x="70" y="99" fill={clock === 1 ? '#10b981' : '#64748b'} fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                  CLK ({clock})
                </text>

                {/* Primary Data Input Pin */}
                {(() => {
                  const pVal = ffType === 'D' ? d : ffType === 'T' ? tInput : ffType === 'JK' ? j : s;
                  const pLabel = ffType === 'D' ? 'D' : ffType === 'T' ? 'T' : ffType === 'JK' ? 'J' : 'S';
                  const pColor = pVal === 1 ? '#06b6d4' : '#475569';
                  return (
                    <>
                      <line x1="80" y1="50" x2="130" y2="50" stroke={pColor} strokeWidth="2.5" />
                      <text x="70" y="54" fill={pColor} fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                        {pLabel} ({pVal})
                      </text>
                    </>
                  );
                })()}

                {/* Secondary Data Input Pin for JK or SR */}
                {(ffType === 'JK' || ffType === 'SR') && (() => {
                  const sVal = ffType === 'JK' ? k : r;
                  const sLabel = ffType === 'JK' ? 'K' : 'R';
                  const sColor = sVal === 1 ? '#a855f7' : '#475569';
                  return (
                    <>
                      <line x1="80" y1="75" x2="130" y2="75" stroke={sColor} strokeWidth="2.5" />
                      <text x="70" y="79" fill={sColor} fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                        {sLabel} ({sVal})
                      </text>
                    </>
                  );
                })()}

                {/* Output Q Pin */}
                <line x1="270" y1="50" x2="320" y2="50" stroke={state.q === 1 ? '#f59e0b' : '#475569'} strokeWidth="2.5" />
                <text x="330" y="54" fill={state.q === 1 ? '#f59e0b' : '#64748b'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Q ({state.q})
                </text>

                {/* Output Q_bar Pin (with inversion circle) */}
                <circle cx="275" cy="95" r="4" fill="#090d16" stroke="#ec4899" strokeWidth="1.8" />
                <line x1="279" y1="95" x2="320" y2="95" stroke={state.qBar === 1 ? '#ec4899' : '#475569'} strokeWidth="2.5" />
                <text x="330" y="99" fill={state.qBar === 1 ? '#ec4899' : '#64748b'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Q̄ ({state.qBar})
                </text>

                {/* Characteristic equation below */}
                <text x="200" y="120" fill="#64748b" fontSize="8.5" fontFamily="monospace" textAnchor="middle">
                  {equations.characteristicEquation}
                </text>
              </svg>
            </div>
          </div>

          {/* Live Waveform Timing Diagram Component */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.flipflopLab.liveWaveform}</span>
              </span>
              <span className="text-[11px] font-mono text-secondary code-ltr">Buffer: {history.length} samples</span>
            </div>

            <TimingDiagram
              signals={timingSignals}
              totalDuration={Math.max(10, simTime)}
              timeUnit="cycles"
              enableCursors={true}
              initialZoom={1.2}
            />
          </div>

          {/* Truth Table & Excitation Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Truth Table */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  {t.flipflopLab.truthTable}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(truthTable, null, 2), 'tt')}
                  className="p-1 text-secondary hover:text-primary transition-colors"
                >
                  {copiedKey === 'tt' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="border border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-neutral-900 text-secondary border-b border-subtle">
                    <tr>
                      <th className="px-2.5 py-1.5">Inputs</th>
                      <th className="px-2.5 py-1.5">Q(t+1)</th>
                      <th className="px-2.5 py-1.5">Operation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle/50 text-primary">
                    {truthTable.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-800/50">
                        <td className="px-2.5 py-1 text-cyan-400">
                          {Object.entries(row.inputs).map(([k, v]) => `${k}=${v}`).join(', ')}
                        </td>
                        <td className="px-2.5 py-1 font-bold text-amber-400">{row.qNext}</td>
                        <td className="px-2.5 py-1 text-secondary text-[11px]">{row.operation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Excitation Table */}
            <div className="bg-card border border-subtle rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
                  {t.flipflopLab.excitationTable}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(equations.excitationTable, null, 2), 'ex')}
                  className="p-1 text-secondary hover:text-primary transition-colors"
                >
                  {copiedKey === 'ex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="border border-subtle rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-neutral-900 text-secondary border-b border-subtle">
                    <tr>
                      <th className="px-2.5 py-1.5">Q(t) → Q(t+1)</th>
                      <th className="px-2.5 py-1.5">Required Inputs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle/50 text-primary">
                    {equations.excitationTable.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-800/50">
                        <td className="px-2.5 py-1 text-secondary">
                          {row.qCurrent} → <span className="text-primary font-bold">{row.qTarget}</span>
                        </td>
                        <td className="px-2.5 py-1 text-emerald-400 font-semibold">{row.requiredInputs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
