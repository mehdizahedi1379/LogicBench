import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  MenuItemConstructorOptions,
  nativeTheme,
  screen,
  session,
  shell,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_ORIGIN, registerAppProtocol, registerPrivileges } from './protocol';

// Register custom scheme privileges before app is ready
registerPrivileges();

// Enforce single-instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let initialFilePath: string | null = null;

// Paths
const distPath = path.join(__dirname, '../dist');
const boundsFilePath = path.join(app.getPath('userData'), 'bounds.json');

// Interface for persisted window state
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

/**
 * Reads persisted window bounds from userData/bounds.json
 */
function loadWindowState(): WindowState {
  const defaultState: WindowState = {
    width: 1280,
    height: 820,
    isMaximized: false,
  };

  try {
    if (fs.existsSync(boundsFilePath)) {
      const data = JSON.parse(fs.readFileSync(boundsFilePath, 'utf8'));
      // Verify visible on current displays
      if (data.x !== undefined && data.y !== undefined) {
        const matchingDisplay = screen.getDisplayMatching({
          x: data.x,
          y: data.y,
          width: data.width || 1280,
          height: data.height || 820,
        });
        if (!matchingDisplay) {
          return defaultState;
        }
      }
      return { ...defaultState, ...data };
    }
  } catch (err) {
    console.warn('[Window] Could not load bounds.json, using defaults:', err);
  }

  return defaultState;
}

/**
 * Saves window bounds to userData/bounds.json
 */
function saveWindowState(): void {
  if (!mainWindow) return;
  try {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    };
    fs.writeFileSync(boundsFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[Window] Could not save bounds.json:', err);
  }
}

/**
 * Checks command line arguments for any .logicbench association file
 */
function extractAssociatedFile(argv: string[]): string | null {
  for (const arg of argv) {
    if (arg && typeof arg === 'string' && arg.toLowerCase().endsWith('.logicbench')) {
      try {
        const resolved = path.resolve(arg);
        if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
          return resolved;
        }
      } catch {
        // Continue checking
      }
    }
  }
  return null;
}

// Check initial argv for file association on startup
initialFilePath = extractAssociatedFile(process.argv);

/**
 * Safe external URL opener: strictly validates https: and mailto: protocols
 */
function safeOpenExternal(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      shell.openExternal(rawUrl);
      return true;
    }
    console.warn(`[Security] Denied openExternal for non-whitelisted protocol: ${parsed.protocol}`);
  } catch (err) {
    console.error('[Security] Failed to parse external URL:', rawUrl, err);
  }
  return false;
}

/**
 * Configures the native desktop application menu
 */
function setupApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const fileSubmenu: MenuItemConstructorOptions[] = [
    {
      label: '&Open Project / Backup...',
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        mainWindow?.webContents.send('desktop:menu-action', 'open');
      },
    },
    {
      label: '&Save Project / Backup...',
      accelerator: 'CmdOrCtrl+S',
      click: () => {
        mainWindow?.webContents.send('desktop:menu-action', 'save');
      },
    },
    { type: 'separator' },
    isMac ? { role: 'close' } : { role: 'quit', label: 'E&xit' },
  ];

  const editSubmenu: MenuItemConstructorOptions[] = [
    { role: 'undo' },
    { role: 'redo' },
    { type: 'separator' },
    { role: 'cut' },
    { role: 'copy' },
    { role: 'paste' },
    { role: 'selectAll' },
  ];

  const viewSubmenu: MenuItemConstructorOptions[] = [
    { role: 'reload', accelerator: 'CmdOrCtrl+R' },
    { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
    ...(isDev ? [{ role: 'toggleDevTools' as const, accelerator: 'CmdOrCtrl+Shift+I' }] : []),
    { type: 'separator' },
    { role: 'resetZoom' },
    { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
    { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
    { type: 'separator' },
    { role: 'togglefullscreen' },
  ];

  const windowSubmenu: MenuItemConstructorOptions[] = [
    { role: 'minimize' },
    { role: 'zoom' },
    ...(isMac
      ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const },
        ]
      : [{ role: 'close' as const }]),
  ];

  const helpSubmenu: MenuItemConstructorOptions[] = [
    {
      label: 'About &LogicBench',
      click: () => {
        mainWindow?.webContents.send('desktop:menu-action', 'about');
      },
    },
    { type: 'separator' },
    {
      label: 'Documentation & Guides',
      click: () => {
        safeOpenExternal('https://github.com');
      },
    },
  ];

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const },
            ],
          },
        ]
      : []),
    { label: '&File', submenu: fileSubmenu },
    { label: '&Edit', submenu: editSubmenu },
    { label: '&View', submenu: viewSubmenu },
    { label: '&Window', submenu: windowSubmenu },
    { label: '&Help', submenu: helpSubmenu },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Sets up strict Content-Security-Policy and response headers via session
 */
function setupSecurityHeaders(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self' app://logicbench;",
            "script-src 'self' 'unsafe-inline' app://logicbench;",
            "style-src 'self' 'unsafe-inline' app://logicbench https://fonts.googleapis.com;",
            "font-src 'self' app://logicbench https://fonts.gstatic.com data:;",
            "img-src 'self' app://logicbench data: blob: https:;",
            "connect-src 'self' app://logicbench https:;",
            "base-uri 'none';",
            "form-action 'self';",
          ].join(' '),
        ],
      },
    });
  });
}

