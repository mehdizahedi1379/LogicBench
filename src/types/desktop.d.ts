/**
 * Type declarations for Electron desktop integration (window.desktop).
 * In web builds, window.desktop is undefined and all callers fall back gracefully.
 */

export interface DesktopFileFilter {
  name: string;
  extensions: string[];
}

export interface DesktopOpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: DesktopFileFilter[];
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface DesktopSaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: DesktopFileFilter[];
}

export interface DesktopAPI {
  /** True when running inside Electron */
  isElectron: boolean;
  /** Operating system platform ('win32', 'darwin', 'linux') */
  platform: string;

  /** Native file dialogs */
  showOpenDialog(options?: DesktopOpenDialogOptions): Promise<string[] | null>;
  showSaveDialog(options?: DesktopSaveDialogOptions): Promise<string | null>;
  readFile(filePath: string): Promise<string>;
  saveFile(filePath: string, content: string): Promise<boolean>;

  /** File association / CLI startup argument file (.logicbench) */
  getInitialFile(): Promise<{ path: string; content: string } | null>;
  onOpenFile(callback: (data: { path: string; content: string }) => void): () => void;

  /** OS Theme sync with nativeTheme */
  getNativeTheme(): Promise<'dark' | 'light'>;
  onThemeChange(callback: (theme: 'dark' | 'light') => void): () => void;

  /** Safe external URL opening (validated https: and mailto:) */
  openExternal(url: string): Promise<boolean>;

  /** Native menu action triggers from Main process */
  onMenuAction(callback: (action: 'open' | 'save' | 'about') => void): () => void;
}

declare global {
  interface Window {
    desktop?: DesktopAPI;
  }
}
