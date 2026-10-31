import React, { useState } from 'react';
import { Keyboard, X, Search } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useWorkbench } from '../store/workbenchStore';
import { SHORTCUT_REGISTRY, ShortcutItem } from '../lib/shortcuts';

export const ShortcutsModal: React.FC = () => {
  const { t } = useI18n();
  const { shortcutsModalOpen, setShortcutsModalOpen } = useWorkbench();
  const [filter, setFilter] = useState('');

  if (!shortcutsModalOpen) return null;

  const resolveShortcutDesc = (item: ShortcutItem) => {
    switch (item.id) {
      case 'command-palette':
        return t.shortcuts.keyCommandPalette;
      case 'new-note':
        return t.shortcuts.keyNewNote;
      case 'save':
        return t.shortcuts.keySave;
      case 'find':
        return t.shortcuts.keyFind;
      case 'next-tab':
        return t.shortcuts.keyNextTab;
      case 'prev-tab':
        return t.shortcuts.keyPrevTab;
      case 'close-tab':
        return t.shortcuts.keyCloseTab;
      case 'toggle-sidebar':
        return t.shortcuts.keyToggleSidebar;
      case 'shortcuts-help':
        return t.shortcuts.keyShortcutsHelp;
      default:
        return item.handlerName;
    }
  };

  const filteredShortcuts = SHORTCUT_REGISTRY.filter((item) => {
    const desc = resolveShortcutDesc(item).toLowerCase();
    const combo = item.displayCombo.toLowerCase();
    const q = filter.toLowerCase();
    return desc.includes(q) || combo.includes(q);
  });

  const categories = [
    { key: 'general', title: t.shortcuts.sectionGeneral },
    { key: 'tabs', title: t.shortcuts.sectionTabs },
    { key: 'editor', title: t.shortcuts.sectionEditor },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100"
      onClick={() => setShortcutsModalOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface border border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-primary">{t.shortcuts.title}</h2>
              <p className="text-[11px] text-secondary">{t.shortcuts.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 rounded text-secondary hover:text-primary hover:bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Input */}
        <div className="p-3 border-b border-subtle bg-surface-subtle">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t.shortcuts.searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 bg-canvas border border-subtle rounded text-xs text-primary placeholder-muted focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Shortcut Groups */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {categories.map((cat) => {
            const items = filteredShortcuts.filter((s) => s.category === cat.key);
            if (items.length === 0) return null;

            return (
              <div key={cat.key} className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted font-mono">
                  {cat.title}
                </h3>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-lg bg-surface-elevated border border-subtle flex items-center justify-between gap-4"
                    >
                      <span className="text-xs text-primary font-medium">
                        {resolveShortcutDesc(item)}
                      </span>
                      <kbd className="code-ltr font-mono text-xs px-2 py-1 rounded bg-canvas border border-subtle text-cyan-300 font-semibold shadow-xs shrink-0" dir="ltr">
                        {item.displayCombo}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 text-xs text-muted">
              No shortcuts matching &quot;{filter}&quot;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-subtle bg-canvas/60 text-right">
          <button
            type="button"
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-surface-subtle hover:bg-hover border border-subtle text-primary transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
