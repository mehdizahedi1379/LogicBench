import React, { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Bookmark, 
  Table, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Clock,
  Zap
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { calculateUartBaud, generateBaudComparisonTable, COMMON_BAUD_RATES } from '../../lib/uartBaudCalc';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const UartCalcView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();
  const [clockHz, setClockHz] = useState<number>(16000000); // 16 MHz default
  const [targetBaud, setTargetBaud] = useState<number>(115200);
  const [oversampling, setOversampling] = useState<16 | 8>(16);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  const result = React.useMemo(() => {
    return calculateUartBaud({ clockHz, targetBaudRate: targetBaud, oversampling });
  }, [clockHz, targetBaud, oversampling]);

  const comparisonTable = React.useMemo(() => {
    return generateBaudComparisonTable(clockHz, oversampling);
  }, [clockHz, oversampling]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `UART Baud Rate Analysis: ${targetBaud} bps @ ${(clockHz / 1e6).toFixed(2)} MHz`;
    const content = [
      `# ${title}`,
      `- Clock Source: ${clockHz.toLocaleString()} Hz (${(clockHz / 1e6).toFixed(3)} MHz)`,
      `- Target Baud: ${targetBaud} bps | Oversampling: ${oversampling}×`,
      `- Integer Divisor (UBRR): ${result.integerDivider} (0x${result.integerDivider.toString(16).toUpperCase()})`,
      `- Actual Achieved Baud: ${result.actualBaudRate.toFixed(2)} bps`,
      `- Framing Error: ${result.errorPercent >= 0 ? '+' : ''}${result.errorPercent.toFixed(3)}%`,
      `- Status: ${result.status.toUpperCase()} (${result.statusExplanation})`,
      `\n### Step-by-Step Derivations:\n` + result.steps.join('\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['uart', 'baud-rate', `${targetBaud}-bps`]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const clockPresets = [
    { label: '8 MHz (Internal)', hz: 8000000 },
    { label: '11.0592 MHz (Baud Crystal)', hz: 11059200 },
    { label: '14.7456 MHz (Baud Crystal)', hz: 14745600 },
    { label: '16 MHz (Arduino / AVR)', hz: 16000000 },
    { label: '48 MHz (USB Clock)', hz: 48000000 },
    { label: '84 MHz (STM32 APB1/2)', hz: 84000000 },
    { label: '125 MHz (RP2040 Pico)', hz: 125000000 },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <span>{t.uartBaud.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.uartBaud.description}</p>
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

      {/* Input Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Clock Source Input */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.uartBaud.clockSource}</span>
            </label>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {(clockHz / 1e6).toFixed(4)} MHz
            </span>
          </div>
          <input
            type="number"
            value={clockHz}
            onChange={(e) => setClockHz(Math.max(1, Number(e.target.value) || 1))}
            className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-cyan-300 focus:border-cyan-500 focus:outline-none"
          />
          {/* Preset Crystals */}
          <div className="flex flex-wrap items-center gap-1">
            {clockPresets.map((clk) => (
              <button
                key={clk.hz}
                type="button"
                onClick={() => setClockHz(clk.hz)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  clockHz === clk.hz ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-canvas border-subtle text-muted hover:text-primary'
                }`}
                title={clk.label}
              >
                {(clk.hz / 1e6).toFixed(2)}M
              </button>
            ))}
          </div>
        </div>

        {/* Target Baud Rate */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase text-secondary">
              {t.uartBaud.targetBaud}
            </label>
            <span className="text-xs font-mono text-amber-400 font-bold">
              {targetBaud.toLocaleString()} bps
            </span>
          </div>
          <input
            type="number"
            value={targetBaud}
            onChange={(e) => setTargetBaud(Math.max(1, Number(e.target.value) || 1))}
            className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-amber-300 focus:border-amber-500 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1">
            {[9600, 19200, 38400, 57600, 115200, 230400, 921600].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setTargetBaud(b)}
                className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  targetBaud === b ? 'bg-amber-600 border-amber-500 text-white' : 'bg-canvas border-subtle text-muted hover:text-primary'
                }`}
              >
                {b >= 1000 ? `${b / 1000}k` : b}
              </button>
            ))}
          </div>
        </div>

        {/* Oversampling Factor */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-3">
          <label className="text-xs font-semibold uppercase text-secondary">
            {t.uartBaud.oversamplingMode}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOversampling(16)}
              className={`p-2.5 rounded border text-xs font-medium transition-colors ${
                oversampling === 16
                  ? 'bg-cyan-600 border-cyan-500 text-white shadow-xs'
                  : 'bg-canvas border-subtle text-secondary hover:text-primary'
              }`}
            >
              16× (Standard)
            </button>
            <button
              type="button"
              onClick={() => setOversampling(8)}
              className={`p-2.5 rounded border text-xs font-medium transition-colors ${
                oversampling === 8
                  ? 'bg-purple-600 border-purple-500 text-white shadow-xs'
                  : 'bg-canvas border-subtle text-secondary hover:text-primary'
              }`}
            >
              8× (High-Speed / Double)
            </button>
          </div>
          <p className="text-[10px] text-muted">
            {oversampling === 16 ? 'Standard noise filtering (3 center sample voting)' : 'Double baud rate capability at lower clock crystals'}
          </p>
        </div>
      </div>

      {/* Main Calculation Output Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Divisor (UBRR) */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.uartBaud.dividerResult}</span>
            <button
              type="button"
              onClick={() => handleCopy(String(result.integerDivider), 'div')}
              className="hover:text-primary"
            >
              {copiedKey === 'div' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-cyan-400" dir="ltr">
            {result.integerDivider}
          </div>
          <p className="code-ltr text-[10px] text-muted font-mono" dir="ltr">
            Hex: 0x{result.integerDivider.toString(16).toUpperCase()}
          </p>
        </div>

        {/* Achieved Baud Rate */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.uartBaud.actualBaud}</span>
            <button
              type="button"
              onClick={() => handleCopy(result.actualBaudRate.toFixed(2), 'actual')}
              className="hover:text-primary"
            >
              {copiedKey === 'actual' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <div className="code-ltr text-2xl font-mono font-bold text-primary" dir="ltr">
            {Math.round(result.actualBaudRate).toLocaleString()} bps
          </div>
          <p className="text-[10px] text-muted">Exact: {result.actualBaudRate.toFixed(2)}</p>
        </div>

        {/* Error Percentage */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.uartBaud.baudError}</span>
          </div>
          <div className={`code-ltr text-2xl font-mono font-bold ${
            Math.abs(result.errorPercent) <= 2.0
              ? 'text-emerald-400'
              : Math.abs(result.errorPercent) <= 3.0
              ? 'text-amber-400'
              : 'text-red-400'
          }`} dir="ltr">
            {result.errorPercent >= 0 ? '+' : ''}{result.errorPercent.toFixed(2)}%
          </div>
          <p className="text-[10px] text-muted">Tolerance limit: ±2.5% max</p>
        </div>

        {/* Framing Stability Status */}
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-1">
          <div className="flex items-center justify-between text-muted text-xs font-mono">
            <span>{t.uartBaud.framingStatus}</span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {result.status === 'safe' ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded border border-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>RELIABLE</span>
              </span>
            ) : result.status === 'marginal' ? (
              <span className="flex items-center gap-1.5 text-sm font-bold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded border border-amber-800">
                <AlertTriangle className="w-4 h-4" />
                <span>MARGINAL</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sm font-bold text-red-400 bg-red-950/40 px-2.5 py-1 rounded border border-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span>UNRELIABLE</span>
              </span>
            )}
          </div>
          <p className="text-[10px] text-secondary truncate mt-1">
            {result.status === 'safe' ? 'Zero framing errors' : 'Frame drop risk'}
          </p>
        </div>
      </div>

      {/* Explanation Banner */}
      <div className={`p-4 rounded-lg border text-xs leading-relaxed ${
        result.status === 'safe' 
          ? 'bg-surface border-subtle text-secondary'
          : result.status === 'marginal'
          ? 'bg-amber-950/20 border-amber-800 text-amber-200'
          : 'bg-red-950/20 border-red-800 text-red-200'
      }`}>
        <span className="font-bold mr-1">Engineering Assessment:</span>
        {result.statusExplanation}
      </div>

      {/* Comparison Table for All Common Bauds */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-2">
            <Table className="w-4 h-4 text-cyan-400" />
            <span>{t.uartBaud.comparisonTableTitle} (At {(clockHz / 1e6).toFixed(2)} MHz)</span>
          </h3>
          <span className="text-xs text-muted font-mono">{comparisonTable.length} Standard Rates</span>
        </div>

        <div className="code-ltr overflow-x-auto border border-subtle rounded max-h-64" dir="ltr">
          <table className="w-full text-xs font-mono">
            <thead className="bg-canvas border-b border-subtle text-secondary sticky top-0">
              <tr>
                <th className="p-2.5 text-left">Target Baud (bps)</th>
                <th className="p-2.5 text-center">Divisor (UBRR)</th>
                <th className="p-2.5 text-center">Achieved Baud</th>
                <th className="p-2.5 text-center">Error %</th>
                <th className="p-2.5 text-right">Framing Status</th>
              </tr>
            </thead>
            <tbody>
              {comparisonTable.map((row) => (
                <tr
                  key={row.targetBaud}
                  onClick={() => setTargetBaud(row.targetBaud)}
                  className={`border-b border-subtle/50 cursor-pointer hover:bg-hover transition-colors ${
                    row.targetBaud === targetBaud ? 'bg-cyan-950/25 font-bold text-cyan-300' : 'text-secondary'
                  }`}
                >
                  <td className="p-2.5 text-left font-semibold text-primary">{row.targetBaud.toLocaleString()}</td>
                  <td className="p-2.5 text-center">{row.divider} (0x{row.divider.toString(16).toUpperCase()})</td>
                  <td className="p-2.5 text-center">{row.actualBaud.toLocaleString()}</td>
                  <td className={`p-2.5 text-center ${
                    Math.abs(row.errorPercent) <= 2.0
                      ? 'text-emerald-400'
                      : Math.abs(row.errorPercent) <= 3.0
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {row.errorPercent >= 0 ? '+' : ''}{row.errorPercent.toFixed(2)}%
                  </td>
                  <td className="p-2.5 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      row.status === 'safe'
                        ? 'bg-emerald-950/40 text-emerald-400'
                        : row.status === 'marginal'
                        ? 'bg-amber-950/40 text-amber-400'
                        : 'bg-red-950/40 text-red-400'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>{t.common.stepByStep}</span>
          </div>
          <span className="text-xs text-secondary font-mono">{showSteps ? 'Hide' : 'Show'}</span>
        </button>

        {showSteps && (
          <div className="code-ltr text-xs font-mono space-y-1 text-secondary pt-2 border-t border-subtle" dir="ltr">
            {result.steps.map((st, i) => (
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
