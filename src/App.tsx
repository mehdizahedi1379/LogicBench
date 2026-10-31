/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { I18nProvider } from './i18n/context';
import { WorkbenchProvider, useWorkbench } from './store/workbenchStore';
import { WindowFrame } from './components/WindowFrame';
import { NavigationRail } from './components/NavigationRail';
import { SidebarPane } from './components/SidebarPane';
import { ResizableSplitter } from './components/ResizablePanes';
import { TabBar } from './components/TabBar';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import { HomeView } from './features/home/HomeView';
import { featureRegistry } from './features/registry';
import { useGlobalShortcuts } from './lib/useGlobalShortcuts';
import { seedDefaultsIfEmpty } from './lib/seedData';
import { initDesktopIntegration } from './lib/fileSystemHelper';
import { AlertCircle } from 'lucide-react';

const WorkbenchContent: React.FC = () => {
  useGlobalShortcuts();
  const { 
    tabs, 
    activeTabId, 
    openTab, 
    setActiveRailCategory,
    setSidebarCollapsed,
    switchTab
  } = useWorkbench();

  // Initialize theme, graticule, seed data, and desktop bridge on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('logicbench_theme') || 'dark';
    if (savedTheme === 'system') {
      if (window.desktop) {
        window.desktop.getNativeTheme().then((theme) => {
          document.documentElement.setAttribute('data-theme', theme);
        });
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }

    const savedReduced = localStorage.getItem('logicbench_reduced_motion') === 'true';
    document.documentElement.setAttribute('data-reduced-motion', String(savedReduced));

    // Seed default knowledge base items if empty
    seedDefaultsIfEmpty();

    // Listen for custom open-tab event from native menu or commands
    const handleOpenTab = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail === 'about' || customEvent.detail === 'settings') {
        openTab('settings');
      } else if (customEvent.detail) {
        openTab(customEvent.detail);
      }
    };
    window.addEventListener('logicbench:open-tab', handleOpenTab);

    // Initialize Electron Desktop integration if running in desktop app
    let cleanupDesktop: (() => void) | undefined;
    if (window.desktop) {
      // OS theme updates
      const unlistenTheme = window.desktop.onThemeChange((theme) => {
        const currentPref = localStorage.getItem('logicbench_theme') || 'dark';
        if (currentPref === 'system') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      });

      // File association / menu bridge
      const unlistenBridge = initDesktopIntegration();

      cleanupDesktop = () => {
        unlistenTheme();
        unlistenBridge?.();
      };
    }

    return () => {
      window.removeEventListener('logicbench:open-tab', handleOpenTab);
      cleanupDesktop?.();
    };
  }, [openTab]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeFeature = activeTab ? featureRegistry.get(activeTab.featureId) : null;
  const ActiveComponent = activeFeature ? activeFeature.component : null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-canvas text-primary">
      {/* 1. Desktop Window Title Bar */}
      <WindowFrame />

      {/* 2. Main Workbench Body (Rail + Sidebar + Viewport) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Rail */}
        <NavigationRail />

        {/* Resizable Category Drawer Pane */}
        <SidebarPane />

        {/* Draggable Pane Splitter */}
        <ResizableSplitter />

        {/* Main Workspace Canvas (No Page-Scroll Feel) */}
        <main 
          role="main"
          className="flex-1 flex flex-col overflow-hidden bg-canvas min-w-0"
        >
          {/* Top Multi-Item Tab Bar */}
          <TabBar />

          {/* Active Viewport Frame with Oscilloscope Graticule */}
          <div 
            id="workbench-viewport"
            className="flex-1 overflow-hidden relative bg-canvas bg-graticule flex flex-col"
          >
            {activeTabId === null ? (
              /* Home Overview & Quick Launch Dashboard */
              <HomeView 
                onOpenFeature={(featId) => openTab(featId)}
                onSelectCategory={(cat) => {
                  setActiveRailCategory(cat);
                  setSidebarCollapsed(false);
                }}
              />
            ) : ActiveComponent && activeTab ? (
              /* Registered Feature View (e.g. Base Converter, Settings) */
              <ActiveComponent tabId={activeTab.id} />
            ) : (
              /* Empty state / Fallback */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-surface border border-subtle flex items-center justify-center text-amber-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-primary">Tab Unavailable</h3>
                  <p className="text-xs text-secondary max-w-sm">
                    The requested instrument feature could not be resolved from the registry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => switchTab(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface-subtle hover:bg-hover border border-subtle text-primary transition-colors"
                >
                  Return to Overview
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 3. Bottom Desktop Status Bar */}
      <StatusBar />

      {/* 4. Global Command Palette & Modals */}
      <CommandPalette />
      <ShortcutsModal />
    </div>
  );
};

export default function App() {
  return (
    <I18nProvider>
      <WorkbenchProvider>
        <WorkbenchContent />
      </WorkbenchProvider>
    </I18nProvider>
  );
}
