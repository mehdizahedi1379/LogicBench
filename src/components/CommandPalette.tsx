import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Binary, 
  Settings, 
  Moon, 
  Sun, 
  Languages, 
  Keyboard, 
  X, 
  Terminal, 
  RotateCcw,
  Plus,
  FileText,
  Layers,
  Code,
  FolderKanban
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useWorkbench } from '../store/workbenchStore';
import { featureRegistry } from '../features/registry';
import { db, DBNote, DBChip, DBSnippet, DBProject } from '../lib/db';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const { t, language, toggleLanguage } = useI18n();
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    openTab, 
    closeAllTabs,
    setShortcutsModalOpen,
    switchTab
  } = useWorkbench();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dbNotes, setDbNotes] = useState<DBNote[]>([]);
  const [dbChips, setDbChips] = useState<DBChip[]>([]);
  const [dbSnippets, setDbSnippets] = useState<DBSnippet[]>([]);
  const [dbProjects, setDbProjects] = useState<DBProject[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and load knowledge records when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Async load database items for search
      Promise.all([
        db.getAll('notes'),
        db.getAll('chips'),
        db.getAll('snippets'),
        db.getAll('projects')
      ]).then(([notes, chips, snippets, projects]) => {
        setDbNotes(notes);
        setDbChips(chips);
        setDbSnippets(snippets);
        setDbProjects(projects);
      }).catch(err => {
        console.error('Failed to load command palette db records:', err);
      });
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  // Build command item list
  const features = featureRegistry.getAll();
  const featureCommands: CommandItem[] = features.map((f) => ({
    id: `feat-${f.id}`,
    title: featureRegistry.resolveTitle(f, t),
    description: featureRegistry.resolveDescription(f, t),
    category: t.commandPalette.categoryTools,
    icon: f.icon,
    shortcut: f.shortcut,
    action: () => {
      openTab(f.id);
      setCommandPaletteOpen(false);
    },
  }));

  // Knowledge base: Notes
  const noteCommands: CommandItem[] = dbNotes.map((n) => ({
    id: `note-${n.id}`,
    title: n.title,
    description: n.content.slice(0, 80).replace(/\n/g, ' ') || 'Knowledge note',
    category: 'Notes',
    icon: FileText,
    action: () => {
      openTab('notes');
      setCommandPaletteOpen(false);
    },
  }));

  // Knowledge base: Chips
  const chipCommands: CommandItem[] = dbChips.map((c) => ({
    id: `chip-${c.id}`,
    title: `${c.partNumber} (${c.manufacturer})`,
    description: `${c.architecture} · ${c.keySpecs || c.description}`,
    category: 'Component Library',
    icon: Layers,
    action: () => {
      openTab('library');
      setCommandPaletteOpen(false);
    },
  }));

  // Knowledge base: Snippets
  const snippetCommands: CommandItem[] = dbSnippets.map((s) => ({
    id: `snip-${s.id}`,
    title: s.title,
    description: `[${s.language.toUpperCase()}] ${s.description || s.category}`,
    category: 'Code Snippets',
    icon: Code,
    action: () => {
      openTab('snippets');
      setCommandPaletteOpen(false);
    },
  }));

  // Knowledge base: Projects
  const projectCommands: CommandItem[] = dbProjects.map((p) => ({
    id: `proj-${p.id}`,
    title: p.title,
    description: `${p.targetMcu || 'Hardware Project'} · ${(p.bom || []).length} BOM items`,
    category: 'Projects & BOM',
    icon: FolderKanban,
    action: () => {
      openTab('projects');
      setCommandPaletteOpen(false);
    },
  }));

  const systemCommands: CommandItem[] = [
    {
      id: 'action-home',
      title: t.workbench.homeTab,
      description: 'Go to workbench overview dashboard',
      category: t.commandPalette.categoryNavigation,
      icon: Terminal,
      action: () => {
        switchTab(null);
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-language',
      title: `Switch Language (${language === 'en' ? 'فارسی' : 'English'})`,
      description: 'Toggle between English (LTR) and Persian (RTL)',
      category: t.commandPalette.categorySystem,
      icon: Languages,
      action: () => {
        toggleLanguage();
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-shortcuts',
      title: t.shortcuts.title,
      description: 'Open full keyboard shortcuts cheat sheet',
      category: t.commandPalette.categorySystem,
      icon: Keyboard,
      shortcut: 'Ctrl+/',
      action: () => {
        setCommandPaletteOpen(false);
        setShortcutsModalOpen(true);
      },
    },
    {
      id: 'action-close-tabs',
      title: 'Close All Open Tabs',
      description: 'Close all open workbench tab views',
      category: t.commandPalette.categorySystem,
      icon: X,
      action: () => {
        closeAllTabs();
        setCommandPaletteOpen(false);
      },
    },
  ];

  const allCommands = [
    ...featureCommands,
    ...noteCommands,
    ...chipCommands,
    ...snippetCommands,
    ...projectCommands,
    ...systemCommands
  ];

  const filtered = allCommands.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface border border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-subtle gap-3">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search tools, notes, chips, snippets, projects..."
            className="w-full bg-transparent text-sm text-primary placeholder-muted focus:outline-none"
          />
          <kbd className="code-ltr font-mono text-[10px] px-1.5 py-0.5 rounded bg-canvas border border-subtle text-muted shrink-0" dir="ltr">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-2.5 rounded-lg flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'bg-surface-elevated border border-cyan-500/40 text-primary'
                      : 'border border-transparent text-secondary hover:text-primary hover:bg-hover'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded flex items-center justify-center border shrink-0 ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-canvas border-subtle text-muted'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-primary truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="code-ltr text-[10px] font-mono px-1.5 py-0.5 rounded bg-canvas border border-subtle text-muted" dir="ltr">
                        {item.shortcut}
                      </kbd>
                    )}
                    <span className="text-[10px] font-mono uppercase text-muted">
                      {item.category}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-muted">
              {t.commandPalette.noResults}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="code-ltr px-4 py-2 border-t border-subtle bg-canvas/60 text-[10px] font-mono text-muted flex items-center justify-between" dir="ltr">
          <div className="flex items-center gap-3">
            <span>↑↓ {t.commandPalette.navigate}</span>
            <span>↵ {t.commandPalette.select}</span>
          </div>
          <span>ESC {t.commandPalette.close}</span>
        </div>
      </div>
    </div>
  );
};
