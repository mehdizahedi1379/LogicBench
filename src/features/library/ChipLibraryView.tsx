import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Package, 
  Check, 
  Copy, 
  Download, 
  Upload, 
  Tag, 
  Cpu, 
  Zap, 
  Sliders, 
  AlertTriangle,
  X,
  FileText,
  ChevronRight
} from 'lucide-react';
import { db, DBChip } from '../../lib/db';
import { useI18n } from '../../i18n/context';
import { FeatureContextProps } from '../types';

export const ChipLibraryView: React.FC<FeatureContextProps> = () => {
  const { t, language } = useI18n();
  const isRtl = language === 'fa';

  const [chips, setChips] = useState<DBChip[]>([]);
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [architectureFilter, setArchitectureFilter] = useState<string>('all');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Edit/Add modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<DBChip>>({
    partNumber: '',
    manufacturer: '',
    architecture: '',
    category: 'mcu',
    pinCount: 8,
    description: '',
    keySpecs: '',
    pinoutNotes: '',
    datasheetUrl: '',
    stockQuantity: 10,
    voltageMin: 3.3,
    voltageMax: 5.0,
  });

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    chip: DBChip | null;
  }>({ visible: false, x: 0, y: 0, chip: null });

  // Load chips from IndexedDB
  const loadChips = async () => {
    try {
      const allChips = await db.getAll('chips');
      allChips.sort((a, b) => a.partNumber.localeCompare(b.partNumber));
      setChips(allChips);
      if (allChips.length > 0 && !selectedChipId) {
        setSelectedChipId(allChips[0].id);
      }
    } catch (err) {
      console.error('Failed to load chips:', err);
    }
  };

  useEffect(() => {
    loadChips();
  }, []);

  const selectedChip = useMemo(() => chips.find(c => c.id === selectedChipId), [chips, selectedChipId]);

  // Unique architectures for filter
  const architectures = useMemo(() => {
    const set = new Set<string>();
    chips.forEach(c => {
      if (c.architecture) set.add(c.architecture);
    });
    return Array.from(set);
  }, [chips]);

  // Filtered chips
  const filteredChips = useMemo(() => {
    return chips.filter(c => {
      const matchesSearch = searchQuery === '' || 
        c.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.keySpecs && c.keySpecs.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchesArch = architectureFilter === 'all' || c.architecture === architectureFilter;

      return matchesSearch && matchesCategory && matchesArch;
    });
  }, [chips, searchQuery, categoryFilter, architectureFilter]);

  // Adjust stock quantity with instant DB update
  const handleAdjustStock = async (id: string, delta: number) => {
    const target = chips.find(c => c.id === id);
    if (!target) return;

    const newStock = Math.max(0, (target.stockQuantity || 0) + delta);
    const updated: DBChip = { ...target, stockQuantity: newStock, updatedAt: Date.now() };

    await db.put('chips', updated);
    setChips(prev => prev.map(c => c.id === id ? updated : c));
  };

  // Delete chip
  const handleDeleteChip = async (id: string) => {
    if (!window.confirm(isRtl ? 'آیا از حذف این قطعه اطمینان دارید؟' : 'Are you sure you want to delete this chip?')) return;
    await db.delete('chips', id);
    const updated = chips.filter(c => c.id !== id);
    setChips(updated);
    if (selectedChipId === id) {
      setSelectedChipId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      partNumber: '',
      manufacturer: '',
      architecture: 'ARM Cortex-M4',
      category: 'mcu',
      pinCount: 16,
      description: '',
      keySpecs: '',
      pinoutNotes: '',
      datasheetUrl: '',
      stockQuantity: 5,
      voltageMin: 3.3,
      voltageMax: 5.0,
    });
    setEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (chip: DBChip) => {
    setModalMode('edit');
    setFormData({ ...chip });
    setEditModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.partNumber?.trim()) return;

    const now = Date.now();
    const chipToSave: DBChip = {
      id: modalMode === 'edit' && formData.id ? formData.id : `chip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      partNumber: formData.partNumber.trim(),
      manufacturer: formData.manufacturer?.trim() || 'Generic',
      architecture: formData.architecture?.trim() || 'Discrete Logic',
      category: formData.category || 'logic_ic',
      pinCount: Number(formData.pinCount) || 8,
      description: formData.description?.trim() || '',
      keySpecs: formData.keySpecs?.trim() || '',
      pinoutNotes: formData.pinoutNotes?.trim() || '',
      datasheetUrl: formData.datasheetUrl?.trim() || '',
      stockQuantity: Number(formData.stockQuantity) || 0,
      voltageMin: formData.voltageMin ? Number(formData.voltageMin) : undefined,
      voltageMax: formData.voltageMax ? Number(formData.voltageMax) : undefined,
      updatedAt: now,
    };

    await db.put('chips', chipToSave);
    await loadChips();
    setSelectedChipId(chipToSave.id);
    setEditModalOpen(false);
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  // Export JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(chips, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logicbench_chip_library_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Category badge colors
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'mcu': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'logic_ic': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'sensor': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'analog': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'interface': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-secondary bg-surface-subtle border-subtle';
    }
  };

  return (
    <div className="h-full flex flex-col bg-canvas select-none">
      {/* Top action header */}
      <div className="p-3 bg-surface border-b border-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span>Chip & Component Library</span>
              <span className="text-xs font-mono font-normal text-secondary">({chips.length} components)</span>
            </h2>
            <p className="text-[11px] text-secondary">
              Microcontrollers, 74xx discrete logic, sensors, analog ICs & stock inventory
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1 text-xs rounded border border-subtle text-secondary hover:text-primary hover:bg-hover inline-flex items-center gap-1.5 transition-colors"
            title="Export catalog as JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Component</span>
          </button>
        </div>
      </div>

      {/* Main split: Filter & Table on Left, Component Inspector on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Table / Grid */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-subtle">
          {/* Filters Bar */}
          <div className="p-2.5 bg-surface/50 border-b border-subtle flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search part #, family, specs..."
                className="w-full bg-surface-subtle border border-subtle rounded px-8 py-1.5 text-xs text-primary focus:outline-none focus:border-cyan-500 font-mono placeholder:text-muted"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-secondary hover:text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface-subtle border border-subtle rounded px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">All Categories</option>
              <option value="mcu">Microcontrollers (MCU)</option>
              <option value="logic_ic">74xx / Logic ICs</option>
              <option value="sensor">Sensors</option>
              <option value="analog">Analog & Timers</option>
              <option value="interface">Interface / Drivers</option>
            </select>

            {/* Architecture Dropdown */}
            {architectures.length > 0 && (
              <select
                value={architectureFilter}
                onChange={(e) => setArchitectureFilter(e.target.value)}
                className="bg-surface-subtle border border-subtle rounded px-2.5 py-1.5 text-xs text-primary focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="all">All Families</option>
                {architectures.map(arch => (
                  <option key={arch} value={arch}>{arch}</option>
                ))}
              </select>
            )}
          </div>

          {/* Component Table List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChips.length === 0 ? (
              <div className="p-8 text-center text-secondary text-xs space-y-2">
                <Package className="w-8 h-8 mx-auto text-secondary opacity-40" />
                <p>No components match the current filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                    setArchitectureFilter('all');
                  }}
                  className="text-cyan-400 hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-surface-subtle border-b border-subtle text-[11px] font-mono text-secondary uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-2 px-3">Part Number</th>
                    <th className="py-2 px-3">Family / Architecture</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Pins</th>
                    <th className="py-2 px-3 text-right">In Stock</th>
                    <th className="py-2 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle/40 font-mono">
                  {filteredChips.map(chip => {
                    const isSelected = chip.id === selectedChipId;
                    const isLowStock = (chip.stockQuantity || 0) < 5;

                    return (
                      <tr
                        key={chip.id}
                        onClick={() => setSelectedChipId(chip.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            chip
                          });
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-cyan-500/10' : 'hover:bg-hover'
                        }`}
                      >
                        {/* Part Number & Manufacturer */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-primary flex items-center gap-1.5">
                            <span>{chip.partNumber}</span>
                            {chip.datasheetUrl && (
                              <a
                                href={chip.datasheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-secondary hover:text-cyan-400"
                                title="Open Datasheet"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-secondary font-sans">
                            {chip.manufacturer}
                          </div>
                        </td>

                        {/* Family */}
                        <td className="py-2.5 px-3 text-secondary font-sans text-[11px]">
                          {chip.architecture}
                        </td>

                        {/* Category Badge */}
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border uppercase ${getCategoryBadgeClass(chip.category)}`}>
                            {chip.category.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Pins */}
                        <td className="py-2.5 px-3 text-secondary">
                          {chip.pinCount} pins
                        </td>

                        {/* Stock Counter Stepper */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5 bg-surface-subtle border border-subtle rounded px-1.5 py-0.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(chip.id, -1)}
                              className="text-secondary hover:text-primary px-1 hover:bg-hover rounded"
                              title="Decrease stock"
                            >
                              −
                            </button>
                            <span className={`min-w-[20px] text-center font-bold ${isLowStock ? 'text-amber-400' : 'text-primary'}`}>
                              {chip.stockQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdjustStock(chip.id, 1)}
                              className="text-secondary hover:text-primary px-1 hover:bg-hover rounded"
                              title="Increase stock"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Quick action buttons */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(chip)}
                              className="p-1 rounded text-secondary hover:text-primary hover:bg-hover"
                              title="Edit component"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteChip(chip.id)}
                              className="p-1 rounded text-secondary hover:text-rose-400 hover:bg-rose-500/10"
                              title="Delete component"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Detail Inspector */}
        <div className="w-84 bg-surface flex flex-col overflow-y-auto shrink-0 select-text">
          {selectedChip ? (
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="border-b border-subtle pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border uppercase ${getCategoryBadgeClass(selectedChip.category)}`}>
                    {selectedChip.category.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-secondary">
                    {selectedChip.pinCount} Pins · {selectedChip.voltageMin ? `${selectedChip.voltageMin}V - ${selectedChip.voltageMax}V` : 'Logic Level'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-primary font-mono flex items-center justify-between">
                  <span>{selectedChip.partNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedChip.partNumber, 'partNumber')}
                    className="text-secondary hover:text-cyan-400 p-1"
                    title="Copy part number"
                  >
                    {copyFeedback === 'partNumber' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </h3>
                <p className="text-xs text-secondary font-sans">{selectedChip.manufacturer} · {selectedChip.architecture}</p>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block font-sans">
                  Description
                </label>
                <p className="text-xs text-primary leading-relaxed font-sans bg-surface-subtle p-2.5 rounded border border-subtle">
                  {selectedChip.description || 'No description provided.'}
                </p>
              </div>

              {/* Key Specs */}
              {selectedChip.keySpecs && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block font-sans">
                    Key Technical Specs
                  </label>
                  <div className="p-2.5 rounded bg-surface-subtle border border-subtle font-mono text-xs text-primary leading-relaxed code-ltr">
                    {selectedChip.keySpecs}
                  </div>
                </div>
              )}

              {/* Pinout Notes */}
              {selectedChip.pinoutNotes && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-sans">
                    Pinout & Wiring Notes
                  </label>
                  <div className="p-2.5 rounded bg-surface-subtle border border-subtle font-mono text-xs text-primary leading-relaxed code-ltr whitespace-pre-wrap">
                    {selectedChip.pinoutNotes}
                  </div>
                </div>
              )}

              {/* Inventory & Stock */}
              <div className="p-3 rounded-lg bg-surface-subtle border border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="font-semibold text-secondary">Stock Inventory</span>
                  <span className={`font-mono font-bold ${selectedChip.stockQuantity < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedChip.stockQuantity} units available
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(selectedChip.id, -1)}
                    className="flex-1 py-1 text-xs font-mono font-bold bg-canvas border border-subtle rounded hover:bg-hover text-secondary hover:text-primary transition-colors"
                  >
                    -1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(selectedChip.id, 5)}
                    className="flex-1 py-1 text-xs font-mono font-bold bg-canvas border border-subtle rounded hover:bg-hover text-secondary hover:text-primary transition-colors"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(selectedChip.id, 10)}
                    className="flex-1 py-1 text-xs font-mono font-bold bg-canvas border border-subtle rounded hover:bg-hover text-secondary hover:text-primary transition-colors"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Datasheet Link */}
              {selectedChip.datasheetUrl && (
                <a
                  href={selectedChip.datasheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-semibold flex items-center justify-center gap-2 transition-colors select-none"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Manufacturer Datasheet</span>
                </a>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6 text-center text-secondary text-xs">
              Select a component to inspect technical specs and pinout notes.
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.chip && (
        <div
          className="fixed z-50 bg-surface border border-subtle rounded-lg shadow-xl py-1 w-48 text-xs font-sans text-primary select-none animate-in fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (contextMenu.chip) handleOpenEdit(contextMenu.chip);
              setContextMenu({ visible: false, x: 0, y: 0, chip: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit Component</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (contextMenu.chip) handleAdjustStock(contextMenu.chip.id, 5);
              setContextMenu({ visible: false, x: 0, y: 0, chip: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add +5 to Stock</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (contextMenu.chip) handleCopy(contextMenu.chip.partNumber, 'cm');
              setContextMenu({ visible: false, x: 0, y: 0, chip: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-secondary" />
            <span>Copy Part Number</span>
          </button>
          <div className="h-px bg-subtle my-1" />
          <button
            type="button"
            onClick={() => {
              if (contextMenu.chip) handleDeleteChip(contextMenu.chip.id);
              setContextMenu({ visible: false, x: 0, y: 0, chip: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Component</span>
          </button>
        </div>
      )}

      {/* Close context menu */}
      {contextMenu.visible && (
        <div className="fixed inset-0 z-40" onClick={() => setContextMenu({ visible: false, x: 0, y: 0, chip: null })} />
      )}

      {/* Add / Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveModal} className="bg-surface border border-subtle rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>{modalMode === 'create' ? 'Add New Component' : 'Edit Component Specs'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-secondary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Part Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.partNumber || ''}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    placeholder="e.g. ATmega328P-PU or SN74HC595N"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={formData.manufacturer || ''}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g. Microchip, TI, ST, Espressif"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Category</label>
                  <select
                    value={formData.category || 'mcu'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  >
                    <option value="mcu">MCU</option>
                    <option value="logic_ic">74xx Logic</option>
                    <option value="sensor">Sensor</option>
                    <option value="analog">Analog / Timer</option>
                    <option value="interface">Interface</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Family / Arch</label>
                  <input
                    type="text"
                    value={formData.architecture || ''}
                    onChange={(e) => setFormData({ ...formData, architecture: e.target.value })}
                    placeholder="e.g. AVR, ARM Cortex-M4"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockQuantity ?? 0}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Pin Count</label>
                  <input
                    type="number"
                    min="2"
                    max="1000"
                    value={formData.pinCount || 8}
                    onChange={(e) => setFormData({ ...formData, pinCount: parseInt(e.target.value) || 8 })}
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Min Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.voltageMin || ''}
                    onChange={(e) => setFormData({ ...formData, voltageMin: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 1.8"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Max Voltage (V)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.voltageMax || ''}
                    onChange={(e) => setFormData({ ...formData, voltageMax: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 5.5"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of component role and capabilities"
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-sans text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-cyan-400 uppercase block mb-1">Key Technical Specs</label>
                <input
                  type="text"
                  value={formData.keySpecs || ''}
                  onChange={(e) => setFormData({ ...formData, keySpecs: e.target.value })}
                  placeholder="Clock speed, flash memory, peripherals, ADC channels"
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Pinout Notes & Wiring</label>
                <textarea
                  rows={3}
                  value={formData.pinoutNotes || ''}
                  onChange={(e) => setFormData({ ...formData, pinoutNotes: e.target.value })}
                  placeholder="e.g. DIP-28: Pin 1 RESET, Pin 7 VCC, Pin 8 GND, Pin 19 SCK..."
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Datasheet URL</label>
                <input
                  type="url"
                  value={formData.datasheetUrl || ''}
                  onChange={(e) => setFormData({ ...formData, datasheetUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="p-3 border-t border-subtle bg-surface/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-subtle text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors"
              >
                {modalMode === 'create' ? 'Save Component' : 'Update Component'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
