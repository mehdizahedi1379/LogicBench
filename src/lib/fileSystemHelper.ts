/**
 * File System Access API helper with Electron desktop integration and browser download fallback.
 * Supports full JSON backup/restore (.logicbench), Markdown notes, CSV BOM/chips, and C header pin maps.
 */

import { db, DBNote, DBChip, DBSnippet, DBProject } from './db';

export interface LogicBenchBackup {
  version: number;
  timestamp: number;
  notes: DBNote[];
  chips: DBChip[];
  snippets: DBSnippet[];
  projects: DBProject[];
}

/**
 * Creates a full JSON backup of all IndexedDB stores (.logicbench / .json)
 */
export async function exportFullJsonBackup(): Promise<void> {
  try {
    const [notes, chips, snippets, projects] = await Promise.all([
      db.getAll('notes'),
      db.getAll('chips'),
      db.getAll('snippets'),
      db.getAll('projects'),
    ]);

    const backup: LogicBenchBackup = {
      version: 2,
      timestamp: Date.now(),
      notes,
      chips,
      snippets,
      projects,
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const dateStr = new Date().toISOString().slice(0, 10);
    const suggestedFileName = `logicbench_backup_${dateStr}.logicbench`;

    // 1. Desktop integration path: use native Electron save dialog
    if (window.desktop) {
      const chosenPath = await window.desktop.showSaveDialog({
        title: 'Save LogicBench Project Backup',
        defaultPath: suggestedFileName,
        filters: [
          { name: 'LogicBench Project', extensions: ['logicbench'] },
          { name: 'JSON Backup', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });
      if (chosenPath) {
        await window.desktop.saveFile(chosenPath, jsonStr);
      }
      return;
    }

    // 2. Web File System Access API (Chromium / Edge / Opera)
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedFileName,
          types: [{
            description: 'LogicBench Project Backup',
            accept: {
              'application/json': ['.json', '.logicbench'],
            },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
        console.warn('File System Access API save cancelled or failed, falling back:', err);
      }
    }

    // 3. Fallback to standard browser download
    downloadBlob(blob, suggestedFileName);
  } catch (err) {
    console.error('Failed to export backup:', err);
    throw err;
  }
}

/**
 * Prompts user to open and restore a .logicbench / .json backup file
 */
export async function promptOpenProjectBackup(): Promise<void> {
  // Desktop native open dialog
  if (window.desktop) {
    const paths = await window.desktop.showOpenDialog({
      title: 'Open LogicBench Project Backup',
      filters: [
        { name: 'LogicBench Project Files', extensions: ['logicbench', 'json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (paths && paths[0]) {
      const content = await window.desktop.readFile(paths[0]);
      await restoreJsonBackup(content);
    }
    return;
  }

  // Web fallback using file input picker
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.logicbench,.json';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (file) {
      const text = await file.text();
      await restoreJsonBackup(text);
    }
  };
  input.click();
}

/**
 * Restores IndexedDB from a full JSON backup object
 */
export async function restoreJsonBackup(jsonText: string): Promise<void> {
  try {
    const backup: LogicBenchBackup = JSON.parse(jsonText);
    if (!backup.notes || !backup.chips || !backup.snippets) {
      throw new Error('Invalid backup schema format');
    }

    // Clear existing stores and repopulate
    await db.clear('notes');
    await db.clear('chips');
    await db.clear('snippets');
    await db.clear('projects');

    for (const note of backup.notes) await db.put('notes', note);
    for (const chip of backup.chips) await db.put('chips', chip);
    for (const snip of backup.snippets) await db.put('snippets', snip);
    if (backup.projects) {
      for (const proj of backup.projects) await db.put('projects', proj);
    }

    window.dispatchEvent(new CustomEvent('logicbench:note-saved'));
  } catch (err) {
    console.error('Failed to restore backup:', err);
    throw err;
  }
}

/**
 * Exports C header (.h) file for a project's pin map
 */
export async function exportPinMapCHeader(projectName: string, pinMap: Record<string, string>): Promise<void> {
  const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  let headerContent = `/**
 * @file ${safeName}_PINMAP.h
 * @brief Auto-generated pin assignments from LogicBench
 * @date ${new Date().toISOString()}
 */

#ifndef ${safeName}_PINMAP_H
#define ${safeName}_PINMAP_H

#include <stdint.h>

/* Pin Definitions */\n`;

  for (const [pin, signal] of Object.entries(pinMap)) {
    const safeSig = signal.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    headerContent += `#define PIN_${safeSig}  "${pin}"\n`;
  }

  headerContent += `\n#endif /* ${safeName}_PINMAP_H */\n`;

  // Desktop native save
  if (window.desktop) {
    const chosenPath = await window.desktop.showSaveDialog({
      title: 'Export C Pinmap Header',
      defaultPath: `${safeName.toLowerCase()}_pinmap.h`,
      filters: [
        { name: 'C Header (*.h)', extensions: ['h'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    if (chosenPath) {
      await window.desktop.saveFile(chosenPath, headerContent);
    }
    return;
  }

  const blob = new Blob([headerContent], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${safeName.toLowerCase()}_pinmap.h`);
}

/**
 * Helper to trigger browser file download fallback
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Initializes desktop listeners if running inside Electron
 */
export function initDesktopIntegration(): (() => void) | undefined {
  if (!window.desktop) return undefined;

  // 1. Check for initial file passed via CLI / file association
  window.desktop.getInitialFile().then((fileData) => {
    if (fileData?.content) {
      restoreJsonBackup(fileData.content).catch((err) => {
        console.error('Failed to load initial file:', err);
      });
    }
  });

  // 2. Listen for second-instance / association open events
  const unlistenOpen = window.desktop.onOpenFile(({ content }) => {
    if (content) {
      restoreJsonBackup(content).catch((err) => {
        console.error('Failed to restore file from open event:', err);
      });
    }
  });

  // 3. Listen for application menu actions
  const unlistenMenu = window.desktop.onMenuAction((action) => {
    if (action === 'open') {
      promptOpenProjectBackup();
    } else if (action === 'save') {
      exportFullJsonBackup();
    } else if (action === 'about') {
      window.dispatchEvent(new CustomEvent('logicbench:open-tab', { detail: 'about' }));
    }
  });

  return () => {
    unlistenOpen();
    unlistenMenu();
  };
}
