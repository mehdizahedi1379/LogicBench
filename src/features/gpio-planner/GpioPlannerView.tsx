import React, { useState } from 'react';
import { 
  Cpu, 
  Copy, 
  Check, 
  Bookmark, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Code, 
  Info,
  Sliders
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { MCU_PRESETS, McuPreset } from '../../data/mcu-presets';
import { 
  PinAssignment, 
  PinFunction, 
  evaluateGpioPlan, 
  GpioPlanReport 
} from '../../lib/gpioPlannerHelper';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const GpioPlannerView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  const [selectedMcuId, setSelectedMcuId] = useState<string>('esp32');
  const activeMcu: McuPreset = MCU_PRESETS.find((m) => m.id === selectedMcuId) || MCU_PRESETS[0];

  const [assignments, setAssignments] = useState<Record<string, PinAssignment>>({
    'GPIO1': { pinIdentifier: 'GPIO1', customLabel: 'DEBUG_TX', assignedFunction: 'UART_TX' },
    'GPIO3': { pinIdentifier: 'GPIO3', customLabel: 'DEBUG_RX', assignedFunction: 'UART_RX' },
    'GPIO2': { pinIdentifier: 'GPIO2', customLabel: 'STATUS_LED', assignedFunction: 'GPIO_OUT' },
    'GPIO21': { pinIdentifier: 'GPIO21', customLabel: 'BUS_SDA', assignedFunction: 'I2C_SDA' },
    'GPIO22': { pinIdentifier: 'GPIO22', customLabel: 'BUS_SCL', assignedFunction: 'I2C_SCL' },
    'GPIO34': { pinIdentifier: 'GPIO34', customLabel: 'BATTERY_ADC', assignedFunction: 'ADC' },
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [showExportModal, setShowExportModal] = useState<'markdown' | 'c' | null>(null);

  const planReport: GpioPlanReport = React.useMemo(() => {
    return evaluateGpioPlan(activeMcu, assignments);
  }, [activeMcu, assignments]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleFunctionChange = (pinId: string, fn: PinFunction) => {
    setAssignments((prev) => ({
      ...prev,
      [pinId]: {
        pinIdentifier: pinId,
        customLabel: prev[pinId]?.customLabel || '',
        assignedFunction: fn,
      },
    }));
  };

  const handleLabelChange = (pinId: string, label: string) => {
    setAssignments((prev) => ({
      ...prev,
      [pinId]: {
        pinIdentifier: pinId,
        customLabel: label,
        assignedFunction: prev[pinId]?.assignedFunction || 'GPIO_OUT',
      },
    }));
  };

  const handleSaveToNotes = async () => {
    const title = `GPIO Pinout Plan: ${activeMcu.name}`;
    const content = [
      `# ${title}`,
      `- Package: ${activeMcu.name} (${activeMcu.architecture})`,
      `- Total Assigned Pins: ${planReport.assignedCount} of ${activeMcu.pins.length}`,
      `- Conflict Status: ${planReport.conflicts.length === 0 ? 'CLEAN (No conflicts)' : `${planReport.conflicts.length} Violations Detected`}`,
      `\n### C Header #defines:\n\`\`\`c\n${planReport.cHeaderCode}\n\`\`\``,
      `\n` + planReport.markdownTable,
    ].join('\n');

    await saveToolResultToNotes(title, content, ['gpio', 'pinout', activeMcu.id]);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const availableFunctions: PinFunction[] = [
    'UNUSED', 'GPIO_IN', 'GPIO_OUT', 'ADC', 'PWM',
    'UART_TX', 'UART_RX', 'SPI_SCK', 'SPI_MOSI', 'SPI_MISO', 'SPI_CS',
    'I2C_SDA', 'I2C_SCL', 'RESET'
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span>{t.gpioPlanner.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.gpioPlanner.description}</p>
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

      {/* MCU Package Picker & Export Controls */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase text-secondary font-mono">
              {t.gpioPlanner.selectMcu}:
            </label>
            <select
              value={selectedMcuId}
              onChange={(e) => {
                setSelectedMcuId(e.target.value);
                setAssignments({});
              }}
              className="px-3 py-1.5 bg-canvas border border-subtle rounded text-xs text-primary font-medium focus:border-cyan-500 focus:outline-none"
            >
              {MCU_PRESETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(planReport.markdownTable, 'mdTable')}
              className="px-3 py-1.5 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
            >
              {copiedKey === 'mdTable' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{t.common.exportMarkdown}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy(planReport.cHeaderCode, 'cHeader')}
              className="px-3 py-1.5 text-xs rounded bg-surface-subtle hover:bg-hover border border-subtle text-secondary hover:text-primary transition-colors flex items-center gap-1.5"
            >
              {copiedKey === 'cHeader' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{t.common.exportCHeader}</span>
            </button>
          </div>
        </div>

        {/* Conflict Status Banner */}
        <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
          planReport.conflicts.length > 0 
            ? 'bg-red-950/30 border-red-800 text-red-200' 
            : 'bg-emerald-950/20 border-emerald-800 text-emerald-300'
        }`}>
          {planReport.conflicts.length > 0 ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <span className="font-bold">
              {planReport.conflicts.length > 0 ? `${planReport.conflicts.length} Hardware Pin Conflict(s) Detected:` : t.gpioPlanner.noConflicts}
            </span>
            {planReport.conflicts.map((c, i) => (
              <div key={i} className="code-ltr font-mono text-[11px]" dir="ltr">
                • {c.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pin Allocation Matrix Table */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
            {t.gpioPlanner.pinTable} ({activeMcu.pins.length} Total Pins)
          </h3>
          <span className="text-xs font-mono text-cyan-400">
            {planReport.assignedCount} Active Assigned
          </span>
        </div>

        <div className="code-ltr overflow-x-auto border border-subtle rounded max-h-96" dir="ltr">
          <table className="w-full text-xs font-mono">
            <thead className="bg-canvas border-b border-subtle text-secondary sticky top-0">
              <tr>
                <th className="p-2.5 text-left">Pin / Net</th>
                <th className="p-2.5 text-left">Supported Hardware Peripherals</th>
                <th className="p-2.5 text-left">Custom Label</th>
                <th className="p-2.5 text-left">Assigned Function</th>
              </tr>
            </thead>
            <tbody>
              {activeMcu.pins.map((pin) => {
                const pinKey = String(pin.pin);
                const current = assignments[pinKey] || { pinIdentifier: pinKey, customLabel: '', assignedFunction: 'UNUSED' };
                const isConflict = planReport.conflicts.some((c) => c.pinIdentifier === pinKey);

                return (
                  <tr
                    key={pinKey}
                    className={`border-b border-subtle/50 transition-colors ${
                      isConflict ? 'bg-red-950/20 text-red-200' : current.assignedFunction !== 'UNUSED' ? 'bg-cyan-950/15' : 'hover:bg-hover'
                    }`}
                  >
                    <td className="p-2.5">
                      <div className="font-bold text-primary">{pin.pin}</div>
                      <div className="text-[10px] text-muted">{pin.label}</div>
                    </td>

                    <td className="p-2.5 text-secondary">
                      <div className="flex flex-wrap gap-1">
                        {pin.supportedFunctions.map((fn) => (
                          <span key={fn} className="text-[9px] px-1.5 py-0.2 rounded bg-surface border border-subtle text-muted">
                            {fn}
                          </span>
                        ))}
                        {pin.isInputOnly && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/40 border border-amber-800 text-amber-300 font-bold">
                            INPUT ONLY
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-2.5">
                      <input
                        type="text"
                        value={current.customLabel}
                        onChange={(e) => handleLabelChange(pinKey, e.target.value)}
                        placeholder="e.g. LED1"
                        className="w-32 px-2 py-1 bg-canvas border border-subtle rounded text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                      />
                    </td>

                    <td className="p-2.5">
                      <select
                        value={current.assignedFunction}
                        onChange={(e) => handleFunctionChange(pinKey, e.target.value as PinFunction)}
                        className={`px-2 py-1 bg-canvas border rounded text-xs font-mono ${
                          current.assignedFunction !== 'UNUSED' ? 'text-emerald-400 font-bold border-emerald-500/50' : 'text-muted border-subtle'
                        }`}
                      >
                        {availableFunctions.map((fn) => (
                          <option key={fn} value={fn}>
                            {fn}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
