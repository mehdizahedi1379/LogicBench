import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Pin, 
  Trash2, 
  Undo2, 
  Redo2, 
  Share2, 
  BookOpen, 
  Sparkles, 
  Eye, 
  Edit3, 
  Columns, 
  Network, 
  Link as LinkIcon, 
  Download, 
  Upload, 
  Tag, 
  Check, 
  Copy, 
  ExternalLink,
  ChevronRight,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { db, DBNote } from '../../lib/db';
import { useI18n } from '../../i18n/context';
import { FeatureContextProps } from '../types';
import { 
  extractWikiLinks, 
  findBacklinks, 
  buildNoteGraph, 
  GraphNode, 
  GraphEdge, 
  BacklinkResult 
} from '../../lib/wikiLinkParser';
import { 
  extractFlashcardsFromMarkdown, 
  saveFlashcardsToDb, 
  ExtractedCardCandidate 
} from '../../lib/noteFlashcards';

interface HistoryState {
  title: string;
  content: string;
  tags: string[];
}

export const NotesView: React.FC<FeatureContextProps> = () => {
  const { t, language } = useI18n();
  const isRtl = language === 'fa';

  // Notes list state
  const [notes, setNotes] = useState<DBNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Active note editing state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Undo / Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // View modes
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview' | 'graph'>('split');
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Flashcard modal state
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const [flashcardCandidates, setFlashcardCandidates] = useState<ExtractedCardCandidate[]>([]);
  const [selectedTextForCards, setSelectedTextForCards] = useState('');
  const [flashcardsSavedAlert, setFlashcardsSavedAlert] = useState<number | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    note: DBNote | null;
  }>({ visible: false, x: 0, y: 0, note: null });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load all notes from DB
  const loadNotes = useCallback(async () => {
    try {
      const allNotes = await db.getAll('notes');
      // Sort pinned first, then by updatedAt descending
      allNotes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
      setNotes(allNotes);

      // Select first note if none selected or if selected note was deleted
      if (allNotes.length > 0) {
        if (!selectedNoteId || !allNotes.some(n => n.id === selectedNoteId)) {
          setSelectedNoteId(allNotes[0].id);
        }
      } else {
        setSelectedNoteId(null);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }, [selectedNoteId]);

  useEffect(() => {
    loadNotes();

    // Listen for cross-tool note save events
    const handleNoteSaved = (e: any) => {
      loadNotes();
      if (e?.detail?.id) {
        setSelectedNoteId(e.detail.id);
      }
    };
    window.addEventListener('logicbench:note-saved', handleNoteSaved);
    return () => {
      window.removeEventListener('logicbench:note-saved', handleNoteSaved);
    };
  }, [loadNotes]);

  // When selected note changes, populate editor & history
  useEffect(() => {
    if (!selectedNoteId) {
      setTitle('');
      setContent('');
      setTags([]);
      setIsPinned(false);
      setHistory([]);
      setHistoryIndex(-1);
      return;
    }

    const current = notes.find(n => n.id === selectedNoteId);
    if (current) {
      setTitle(current.title);
      setContent(current.content);
      setTags(current.tags || []);
      setIsPinned(Boolean(current.pinned));

      // Reset undo/redo for new note
      setHistory([{ title: current.title, content: current.content, tags: current.tags || [] }]);
      setHistoryIndex(0);
      setSaveStatus('saved');
    }
  }, [selectedNoteId, notes]);

  // Push to history when content/title/tags change from user action
  const pushHistory = useCallback((newTitle: string, newContent: string, newTags: string[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    setHistory(prev => {
      const updated = prev.slice(0, historyIndex + 1);
      if (updated.length > 50) updated.shift();
      return [...updated, { title: newTitle, content: newContent, tags: newTags }];
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
    setSaveStatus('dirty');
  }, [historyIndex]);

  // Debounced auto-save to IndexedDB
  useEffect(() => {
    if (!selectedNoteId || saveStatus !== 'dirty') return;

    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const now = Date.now();
        const updatedNote: DBNote = {
          id: selectedNoteId,
          title: title.trim() || 'Untitled Note',
          content,
          tags,
          pinned: isPinned,
          createdAt: notes.find(n => n.id === selectedNoteId)?.createdAt || now,
          updatedAt: now,
        };

        await db.put('notes', updatedNote);
        setNotes(prev => prev.map(n => n.id === selectedNoteId ? updatedNote : n));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save note:', err);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [title, content, tags, isPinned, selectedNoteId, saveStatus, notes]);

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      isUndoRedoAction.current = true;
      setTitle(target.title);
      setContent(target.content);
      setTags(target.tags);
      setHistoryIndex(prev => prev - 1);
      setSaveStatus('dirty');
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      isUndoRedoAction.current = true;
      setTitle(target.title);
      setContent(target.content);
      setTags(target.tags);
      setHistoryIndex(prev => prev + 1);
      setSaveStatus('dirty');
    }
  }, [history, historyIndex]);

  // Keyboard shortcut listener for Ctrl+Z / Ctrl+Y
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else {
        e.preventDefault();
        handleUndo();
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      handleRedo();
    }
  };

  // Create new note
  const handleCreateNote = async (initialTitle = 'Untitled Note', initialContent = '') => {
    const id = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const newNote: DBNote = {
      id,
      title: initialTitle,
      content: initialContent,
      tags: [],
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };

    await db.put('notes', newNote);
    setNotes(prev => [newNote, ...prev]);
    setSelectedNoteId(id);
    setViewMode('split');
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm(isRtl ? 'آیا از حذف این یادداشت اطمینان دارید؟' : 'Are you sure you want to delete this note?')) return;
    await db.delete('notes', id);
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    if (selectedNoteId === id) {
      setSelectedNoteId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Toggle pin
  const handleTogglePin = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const updated: DBNote = { ...note, pinned: !note.pinned, updatedAt: Date.now() };
    await db.put('notes', updated);
    setNotes(prev => {
      const list = prev.map(n => n.id === id ? updated : n);
      list.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.updatedAt - a.updatedAt;
      });
      return list;
    });
    if (selectedNoteId === id) {
      setIsPinned(!note.pinned);
    }
  };

  // Add tag
  const handleAddTag = () => {
    const cleanTag = tagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (cleanTag && !tags.includes(cleanTag)) {
      const newTags = [...tags, cleanTag];
      setTags(newTags);
      setTagInput('');
      pushHistory(title, content, newTags);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    pushHistory(title, content, newTags);
  };

  // Drag and drop import
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          const noteTitle = file.name.replace(/\.[^/.]+$/, '');
          await handleCreateNote(noteTitle, text);
        };
        reader.readAsText(file);
      }
    }
  };

  // Export active note as .md file
  const handleExportMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy note markdown to clipboard
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  };

  // Open flashcard creator
  const handleOpenFlashcardsModal = () => {
    let sel = '';
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        sel = content.slice(start, end);
      }
    }
    setSelectedTextForCards(sel);
    const candidates = extractFlashcardsFromMarkdown(content, sel, title);
    setFlashcardCandidates(candidates);
    setShowFlashcardModal(true);
  };

  // Save extracted flashcards to IndexedDB
  const handleSaveFlashcards = async () => {
    const saved = await saveFlashcardsToDb(flashcardCandidates, 'notes-deck', title);
    setFlashcardsSavedAlert(saved);
    setShowFlashcardModal(false);
    setTimeout(() => setFlashcardsSavedAlert(null), 3000);
  };

  // Jump to wiki-link note
  const handleWikiLinkClick = (targetTitleOrId: string) => {
    const targetClean = targetTitleOrId.trim().toLowerCase();
    const existing = notes.find(
      n => n.id === targetTitleOrId || n.title.trim().toLowerCase() === targetClean
    );

    if (existing) {
      setSelectedNoteId(existing.id);
    } else {
      if (window.confirm(isRtl 
        ? `یادداشت "${targetTitleOrId}" یافت نشد. مایل به ایجاد آن هستید؟` 
        : `Note "${targetTitleOrId}" does not exist yet. Create it now?`)) {
        handleCreateNote(targetTitleOrId, `# ${targetTitleOrId}\n\nLinked from [[${title}]].`);
      }
    }
  };

  // Compute backlinks for the active note
  const activeNote = useMemo(() => notes.find(n => n.id === selectedNoteId), [notes, selectedNoteId]);
  const backlinks = useMemo(() => {
    if (!activeNote) return [];
    return findBacklinks(activeNote, notes);
  }, [activeNote, notes]);

  // Compute graph data
  const graphData = useMemo(() => buildNoteGraph(notes), [notes]);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => (n.tags || []).forEach(t => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = searchQuery === '' || 
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        n.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === null || (n.tags || []).includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [notes, searchQuery, selectedTag]);

  // Render markdown with clickable [[wiki-links]]
  const renderFormattedMarkdown = (raw: string) => {
    if (!raw) return <p className="text-secondary italic">Empty note. Type in the editor to start.</p>;

    // Split markdown lines
    const lines = raw.split('\n');

    return (
      <div className="space-y-3 font-sans text-sm leading-relaxed text-primary select-text">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-xl font-bold border-b border-subtle pb-1 text-emerald-400 font-mono">{line.slice(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-base font-bold text-cyan-400 mt-4 mb-1 font-mono">{line.slice(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-sm font-bold text-amber-400 mt-2 font-mono">{line.slice(4)}</h3>;
          }
          // Quotes
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-2 border-emerald-500/50 pl-3 italic text-secondary text-xs my-2">
                {renderInlineElements(line.slice(2))}
              </blockquote>
            );
          }
          // Bullet points
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-emerald-400 mt-1">▸</span>
                <span className="flex-1">{renderInlineElements(line.slice(2))}</span>
              </div>
            );
          }
          // Empty lines
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          return <p key={idx} className="text-xs">{renderInlineElements(line)}</p>;
        })}
      </div>
    );
  };

  // Replaces inline [[wiki-links]] and bold/code elements with interactive spans
  const renderInlineElements = (text: string) => {
    // Regular expression matching [[wiki-links]], **bold**, `code`
    const parts = text.split(/(\[\[.*?\]\]|\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, pIdx) => {
      // Wiki Link
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const inner = part.slice(2, -2);
        const [target, label] = inner.split('|').map(s => s.trim());
        const displayLabel = label || target;
        const exists = notes.some(
          n => n.id === target || n.title.trim().toLowerCase() === target.toLowerCase()
        );

        return (
          <button
            key={pIdx}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleWikiLinkClick(target);
            }}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono transition-colors mx-0.5 ${
              exists 
                ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30' 
                : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 border-dashed'
            }`}
            title={exists ? `Jump to note: ${target}` : `Note "${target}" not found. Click to create.`}
          >
            <LinkIcon className="w-2.5 h-2.5" />
            <span>{displayLabel}</span>
            {!exists && <span className="text-[10px] opacity-70">+</span>}
          </button>
        );
      }

      // Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx} className="font-semibold text-primary">{part.slice(2, -2)}</strong>;
      }

      // Inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} className="font-mono text-emerald-400 bg-surface-subtle px-1 py-0.5 rounded text-[11px] code-ltr">
            {part.slice(1, -1)}
          </code>
        );
      }

      return part;
    });
  };

  return (
    <div 
      className="h-full flex flex-col bg-canvas select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropFile}
    >
      {/* Toast alert when cards are created */}
      {flashcardsSavedAlert !== null && (
        <div className="absolute top-4 right-4 z-50 bg-emerald-950 border border-emerald-500 text-emerald-300 px-3.5 py-2 rounded-lg text-xs flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{flashcardsSavedAlert} flashcards created and added to Daily Review Queue!</span>
        </div>
      )}

      {/* Main Split Layout: Left Notes Explorer, Right Work Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT PANEL: NOTES LIST & SEARCH                           */}
        {/* ========================================================= */}
        <div className="w-72 bg-surface border-r border-subtle flex flex-col shrink-0 select-none">
          {/* Top action bar: Search + New Note */}
          <div className="p-3 border-b border-subtle space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                {t.navigation.notes} ({notes.length})
              </span>
              <button
                type="button"
                onClick={() => handleCreateNote()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors"
                title="Create Note (Ctrl+N)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Full text search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-secondary absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes or [[links]]..."
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

            {/* Tag filter pills */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`px-2 py-0.5 rounded font-mono transition-colors whitespace-nowrap ${
                    selectedTag === null
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                  }`}
                >
                  all
                </button>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`px-2 py-0.5 rounded font-mono transition-colors whitespace-nowrap ${
                      selectedTag === tag
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'text-secondary hover:text-primary hover:bg-surface-subtle'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes scroll list */}
          <div className="flex-1 overflow-y-auto divide-y divide-subtle/50">
            {filteredNotes.length === 0 ? (
              <div className="p-6 text-center text-secondary text-xs space-y-2">
                <p>No notes found.</p>
                <button
                  type="button"
                  onClick={() => handleCreateNote(searchQuery ? searchQuery : 'New Note')}
                  className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Create note "{searchQuery || 'New Note'}"
                </button>
              </div>
            ) : (
              filteredNotes.map(n => {
                const isSelected = n.id === selectedNoteId;
                const linkCount = extractWikiLinks(n.content).length;

                return (
                  <div
                    key={n.id}
                    onClick={() => setSelectedNoteId(n.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        note: n
                      });
                    }}
                    className={`p-3 cursor-pointer transition-colors group relative ${
                      isSelected ? 'bg-surface-subtle border-l-2 border-cyan-400' : 'hover:bg-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h4 className="text-xs font-semibold text-primary truncate flex-1 flex items-center gap-1">
                        {n.pinned && <Pin className="w-3 h-3 text-amber-400 fill-amber-400/30 shrink-0" />}
                        <span>{n.title || 'Untitled Note'}</span>
                      </h4>
                      <span className="text-[10px] text-muted font-mono shrink-0">
                        {new Date(n.updatedAt).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-secondary line-clamp-2 leading-relaxed">
                      {n.content ? n.content.replace(/[#*`_\[\]]/g, '').slice(0, 80) : 'Empty note'}
                    </p>

                    {/* Metadata tags & link indicator */}
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-secondary">
                      {linkCount > 0 && (
                        <span className="flex items-center gap-0.5 text-cyan-400/90 font-mono">
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>{linkCount}</span>
                        </span>
                      )}
                      {(n.tags || []).slice(0, 2).map(tag => (
                        <span key={tag} className="text-muted font-mono">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Left panel footer: Drag/drop hint */}
          <div className="p-2 border-t border-subtle text-[10px] text-muted text-center flex items-center justify-center gap-1">
            <Upload className="w-3 h-3" />
            <span>Drop .md or .txt files to import</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL: EDITOR / PREVIEW / GRAPH VIEW               */}
        {/* ========================================================= */}
        <div className="flex-1 flex flex-col overflow-hidden bg-canvas">
          {selectedNoteId && activeNote ? (
            <>
              {/* Note Header Toolbar */}
              <div className="p-2.5 bg-surface border-b border-subtle flex flex-wrap items-center justify-between gap-2 select-none">
                {/* Title Input */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTogglePin(selectedNoteId)}
                    className={`p-1.5 rounded transition-colors ${
                      isPinned ? 'text-amber-400 bg-amber-500/20' : 'text-secondary hover:text-primary hover:bg-hover'
                    }`}
                    title={isPinned ? 'Unpin Note' : 'Pin Note to Top'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400' : ''}`} />
                  </button>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setTitle(newTitle);
                      pushHistory(newTitle, content, tags);
                    }}
                    placeholder="Note Title..."
                    className="flex-1 bg-transparent border-0 font-bold text-sm text-primary focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded px-1.5 py-0.5"
                  />
                </div>

                {/* Center / Right Toolbar Controls */}
                <div className="flex items-center gap-1">
                  {/* Undo / Redo */}
                  <div className="flex items-center bg-surface-subtle border border-subtle rounded p-0.5 mr-1">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyIndex <= 0}
                      className="p-1 rounded text-secondary hover:text-primary disabled:opacity-30"
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={historyIndex >= history.length - 1}
                      className="p-1 rounded text-secondary hover:text-primary disabled:opacity-30"
                      title="Redo (Ctrl+Y)"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center bg-surface-subtle border border-subtle rounded p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'split' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-secondary hover:text-primary'
                      }`}
                      title="Side-by-side Split View"
                    >
                      <Columns className="w-3 h-3" />
                      <span className="hidden sm:inline">Split</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('edit')}
                      className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'edit' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-secondary hover:text-primary'
                      }`}
                      title="Editor Only"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('preview')}
                      className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'preview' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-secondary hover:text-primary'
                      }`}
                      title="Rendered Preview"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline">Read</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('graph')}
                      className={`px-2 py-1 text-xs rounded font-medium flex items-center gap-1 transition-colors ${
                        viewMode === 'graph' ? 'bg-emerald-500/20 text-emerald-300 font-semibold' : 'text-secondary hover:text-primary'
                      }`}
                      title="Interactive Knowledge Graph"
                    >
                      <Network className="w-3 h-3" />
                      <span className="hidden sm:inline">Graph</span>
                    </button>
                  </div>

                  {/* Make Flashcards from Note */}
                  <button
                    type="button"
                    onClick={handleOpenFlashcardsModal}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 transition-colors"
                    title="Extract headings & text into SM-2 spaced repetition cards"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Make Flashcards</span>
                  </button>

                  {/* Backlinks Panel Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowBacklinks(!showBacklinks)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors ${
                      showBacklinks 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                        : 'bg-surface-subtle text-secondary border-subtle hover:text-primary'
                    }`}
                    title="Show incoming backlinks from other notes"
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>{backlinks.length}</span>
                  </button>

                  {/* Save Status / Export */}
                  <span className="text-[10px] font-mono text-muted px-1.5">
                    {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'dirty' ? 'Unsaved' : 'Saved'}
                  </span>

                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="p-1.5 rounded text-secondary hover:text-primary hover:bg-hover"
                    title="Export as .md"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteNote(selectedNoteId)}
                    className="p-1.5 rounded text-secondary hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete Note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Tags Editor Bar */}
              <div className="px-3 py-1.5 bg-surface/50 border-b border-subtle flex items-center gap-1.5 overflow-x-auto text-xs">
                <Tag className="w-3 h-3 text-secondary shrink-0" />
                <div className="flex items-center gap-1 flex-wrap">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-surface-subtle border border-subtle text-secondary"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-muted hover:text-rose-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="+ Add tag..."
                      className="bg-transparent border-0 text-[11px] font-mono text-primary focus:outline-none w-20 placeholder:text-muted"
                    />
                  </div>
                </div>
              </div>

              {/* Body Content Area (Editor / Preview / Graph / Backlinks) */}
              <div className="flex-1 flex overflow-hidden relative">
                {/* 1. GRAPH VIEW MODE */}
                {viewMode === 'graph' ? (
                  <div className="flex-1 overflow-hidden relative bg-canvas bg-graticule flex flex-col">
                    <div className="p-2 border-b border-subtle bg-surface/80 flex items-center justify-between text-xs text-secondary">
                      <div className="flex items-center gap-2">
                        <Network className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-primary">Interactive Knowledge Graph</span>
                        <span>· {graphData.nodes.length} Notes · {graphData.edges.length} Wiki-Links</span>
                      </div>
                      <span className="text-[11px] text-muted">Click any node to navigate</span>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
                      <KnowledgeGraphView
                        nodes={graphData.nodes}
                        edges={graphData.edges}
                        activeNodeId={selectedNoteId}
                        onSelectNode={(id) => {
                          setSelectedNoteId(id);
                          setViewMode('split');
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  /* 2. SPLIT / EDIT / PREVIEW MODES */
                  <div className="flex-1 flex overflow-hidden">
                    {/* Markdown Editor */}
                    {(viewMode === 'split' || viewMode === 'edit') && (
                      <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-subtle' : 'w-full'}`}>
                        {/* Editor Helper Toolbar */}
                        <div className="px-3 py-1 bg-surface-subtle border-b border-subtle flex items-center gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              const ins = '## ';
                              setContent(prev => prev + '\n' + ins);
                              pushHistory(title, content + '\n' + ins, tags);
                            }}
                            className="px-1.5 py-0.5 rounded hover:bg-hover text-secondary hover:text-primary font-mono text-[11px]"
                            title="Insert Heading 2"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const ins = '[[Target Note]]';
                              setContent(prev => prev + ins);
                              pushHistory(title, content + ins, tags);
                            }}
                            className="px-1.5 py-0.5 rounded hover:bg-hover text-cyan-400 font-mono text-[11px]"
                            title="Insert [[Wiki-Link]]"
                          >
                            [[Wiki-Link]]
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const ins = '```c\n// Code snippet\n```\n';
                              setContent(prev => prev + '\n' + ins);
                              pushHistory(title, content + '\n' + ins, tags);
                            }}
                            className="px-1.5 py-0.5 rounded hover:bg-hover text-emerald-400 font-mono text-[11px]"
                            title="Insert C code block"
                          >
                            Code
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyMarkdown}
                            className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-secondary hover:text-primary hover:bg-hover"
                            title="Copy Markdown"
                          >
                            {copyFeedback ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copyFeedback ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        {/* Textarea */}
                        <textarea
                          ref={textareaRef}
                          value={content}
                          onChange={(e) => {
                            const newContent = e.target.value;
                            setContent(newContent);
                            pushHistory(title, newContent, tags);
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder="Write markdown with [[wiki-links]] to connect concepts..."
                          className="flex-1 w-full p-4 bg-canvas text-primary font-mono text-xs leading-relaxed resize-none focus:outline-none select-text code-ltr"
                        />
                      </div>
                    )}

                    {/* Markdown Preview */}
                    {(viewMode === 'split' || viewMode === 'preview') && (
                      <div className={`h-full overflow-y-auto p-6 bg-surface/30 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                        <div className="max-w-2xl mx-auto">
                          {renderFormattedMarkdown(content)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ========================================================= */}
                {/* BACKLINKS DRAWER                                          */}
                {/* ========================================================= */}
                {showBacklinks && (
                  <div className="w-72 bg-surface border-l border-subtle flex flex-col shrink-0 select-none z-10 animate-in slide-in-from-right-2">
                    <div className="p-3 border-b border-subtle flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-bold text-primary">Backlinks ({backlinks.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowBacklinks(false)}
                        className="text-secondary hover:text-primary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {backlinks.length === 0 ? (
                        <div className="p-4 text-center text-secondary text-xs">
                          <p>No other notes link to this note yet.</p>
                          <p className="text-[11px] text-muted mt-1">Use [[{title}]] in any other note to link it.</p>
                        </div>
                      ) : (
                        backlinks.map((bl, bIdx) => (
                          <div
                            key={bIdx}
                            onClick={() => setSelectedNoteId(bl.sourceNote.id)}
                            className="p-2.5 rounded bg-surface-subtle hover:bg-hover border border-subtle cursor-pointer transition-colors space-y-1"
                          >
                            <h5 className="text-xs font-semibold text-cyan-300 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-secondary" />
                              <span>{bl.sourceNote.title}</span>
                            </h5>
                            <p className="text-[11px] text-secondary font-mono italic line-clamp-2">
                              {bl.snippet}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state when no note is selected */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-primary">No Note Selected</h3>
                <p className="text-xs text-secondary max-w-sm">
                  Select a note from the left sidebar or create a new note with wiki-links to build your electronic engineering knowledge base.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCreateNote()}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 inline-flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Note</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CONTEXT MENU ON NOTE ITEMS                                */}
      {/* ========================================================= */}
      {contextMenu.visible && contextMenu.note && (
        <div
          className="fixed z-50 bg-surface border border-subtle rounded-lg shadow-xl py-1 w-48 text-xs font-sans text-primary select-none animate-in fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (contextMenu.note) handleTogglePin(contextMenu.note.id);
              setContextMenu({ visible: false, x: 0, y: 0, note: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Pin className="w-3.5 h-3.5 text-amber-400" />
            <span>{contextMenu.note.pinned ? 'Unpin' : 'Pin Note'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (contextMenu.note) {
                navigator.clipboard.writeText(contextMenu.note.content);
              }
              setContextMenu({ visible: false, x: 0, y: 0, note: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copy Markdown</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (contextMenu.note) {
                setSelectedNoteId(contextMenu.note.id);
                handleOpenFlashcardsModal();
              }
              setContextMenu({ visible: false, x: 0, y: 0, note: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-hover flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Make Flashcards</span>
          </button>
          <div className="h-px bg-subtle my-1" />
          <button
            type="button"
            onClick={() => {
              if (contextMenu.note) handleDeleteNote(contextMenu.note.id);
              setContextMenu({ visible: false, x: 0, y: 0, note: null });
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Note</span>
          </button>
        </div>
      )}

      {/* Close context menu on outside click */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu({ visible: false, x: 0, y: 0, note: null })}
        />
      )}

      {/* ========================================================= */}
      {/* FLASHCARD CREATION MODAL                                  */}
      {/* ========================================================= */}
      {showFlashcardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-subtle rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary">Make Flashcards from Note</h3>
                  <p className="text-[11px] text-secondary">
                    Extracted from "{title}" into SM-2 spaced repetition cards
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFlashcardModal(false)}
                className="text-secondary hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {flashcardCandidates.length === 0 ? (
                <div className="p-6 text-center text-secondary text-xs space-y-2">
                  <p>No automatic Q/A patterns found in this note.</p>
                  <p className="text-[11px] text-muted">
                    Tip: Use markdown headings like <code>## What is I2C?</code> or <code>Q: ... \n A: ...</code> or select text before clicking this action.
                  </p>
                </div>
              ) : (
                flashcardCandidates.map((card, cIdx) => (
                  <div key={cIdx} className="p-3 rounded-lg bg-surface-subtle border border-subtle space-y-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-0.5">
                        Question #{cIdx + 1}
                      </label>
                      <input
                        type="text"
                        value={card.question}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFlashcardCandidates(prev => prev.map((c, i) => i === cIdx ? { ...c, question: val } : c));
                        }}
                        className="w-full bg-canvas border border-subtle rounded px-2.5 py-1 text-xs text-primary focus:outline-none focus:border-purple-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                        Answer
                      </label>
                      <textarea
                        value={card.answer}
                        rows={2}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFlashcardCandidates(prev => prev.map((c, i) => i === cIdx ? { ...c, answer: val } : c));
                        }}
                        className="w-full bg-canvas border border-subtle rounded px-2.5 py-1 text-xs text-primary focus:outline-none focus:border-emerald-400 font-mono resize-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlashcardCandidates(prev => prev.filter((_, i) => i !== cIdx))}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Remove Card
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-subtle bg-surface/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFlashcardCandidates(prev => [
                    ...prev,
                    { question: 'New Question?', answer: 'Answer here', category: title }
                  ]);
                }}
                className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Card</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFlashcardModal(false)}
                  className="px-3 py-1.5 text-xs rounded border border-subtle text-secondary hover:text-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={flashcardCandidates.length === 0}
                  onClick={handleSaveFlashcards}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 disabled:opacity-40 transition-colors"
                >
                  Save {flashcardCandidates.length} Cards to Deck
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================
// SVG KNOWLEDGE GRAPH COMPONENT
// =========================================================
interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  activeNodeId: string | null;
  onSelectNode: (id: string) => void;
}

const KnowledgeGraphView: React.FC<KnowledgeGraphProps> = ({
  nodes,
  edges,
  activeNodeId,
  onSelectNode,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Position nodes in a radial/circular layout for high stability
  const computedNodes = useMemo(() => {
    const width = 600;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.38;

    return nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / (nodes.length || 1);
      // Nodes with higher connections slightly offset inwards
      const r = n.totalDegree > 1 ? radius * 0.8 : radius;
      return {
        ...n,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      };
    });
  }, [nodes]);

  const nodePosMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    computedNodes.forEach(n => map.set(n.id, { x: n.x, y: n.y }));
    return map;
  }, [computedNodes]);

  return (
    <svg 
      className="w-full h-full max-w-3xl max-h-[500px] select-none" 
      viewBox="0 0 600 450"
    >
      <defs>
        {/* Glowing node filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Render Edges */}
      {edges.map(e => {
        const src = nodePosMap.get(e.sourceId);
        const tgt = nodePosMap.get(e.targetId);
        if (!src || !tgt) return null;

        const isHighlighted = hoveredNodeId === e.sourceId || hoveredNodeId === e.targetId;
        const isActiveEdge = activeNodeId === e.sourceId || activeNodeId === e.targetId;

        return (
          <line
            key={e.id}
            x1={src.x}
            y1={src.y}
            x2={tgt.x}
            y2={tgt.y}
            stroke={isHighlighted ? '#22d3ee' : isActiveEdge ? '#10b981' : '#334155'}
            strokeWidth={isHighlighted ? 2.5 : isActiveEdge ? 1.8 : 1}
            strokeDasharray={isHighlighted ? undefined : '3 3'}
            opacity={isHighlighted ? 0.9 : 0.5}
          />
        );
      })}

      {/* Render Nodes */}
      {computedNodes.map(n => {
        const isActive = n.id === activeNodeId;
        const isHovered = n.id === hoveredNodeId;
        const radius = Math.max(10, Math.min(22, 10 + n.totalDegree * 3));

        return (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y})`}
            className="cursor-pointer transition-transform duration-200"
            onClick={() => onSelectNode(n.id)}
            onMouseEnter={() => setHoveredNodeId(n.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            {/* Outer ring on hover/active */}
            {(isActive || isHovered) && (
              <circle
                r={radius + 4}
                fill="none"
                stroke={isActive ? '#10b981' : '#22d3ee'}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                opacity={0.8}
              />
            )}

            {/* Central node circle */}
            <circle
              r={radius}
              fill={isActive ? '#064e3b' : isHovered ? '#164e63' : '#1e293b'}
              stroke={isActive ? '#34d399' : isHovered ? '#38bdf8' : '#64748b'}
              strokeWidth={isActive || isHovered ? 2 : 1.2}
              filter={isActive || isHovered ? 'url(#glow)' : undefined}
            />

            {/* Degree badge count if > 0 */}
            {n.totalDegree > 0 && (
              <text
                textAnchor="middle"
                dy="3.5"
                fill="#f8fafc"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {n.totalDegree}
              </text>
            )}

            {/* Node Title Label */}
            <text
              textAnchor="middle"
              dy={radius + 14}
              fill={isActive ? '#34d399' : isHovered ? '#38bdf8' : '#94a3b8'}
              fontSize="10"
              fontFamily="sans-serif"
              fontWeight={isActive || isHovered ? '600' : 'normal'}
              className="pointer-events-none"
            >
              {n.title.length > 20 ? n.title.slice(0, 18) + '...' : n.title}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
