import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FolderKanban, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Undo2, 
  Redo2, 
  Cpu, 
  CheckSquare, 
  Square, 
  DollarSign, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  FileText, 
  Layers, 
  Sliders, 
  Link as LinkIcon, 
  X,
  PlusCircle,
  FileSpreadsheet
} from 'lucide-react';
import { db, DBProject, DBProjectBomItem, DBProjectChecklistItem, DBNote } from '../../lib/db';
import { useI18n } from '../../i18n/context';
import { useWorkbench } from '../../store/workbenchStore';
import { FeatureContextProps } from '../types';

export const ProjectsView: React.FC<FeatureContextProps> = () => {
  const { t, language } = useI18n();
  const { openTab } = useWorkbench();
  const isRtl = language === 'fa';

  const [projects, setProjects] = useState<DBProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'bom' | 'pins' | 'checklist' | 'notes'>('overview');
  const [allNotes, setAllNotes] = useState<DBNote[]>([]);

  // BOM Undo / Redo History
  const [bomHistory, setBomHistory] = useState<DBProjectBomItem[][]>([]);
  const [bomHistoryIndex, setBomHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // New item forms / Modals
  const [showAddBomModal, setShowAddBomModal] = useState(false);
  const [editingBomItem, setEditingBomItem] = useState<DBProjectBomItem | null>(null);
  const [bomForm, setBomForm] = useState<Partial<DBProjectBomItem>>({
    designator: '',
    partNumber: '',
    description: '',
    quantity: 1,
    unitCost: 1.0,
    supplierUrl: '',
    notes: '',
  });

  const [newChecklistText, setNewChecklistText] = useState('');
  const [newPinName, setNewPinName] = useState('');
  const [newPinSignal, setNewPinSignal] = useState('');

  // Context Menu for BOM items
  const [bomContextMenu, setBomContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: DBProjectBomItem | null;
  }>({ visible: false, x: 0, y: 0, item: null });

  // Load projects & notes from DB
  const loadProjects = async () => {
    try {
      const [projList, noteList] = await Promise.all([
        db.getAll('projects'),
        db.getAll('notes')
      ]);
      projList.sort((a, b) => b.updatedAt - a.updatedAt);
      setProjects(projList);
      setAllNotes(noteList);
      if (projList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projList[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const currentProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);

  // Sync BOM history when project changes
  useEffect(() => {
    if (currentProject) {
      setBomHistory([currentProject.bom || []]);
      setBomHistoryIndex(0);
    }
  }, [selectedProjectId]);

  // Save project helper
  const updateProject = async (updated: DBProject) => {
    updated.updatedAt = Date.now();
    await db.put('projects', updated);
    setProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  // Push to BOM history for undo/redo
  const pushBomState = (newBom: DBProjectBomItem[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setBomHistory(prev => {
      const sliced = prev.slice(0, bomHistoryIndex + 1);
      return [...sliced, newBom];
    });
    setBomHistoryIndex(prev => prev + 1);
  };

  // BOM Undo / Redo handlers
  const handleBomUndo = useCallback(() => {
    if (bomHistoryIndex > 0 && currentProject) {
      const targetBom = bomHistory[bomHistoryIndex - 1];
      isUndoRedoAction.current = true;
      setBomHistoryIndex(prev => prev - 1);
      updateProject({ ...currentProject, bom: targetBom });
    }
  }, [bomHistory, bomHistoryIndex, currentProject]);

  const handleBomRedo = useCallback(() => {
    if (bomHistoryIndex < bomHistory.length - 1 && currentProject) {
      const targetBom = bomHistory[bomHistoryIndex + 1];
      isUndoRedoAction.current = true;
      setBomHistoryIndex(prev => prev + 1);
      updateProject({ ...currentProject, bom: targetBom });
    }
  }, [bomHistory, bomHistoryIndex, currentProject]);

  // Create new project
  const handleCreateProject = async () => {
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const newProj: DBProject = {
      id,
      title: 'New Hardware Project',
      description: 'Project description and scope',
      goals: '1. Specify hardware requirements\n2. Design schematic and PCB\n3. Bring up board and firmware',
      targetMcu: 'ESP32-WROOM-32D',
      pinMap: {
        'GPIO21': 'I2C_SDA',
        'GPIO22': 'I2C_SCL'
      },
      bom: [],
      checklist: [
        { id: 'c1', label: 'Review power rail decoupling', completed: false },
        { id: 'c2', label: 'Verify MCU crystal oscillator frequency', completed: false }
      ],
      linkedNoteIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.put('projects', newProj);
    setProjects(prev => [newProj, ...prev]);
    setSelectedProjectId(id);
    setActiveSubTab('overview');
  };

  // Delete project
  const handleDeleteProject = async (id: string) => {
    if (!window.confirm(isRtl ? 'آیا از حذف این پروژه اطمینان دارید؟' : 'Are you sure you want to delete this project?')) return;
    await db.delete('projects', id);
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (selectedProjectId === id) {
      setSelectedProjectId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Save BOM Item (Create or Edit)
  const handleSaveBomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !bomForm.partNumber?.trim()) return;

    let updatedBom: DBProjectBomItem[];
    if (editingBomItem) {
      updatedBom = (currentProject.bom || []).map(item => item.id === editingBomItem.id ? {
        ...editingBomItem,
        designator: bomForm.designator?.trim() || 'U1',
        partNumber: bomForm.partNumber!.trim(),
        description: bomForm.description?.trim() || '',
        quantity: Math.max(1, Number(bomForm.quantity) || 1),
        unitCost: Math.max(0, Number(bomForm.unitCost) || 0),
        supplierUrl: bomForm.supplierUrl?.trim() || '',
        notes: bomForm.notes?.trim() || '',
      } : item);
    } else {
      const newItem: DBProjectBomItem = {
        id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        designator: bomForm.designator?.trim() || 'U1',
        partNumber: bomForm.partNumber.trim(),
        description: bomForm.description?.trim() || '',
        quantity: Math.max(1, Number(bomForm.quantity) || 1),
        unitCost: Math.max(0, Number(bomForm.unitCost) || 0),
        supplierUrl: bomForm.supplierUrl?.trim() || '',
        notes: bomForm.notes?.trim() || '',
      };
      updatedBom = [...(currentProject.bom || []), newItem];
    }

    pushBomState(updatedBom);
    updateProject({ ...currentProject, bom: updatedBom });
    setShowAddBomModal(false);
    setEditingBomItem(null);
  };

  // Delete BOM Item
  const handleDeleteBomItem = (itemId: string) => {
    if (!currentProject) return;
    const updatedBom = (currentProject.bom || []).filter(item => item.id !== itemId);
    pushBomState(updatedBom);
    updateProject({ ...currentProject, bom: updatedBom });
  };

  // Duplicate BOM Item
  const handleDuplicateBomItem = (item: DBProjectBomItem) => {
    if (!currentProject) return;
    const dup: DBProjectBomItem = {
      ...item,
      id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      designator: `${item.designator}_copy`
    };
    const updatedBom = [...(currentProject.bom || []), dup];
    pushBomState(updatedBom);
    updateProject({ ...currentProject, bom: updatedBom });
  };

  // Toggle checklist item
  const handleToggleChecklist = (checkId: string) => {
    if (!currentProject) return;
    const updated = (currentProject.checklist || []).map(c => 
      c.id === checkId ? { ...c, completed: !c.completed } : c
    );
    updateProject({ ...currentProject, checklist: updated });
  };

  // Add checklist item
  const handleAddChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newChecklistText.trim()) return;

    const newItem: DBProjectChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: newChecklistText.trim(),
      completed: false,
    };
    updateProject({
      ...currentProject,
      checklist: [...(currentProject.checklist || []), newItem]
    });
    setNewChecklistText('');
  };

  // Add pin mapping
  const handleAddPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject || !newPinName.trim()) return;

    const updatedPinMap = {
      ...(currentProject.pinMap || {}),
      [newPinName.trim()]: newPinSignal.trim() || 'GPIO'
    };
    updateProject({ ...currentProject, pinMap: updatedPinMap });
    setNewPinName('');
    setNewPinSignal('');
  };

  // Remove pin mapping
  const handleRemovePin = (pinName: string) => {
    if (!currentProject) return;
    const updated = { ...(currentProject.pinMap || {}) };
    delete updated[pinName];
    updateProject({ ...currentProject, pinMap: updated });
  };

  // Import from GPIO Planner (Preset load)
  const handleImportGpioPlanner = () => {
    if (!currentProject) return;
    const defaultMcuPins: Record<string, string> = {
      'GPIO21': 'I2C_SDA (Bus Master)',
      'GPIO22': 'I2C_SCL (Bus Master)',
      'GPIO18': 'SPI_SCK (Clock)',
      'GPIO19': 'SPI_MISO (Input)',
      'GPIO23': 'SPI_MOSI (Output)',
      'GPIO5': 'SPI_CS (Chip Select)',
      'GPIO1': 'UART0_TX (Console Output)',
      'GPIO3': 'UART0_RX (Console Input)',
    };
    updateProject({
      ...currentProject,
      pinMap: { ...(currentProject.pinMap || {}), ...defaultMcuPins }
    });
  };

  // Export BOM as CSV
  const handleExportBomCsv = () => {
    if (!currentProject) return;
    const headers = ['Designator', 'Part Number', 'Description', 'Quantity', 'Unit Cost ($)', 'Line Total ($)', 'Supplier URL', 'Notes'];
    const rows = (currentProject.bom || []).map(b => [
      `"${b.designator}"`,
      `"${b.partNumber}"`,
      `"${b.description || ''}"`,
      b.quantity,
      b.unitCost.toFixed(2),
      (b.quantity * b.unitCost).toFixed(2),
      `"${b.supplierUrl || ''}"`,
      `"${b.notes || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_BOM.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // BOM Totals calculation
  const bomTotals = useMemo(() => {
    if (!currentProject || !currentProject.bom) return { count: 0, cost: 0 };
    return currentProject.bom.reduce((acc, item) => {
      acc.count += item.quantity;
      acc.cost += item.quantity * item.unitCost;
      return acc;
    }, { count: 0, cost: 0 });
  }, [currentProject]);

  // Checklist Progress calculation
  const checklistProgress = useMemo(() => {
    if (!currentProject || !currentProject.checklist || currentProject.checklist.length === 0) return 0;
    const completed = currentProject.checklist.filter(c => c.completed).length;
    return Math.round((completed / currentProject.checklist.length) * 100);
  }, [currentProject]);

  return (
    <div className="h-full flex flex-col bg-canvas select-none">
      {/* Top Header */}
      <div className="p-3 bg-surface border-b border-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span>Hardware Projects & BOM</span>
              <span className="text-xs font-mono font-normal text-secondary">({projects.length} projects)</span>
            </h2>
            <p className="text-[11px] text-secondary">
              Project charter, GPIO pin assignments, Bill of Materials with live costing, and bring-up checklist
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateProject}
          className="px-3 py-1 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Main Split: Left Projects Selector, Right Project Tabs */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Projects Sidebar */}
        <div className="w-72 bg-surface border-r border-subtle flex flex-col shrink-0">
          <div className="p-2.5 border-b border-subtle text-xs font-bold text-secondary uppercase tracking-wider flex items-center justify-between">
            <span>Project Explorer</span>
            <span className="font-mono text-muted text-[10px]">{projects.length} Total</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-subtle/40">
            {projects.length === 0 ? (
              <div className="p-6 text-center text-secondary text-xs">
                No projects found. Click "New Project" above to create one.
              </div>
            ) : (
              projects.map(proj => {
                const isSelected = proj.id === selectedProjectId;
                const totalParts = (proj.bom || []).reduce((sum, b) => sum + b.quantity, 0);

                return (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-surface-subtle border-l-2 border-cyan-400' : 'hover:bg-hover'
                    }`}
                  >
                    <h4 className="text-xs font-semibold text-primary truncate mb-1">
                      {proj.title}
                    </h4>
                    <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                      {proj.description || 'Hardware project'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-secondary font-mono">
                      <span>{proj.targetMcu || 'Generic MCU'}</span>
                      <span className="text-emerald-400">{totalParts} BOM parts</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Project Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-canvas">
          {currentProject ? (
            <>
              {/* Project Sub-Tab Navigation Bar */}
              <div className="px-4 py-2 bg-surface border-b border-subtle flex flex-wrap items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('overview')}
                    className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${
                      activeSubTab === 'overview' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    Overview & Goals
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('bom')}
                    className={`px-3 py-1.5 text-xs rounded font-medium transition-colors flex items-center gap-1.5 ${
                      activeSubTab === 'bom' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <FileSpreadsheet className="w-3 h-3" />
                    <span>BOM Table ({(currentProject.bom || []).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('pins')}
                    className={`px-3 py-1.5 text-xs rounded font-medium transition-colors flex items-center gap-1.5 ${
                      activeSubTab === 'pins' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <Cpu className="w-3 h-3" />
                    <span>Pin Map ({Object.keys(currentProject.pinMap || {}).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('checklist')}
                    className={`px-3 py-1.5 text-xs rounded font-medium transition-colors flex items-center gap-1.5 ${
                      activeSubTab === 'checklist' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Checklist ({checklistProgress}%)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('notes')}
                    className={`px-3 py-1.5 text-xs rounded font-medium transition-colors flex items-center gap-1.5 ${
                      activeSubTab === 'notes' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-secondary hover:text-primary'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Linked Notes ({(currentProject.linkedNoteIds || []).length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(currentProject.id)}
                    className="p-1.5 rounded text-secondary hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete Project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Sub-Tab 1: OVERVIEW & GOALS */}
              {activeSubTab === 'overview' && (
                <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-5 select-text">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Project Title</label>
                    <input
                      type="text"
                      value={currentProject.title}
                      onChange={(e) => updateProject({ ...currentProject, title: e.target.value })}
                      className="w-full bg-surface-subtle border border-subtle rounded px-3 py-1.5 text-sm font-bold text-primary focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Target MCU / Processor</label>
                      <input
                        type="text"
                        value={currentProject.targetMcu || ''}
                        onChange={(e) => updateProject({ ...currentProject, targetMcu: e.target.value })}
                        placeholder="e.g. ESP32-WROOM-32D, STM32F401, ATmega328P"
                        className="w-full bg-surface-subtle border border-subtle rounded px-3 py-1.5 font-mono text-xs text-primary focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Quick Stats</label>
                      <div className="p-2 rounded bg-surface-subtle border border-subtle font-mono text-xs text-secondary flex items-center justify-around">
                        <span>BOM: <strong className="text-emerald-400">{bomTotals.count} items</strong></span>
                        <span>Est: <strong className="text-emerald-400">${bomTotals.cost.toFixed(2)}</strong></span>
                        <span>Tasks: <strong className="text-cyan-400">{checklistProgress}%</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-secondary uppercase tracking-wider block">Description & Scope</label>
                    <textarea
                      rows={3}
                      value={currentProject.description || ''}
                      onChange={(e) => updateProject({ ...currentProject, description: e.target.value })}
                      className="w-full bg-surface-subtle border border-subtle rounded p-3 text-xs text-primary leading-relaxed focus:outline-none focus:border-cyan-500 resize-none font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Project Goals & Milestones</label>
                    <textarea
                      rows={6}
                      value={currentProject.goals || ''}
                      onChange={(e) => updateProject({ ...currentProject, goals: e.target.value })}
                      placeholder="Outline bulleted milestones, hardware bring-up criteria, power budgets..."
                      className="w-full bg-surface-subtle border border-subtle rounded p-3 text-xs text-primary leading-relaxed focus:outline-none focus:border-cyan-500 resize-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: BOM TABLE WITH UNDO/REDO & COSTING */}
              {activeSubTab === 'bom' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* BOM Action Bar */}
                  <div className="p-3 bg-surface/50 border-b border-subtle flex flex-wrap items-center justify-between gap-3 text-xs select-none">
                    <div className="flex items-center gap-2">
                      {/* Undo / Redo buttons */}
                      <div className="flex items-center bg-surface-subtle border border-subtle rounded p-0.5 mr-2">
                        <button
                          type="button"
                          onClick={handleBomUndo}
                          disabled={bomHistoryIndex <= 0}
                          className="p-1 rounded text-secondary hover:text-primary disabled:opacity-30"
                          title="Undo BOM Edit (Ctrl+Z)"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleBomRedo}
                          disabled={bomHistoryIndex >= bomHistory.length - 1}
                          className="p-1 rounded text-secondary hover:text-primary disabled:opacity-30"
                          title="Redo BOM Edit (Ctrl+Y)"
                        >
                          <Redo2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-mono text-xs flex items-center gap-3">
                        <span>Total Items: <strong className="text-primary">{bomTotals.count}</strong></span>
                        <span>Total BOM Cost: <strong className="text-emerald-400 text-sm font-bold">${bomTotals.cost.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportBomCsv}
                        className="px-2.5 py-1 text-xs rounded border border-subtle text-secondary hover:text-primary hover:bg-hover inline-flex items-center gap-1.5 transition-colors"
                        title="Export as CSV spreadsheet"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingBomItem(null);
                          setBomForm({
                            designator: 'R1',
                            partNumber: '',
                            description: '',
                            quantity: 1,
                            unitCost: 0.1,
                            supplierUrl: '',
                            notes: '',
                          });
                          setShowAddBomModal(true);
                        }}
                        className="px-3 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add BOM Row</span>
                      </button>
                    </div>
                  </div>

                  {/* BOM Table */}
                  <div className="flex-1 overflow-auto">
                    {(currentProject.bom || []).length === 0 ? (
                      <div className="p-8 text-center text-secondary text-xs space-y-2">
                        <FileSpreadsheet className="w-8 h-8 mx-auto text-secondary opacity-40" />
                        <p>No BOM items added yet. Click "Add BOM Row" to populate components.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-surface-subtle border-b border-subtle text-[11px] font-mono text-secondary uppercase tracking-wider sticky top-0 z-10">
                            <th className="py-2 px-3">Designator</th>
                            <th className="py-2 px-3">Part Number</th>
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-3 text-right">Qty</th>
                            <th className="py-2 px-3 text-right">Unit ($)</th>
                            <th className="py-2 px-3 text-right">Ext ($)</th>
                            <th className="py-2 px-3">Supplier</th>
                            <th className="py-2 px-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-subtle/40 font-mono">
                          {currentProject.bom.map(item => {
                            const extCost = item.quantity * item.unitCost;

                            return (
                              <tr
                                key={item.id}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setBomContextMenu({
                                    visible: true,
                                    x: e.clientX,
                                    y: e.clientY,
                                    item
                                  });
                                }}
                                className="hover:bg-hover transition-colors"
                              >
                                <td className="py-2 px-3 font-bold text-cyan-300">
                                  {item.designator}
                                </td>
                                <td className="py-2 px-3 text-primary font-bold">
                                  {item.partNumber}
                                </td>
                                <td className="py-2 px-3 text-secondary font-sans text-[11px]">
                                  {item.description}
                                </td>
                                <td className="py-2 px-3 text-right text-primary">
                                  {item.quantity}
                                </td>
                                <td className="py-2 px-3 text-right text-secondary">
                                  ${item.unitCost.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-400 font-bold">
                                  ${extCost.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-secondary">
                                  {item.supplierUrl ? (
                                    <a
                                      href={item.supplierUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-cyan-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                                    >
                                      <span>Link</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ) : '-'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingBomItem(item);
                                        setBomForm({ ...item });
                                        setShowAddBomModal(true);
                                      }}
                                      className="p-1 rounded text-secondary hover:text-primary hover:bg-hover"
                                      title="Edit item"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBomItem(item.id)}
                                      className="p-1 rounded text-secondary hover:text-rose-400 hover:bg-rose-500/10"
                                      title="Delete row"
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
              )}

              {/* Sub-Tab 3: PIN MAP WITH IMPORT FROM GPIO PLANNER */}
              {activeSubTab === 'pins' && (
                <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-cyan-400" />
                        <span>MCU Pin Map & Peripheral Assignments</span>
                      </h3>
                      <p className="text-[11px] text-secondary">
                        Hardware net allocation for {currentProject.targetMcu || 'Target MCU'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleImportGpioPlanner}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Import from GPIO Planner</span>
                    </button>
                  </div>

                  {/* Add Pin Form */}
                  <form onSubmit={handleAddPin} className="p-3 rounded-lg bg-surface-subtle border border-subtle flex items-center gap-3 text-xs">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Pin (e.g. GPIO21, PA5, PB0)"
                        value={newPinName}
                        onChange={(e) => setNewPinName(e.target.value)}
                        className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Assigned Function / Signal (e.g. I2C_SDA, SPI_SCK, LED_STATUS)"
                        value={newPinSignal}
                        onChange={(e) => setNewPinSignal(e.target.value)}
                        className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newPinName.trim()}
                      className="px-3 py-1.5 font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 disabled:opacity-30 transition-colors shrink-0"
                    >
                      Assign Pin
                    </button>
                  </form>

                  {/* Pin List Table */}
                  <div className="border border-subtle rounded-lg overflow-hidden bg-surface">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-surface-subtle border-b border-subtle font-mono text-[11px] text-secondary">
                          <th className="py-2 px-3">Pin</th>
                          <th className="py-2 px-3">Function / Net Signal</th>
                          <th className="py-2 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle font-mono">
                        {Object.entries(currentProject.pinMap || {}).map(([pin, sig]) => (
                          <tr key={pin} className="hover:bg-hover">
                            <td className="py-2 px-3 font-bold text-cyan-300">
                              {pin}
                            </td>
                            <td className="py-2 px-3 text-primary">
                              {sig}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePin(pin)}
                                className="text-secondary hover:text-rose-400 p-1"
                                title="Remove assignment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: BRING-UP CHECKLIST */}
              {activeSubTab === 'checklist' && (
                <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>Hardware Bring-Up & Validation Checklist</span>
                      </h3>
                      <p className="text-[11px] text-secondary">
                        Step-by-step verification before high-voltage powering and firmware release
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-48 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-secondary">Progress</span>
                        <span className="text-emerald-400 font-bold">{checklistProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-subtle rounded-full overflow-hidden border border-subtle">
                        <div
                          className="h-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${checklistProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Add Checklist Item */}
                  <form onSubmit={handleAddChecklist} className="flex items-center gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Add milestone / test item (e.g. Probe 3.3V rail ripple with oscilloscope)..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      className="flex-1 bg-surface-subtle border border-subtle rounded px-3 py-1.5 text-primary focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={!newChecklistText.trim()}
                      className="px-3 py-1.5 font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 disabled:opacity-30 transition-colors"
                    >
                      Add Item
                    </button>
                  </form>

                  {/* Checklist List */}
                  <div className="space-y-2">
                    {(currentProject.checklist || []).map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleToggleChecklist(item.id)}
                        className={`p-3 rounded-lg border transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                          item.completed 
                            ? 'bg-surface/30 border-subtle text-secondary line-through' 
                            : 'bg-surface border-subtle/80 hover:bg-hover text-primary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.completed ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-secondary shrink-0" />
                          )}
                          <span className="text-xs">{item.label}</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = (currentProject.checklist || []).filter(c => c.id !== item.id);
                            updateProject({ ...currentProject, checklist: updated });
                          }}
                          className="text-secondary hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Tab 5: LINKED NOTES */}
              {activeSubTab === 'notes' && (
                <div className="flex-1 overflow-y-auto p-6 max-w-4xl space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-400" />
                        <span>Linked Knowledge Notes</span>
                      </h3>
                      <p className="text-[11px] text-secondary">
                        Engineering documentation, calculations, and schematics associated with this project
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openTab('notes')}
                      className="px-3 py-1.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Open Notes Workbench</span>
                    </button>
                  </div>

                  {/* Notes Picker */}
                  <div className="p-3 bg-surface-subtle border border-subtle rounded-lg space-y-2">
                    <label className="text-[10px] font-bold text-secondary uppercase block">
                      Attach Existing Note to Project
                    </label>
                    <select
                      onChange={(e) => {
                        const noteId = e.target.value;
                        if (noteId && !(currentProject.linkedNoteIds || []).includes(noteId)) {
                          updateProject({
                            ...currentProject,
                            linkedNoteIds: [...(currentProject.linkedNoteIds || []), noteId]
                          });
                        }
                        e.target.value = '';
                      }}
                      className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 text-xs font-mono text-primary focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">-- Choose note to attach --</option>
                      {allNotes.map(n => (
                        <option key={n.id} value={n.id}>{n.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Attached Notes Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {(currentProject.linkedNoteIds || []).map(noteId => {
                      const note = allNotes.find(n => n.id === noteId);
                      if (!note) return null;

                      return (
                        <div
                          key={noteId}
                          className="p-3 rounded-lg bg-surface border border-subtle flex flex-col justify-between hover:bg-hover transition-colors group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-purple-400" />
                                <span>{note.title}</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (currentProject.linkedNoteIds || []).filter(id => id !== noteId);
                                  updateProject({ ...currentProject, linkedNoteIds: updated });
                                }}
                                className="text-secondary hover:text-rose-400 p-0.5"
                                title="Unlink note"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                              {note.content.slice(0, 80)}
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-subtle/50 flex items-center justify-between text-[10px] text-secondary">
                            <span className="font-mono">#{note.tags?.[0] || 'note'}</span>
                            <button
                              type="button"
                              onClick={() => openTab('notes')}
                              className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Open in Notes</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <FolderKanban className="w-12 h-12 text-secondary opacity-40" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-primary">No Project Selected</h3>
                <p className="text-xs text-secondary max-w-sm">
                  Select a project from the left explorer or start a new hardware engineering project.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOM Context Menu */}
      {bomContextMenu.visible && bomContextMenu.item && (
        <div
          className="fixed z-50 bg-surface border border-subtle rounded-lg shadow-xl py-1 w-48 text-xs font-sans text-primary select-none animate-in fade-in"
          style={{ top: bomContextMenu.y, left: bomContextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (bomContextMenu.item) {
                setEditingBomItem(bomContextMenu.item);
                setBomForm({ ...bomContextMenu.item });
                setShowAddBomModal(true);
              }
              setBomContextMenu({ visible: false, x: 0, y: 0, item: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Edit BOM Row</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (bomContextMenu.item) handleDuplicateBomItem(bomContextMenu.item);
              setBomContextMenu({ visible: false, x: 0, y: 0, item: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Duplicate Row</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (bomContextMenu.item) {
                navigator.clipboard.writeText(bomContextMenu.item.designator);
              }
              setBomContextMenu({ visible: false, x: 0, y: 0, item: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-secondary" />
            <span>Copy Designator</span>
          </button>
          <div className="h-px bg-subtle my-1" />
          <button
            type="button"
            onClick={() => {
              if (bomContextMenu.item) handleDeleteBomItem(bomContextMenu.item.id);
              setBomContextMenu({ visible: false, x: 0, y: 0, item: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Row</span>
          </button>
        </div>
      )}

      {/* Close context menu */}
      {bomContextMenu.visible && (
        <div className="fixed inset-0 z-40" onClick={() => setBomContextMenu({ visible: false, x: 0, y: 0, item: null })} />
      )}

      {/* Add / Edit BOM Modal */}
      {showAddBomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveBomItem} className="bg-surface border border-subtle rounded-xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{editingBomItem ? 'Edit BOM Component' : 'Add BOM Component'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBomModal(false)}
                className="text-secondary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Designator *</label>
                  <input
                    type="text"
                    required
                    value={bomForm.designator || ''}
                    onChange={(e) => setBomForm({ ...bomForm, designator: e.target.value })}
                    placeholder="e.g. R1, R2 or U1"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Part Number *</label>
                  <input
                    type="text"
                    required
                    value={bomForm.partNumber || ''}
                    onChange={(e) => setBomForm({ ...bomForm, partNumber: e.target.value })}
                    placeholder="e.g. 10k 0603 or ESP32"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bomForm.quantity ?? 1}
                    onChange={(e) => setBomForm({ ...bomForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={bomForm.unitCost ?? 0.05}
                    onChange={(e) => setBomForm({ ...bomForm, unitCost: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={bomForm.description || ''}
                  onChange={(e) => setBomForm({ ...bomForm, description: e.target.value })}
                  placeholder="Component role or footprint"
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Supplier URL</label>
                <input
                  type="url"
                  value={bomForm.supplierUrl || ''}
                  onChange={(e) => setBomForm({ ...bomForm, supplierUrl: e.target.value })}
                  placeholder="https://digikey.com/..."
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="p-3 border-t border-subtle bg-surface/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBomModal(false)}
                className="px-3 py-1.5 text-xs rounded border border-subtle text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors"
              >
                {editingBomItem ? 'Update Row' : 'Add to BOM'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
