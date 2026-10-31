import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { FeatureCategory } from '../features/types';
import { featureRegistry } from '../features/registry';
import { useI18n } from '../i18n/context';

export interface TabItem {
  id: string;
  featureId: string;
  title: string;
  isDirty?: boolean;
  createdAt: number;
  customData?: any;
}

interface WorkbenchContextValue {
  tabs: TabItem[];
  activeTabId: string | null;
  activeRailCategory: FeatureCategory;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  statusMessage: string;
  
  openTab: (featureId: string, customTitle?: string, customData?: any) => void;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  switchTab: (tabId: string | null) => void;
  cycleTab: (direction: 1 | -1) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setActiveRailCategory: (category: FeatureCategory) => void;
  setSidebarWidth: (width: number) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setStatusMessage: (msg: string) => void;
}

const WorkbenchContext = createContext<WorkbenchContextValue | undefined>(undefined);

const STORAGE_KEY_TABS = 'logicbench_open_tabs';
const STORAGE_KEY_ACTIVE_TAB = 'logicbench_active_tab';
const STORAGE_KEY_SIDEBAR_WIDTH = 'logicbench_sidebar_width';

export const WorkbenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useI18n();

  // Load saved tabs or start with Base Converter open
  const [tabs, setTabs] = useState<TabItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TABS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    // Default initial tab: Base Converter
    return [
      {
        id: 'tab-base-converter-init',
        featureId: 'base-converter',
        title: 'Base Converter & Bit Lab',
        createdAt: Date.now(),
      },
    ];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    try {
      const storedActive = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
      if (storedActive) return storedActive;
    } catch {
      // ignore
    }
    return 'tab-base-converter-init';
  });

  const [activeRailCategory, setActiveRailCategory] = useState<FeatureCategory>('tools');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [sidebarWidth, setSidebarWidthState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SIDEBAR_WIDTH);
      if (stored) {
        const w = parseInt(stored, 10);
        if (!isNaN(w) && w >= 180 && w <= 480) return w;
      }
    } catch {
      // ignore
    }
    return 260;
  });

  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('READY');

  // Sync tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs));
      if (activeTabId) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, activeTabId);
      } else {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_TAB);
      }
    } catch {
      // ignore
    }
  }, [tabs, activeTabId]);

  const setSidebarWidth = (w: number) => {
    const clamped = Math.max(180, Math.min(480, w));
    setSidebarWidthState(clamped);
    try {
      localStorage.setItem(STORAGE_KEY_SIDEBAR_WIDTH, String(clamped));
    } catch {
      // ignore
    }
  };

  const openTab = useCallback(
    (featureId: string, customTitle?: string, customData?: any) => {
      const feature = featureRegistry.get(featureId);
      if (!feature) {
        console.warn(`Feature ${featureId} not found in registry`);
        return;
      }

      // Check if singleton and already open
      if (feature.singleton) {
        const existing = tabs.find((t) => t.featureId === featureId);
        if (existing) {
          setActiveTabId(existing.id);
          return;
        }
      }

      const title = customTitle || featureRegistry.resolveTitle(feature, t);
      const newTab: TabItem = {
        id: `tab-${featureId}-${Date.now()}`,
        featureId,
        title,
        createdAt: Date.now(),
        customData,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [tabs, t]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((t) => t.id === tabId);
        if (index === -1) return prev;

        const nextTabs = prev.filter((t) => t.id !== tabId);

        // If closed active tab, determine next active tab
        if (activeTabId === tabId) {
          if (nextTabs.length === 0) {
            setActiveTabId(null); // Return to Home Overview
          } else if (index < nextTabs.length) {
            setActiveTabId(nextTabs[index].id);
          } else {
            setActiveTabId(nextTabs[nextTabs.length - 1].id);
          }
        }

        return nextTabs;
      });
    },
    [activeTabId]
  );

  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const switchTab = useCallback((tabId: string | null) => {
    setActiveTabId(tabId);
  }, []);

  const cycleTab = useCallback(
    (direction: 1 | -1) => {
      if (tabs.length <= 1) return;
      const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
      if (currentIndex === -1) {
        if (tabs.length > 0) setActiveTabId(tabs[0].id);
        return;
      }
      const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
      setActiveTabId(tabs[nextIndex].id);
    },
    [tabs, activeTabId]
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <WorkbenchContext.Provider
      value={{
        tabs,
        activeTabId,
        activeRailCategory,
        sidebarCollapsed,
        sidebarWidth,
        commandPaletteOpen,
        shortcutsModalOpen,
        statusMessage,
        openTab,
        closeTab,
        closeAllTabs,
        switchTab,
        cycleTab,
        setSidebarCollapsed,
        toggleSidebar,
        setActiveRailCategory,
        setSidebarWidth,
        setCommandPaletteOpen,
        setShortcutsModalOpen,
        setStatusMessage,
      }}
    >
      {children}
    </WorkbenchContext.Provider>
  );
};

export const useWorkbench = (): WorkbenchContextValue => {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error('useWorkbench must be used within a WorkbenchProvider');
  }
  return context;
};
