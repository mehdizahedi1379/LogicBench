import React, { useState } from 'react';
import { 
  Network, 
  Copy, 
  Check, 
  Bookmark, 
  Search, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Hash,
  ShieldAlert
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { COMMON_I2C_DEVICES, I2cDeviceEntry } from '../../data/mcu-presets';
import { 
  analyzeI2cAddress, 
  detectI2cBusConflicts, 
  UserBusDevice 
} from '../../lib/i2cAddressTool';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const I2cAddressView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  // Address conversion state
  const [addrInput, setAddrInput] = useState<string>('0x3C'); // SSD1306 default
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState<string>('');

  // User-defined I2C bus state
  const [userBus, setUserBus] = useState<UserBusDevice[]>([
    { instanceId: '1', name: 'SSD1306 OLED Display', address7Bit: 0x3c },
    { instanceId: '2', name: 'DS3231 Real-Time Clock', address7Bit: 0x68 },
    { instanceId: '3', name: 'BME280 Climate Sensor', address7Bit: 0x76 },
  ]);

  const parsedAddr = React.useMemo(() => {
    let clean = addrInput.trim();
    if (clean.startsWith('0x') || clean.startsWith('0X')) {
      const val = parseInt(clean, 16);
      return isNaN(val) ? 0x3c : val;
    }
    const val = parseInt(clean, 10);
    return isNaN(val) ? 0x3c : val;
  }, [addrInput]);

  const addrAnalysis = React.useMemo(() => {
    return analyzeI2cAddress(parsedAddr);
  }, [parsedAddr]);

  const conflictReport = React.useMemo(() => {
    return detectI2cBusConflicts(userBus);
  }, [userBus]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleAddDeviceToBus = (device: I2cDeviceEntry) => {
    const newEntry: UserBusDevice = {
      instanceId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: device.name,
      address7Bit: device.address7Bit,
      notes: device.addressPins,
    };
    setUserBus((prev) => [...prev, newEntry]);
  };

  const handleRemoveDeviceFromBus = (instanceId: string) => {
    setUserBus((prev) => prev.filter((d) => d.instanceId !== instanceId));
  };

  const handleSaveToNotes = async () => {
    const title = `I2C Bus Configuration & Address Analysis`;
    const content = [
      `# ${title}`,
      `### Target Address Analysis:`,
      `- 7-bit Address: \`${addrAnalysis.hex7Bit}\` (${addrAnalysis.bin7Bit}, Dec: ${addrAnalysis.address7Bit})`,
      `- 8-bit Write Address: \`${addrAnalysis.hexWrite8Bit}\` (${addrAnalysis.binWrite8Bit})`,
      `- 8-bit Read Address: \`${addrAnalysis.hexRead8Bit}\` (${addrAnalysis.binRead8Bit})`,
      `\n### User Bus Devices (${userBus.length} attached):`,
      ...userBus.map((d) => `- 0x${d.address7Bit.toString(16).padStart(2, '0').toUpperCase()} : ${d.name}`),
      `\n### Conflict Status:\n` + conflictReport.steps.join('\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['i2c', 'addresses', 'conflict-check']);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  const filteredDevices = COMMON_I2C_DEVICES.filter((d) => {
    const q = deviceSearch.toLowerCase();
    const hex = `0x${d.address7Bit.toString(16).toLowerCase()}`;
    return d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || hex.includes(q);
  });

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <span>{t.i2cAddress.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.i2cAddress.description}</p>
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

      {/* 7-Bit to 8-Bit Converter Section */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
            <Hash className="w-4 h-4 text-cyan-400" />
            <span>{t.i2cAddress.addressConverterTitle}</span>
          </h3>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted font-mono">{t.i2cAddress.input7BitAddress}:</label>
            <input
              type="text"
              value={addrInput}
              onChange={(e) => setAddrInput(e.target.value)}
              className="code-ltr w-24 px-2 py-1 bg-canvas border border-subtle rounded text-xs font-mono text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 7-Bit vs 8-Bit Visual Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 7-Bit Base Address */}
          <div className="bg-canvas p-4 rounded-lg border border-subtle space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono">
              <span>7-Bit Slave Address</span>
              <button
                type="button"
                onClick={() => handleCopy(addrAnalysis.hex7Bit, 'addr7')}
                className="hover:text-primary"
              >
                {copiedKey === 'addr7' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="code-ltr text-2xl font-mono font-bold text-cyan-400" dir="ltr">
              {addrAnalysis.hex7Bit}
            </div>
            <div className="code-ltr text-[11px] font-mono text-secondary" dir="ltr">
              {addrAnalysis.bin7Bit} (Dec: {addrAnalysis.address7Bit})
            </div>
          </div>

          {/* 8-Bit Write Address */}
          <div className="bg-canvas p-4 rounded-lg border border-subtle space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono">
              <span>{t.i2cAddress.write8Bit}</span>
              <button
                type="button"
                onClick={() => handleCopy(addrAnalysis.hexWrite8Bit, 'addrW')}
                className="hover:text-primary"
              >
                {copiedKey === 'addrW' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="code-ltr text-2xl font-mono font-bold text-amber-400" dir="ltr">
              {addrAnalysis.hexWrite8Bit}
            </div>
            <div className="code-ltr text-[11px] font-mono text-secondary" dir="ltr">
              {addrAnalysis.binWrite8Bit} (Bit 0 = 0)
            </div>
          </div>

          {/* 8-Bit Read Address */}
          <div className="bg-canvas p-4 rounded-lg border border-subtle space-y-1">
            <div className="flex items-center justify-between text-muted text-xs font-mono">
              <span>{t.i2cAddress.read8Bit}</span>
              <button
                type="button"
                onClick={() => handleCopy(addrAnalysis.hexRead8Bit, 'addrR')}
                className="hover:text-primary"
              >
                {copiedKey === 'addrR' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="code-ltr text-2xl font-mono font-bold text-emerald-400" dir="ltr">
              {addrAnalysis.hexRead8Bit}
            </div>
            <div className="code-ltr text-[11px] font-mono text-secondary" dir="ltr">
              {addrAnalysis.binRead8Bit} (Bit 0 = 1)
            </div>
          </div>
        </div>
      </div>

      {/* User-Defined Custom Bus Conflict Checker */}
      <div className={`p-5 rounded-lg border space-y-4 ${
        conflictReport.hasConflicts ? 'bg-red-950/20 border-red-800' : 'bg-surface border-subtle'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            {conflictReport.hasConflicts ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            <div>
              <h3 className="text-sm font-bold text-primary">{t.i2cAddress.busConflictCheckerTitle}</h3>
              <p className="text-xs text-secondary">
                {conflictReport.hasConflicts ? t.i2cAddress.busStatusConflict : t.i2cAddress.busStatusClean}
              </p>
            </div>
          </div>

          <span className="text-xs font-mono text-muted">
            {userBus.length} Devices Attached
          </span>
        </div>

        {/* Conflict Warning Details */}
        {conflictReport.hasConflicts && (
          <div className="bg-red-950/40 p-3 rounded border border-red-800 text-xs text-red-200 space-y-1">
            <span className="font-bold">Collision Warning:</span>
            {conflictReport.conflictGroups.map((cg, i) => (
              <div key={i} className="code-ltr font-mono" dir="ltr">
                Address {cg.addressHex} is shared by: {cg.devices.join(', ')}
              </div>
            ))}
          </div>
        )}

        {/* Current Devices on User Bus */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {userBus.map((dev) => {
            const isConflicting = conflictReport.conflictingAddresses.includes(dev.address7Bit);

            return (
              <div
                key={dev.instanceId}
                className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                  isConflicting
                    ? 'bg-red-950/30 border-red-700 text-red-200'
                    : 'bg-canvas border-subtle text-primary'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{dev.name}</div>
                  <div className="code-ltr text-[11px] font-mono text-muted" dir="ltr">
                    0x{dev.address7Bit.toString(16).padStart(2, '0').toUpperCase()} (Write: 0x{((dev.address7Bit << 1) & 0xfe).toString(16).toUpperCase()})
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDeviceFromBus(dev.instanceId)}
                  className="p-1 rounded text-muted hover:text-red-400 hover:bg-hover transition-colors shrink-0"
                  title="Remove from bus"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Common I2C Devices Database Table */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
            {t.i2cAddress.commonDevicesTitle}
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              placeholder="Search sensor, OLED, RTC..."
              className="w-full pl-8 pr-3 py-1 bg-canvas border border-subtle rounded text-xs text-primary placeholder-muted focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Database Table */}
        <div className="code-ltr overflow-x-auto border border-subtle rounded max-h-72" dir="ltr">
          <table className="w-full text-xs font-mono">
            <thead className="bg-canvas border-b border-subtle text-secondary sticky top-0">
              <tr>
                <th className="p-2.5 text-left">7-Bit Addr</th>
                <th className="p-2.5 text-left">Device Name</th>
                <th className="p-2.5 text-left">Category</th>
                <th className="p-2.5 text-left">Address Pin Config</th>
                <th className="p-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((dev, idx) => (
                <tr key={idx} className="border-b border-subtle/50 hover:bg-hover transition-colors">
                  <td className="p-2.5 text-cyan-400 font-bold">
                    0x{dev.address7Bit.toString(16).padStart(2, '0').toUpperCase()}
                  </td>
                  <td className="p-2.5 text-primary font-medium">{dev.name}</td>
                  <td className="p-2.5 text-muted">{dev.category}</td>
                  <td className="p-2.5 text-secondary">{dev.addressPins || 'Fixed'}</td>
                  <td className="p-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleAddDeviceToBus(dev)}
                      className="px-2 py-0.5 rounded bg-surface-subtle hover:bg-cyan-600 hover:text-white border border-subtle text-secondary text-[11px] transition-colors"
                    >
                      + Add to Bus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
