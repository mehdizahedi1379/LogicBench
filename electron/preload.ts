import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Explicit allowed IPC channels for defense-in-depth
const ALLOWED_INVOKE_CHANNELS = new Set([
  'desktop:show-open-dialog',
  'desktop:show-save-dialog',
  'desktop:read-file',
  'desktop:save-file',
  'desktop:get-initial-file',
  'desktop:get-native-theme',
  'desktop:open-external',
]);

const ALLOWED_RECEIVE_CHANNELS = new Set([
  'desktop:on-open-file',
  'desktop:theme-changed',
  'desktop:menu-action',
]);

const desktopAPI = {
  isElectron: true,
  platform: process.platform,

  async showOpenDialog(options?: any): Promise<string[] | null> {
    return ipcRenderer.invoke('desktop:show-open-dialog', options);
  },

  async showSaveDialog(options?: any): Promise<string | null> {
    return ipcRenderer.invoke('desktop:show-save-dialog', options);
  },

  async readFile(filePath: string): Promise<string> {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('Invalid file path provided to readFile');
    }
    return ipcRenderer.invoke('desktop:read-file', filePath);
  },

  async saveFile(filePath: string, content: string): Promise<boolean> {
    if (typeof filePath !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid arguments provided to saveFile');
    }
    return ipcRenderer.invoke('desktop:save-file', { filePath, content });
  },

  async getInitialFile(): Promise<{ path: string; content: string } | null> {
    return ipcRenderer.invoke('desktop:get-initial-file');
  },

  onOpenFile(callback: (data: { path: string; content: string }) => void): () => void {
    const handler = (_event: IpcRendererEvent, data: { path: string; content: string }) => {
      callback(data);
    };
    ipcRenderer.on('desktop:on-open-file', handler);
    return () => {
      ipcRenderer.removeListener('desktop:on-open-file', handler);
    };
  },

  async getNativeTheme(): Promise<'dark' | 'light'> {
    return ipcRenderer.invoke('desktop:get-native-theme');
  },

  onThemeChange(callback: (theme: 'dark' | 'light') => void): () => void {
    const handler = (_event: IpcRendererEvent, theme: 'dark' | 'light') => {
      callback(theme);
    };
    ipcRenderer.on('desktop:theme-changed', handler);
    return () => {
      ipcRenderer.removeListener('desktop:theme-changed', handler);
    };
  },

  async openExternal(url: string): Promise<boolean> {
    if (typeof url !== 'string') return false;
    return ipcRenderer.invoke('desktop:open-external', url);
  },

  onMenuAction(callback: (action: 'open' | 'save' | 'about') => void): () => void {
    const handler = (_event: IpcRendererEvent, action: 'open' | 'save' | 'about') => {
      callback(action);
    };
    ipcRenderer.on('desktop:menu-action', handler);
    return () => {
      ipcRenderer.removeListener('desktop:menu-action', handler);
    };
  },
};

// Safely bridge into the main world
try {
  contextBridge.exposeInMainWorld('desktop', desktopAPI);
} catch (err) {
  console.error('[Preload] Failed to expose desktop bridge:', err);
}
