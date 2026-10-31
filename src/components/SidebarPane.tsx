import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  Binary, 
  Plus, 
  Settings, 
  Cpu, 
  BookOpen, 
  FileText, 
  Layers, 
  Sparkles,
  Zap
} from 'lucide-react';
import { useI18n } from '../i18n/context';
import { useWorkbench } from '../store/workbenchStore';
import { featureRegistry } from '../features/registry';

export const SidebarPane: React.FC = () => {
  const { t } = useI18n();
  const { 
    activeRailCategory, 
    openTab, 
    sidebarCollapsed, 
    sidebarWidth 
  } = useWorkbench();

  const [searchQuery, setSearchQuery] = useState('');

  if (sidebarCollapsed) {
    return null;
  }

  // Get features matching current category from registry
  const categoryFeatures = featureRegistry.getByCategory(activeRailCategory);
  const filteredFeatures = categoryFeatures.filter((f) => {
    const title = featureRegistry.resolveTitle(f, t).toLowerCase();
    const desc = featureRegistry.resolveDescription(f, t).toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query) || desc.includes(query) || f.keywords?.some((k) => k.toLowerCase().includes(query));
  });

  const getCategoryHeader = () => {
    switch (activeRailCategory) {
      case 'tools':
        return { title: t.navigation.tools, subtitle: 'Radix, timing & calculation instruments' };
      case 'microcontrollers':
        return { title: t.navigation.microcontrollers, subtitle: 'Timers, UART, I2C, SPI, registers & pin planners' };
      case 'learn':
        return { title: t.navigation.learn, subtitle: '10 micro-lessons, SM-2 flashcards & code lab' };
      case 'notes':
        return { title: t.navigation.notes, subtitle: 'Engineering notes, wiki-links, backlinks & knowledge graph' };
      case 'library':
        return { title: t.navigation.library, subtitle: 'Component database, specs, pinouts, and embedded snippets' };
      case 'settings':
        return { title: t.navigation.settings, subtitle: 'Workbench preferences & storage' };
    }
  };

  const header = getCategoryHeader();

  // Upcoming items for future phases (clear indicators that the foundation is modular and extensible)
  const getUpcomingItems = () => {
    switch (activeRailCategory) {
      case 'tools':
        return [
          { title: 'RLC Resonant Frequency & Q-Factor', badge: 'Roadmap' },
          { title: 'Op-Amp Inverting / Non-Inverting Sizer', badge: 'Roadmap' },
        ];
      case 'microcontrollers':
        return [
          { title: 'Cortex-M NVIC Interrupt Priority Sizer', badge: 'Roadmap' },
          { title: 'DMA Descriptor & Stream Ring Buffer Calculator', badge: 'Roadmap' },
        ];
      case 'learn':
        return [
          { title: 'DSP & Fast Fourier Transform (FFT)', badge: 'Upcoming' },
          { title: 'CAN Bus & Automotive Networks', badge: 'Upcoming' },
        ];
      default:
        return [];
    }
  };

  const upcomingItems = getUpcomingItems();

  return (
    <aside
      aria-label="Sidebar category explorer"
      style={{ width: `${sidebarWidth}px` }}
      className="bg-surface border-r border-subtle flex flex-col h-full select-none shrink-0 overflow-hidden"
    >
      {/* Pane Title Bar */}
      <div className="p-3 border-b border-subtle space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary font-mono">
            {header.title}
          </h2>
          <span className="text-[10px] text-muted font-mono">
            {filteredFeatures.length} Active
          </span>
        </div>
        <p className="text-[11px] text-secondary truncate">{header.subtitle}</p>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter items..."
            className="w-full h-7 pl-8 pr-2.5 bg-canvas border border-subtle rounded text-xs text-primary placeholder-muted focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {/* Active Registered Features */}
        {filteredFeatures.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-mono text-muted px-2 py-1">
              Active Instruments
            </div>
            {filteredFeatures.map((feature) => {
              const Icon = feature.icon;
              const title = featureRegistry.resolveTitle(feature, t);
              const desc = featureRegistry.resolveDescription(feature, t);

              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => openTab(feature.id)}
                  className="w-full text-left p-2.5 rounded-lg bg-surface hover:bg-surface-elevated border border-subtle hover:border-cyan-500/40 transition-colors group space-y-1 block"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-canvas border border-subtle flex items-center justify-center text-cyan-400 group-hover:text-emerald-400 transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-semibold text-primary group-hover:text-cyan-400 transition-colors">
                        {title}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-secondary line-clamp-1 pl-8">
                    {desc}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Upcoming Foundation Slots */}
        {upcomingItems.length > 0 && (
          <div className="space-y-1 pt-2">
            <div className="text-[10px] uppercase font-mono text-muted px-2 py-1 flex items-center justify-between">
              <span>Planned Slots</span>
              <span className="text-[9px]">Foundation Ready</span>
            </div>
            {upcomingItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded border border-subtle/60 bg-canvas/40 opacity-70 flex items-center justify-between"
              >
                <span className="text-xs text-secondary truncate">{item.title}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface border border-subtle text-muted shrink-0">
                  {item.badge}
                </span>
              </div>
            ))}
          </div>
        )}

        {filteredFeatures.length === 0 && upcomingItems.length === 0 && (
          <div className="p-4 text-center text-xs text-muted">
            No matching items found.
          </div>
        )}
      </div>
    </aside>
  );
};
