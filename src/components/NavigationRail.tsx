import React from 'react';
import { 
  Wrench, 
  Cpu, 
  BookOpen, 
  FileText, 
  Layers, 
  Settings,
  Home
} from 'lucide-react';
import { FeatureCategory } from '../features/types';
import { useI18n } from '../i18n/context';
import { useWorkbench } from '../store/workbenchStore';

export const NavigationRail: React.FC = () => {
  const { t } = useI18n();
  const { 
    activeRailCategory, 
    setActiveRailCategory, 
    sidebarCollapsed, 
    setSidebarCollapsed,
    switchTab,
    activeTabId
  } = useWorkbench();

  const handleRailClick = (category: FeatureCategory) => {
    setActiveRailCategory(category);
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
    }
  };

  const navItems: { category: FeatureCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { category: 'tools', label: t.navigation.tools, icon: Wrench },
    { category: 'microcontrollers', label: t.navigation.microcontrollers, icon: Cpu },
    { category: 'learn', label: t.navigation.learn, icon: BookOpen },
    { category: 'notes', label: t.navigation.notes, icon: FileText },
    { category: 'library', label: t.navigation.library, icon: Layers },
  ];

  return (
    <nav 
      aria-label="Workbench primary rail"
      className="w-12 bg-surface border-r border-subtle flex flex-col items-center justify-between py-2 select-none shrink-0 z-20"
    >
      {/* Top Group: Home + Primary Categories */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Home / Overview Shortcut */}
        <button
          type="button"
          onClick={() => switchTab(null)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative group ${
            activeTabId === null
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'text-secondary hover:text-primary hover:bg-hover'
          }`}
          title={t.workbench.homeTab}
          aria-label={t.workbench.homeTab}
        >
          <Home className="w-4 h-4" />
          {activeTabId === null && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
          )}
        </button>

        <div className="w-6 h-px bg-subtle my-1" />

        {/* Categories */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRailCategory === item.category && !sidebarCollapsed;

          return (
            <button
              key={item.category}
              type="button"
              onClick={() => handleRailClick(item.category)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-400'
                  : 'text-secondary hover:text-primary hover:bg-hover'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" />
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-cyan-400 rounded-r" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom: Settings */}
      <div className="flex flex-col items-center gap-1 w-full">
        <button
          type="button"
          onClick={() => handleRailClick('settings')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors relative group ${
            activeRailCategory === 'settings' && !sidebarCollapsed
              ? 'bg-amber-500/15 text-amber-400'
              : 'text-secondary hover:text-primary hover:bg-hover'
          }`}
          title={t.navigation.settings}
          aria-label={t.navigation.settings}
        >
          <Settings className="w-4 h-4" />
          {activeRailCategory === 'settings' && !sidebarCollapsed && (
            <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-amber-400 rounded-r" />
          )}
        </button>
      </div>
    </nav>
  );
};
