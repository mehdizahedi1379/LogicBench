import { useEffect } from 'react';
import { useWorkbench } from '../store/workbenchStore';

export function useGlobalShortcuts() {
  const {
    cycleTab,
    closeTab,
    activeTabId,
    openTab,
    toggleSidebar,
    commandPaletteOpen,
    setCommandPaletteOpen,
    shortcutsModalOpen,
    setShortcutsModalOpen,
    setStatusMessage,
  } = useWorkbench();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Escape key closes modals
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          e.preventDefault();
          setCommandPaletteOpen(false);
          return;
        }
        if (shortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }
      }

      // Ctrl + K: Toggle Command Palette
      if (isCtrlOrCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
        return;
      }

      // Ctrl + /: Toggle Shortcuts Reference
      if (isCtrlOrCmd && e.key === '/') {
        e.preventDefault();
        setShortcutsModalOpen(!shortcutsModalOpen);
        return;
      }

      // Ctrl + B: Toggle Left Navigation Sidebar
      if (isCtrlOrCmd && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Ctrl + W: Close Active Tab
      if (isCtrlOrCmd && e.key.toLowerCase() === 'w') {
        if (activeTabId) {
          e.preventDefault();
          closeTab(activeTabId);
          return;
        }
      }

      // Ctrl + N: Quick New Document / Tool
      if (isCtrlOrCmd && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openTab('base-converter');
        setStatusMessage('OPENED: BASE CONVERTER');
        setTimeout(() => setStatusMessage('READY'), 2000);
        return;
      }

      // Ctrl + S: Save / Persist
      if (isCtrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setStatusMessage('PERSISTED TO LOCAL STORAGE');
        setTimeout(() => setStatusMessage('READY'), 2000);
        return;
      }

      // Ctrl + Tab / Ctrl + Shift + Tab: Cycle Tabs
      if (isCtrlOrCmd && e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          cycleTab(-1);
        } else {
          cycleTab(1);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    commandPaletteOpen,
    shortcutsModalOpen,
    activeTabId,
    cycleTab,
    closeTab,
    openTab,
    toggleSidebar,
    setCommandPaletteOpen,
    setShortcutsModalOpen,
    setStatusMessage,
  ]);
}
