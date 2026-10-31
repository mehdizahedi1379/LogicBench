import React from 'react';
import { 
  Activity, 
  Search, 
  Keyboard, 
  Languages, 
  Minus, 
  Square, 
  X,
  Sidebar
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useWorkbench } from '../store/workbenchStore';

export const WindowFrame: React.FC = () => {
  const { t, language, toggleLanguage } = useI18n();
  const { 
    setCommandPaletteOpen, 
    setShortcutsModalOpen, 
    toggleSidebar, 
    activeTabId, 
    tabs 
  } = useWorkbench();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const titleText = activeTab 
    ? `${activeTab.title} — LogicBench` 
    : `LogicBench — ${t.workbench.homeTab}`;

  return (
    <header className="h-10 bg-surface border-b border-subtle flex items-center justify-between px-3 select-none shrink-0 z-30">
      {/* Left: Window Icon, App Wordmark & Sidebar Toggle */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1 rounded text-secondary hover:text-primary hover:bg-hover transition-colors"
          title={t.navigation.collapse}
          aria-label={t.navigation.collapse}
        >
          <Sidebar className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-primary font-mono">
            LogicBench
          </span>
        </div>

        <span className="text-muted text-xs hidden md:inline">|</span>
        <span className="text-xs text-secondary truncate max-w-[220px] lg:max-w-md hidden md:inline">
          {titleText}
        </span>
      </div>

      {/* Middle: Command Palette Quick Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden sm:block">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full h-7 px-3 rounded bg-canvas border border-subtle hover:border-medium flex items-center justify-between text-xs text-muted hover:text-secondary transition-colors"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span className="truncate">{t.commandPalette.placeholder}</span>
          </span>
          <kbd className="code-ltr font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface border border-subtle" dir="ltr">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Controls & Simulated Window System Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Language Switcher */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="px-2 py-1 rounded text-xs font-mono text-secondary hover:text-primary hover:bg-hover border border-subtle transition-colors flex items-center gap-1"
          title="Toggle Language (English / فارسی)"
        >
          <Languages className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold uppercase">{language}</span>
        </button>

        {/* Shortcuts Modal Trigger */}
        <button
          type="button"
          onClick={() => setShortcutsModalOpen(true)}
          className="p-1.5 rounded text-secondary hover:text-primary hover:bg-hover transition-colors"
          title={t.shortcuts.title}
          aria-label={t.shortcuts.title}
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Windows Desktop Window Action Buttons Styling */}
        <div className="flex items-center ml-2 border-l border-subtle pl-2">
          <button
            type="button"
            className="w-8 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors"
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="w-8 h-7 flex items-center justify-center text-muted hover:text-primary hover:bg-hover transition-colors"
            title="Maximize"
            aria-label="Maximize window"
          >
            <Square className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            className="w-8 h-7 flex items-center justify-center text-muted hover:text-white hover:bg-red-600 transition-colors"
            title="Close"
            aria-label="Close application window"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
