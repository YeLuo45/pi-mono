import { app, BrowserWindow, Tray, globalShortcut, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createTray, restoreWindow, showNotification, setAlwaysOnTopState, destroyTray, setOnlineStatus } from './tray';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { initUpdater, destroyUpdater } from './updater';
import { initFileHandlers, destroyFileHandlers, handleFileAssociation } from './fileHandler';

// Development mode check
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isDev = !app.isPackaged;

// Window instance
let mainWindow: BrowserWindow | null = null;
// Tray instance - kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let tray: Tray | null = null;
// Store window bounds for persistence
let windowBounds: Electron.Rectangle = { x: undefined, y: undefined, width: 1024, height: 720 };
// Always on top state
let isAlwaysOnTop = false;
// Login item settings
const loginItemSettings = { openAtLogin: false };

// Minimize to tray preference
let minimizeToTray = true;

// Paths
const preloadPath = path.join(__dirname, 'preload.js');
const DIST_PATH = path.join(__dirname, '../renderer');
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// ============ Window Management ============

function createWindow(): void {
  // Restore bounds if saved
  const boundsPath = path.join(app.getPath('userData'), 'window-bounds.json');
  if (fs.existsSync(boundsPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(boundsPath, 'utf-8'));
      windowBounds = { ...windowBounds, ...saved };
    } catch (e) {
      console.error('Failed to restore window bounds:', e);
    }
  }

  // Load minimize to tray preference
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      minimizeToTray = settings.minimizeToTray ?? true;
    } catch (e) {
      // Use default
    }
  }

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: process.platform === 'darwin',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../renderer/icon.png'),
  });

  // Restore always on top state
  if (isAlwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Save bounds on resize/move
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Handle close to tray (minimize instead of close)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting && minimizeToTray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load content
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(DIST_PATH, 'index.html'));
  }

  // Create system tray
  tray = createTray(mainWindow);

  // Initialize updater
  initUpdater(mainWindow);

  // Initialize file handlers
  initFileHandlers(mainWindow);

  // Handle file association (opened with file)
  const fileToOpen = handleFileAssociation();
  if (fileToOpen) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('file:opened', fileToOpen);
    });
  }

  // Handle new window request (e.g., from shell.openExternal)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function saveBounds(): void {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  windowBounds = bounds;
  const boundsPath = path.join(app.getPath('userData'), 'window-bounds.json');
  try {
    fs.writeFileSync(boundsPath, JSON.stringify(bounds));
  } catch (e) {
    console.error('Failed to save window bounds:', e);
  }
}

// ============ Global Shortcuts ============

function registerGlobalShortcuts(): void {
  // Ctrl+Shift+P: Show/focus window
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    restoreWindow();
  });
}

// ============ Login Item Settings ============

function updateLoginItemSettings(openAtLogin: boolean): void {
  loginItemSettings.openAtLogin = openAtLogin;
  app.setLoginItemSettings({
    openAtLogin,
    path: app.getPath('exe'),
  });
}

// ============ IPC Handlers ============

function setupIpcHandlers(): void {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.hide());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
  ipcMain.handle('window:setAlwaysOnTop', (_, value: boolean) => {
    isAlwaysOnTop = value;
    mainWindow?.setAlwaysOnTop(value);
    setAlwaysOnTopState(value);
    return value;
  });
  ipcMain.handle('window:getAlwaysOnTop', () => isAlwaysOnTop);

  // Minimize to tray setting
  ipcMain.handle('window:setMinimizeToTray', (_, value: boolean) => {
    minimizeToTray = value;
    saveSettings();
    return value;
  });
  ipcMain.handle('window:getMinimizeToTray', () => minimizeToTray);

  // Tray
  ipcMain.handle('tray:showNotification', (_, title: string, body: string) => {
    showNotification(title, body);
  });
  ipcMain.handle('tray:setOnlineStatus', (_, online: boolean) => {
    setOnlineStatus(online);
  });

  // Login item
  ipcMain.handle('app:getLoginItemSettings', () => loginItemSettings);
  ipcMain.handle('app:setLoginItemSettings', (_, openAtLogin: boolean) => {
    updateLoginItemSettings(openAtLogin);
    return loginItemSettings;
  });

  // App info
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('app:getName', () => app.getName());
  ipcMain.handle('app:getPath', (_, name: 'userData' | 'appData' | 'home' | 'desktop' | 'documents' | 'downloads') => {
    return app.getPath(name);
  });

  // Open external links
  ipcMain.handle('shell:openExternal', (_, url: string) => {
    shell.openExternal(url);
  });

  // Settings persistence
  ipcMain.handle('settings:save', (_, settings: Record<string, unknown>) => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
      const current = fs.existsSync(settingsPath) 
        ? JSON.parse(fs.readFileSync(settingsPath, 'utf-8')) 
        : {};
      fs.writeFileSync(settingsPath, JSON.stringify({ ...current, ...settings }, null, 2));
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  });

  ipcMain.handle('settings:load', () => {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    try {
      if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return {};
  });
}

function saveSettings(): void {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    const settings = {
      minimizeToTray,
      openAtLogin: loginItemSettings.openAtLogin,
    };
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// ============ App Lifecycle ============

// Extend app type to include isQuitting
declare module 'electron' {
  interface App {
    isQuitting?: boolean;
  }
}

app.whenReady().then(() => {
  // Setup IPC handlers first
  setupIpcHandlers();

  // Create window (which also creates tray)
  createWindow();

  // Register global shortcuts
  registerGlobalShortcuts();

  // Load saved login item settings
  const savedLoginSettings = app.getLoginItemSettings();
  if (savedLoginSettings.openAtLogin !== undefined) {
    loginItemSettings.openAtLogin = savedLoginSettings.openAtLogin;
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      restoreWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  destroyTray();
  destroyUpdater();
  destroyFileHandlers();
});

// Handle second instance (single instance lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine) => {
    // Someone tried to run a second instance, focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }

    // Handle file association on second instance
    const fileToOpen = handleFileAssociation();
    if (fileToOpen && mainWindow) {
      mainWindow.webContents.send('file:opened', fileToOpen);
    }
  });
}
