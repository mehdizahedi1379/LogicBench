import React, { useState } from 'react';
import { 
  Code, 
  Copy, 
  Check, 
  Bookmark, 
  Plus, 
  Trash2, 
  Layers, 
  Info,
  Sliders,
  SlidersHorizontal
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  BitfieldDefinition, 
  RegisterDefinition, 
  generateRegisterCode, 
  validateBitfields 
} from '../../lib/registerBitfieldHelper';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const RegisterBitfieldView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  const [regName, setRegName] = useState<string>('USART_CR1');
  const [offsetHex, setOffsetHex] = useState<string>('0x00');
  const [widthBits, setWidthBits] = useState<8 | 16 | 32>(32);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState(false);

  // Field Form state for adding new field
  const [newFieldName, setNewFieldName] = useState<string>('TXEIE');
  const [newStartBit, setNewStartBit] = useState<number>(7);
  const [newBitLength, setNewBitLength] = useState<number>(1);
  const [newAccess, setNewAccess] = useState<'RW' | 'RO' | 'WO' | 'W1C'>('RW');
  const [newDesc, setNewDesc] = useState<string>('TX Empty Interrupt Enable');

  const [fields, setFields] = useState<BitfieldDefinition[]>([
    { id: '1', name: 'UE', startBit: 0, bitLength: 1, access: 'RW', resetValue: 0, description: 'USART Enable' },
    { id: '2', name: 'RE', startBit: 2, bitLength: 1, access: 'RW', resetValue: 0, description: 'Receiver Enable' },
    { id: '3', name: 'TE', startBit: 3, bitLength: 1, access: 'RW', resetValue: 0, description: 'Transmitter Enable' },
    { id: '4', name: 'RXNEIE', startBit: 5, bitLength: 1, access: 'RW', resetValue: 0, description: 'RXNE Interrupt Enable' },
    { id: '5', name: 'PS', startBit: 9, bitLength: 1, access: 'RW', resetValue: 0, description: 'Parity Selection (0=Even, 1=Odd)' },
    { id: '6', name: 'PCE', startBit: 10, bitLength: 1, access: 'RW', resetValue: 0, description: 'Parity Control Enable' },
    { id: '7', name: 'M', startBit: 12, bitLength: 1, access: 'RW', resetValue: 0, description: 'Word length (0=8-bit, 1=9-bit)' },
    { id: '8', name: 'OVER8', startBit: 15, bitLength: 1, access: 'RW', resetValue: 0, description: 'Oversampling mode (0=16x, 1=8x)' },
  ]);

  const validation = React.useMemo(() => {
    return validateBitfields(fields, widthBits);
  }, [fields, widthBits]);

  const generated = React.useMemo(() => {
    const reg: RegisterDefinition = {
      name: regName,
      addressOffsetHex: offsetHex,
      widthBits,
      description: 'Hardware Peripheral Register',
      fields,
    };
    return generateRegisterCode(reg);
  }, [regName, offsetHex, widthBits, fields]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const newField: BitfieldDefinition = {
      id: `${Date.now()}`,
      name: newFieldName.trim().replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase(),
      startBit: newStartBit,
      bitLength: newBitLength,
      access: newAccess,
      resetValue: 0,
      description: newDesc.trim(),
    };
    setFields((prev) => [...prev, newField]);
    setNewFieldName('');
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSaveToNotes = async () => {
    const title = `Register Definition: ${regName} (${widthBits}-bit)`;
    const content = [
      `# ${title}`,
      `- Offset: \`${offsetHex}\` | Width: ${widthBits}-bit`,
      `\n### Header #defines:\n\`\`\`c\n${generated.headerDefines}\n\`\`\``,
      `\n### C Union Struct:\n\`\`\`c\n${generated.cStructSnippet}\n\`\`\``,
      `\n### Read-Modify-Write Snippets:\n` + generated.readModifyWriteSnippets.map((s) => `\`\`\`c\n// ${s.fieldName}\n${s.readCode}\n${s.writeCode}\n\`\`\``).join('\n\n'),
    ].join('\n');

    await saveToolResultToNotes(title, content, ['register', 'bitfields', 'c-code']);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  // Build 32-bit occupancy map for visual bar
  const bitOccupancy = new Array(widthBits).fill(null);
  fields.forEach((f, fIdx) => {
    for (let b = f.startBit; b < f.startBit + f.bitLength; b++) {
      if (b < widthBits) {
        bitOccupancy[b] = { field: f, index: fIdx };
      }
    }
  });

  const colors = [
    'bg-cyan-500/25 border-cyan-500 text-cyan-300',
    'bg-amber-500/25 border-amber-500 text-amber-300',
    'bg-emerald-500/25 border-emerald-500 text-emerald-300',
    'bg-purple-500/25 border-purple-500 text-purple-300',
    'bg-pink-500/25 border-pink-500 text-pink-300',
    'bg-rose-500/25 border-rose-500 text-rose-300',
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-400" />
            <span>{t.registerBitfield.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.registerBitfield.description}</p>
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

      {/* Register Parameters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <label className="text-xs font-semibold uppercase text-secondary">
            {t.registerBitfield.registerName}
          </label>
          <input
            type="text"
            value={regName}
            onChange={(e) => setRegName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase())}
            className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-cyan-300 font-bold"
          />
        </div>

        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <label className="text-xs font-semibold uppercase text-secondary">
            {t.registerBitfield.offsetHex}
          </label>
          <input
            type="text"
            value={offsetHex}
            onChange={(e) => setOffsetHex(e.target.value)}
            className="code-ltr w-full px-3 py-1.5 bg-canvas border border-subtle rounded text-xs font-mono text-amber-300"
          />
        </div>

        <div className="bg-surface rounded-lg p-4 border border-subtle space-y-2">
          <label className="text-xs font-semibold uppercase text-secondary">
            {t.registerBitfield.registerWidth}
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {([8, 16, 32] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWidthBits(w)}
                className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                  widthBits === w ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-canvas border-subtle text-secondary'
                }`}
              >
                {w}-bit
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Register Bitfield Strip (Strictly LTR) */}
      <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span>Interactive Visual Bit Map</span>
          </h3>
          <span className="text-xs font-mono text-muted">
            MSB [{widthBits - 1}] down to LSB [0]
          </span>
        </div>

        <div className="code-ltr overflow-x-auto pb-2" dir="ltr">
          <div className="flex items-center gap-1 min-w-max">
            {Array.from({ length: widthBits }, (_, i) => widthBits - 1 - i).map((bitIdx) => {
              const occ = bitOccupancy[bitIdx];
              const isReserved = occ === null;
              const colorClass = occ ? colors[occ.index % colors.length] : 'bg-canvas border-subtle text-muted/40';

              return (
                <div
                  key={bitIdx}
                  className={`w-9 h-16 border rounded flex flex-col items-center justify-between p-1 font-mono transition-colors ${colorClass}`}
                  title={occ ? `${occ.field.name} (Bit ${bitIdx}) - ${occ.field.description}` : `Reserved Bit ${bitIdx}`}
                >
                  <span className="text-[9px] text-muted">{bitIdx}</span>
                  <span className="text-[9px] font-bold truncate max-w-full leading-none">
                    {occ ? occ.field.name : '-'}
                  </span>
                  <span className="text-[8px] text-muted/70">
                    {occ ? occ.field.access : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Field List & Add Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Existing Defined Fields List */}
        <div className="lg:col-span-2 bg-surface rounded-lg p-5 border border-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
              Defined Bitfields ({fields.length})
            </h3>
            {!validation.isValid && (
              <span className="text-xs text-red-400 font-bold">Conflict in bit allocations</span>
            )}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {fields.map((f, idx) => (
              <div
                key={f.id}
                className="code-ltr bg-canvas p-3 rounded-lg border border-subtle flex items-center justify-between gap-3 text-xs font-mono"
                dir="ltr"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-surface border border-subtle flex items-center justify-center font-bold text-cyan-400 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="flex items-center gap-2">
                      <strong className="text-primary">{f.name}</strong>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-subtle text-amber-300">
                        [{f.startBit + f.bitLength - 1}:{f.startBit}]
                      </span>
                      <span className="text-[10px] text-muted font-normal">
                        ({f.bitLength} bit{f.bitLength > 1 ? 's' : ''}, {f.access})
                      </span>
                    </div>
                    <div className="text-[11px] text-muted truncate">{f.description || 'No description'}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveField(f.id)}
                  className="p-1 rounded text-muted hover:text-red-400 hover:bg-hover shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add New Field Box */}
        <div className="bg-surface rounded-lg p-5 border border-subtle space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
            {t.registerBitfield.addFieldPrompt}
          </h3>

          <div className="space-y-2 text-xs">
            <div>
              <label className="text-muted block mb-1">{t.registerBitfield.fieldName}</label>
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="e.g. CEN"
                className="code-ltr w-full px-2 py-1 bg-canvas border border-subtle rounded font-mono text-cyan-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-muted block mb-1">{t.registerBitfield.startBit}</label>
                <input
                  type="number"
                  min="0"
                  max={widthBits - 1}
                  value={newStartBit}
                  onChange={(e) => setNewStartBit(Number(e.target.value))}
                  className="code-ltr w-full px-2 py-1 bg-canvas border border-subtle rounded font-mono text-primary"
                />
              </div>
              <div>
                <label className="text-muted block mb-1">{t.registerBitfield.bitLength}</label>
                <input
                  type="number"
                  min="1"
                  max={widthBits}
                  value={newBitLength}
                  onChange={(e) => setNewBitLength(Number(e.target.value))}
                  className="code-ltr w-full px-2 py-1 bg-canvas border border-subtle rounded font-mono text-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-muted block mb-1">{t.registerBitfield.accessType}</label>
              <select
                value={newAccess}
                onChange={(e) => setNewAccess(e.target.value as any)}
                className="w-full px-2 py-1 bg-canvas border border-subtle rounded font-mono text-primary"
              >
                <option value="RW">Read-Write (RW)</option>
                <option value="RO">Read-Only (RO)</option>
                <option value="WO">Write-Only (WO)</option>
                <option value="W1C">Write 1 to Clear (W1C)</option>
              </select>
            </div>

            <div>
              <label className="text-muted block mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
                className="w-full px-2 py-1 bg-canvas border border-subtle rounded text-primary"
              />
            </div>

            <button
              type="button"
              onClick={handleAddField}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center justify-center gap-1.5 transition-colors mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Field</span>
            </button>
          </div>
        </div>
      </div>

      {/* Generated C Code & Header Snippets */}
      <div className="space-y-4">
        {/* Header #defines */}
        <div className="bg-surface rounded-lg p-5 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-secondary font-mono">
              {t.registerBitfield.generatedCHeader}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(generated.headerDefines, 'cHeader')}
              className="text-xs text-muted hover:text-cyan-400 flex items-center gap-1"
            >
              {copiedKey === 'cHeader' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy</span>
            </button>
          </div>
          <pre className="code-ltr text-xs text-cyan-300 font-mono bg-canvas p-3 rounded border border-subtle overflow-x-auto max-h-48" dir="ltr">
            {generated.headerDefines}
          </pre>
        </div>

        {/* C Union / Struct */}
        <div className="bg-surface rounded-lg p-5 border border-subtle space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-secondary font-mono">
              {t.registerBitfield.generatedUnionStruct}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(generated.cStructSnippet, 'cStruct')}
              className="text-xs text-muted hover:text-cyan-400 flex items-center gap-1"
            >
              {copiedKey === 'cStruct' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy</span>
            </button>
          </div>
          <pre className="code-ltr text-xs text-emerald-300 font-mono bg-canvas p-3 rounded border border-subtle overflow-x-auto max-h-48" dir="ltr">
            {generated.cStructSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
};
