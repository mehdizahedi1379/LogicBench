import React from 'react';
import { HardDrive, HelpCircle, Terminal, Layers } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useWorkbench } from '../store/workbenchStore';
import { PwaInstallBanner } from './PwaInstallBanner';

export const StatusBar: React.FC = () => {
  const { t, direction, language } = useI18n();
  const { activeTabId, tabs, setShortcutsModalOpen } = useWorkbench();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <footer 
      role="contentinfo"
      aria-label="Workbench status bar"
      className="code-ltr h-6 bg-surface border-t border-subtle flex items-center justify-between px-3 text-[11px] font-mono text-secondary select-none shrink-0 z-30" 
      dir="ltr"
    >
      {/* Left: Engine / Workbench Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">{t.workbench.statusReady}</span>
        </div>

        <span className="text-muted hidden sm:inline">|</span>

        {/* PWA Install & Offline status */}
        <PwaInstallBanner />

        <span className="text-muted hidden sm:inline">|</span>

        {/* Database Persistence Status */}
        <div className="flex items-center gap-1.5 text-cyan-400 hidden md:flex">
          <HardDrive className="w-3 h-3" />
          <span>INDEXED_DB: OK</span>
        </div>

        <span className="text-muted hidden md:inline">|</span>

        {/* Active Context */}
        <div className="truncate max-w-xs text-secondary hidden md:inline">
          {activeTab ? `ACTIVE: ${activeTab.title.toUpperCase()}` : 'OVERVIEW: BENCH'}
        </div>
      </div>

      {/* Right: Radix / Word Width / Shortcuts Help */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline text-muted">WIDTH: 32/64-BIT</span>
        <span className="text-muted hidden sm:inline">|</span>
        <span className="text-amber-400 font-bold uppercase">RADIX: HEX/BIN</span>
        <span className="text-muted">|</span>
        
        {/* Language & Direction Indicator */}
        <span className="text-secondary uppercase">
          {language.toUpperCase()} ({direction.toUpperCase()})
        </span>

        <span className="text-muted">|</span>

        {/* Quick Shortcuts Trigger */}
        <button
          type="button"
          onClick={() => setShortcutsModalOpen(true)}
          className="hover:text-primary transition-colors flex items-center gap-1 text-muted hover:text-cyan-400"
          title="Open Shortcuts (Ctrl+/)"
        >
          <HelpCircle className="w-3 h-3" />
          <span className="hidden sm:inline">Ctrl+/</span>
        </button>
      </div>
    </footer>
  );
};
