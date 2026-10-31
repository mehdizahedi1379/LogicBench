import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  GitBranch, 
  Plus, 
  RotateCcw, 
  RotateCw, 
  Play, 
  Trash2, 
  Bookmark, 
  Check, 
  Copy, 
  FileCode, 
  Table as TableIcon, 
  Sliders, 
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { 
  FsmGraph, 
  FsmState, 
  FsmTransition, 
  stepFsm, 
  generateFsmStateTableMarkdown, 
  generateFsmCCode, 
  FSM_PRESETS 
} from '../../lib/fsmEngine';
import { saveToolResultToNotes } from '../../lib/notesHelper';
import { FeatureContextProps } from '../types';

export const FsmEditorView: React.FC<FeatureContextProps> = () => {
  const { t } = useI18n();

  // Graph state with Undo / Redo history stack
  const [history, setHistory] = useState<FsmGraph[]>([FSM_PRESETS[0].graph]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentGraph = history[historyIndex] || FSM_PRESETS[0].graph;

  const pushGraphChange = useCallback((newGraph: FsmGraph) => {
    setHistory((prev) => {
      const upToCurrent = prev.slice(0, historyIndex + 1);
      return [...upToCurrent, JSON.parse(JSON.stringify(newGraph))];
    });
    setHistoryIndex((idx) => idx + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((idx) => idx - 1);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((idx) => idx + 1);
    }
  }, [historyIndex, history.length]);

  // Keyboard shortcut listener for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Canvas selection state
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransitionId, setSelectedTransitionId] = useState<string | null>(null);

  // Transition creation modal/mode
  const [isAddingTransition, setIsAddingTransition] = useState<boolean>(false);
  const [transSourceId, setTransSourceId] = useState<string>('');
  const [transTargetId, setTransTargetId] = useState<string>('');
  const [transCondition, setTransCondition] = useState<string>('1');
  const [transMealyOutput, setTransMealyOutput] = useState<string>('');

  // Dragging state on canvas
  const [draggingStateId, setDraggingStateId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Simulation State
  const [simActiveStateId, setSimActiveStateId] = useState<string>(
    currentGraph.states.find((s) => s.isInitial)?.id || currentGraph.states[0]?.id || ''
  );
  const [simInput, setSimInput] = useState<string>('1');
  const [simLog, setSimLog] = useState<string[]>(['Simulation ready at initial state.']);

  // Export view tab: 'editor' | 'table' | 'c-code'
  const [activeTab, setActiveTab] = useState<'editor' | 'table' | 'c-code'>('editor');

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToNotes, setSavedToNotes] = useState<boolean>(false);

  // Update active state if graph changes
  useEffect(() => {
    const init = currentGraph.states.find((s) => s.isInitial) || currentGraph.states[0];
    if (init && !currentGraph.states.some((s) => s.id === simActiveStateId)) {
      setSimActiveStateId(init.id);
    }
  }, [currentGraph, simActiveStateId]);

  // Add new state
  const handleAddState = () => {
    const nextIdx = currentGraph.states.length;
    const newState: FsmState = {
      id: `s_${Date.now()}`,
      name: `S_${nextIdx}`,
      x: 120 + (nextIdx % 4) * 110,
      y: 100 + Math.floor(nextIdx / 4) * 90,
      isInitial: currentGraph.states.length === 0,
      mooreOutput: '0',
    };

    const newGraph: FsmGraph = {
      ...currentGraph,
      states: [...currentGraph.states, newState],
    };

    pushGraphChange(newGraph);
    setSelectedStateId(newState.id);
  };

  // Delete selected item
  const handleDeleteSelected = () => {
    if (selectedStateId) {
      const newGraph: FsmGraph = {
        states: currentGraph.states.filter((s) => s.id !== selectedStateId),
        transitions: currentGraph.transitions.filter((t) => t.fromStateId !== selectedStateId && t.toStateId !== selectedStateId),
      };
      pushGraphChange(newGraph);
      setSelectedStateId(null);
    } else if (selectedTransitionId) {
      const newGraph: FsmGraph = {
        ...currentGraph,
        transitions: currentGraph.transitions.filter((t) => t.id !== selectedTransitionId),
      };
      pushGraphChange(newGraph);
      setSelectedTransitionId(null);
    }
  };

  // Add transition
  const handleSaveTransition = () => {
    if (!transSourceId || !transTargetId) return;
    const newTrans: FsmTransition = {
      id: `t_${Date.now()}`,
      fromStateId: transSourceId,
      toStateId: transTargetId,
      condition: transCondition || '1',
      mealyOutput: transMealyOutput || undefined,
    };

    const newGraph: FsmGraph = {
      ...currentGraph,
      transitions: [...currentGraph.transitions, newTrans],
    };

    pushGraphChange(newGraph);
    setIsAddingTransition(false);
  };

  // Step simulation
  const handleStepSimulation = () => {
    const res = stepFsm(currentGraph, simActiveStateId, simInput);
    setSimActiveStateId(res.currentStateId);
    setSimLog((prev) => [res.explanation, ...prev.slice(0, 8)]);
  };

  // Reset simulation to initial
  const handleResetSimulation = () => {
    const init = currentGraph.states.find((s) => s.isInitial) || currentGraph.states[0];
    if (init) {
      setSimActiveStateId(init.id);
      setSimLog(['Reset to initial state: ' + init.name]);
    }
  };

  // Dragging state nodes
  const handleMouseDownNode = (stateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStateId(stateId);
    setSelectedTransitionId(null);
    setDraggingStateId(stateId);

    const st = currentGraph.states.find((s) => s.id === stateId);
    if (st && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - st.x,
        y: e.clientY - rect.top - st.y,
      });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingStateId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const newX = Math.max(30, Math.min(rect.width - 30, e.clientX - rect.left - dragOffset.x));
    const newY = Math.max(30, Math.min(rect.height - 30, e.clientY - rect.top - dragOffset.y));

    // Update in-memory position without polluting history on every pixel
    setHistory((prev) => {
      const cur = prev[historyIndex];
      const updatedStates = cur.states.map((s) =>
        s.id === draggingStateId ? { ...s, x: newX, y: newY } : s
      );
      const copy = [...prev];
      copy[historyIndex] = { ...cur, states: updatedStates };
      return copy;
    });
  };

  const handleMouseUpCanvas = () => {
    if (draggingStateId) {
      setDraggingStateId(null);
      // Push history snapshot on drag completion
      pushGraphChange(currentGraph);
    }
  };

  const selectedState = currentGraph.states.find((s) => s.id === selectedStateId);
  const stateTableMd = useMemo(() => generateFsmStateTableMarkdown(currentGraph), [currentGraph]);
  const cCode = useMemo(() => generateFsmCCode(currentGraph, 'Controller'), [currentGraph]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleSaveToNotes = async () => {
    const title = `FSM Design: ${currentGraph.states.length} States, ${currentGraph.transitions.length} Transitions`;
    const content = [
      `# ${title}`,
      `- States: ${currentGraph.states.map((s) => s.name).join(', ')}`,
      `- Initial State: ${currentGraph.states.find((s) => s.isInitial)?.name || 'None'}`,
      `\n### State Transition Table:\n${stateTableMd}`,
      `\n### Generated C Header:\n\`\`\`c\n${cCode}\n\`\`\``,
    ].join('\n');

    await saveToolResultToNotes(title, content, ['fsm', 'state-machine', 'c-code']);
    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <span>{t.fsmEditor.title}</span>
          </h2>
          <p className="text-xs text-secondary mt-1">{t.fsmEditor.description}</p>
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

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-subtle">
        <button
          type="button"
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'editor' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Interactive Canvas &amp; Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('table')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'table' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <TableIcon className="w-3.5 h-3.5" />
          <span>{t.fsmEditor.stateTable}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('c-code')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'c-code' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-secondary hover:text-primary'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>{t.fsmEditor.exportC}</span>
        </button>
      </div>

      {activeTab === 'editor' && (
        <div className="space-y-4">
          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-subtle p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddState}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.fsmEditor.addState}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTransSourceId(selectedStateId || currentGraph.states[0]?.id || '');
                  setTransTargetId(currentGraph.states[1]?.id || currentGraph.states[0]?.id || '');
                  setIsAddingTransition(true);
                }}
                disabled={currentGraph.states.length === 0}
                className="px-3 py-1.5 bg-input hover:bg-neutral-800 border border-subtle rounded-lg text-xs font-medium text-primary flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{t.fsmEditor.addTransition}</span>
              </button>

              {(selectedStateId || selectedTransitionId) && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {/* Undo / Redo buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex === 0}
                title="Undo (Ctrl+Z)"
                className="p-1.5 text-secondary hover:text-primary disabled:opacity-40 hover:bg-neutral-800 rounded transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
                title="Redo (Ctrl+Y)"
                className="p-1.5 text-secondary hover:text-primary disabled:opacity-40 hover:bg-neutral-800 rounded transition-colors"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono text-muted ml-1">
                {historyIndex + 1}/{history.length}
              </span>

              {/* Preset Selector */}
              <select
                onChange={(e) => {
                  const p = FSM_PRESETS.find((pre) => pre.name === e.target.value);
                  if (p) pushGraphChange(p.graph);
                }}
                className="ml-3 px-2 py-1 bg-input border border-subtle rounded text-xs text-primary focus:outline-none"
              >
                <option value="">Load Preset...</option>
                {FSM_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Interactive Graph Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8 bg-neutral-950 border border-subtle rounded-xl overflow-hidden relative" style={{ height: '420px' }}>
              <svg
                ref={svgRef}
                className="w-full h-full cursor-crosshair select-none"
                onMouseMove={handleMouseMoveCanvas}
                onMouseUp={handleMouseUpCanvas}
                onClick={() => {
                  setSelectedStateId(null);
                  setSelectedTransitionId(null);
                }}
              >
                {/* Background Grid Pattern */}
                <defs>
                  <pattern id="fsm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                  </pattern>
                  <marker
                    id="fsm-arrow"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                  </marker>
                  <marker
                    id="fsm-arrow-sel"
                    viewBox="0 0 10 10"
                    refX="22"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                </defs>

                <rect width="100%" height="100%" fill="url(#fsm-grid)" />

                {/* Transitions (Curved Arcs & Arrows) */}
                {currentGraph.transitions.map((t) => {
                  const src = currentGraph.states.find((s) => s.id === t.fromStateId);
                  const dst = currentGraph.states.find((s) => s.id === t.toStateId);
                  if (!src || !dst) return null;

                  const isSel = selectedTransitionId === t.id;

                  if (src.id === dst.id) {
                    // Self-loop transition
                    const arcPath = `M ${src.x - 14} ${src.y - 18} C ${src.x - 30} ${src.y - 65}, ${src.x + 30} ${src.y - 65}, ${src.x + 14} ${src.y - 18}`;
                    return (
                      <g key={t.id} onClick={(e) => { e.stopPropagation(); setSelectedTransitionId(t.id); setSelectedStateId(null); }}>
                        <path
                          d={arcPath}
                          fill="none"
                          stroke={isSel ? '#38bdf8' : '#10b981'}
                          strokeWidth={isSel ? '2.5' : '1.8'}
                          markerEnd={isSel ? 'url(#fsm-arrow-sel)' : 'url(#fsm-arrow)'}
                        />
                        <rect x={src.x - 16} y={src.y - 75} width="32" height="16" rx="4" fill="#090d16" stroke="#334155" strokeWidth="0.8" />
                        <text x={src.x} y={src.y - 64} fill="#e2e8f0" fontSize="9.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                          {t.condition}
                        </text>
                      </g>
                    );
                  }

                  // Quadratic Bezier Arc between two distinct states
                  const dx = dst.x - src.x;
                  const dy = dst.y - src.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  const midX = (src.x + dst.x) / 2;
                  const midY = (src.y + dst.y) / 2;
                  // Perpendicular offset for curve
                  const curvature = 24;
                  const ctrlX = midX - (dy / dist) * curvature;
                  const ctrlY = midY + (dx / dist) * curvature;

                  return (
                    <g key={t.id} onClick={(e) => { e.stopPropagation(); setSelectedTransitionId(t.id); setSelectedStateId(null); }}>
                      <path
                        d={`M ${src.x} ${src.y} Q ${ctrlX} ${ctrlY} ${dst.x} ${dst.y}`}
                        fill="none"
                        stroke={isSel ? '#38bdf8' : '#10b981'}
                        strokeWidth={isSel ? '2.5' : '1.8'}
                        markerEnd={isSel ? 'url(#fsm-arrow-sel)' : 'url(#fsm-arrow)'}
                        className="cursor-pointer"
                      />
                      {/* Label badge */}
                      <rect
                        x={ctrlX - 16}
                        y={ctrlY - 10}
                        width="32"
                        height="18"
                        rx="4"
                        fill="#090d16"
                        stroke="#334155"
                        strokeWidth="0.8"
                      />
                      <text
                        x={ctrlX}
                        y={ctrlY + 2.5}
                        fill="#e2e8f0"
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="select-none pointer-events-none"
                      >
                        {t.condition}{t.mealyOutput ? `/${t.mealyOutput}` : ''}
                      </text>
                    </g>
                  );
                })}

                {/* State Nodes */}
                {currentGraph.states.map((s) => {
                  const isSimActive = simActiveStateId === s.id;
                  const isSel = selectedStateId === s.id;

                  return (
                    <g
                      key={s.id}
                      transform={`translate(${s.x}, ${s.y})`}
                      onMouseDown={(e) => handleMouseDownNode(s.id, e)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      {/* Pulsing ring if active in simulation */}
                      {isSimActive && (
                        <circle
                          r="30"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeDasharray="4 2"
                          className="animate-spin"
                          style={{ animationDuration: '6s' }}
                        />
                      )}

                      {/* Double ring for accepting/final states */}
                      {s.isAccepting && (
                        <circle
                          r="25"
                          fill="none"
                          stroke={isSel ? '#38bdf8' : isSimActive ? '#10b981' : '#64748b'}
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Main State Circle */}
                      <circle
                        r="22"
                        fill={isSimActive ? '#064e3b' : '#0f172a'}
                        stroke={isSel ? '#38bdf8' : isSimActive ? '#34d399' : s.isInitial ? '#f59e0b' : '#334155'}
                        strokeWidth={isSel ? '3' : '2'}
                      />

                      {/* Initial state arrow pointing in */}
                      {s.isInitial && (
                        <polygon points="-36,0 -24,-5 -24,5" fill="#f59e0b" />
                      )}

                      {/* State Name */}
                      <text
                        y={s.mooreOutput ? -2 : 3}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {s.name}
                      </text>

                      {/* Moore Output Label */}
                      {s.mooreOutput && (
                        <text
                          y="10"
                          fill="#94a3b8"
                          fontSize="7.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                        >
                          y={s.mooreOutput}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Right Simulation & Inspector Panel */}
            <div className="lg:col-span-4 space-y-4">
              {/* Step Simulator */}
              <div className="bg-card border border-subtle rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{t.fsmEditor.simulate}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetSimulation}
                    className="text-[10px] text-secondary hover:text-primary transition-colors"
                  >
                    {t.fsmEditor.reset}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    placeholder="Input (e.g. 1)"
                    className="w-24 px-2.5 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs font-mono code-ltr focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleStepSimulation}
                    className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>{t.fsmEditor.step}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Active State Readout */}
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-subtle text-xs space-y-1">
                  <div className="text-[10px] text-secondary uppercase font-semibold">Active State:</div>
                  <div className="font-mono text-emerald-400 font-bold text-sm">
                    {currentGraph.states.find((s) => s.id === simActiveStateId)?.name || 'None'}
                  </div>
                </div>

                {/* Simulation Logs */}
                <div className="bg-neutral-950 p-2.5 rounded-lg border border-subtle text-[11px] font-mono space-y-1 max-h-24 overflow-y-auto text-secondary code-ltr">
                  {simLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>

              {/* Selected State Property Editor */}
              {selectedState && (
                <div className="bg-card border border-subtle rounded-xl p-4 space-y-3 text-xs">
                  <span className="font-semibold text-secondary uppercase tracking-wider text-[11px]">
                    State Properties: {selectedState.name}
                  </span>

                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-secondary">State Name</label>
                      <input
                        type="text"
                        value={selectedState.name}
                        onChange={(e) => {
                          const newStates = currentGraph.states.map((s) =>
                            s.id === selectedState.id ? { ...s, name: e.target.value } : s
                          );
                          pushGraphChange({ ...currentGraph, states: newStates });
                        }}
                        className="w-full px-2.5 py-1 bg-input border border-subtle rounded text-primary font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-secondary">Moore Output</label>
                      <input
                        type="text"
                        value={selectedState.mooreOutput || ''}
                        onChange={(e) => {
                          const newStates = currentGraph.states.map((s) =>
                            s.id === selectedState.id ? { ...s, mooreOutput: e.target.value } : s
                          );
                          pushGraphChange({ ...currentGraph, states: newStates });
                        }}
                        className="w-full px-2.5 py-1 bg-input border border-subtle rounded text-primary font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedState.isInitial}
                          onChange={(e) => {
                            const newStates = currentGraph.states.map((s) => ({
                              ...s,
                              isInitial: s.id === selectedState.id ? e.target.checked : false,
                            }));
                            pushGraphChange({ ...currentGraph, states: newStates });
                          }}
                        />
                        <span className="text-secondary">Initial</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedState.isAccepting}
                          onChange={(e) => {
                            const newStates = currentGraph.states.map((s) =>
                              s.id === selectedState.id ? { ...s, isAccepting: e.target.checked } : s
                            );
                            pushGraphChange({ ...currentGraph, states: newStates });
                          }}
                        />
                        <span className="text-secondary">Accepting</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Add Transition Modal Popup */}
          {isAddingTransition && (
            <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-card border border-subtle rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-400" />
                  <span>Add Transition Arc</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-secondary">Source State</label>
                    <select
                      value={transSourceId}
                      onChange={(e) => setTransSourceId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs mt-1"
                    >
                      {currentGraph.states.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-secondary">Destination State</label>
                    <select
                      value={transTargetId}
                      onChange={(e) => setTransTargetId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-input border border-subtle rounded-lg text-primary text-xs mt-1"
                    >
                      {currentGraph.states.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-secondary">Input Condition (e.g. 0, 1, btn_pressed)</label>
                    <input
                      type="text"
                      value={transCondition}
                      onChange={(e) => setTransCondition(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-input border border-subtle rounded-lg text-primary font-mono text-xs mt-1 code-ltr"
                    />
                  </div>

                  <div>
                    <label className="text-secondary">Optional Mealy Output</label>
                    <input
                      type="text"
                      value={transMealyOutput}
                      onChange={(e) => setTransMealyOutput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-input border border-subtle rounded-lg text-primary font-mono text-xs mt-1 code-ltr"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
                  <button
                    type="button"
                    onClick={() => setIsAddingTransition(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-secondary hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTransition}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Add Arc
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE TABLE TAB */}
      {activeTab === 'table' && (
        <div className="bg-card border border-subtle rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              {t.fsmEditor.stateTable}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(stateTableMd, 'md')}
              className="px-3 py-1.5 bg-input hover:bg-neutral-800 border border-subtle rounded-lg text-xs text-primary flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'md' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Markdown Table</span>
            </button>
          </div>

          <div className="border border-subtle rounded-lg overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-neutral-900 text-secondary border-b border-subtle">
                <tr>
                  <th className="px-3 py-2">Current State</th>
                  <th className="px-3 py-2">Condition</th>
                  <th className="px-3 py-2">Next State</th>
                  <th className="px-3 py-2">Moore Output</th>
                  <th className="px-3 py-2">Mealy Output</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle/50 text-primary">
                {currentGraph.states.map((s) => {
                  const transitions = currentGraph.transitions.filter((t) => t.fromStateId === s.id);
                  if (transitions.length === 0) {
                    return (
                      <tr key={s.id} className="hover:bg-neutral-800/50">
                        <td className="px-3 py-1.5 font-bold text-amber-400">{s.name} {s.isInitial && '(Init)'}</td>
                        <td className="px-3 py-1.5 text-secondary">-</td>
                        <td className="px-3 py-1.5 text-secondary">{s.name}</td>
                        <td className="px-3 py-1.5 text-secondary">{s.mooreOutput || '-'}</td>
                        <td className="px-3 py-1.5 text-secondary">-</td>
                      </tr>
                    );
                  }
                  return transitions.map((t) => {
                    const dst = currentGraph.states.find((st) => st.id === t.toStateId);
                    return (
                      <tr key={t.id} className="hover:bg-neutral-800/50">
                        <td className="px-3 py-1.5 font-bold text-amber-400">{s.name} {s.isInitial && '(Init)'}</td>
                        <td className="px-3 py-1.5 text-cyan-400 font-bold">{t.condition}</td>
                        <td className="px-3 py-1.5 text-emerald-400 font-bold">{dst ? dst.name : t.toStateId}</td>
                        <td className="px-3 py-1.5 text-secondary">{s.mooreOutput || '-'}</td>
                        <td className="px-3 py-1.5 text-purple-400">{t.mealyOutput || '-'}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* C CODE EXPORT TAB */}
      {activeTab === 'c-code' && (
        <div className="bg-card border border-subtle rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              {t.fsmEditor.exportC}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(cCode, 'c')}
              className="px-3 py-1.5 bg-input hover:bg-neutral-800 border border-subtle rounded-lg text-xs text-primary flex items-center gap-1.5 transition-colors"
            >
              {copiedKey === 'c' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy C Code</span>
            </button>
          </div>

          <pre className="bg-neutral-950 p-4 rounded-xl border border-subtle text-xs font-mono text-primary code-ltr overflow-x-auto leading-relaxed max-h-96">
            <code>{cCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
