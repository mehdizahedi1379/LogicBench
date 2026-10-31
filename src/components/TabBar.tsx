import React, { useRef } from 'react';
import { X, Plus, Home, Binary, Settings, Sparkles } from 'lucide-react';
import { useWorkbench, TabItem } from '../store/workbenchStore';
import { useI18n } from '../i18n/context';
import { featureRegistry } from '../features/registry';

export const TabBar: React.FC = () => {
  const { t } = useI18n();
  const { 
    tabs, 
    activeTabId, 
    switchTab, 
    closeTab, 
    setCommandPaletteOpen 
  } = useWorkbench();

  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTabMouseDown = (e: React.MouseEvent, tabId: string) => {
    // Middle click closes tab
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabId);
    }
  };

  const getTabIcon = (featureId: string) => {
    const feat = featureRegistry.get(featureId);
    if (!feat) return Sparkles;
    return feat.icon;
  };

  return (
    <div 
      role="tablist"
      aria-label="Workbench open tabs"
      className="h-9 bg-surface-subtle border-b border-subtle flex items-center select-none overflow-hidden shrink-0 px-2"
    >
      {/* Home / Overview Fixed Tab */}
      <button
        role="tab"
        aria-selected={activeTabId === null}
        type="button"
        onClick={() => switchTab(null)}
        className={`h-7 px-3 rounded-t text-xs font-medium flex items-center gap-1.5 transition-colors border-t border-x shrink-0 ${
          activeTabId === null
            ? 'bg-surface border-subtle text-primary shadow-xs font-semibold'
            : 'border-transparent text-secondary hover:text-primary hover:bg-hover'
        }`}
        title={t.workbench.homeTab}
      >
        <Home className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">{t.workbench.homeTab}</span>
      </button>

      {/* Dynamic Tabs Container */}
      <div 
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto flex-1 h-full pt-1 px-1 no-scrollbar"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const Icon = getTabIcon(tab.featureId);

          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onMouseDown={(e) => handleTabMouseDown(e, tab.id)}
              className={`group h-7 px-2.5 rounded-t text-xs flex items-center gap-2 transition-colors border-t border-x cursor-pointer shrink-0 max-w-[200px] ${
                isActive
                  ? 'bg-surface border-subtle text-primary font-medium'
                  : 'border-transparent text-secondary hover:text-primary hover:bg-hover'
              }`}
              onClick={() => switchTab(tab.id)}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-muted'}`} />
              <span className="truncate">{tab.title}</span>

              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-subtle text-secondary hover:text-primary transition-opacity shrink-0 ml-1"
                title={t.workbench.closeTab}
                aria-label={`${t.workbench.closeTab} ${tab.title}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* New Tab (+) button */}
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="w-7 h-7 rounded flex items-center justify-center text-secondary hover:text-primary hover:bg-hover transition-colors shrink-0"
        title={`${t.workbench.newTab} (Ctrl+K)`}
        aria-label={t.workbench.newTab}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