/**
 * Web Serial API handlers: enumerate and grant permissions for COM ports on Windows
 */
function setupWebSerialHandlers(): void {
  // Web Serial port selection
  session.defaultSession.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      // Auto-grant the first matched serial COM port
      callback(portList[0].portId);
    } else {
      callback('');
    }
  });

  // Device permission handler for serial
  session.defaultSession.setDevicePermissionHandler((details) => {
    return details.deviceType === 'serial';
  });

  // Permission check handler
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    if (permission === 'serial') {
      return true;
    }
    return false;
  });
}

/**
 * Creates the primary application window
 */
function createMainWindow(): void {
  const windowState = loadWindowState();

  mainWindow = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0e14', // Matches CRT logic-analyzer dark theme
    show: false, // Show once ready-to-show to prevent white flash
    title: 'LogicBench',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
      spellcheck: false,
    },
  });

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Gracefully show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Track state for persistence
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Navigation Guard: Block leaving app origin
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      const isAllowedOrigin =
        parsedUrl.origin === APP_ORIGIN ||
        (isDev && parsedUrl.origin === 'http://localhost:3000');

      if (!isAllowedOrigin) {
        event.preventDefault();
        safeOpenExternal(navigationUrl);
      }
    } catch {
      event.preventDefault();
    }
  });

  // External link window.open interception
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    safeOpenExternal(url);
    return { action: 'deny' };
  });

  // Load URL: in dev, can load localhost:3000 or app://logicbench; in prod, app://logicbench/
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev && !fs.existsSync(path.join(distPath, 'index.html'))) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL(`${APP_ORIGIN}/`);
  }
}

/**
 * Register IPC handlers with strict validation allowlist
 */
function setupIpcHandlers(): void {
  // Show open dialog
  ipcMain.handle('desktop:show-open-dialog', async (_event, options) => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options?.title || 'Open File',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'LogicBench Files', extensions: ['logicbench', 'json'] },
        { name: 'Hardware Code', extensions: ['v', 'c', 'h'] },
        { name: 'CSV Tables', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: options?.properties || ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths;
  });

  // Show save dialog
  ipcMain.handle('desktop:show-save-dialog', async (_event, options) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options?.title || 'Save File',
      defaultPath: options?.defaultPath,
      filters: options?.filters || [
        { name: 'LogicBench Project Backup', extensions: ['logicbench'] },
        { name: 'JSON Backup', extensions: ['json'] },
        { name: 'C Header Pinmap', extensions: ['h'] },
        { name: 'CSV File', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }
    return result.filePath;
  });

  // Read file from disk
  ipcMain.handle('desktop:read-file', async (_event, filePath) => {
    if (typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }
    const resolved = path.resolve(filePath);
    return fs.promises.readFile(resolved, 'utf8');
  });

  // Save file to disk
  ipcMain.handle('desktop:save-file', async (_event, { filePath, content }) => {
    if (typeof filePath !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid arguments for save-file');
    }
    const resolved = path.resolve(filePath);
    await fs.promises.writeFile(resolved, content, 'utf8');
    return true;
  });

  // Get initial file passed at process startup
  ipcMain.handle('desktop:get-initial-file', async () => {
    if (initialFilePath && fs.existsSync(initialFilePath)) {
      try {
        const content = await fs.promises.readFile(initialFilePath, 'utf8');
        const ret = { path: initialFilePath, content };
        initialFilePath = null; // Consume once
        return ret;
      } catch (err) {
        console.error('Failed to read initial file:', err);
      }
    }
    return null;
  });

  // Native theme detection
  ipcMain.handle('desktop:get-native-theme', () => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  // Open external link
  ipcMain.handle('desktop:open-external', (_event, url) => {
    if (typeof url !== 'string') return false;
    return safeOpenExternal(url);
  });
}

// Second-instance handler: focus window and forward opened file
app.on('second-instance', async (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();

    const associated = extractAssociatedFile(commandLine);
    if (associated) {
      try {
        const content = await fs.promises.readFile(associated, 'utf8');
        mainWindow.webContents.send('desktop:on-open-file', {
          path: associated,
          content,
        });
      } catch (err) {
        console.error('Failed to read associated file from second-instance:', err);
      }
    }
  }
});

// App Lifecycle
app.whenReady().then(() => {
  // 1. Register privileged protocol handler for app://logicbench
  registerAppProtocol(distPath);

  // 2. Configure session security headers and CSP
  setupSecurityHeaders();

  // 3. Web Serial handlers
  setupWebSerialHandlers();

  // 4. Native Application Menu
  setupApplicationMenu();

  // 5. IPC Handlers
  setupIpcHandlers();

  // 6. Native Theme sync listener
  nativeTheme.on('updated', () => {
    const currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    mainWindow?.webContents.send('desktop:theme-changed', currentTheme);
  });

  // 7. Create BrowserWindow
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
