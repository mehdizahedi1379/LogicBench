import React, { useState, useEffect, useMemo } from 'react';
import { 
  Code, 
  Search, 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Link as LinkIcon, 
  FileText, 
  Tag, 
  Terminal,
  ExternalLink,
  X
} from 'lucide-react';
import { db, DBSnippet, DBNote } from '../../lib/db';
import { useI18n } from '../../i18n/context';
import { useWorkbench } from '../../store/workbenchStore';
import { FeatureContextProps } from '../types';

export const SnippetLibraryView: React.FC<FeatureContextProps> = () => {
  const { t, language } = useI18n();
  const { openTab } = useWorkbench();
  const isRtl = language === 'fa';

  const [snippets, setSnippets] = useState<DBSnippet[]>([]);
  const [notes, setNotes] = useState<DBNote[]>([]);
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<DBSnippet>>({
    title: '',
    language: 'c',
    code: '',
    category: 'embedded',
    description: '',
    tags: [],
    linkedNoteId: '',
  });
  const [tagInput, setTagInput] = useState('');

  // Load snippets & notes
  const loadData = async () => {
    try {
      const [allSnippets, allNotes] = await Promise.all([
        db.getAll('snippets'),
        db.getAll('notes')
      ]);
      allSnippets.sort((a, b) => b.updatedAt - a.updatedAt);
      setSnippets(allSnippets);
      setNotes(allNotes);
      if (allSnippets.length > 0 && !selectedSnippetId) {
        setSelectedSnippetId(allSnippets[0].id);
      }
    } catch (err) {
      console.error('Failed to load snippets:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedSnippet = useMemo(() => snippets.find(s => s.id === selectedSnippetId), [snippets, selectedSnippetId]);

  // Filtered snippets
  const filteredSnippets = useMemo(() => {
    return snippets.filter(s => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = query === '' ||
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        (s.tags || []).some(t => t.toLowerCase().includes(query));

      const matchesLang = languageFilter === 'all' || s.language === languageFilter;

      return matchesSearch && matchesLang;
    });
  }, [snippets, searchQuery, languageFilter]);

  // Copy code handler
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 1500);
  };

  // Delete snippet
  const handleDeleteSnippet = async (id: string) => {
    if (!window.confirm(isRtl ? 'آیا از حذف این قطعه کد اطمینان دارید؟' : 'Are you sure you want to delete this snippet?')) return;
    await db.delete('snippets', id);
    const updated = snippets.filter(s => s.id !== id);
    setSnippets(updated);
    if (selectedSnippetId === id) {
      setSelectedSnippetId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setModalMode('create');
    setFormData({
      title: '',
      language: 'c',
      code: '/* Embedded C Snippet */\n',
      category: 'general',
      description: '',
      tags: ['embedded'],
      linkedNoteId: '',
    });
    setTagInput('');
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (snip: DBSnippet) => {
    setModalMode('edit');
    setFormData({ ...snip });
    setTagInput('');
    setModalOpen(true);
  };

  // Save Modal
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim() || !formData.code?.trim()) return;

    const now = Date.now();
    const snipToSave: DBSnippet = {
      id: modalMode === 'edit' && formData.id ? formData.id : `snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: formData.title.trim(),
      language: (formData.language as any) || 'c',
      code: formData.code,
      category: formData.category?.trim() || 'embedded',
      description: formData.description?.trim() || '',
      tags: formData.tags || [],
      linkedNoteId: formData.linkedNoteId || undefined,
      updatedAt: now,
    };

    await db.put('snippets', snipToSave);
    await loadData();
    setSelectedSnippetId(snipToSave.id);
    setModalOpen(false);
  };

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'c': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'cpp': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'python': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'verilog': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'rust': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default: return 'text-secondary bg-surface-subtle border-subtle';
    }
  };

  return (
    <div className="h-full flex flex-col bg-canvas select-none">
      {/* Top Header */}
      <div className="p-3 bg-surface border-b border-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Code className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary flex items-center gap-2">
              <span>Embedded Snippet Library</span>
              <span className="text-xs font-mono font-normal text-secondary">({snippets.length} snippets)</span>
            </h2>
            <p className="text-[11px] text-secondary">
              Tagged C, C++, MicroPython, and Verilog routines with note cross-linking
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-3 py-1 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 inline-flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Snippet</span>
        </button>
      </div>

      {/* Main Split: Left Snippet List, Right Code Viewer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Snippets Explorer */}
        <div className="w-80 bg-surface border-r border-subtle flex flex-col shrink-0">
          {/* Search & Language Filter */}
          <div className="p-2.5 border-b border-subtle space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search snippets & code..."
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

            {/* Language filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
              {['all', 'c', 'cpp', 'python', 'verilog', 'rust'].map(lang => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguageFilter(lang)}
                  className={`px-2 py-0.5 rounded font-mono uppercase transition-colors whitespace-nowrap ${
                    languageFilter === lang
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                  }`}
                >
                  {lang === 'python' ? 'uPy' : lang}
                </button>
              ))}
            </div>
          </div>

          {/* Snippets Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-subtle/40">
            {filteredSnippets.length === 0 ? (
              <div className="p-6 text-center text-secondary text-xs">
                No code snippets found.
              </div>
            ) : (
              filteredSnippets.map(snip => {
                const isSelected = snip.id === selectedSnippetId;
                const hasLinkedNote = Boolean(snip.linkedNoteId);

                return (
                  <div
                    key={snip.id}
                    onClick={() => setSelectedSnippetId(snip.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-surface-subtle border-l-2 border-cyan-400' : 'hover:bg-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold text-primary truncate flex-1">
                        {snip.title}
                      </h4>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border uppercase shrink-0 ${getLanguageColor(snip.language)}`}>
                        {snip.language}
                      </span>
                    </div>

                    <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                      {snip.description || snip.code.split('\n')[0]}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-secondary">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(snip.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="text-muted font-mono">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {hasLinkedNote && (
                        <span className="flex items-center gap-0.5 text-cyan-400/90 font-mono" title="Linked to note">
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>note</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Code Viewer & Cross-Link Inspector */}
        <div className="flex-1 flex flex-col overflow-hidden bg-canvas">
          {selectedSnippet ? (
            <>
              {/* Header Bar */}
              <div className="p-3 bg-surface border-b border-subtle flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border uppercase ${getLanguageColor(selectedSnippet.language)}`}>
                      {selectedSnippet.language}
                    </span>
                    <h3 className="text-sm font-bold text-primary font-mono">{selectedSnippet.title}</h3>
                  </div>
                  <p className="text-xs text-secondary">{selectedSnippet.description}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Linked Note Jump Button */}
                  {selectedSnippet.linkedNoteId && (
                    <button
                      type="button"
                      onClick={() => openTab('notes')}
                      className="px-2.5 py-1 text-xs rounded bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 inline-flex items-center gap-1 transition-colors"
                      title="Open linked note in Notes workbench"
                    >
                      <FileText className="w-3 h-3 text-purple-400" />
                      <span>Linked Note</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedSnippet.code, selectedSnippet.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 inline-flex items-center gap-1 transition-colors"
                  >
                    {copyFeedback === selectedSnippet.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedSnippet)}
                    className="p-1.5 rounded text-secondary hover:text-primary hover:bg-hover"
                    title="Edit snippet"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSnippet(selectedSnippet.id)}
                    className="p-1.5 rounded text-secondary hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete snippet"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tags & Metadata Bar */}
              <div className="px-3 py-1.5 bg-surface/50 border-b border-subtle flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3 h-3 text-secondary shrink-0" />
                  {(selectedSnippet.tags || []).map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface-subtle border border-subtle text-secondary">
                      #{t}
                    </span>
                  ))}
                </div>

                {selectedSnippet.linkedNoteId && (
                  <div className="text-[11px] text-secondary font-mono flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-cyan-400" />
                    <span>Target: {notes.find(n => n.id === selectedSnippet.linkedNoteId)?.title || selectedSnippet.linkedNoteId}</span>
                  </div>
                )}
              </div>

              {/* Code Display Area */}
              <div className="flex-1 overflow-auto p-4 bg-canvas select-text">
                <pre className="font-mono text-xs text-primary leading-relaxed bg-surface/60 p-4 rounded-xl border border-subtle code-ltr overflow-x-auto">
                  <code>{selectedSnippet.code}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-secondary text-xs">
              Select a snippet to view code implementation.
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Snippet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveModal} className="bg-surface border border-subtle rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary font-mono flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span>{modalMode === 'create' ? 'Create Snippet' : 'Edit Snippet'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-secondary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs font-sans">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Snippet Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Ring Buffer FIFO or I2C Bit-Bang"
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Language</label>
                  <select
                    value={formData.language || 'c'}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value as any })}
                    className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500 uppercase"
                  >
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="python">MicroPython</option>
                    <option value="verilog">Verilog</option>
                    <option value="rust">Rust</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-secondary uppercase block mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of algorithm or peripheral usage"
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 text-primary focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-cyan-400 uppercase block mb-1">Link to Knowledge Note</label>
                <select
                  value={formData.linkedNoteId || ''}
                  onChange={(e) => setFormData({ ...formData, linkedNoteId: e.target.value || undefined })}
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-1.5 font-mono text-primary focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- No Linked Note --</option>
                  {notes.map(n => (
                    <option key={n.id} value={n.id}>{n.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Code *</label>
                <textarea
                  rows={8}
                  required
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Paste or write code snippet here..."
                  className="w-full bg-canvas border border-subtle rounded px-2.5 py-2 font-mono text-xs text-primary focus:outline-none focus:border-emerald-500 resize-none code-ltr"
                />
              </div>
            </div>

            <div className="p-3 border-t border-subtle bg-surface/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-subtle text-secondary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 transition-colors"
              >
                Save Snippet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
