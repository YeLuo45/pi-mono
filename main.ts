import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  ipcMain,
  shell,
  dialog,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// PixelPal V11 — Electron Main Process
// ============================================================================

// Disable GPU acceleration in problematic environments
app.disableHardwareAcceleration();

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// ========================================================================
// Global References
// ========================================================================

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// ========================================================================
// Window State
// ========================================================================

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false,
};

// ========================================================================
// Environment Detection
// ========================================================================

function isDev(): boolean {
  return !app.isPackaged;
}

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js');
}

function getRendererUrl(): string {
  if (isDev()) {
    return 'http://127.0.0.1:5173';
  }
  return `file://${path.join(__dirname, '../renderer/index.html')}`;
}

// ========================================================================
// Window Creation
// ========================================================================

async function createWindow(): Promise<void> {
  const windowState = DEFAULT_WINDOW_STATE;

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true,
    icon: path.join(__dirname, '../renderer/icon.png'),
    webPreferences: {
      preload: getPreloadPath(),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Maximize if previously maximized
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    if (isDev()) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Handle close to tray
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      showTrayNotification('PixelPal', 'App minimized to system tray');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  const url = getRendererUrl();
  if (isDev()) {
    await mainWindow.loadURL(url);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

// ========================================================================
// System Tray
// ========================================================================

function getTrayIconPath(): string {
  // Use PNG icon for tray (ICO may not work on all platforms)
  if (isDev()) {
    return path.join(__dirname, '../../public/icon.png');
  }
  return path.join(__dirname, '../renderer/icon.png');
}

function createTray(): void {
  try {
    const iconPath = getTrayIconPath();
    let icon: Electron.NativeImage;

    try {
      icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        // Create a simple colored icon as fallback
        icon = nativeImage.createEmpty();
      }
    } catch {
      icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('PixelPal — AI Companion');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show PixelPal',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: 'Notifications',
        submenu: [
          {
            label: 'Enable Notifications',
            type: 'checkbox',
            checked: true,
            click: (menuItem) => {
              mainWindow?.webContents.send('notification-toggle', menuItem.checked);
            },
          },
        ],
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    // Double-click to show window
    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  } catch (error) {
    console.error('[Tray] Failed to create tray:', error);
  }
}

// ========================================================================
// Native Notifications
// ========================================================================

function showTrayNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: getTrayIconPath(),
    });
    notification.show();
  }
}

// ========================================================================
// IPC Handlers
// ========================================================================

function setupIpcHandlers(): void {
  // Window controls
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  // Notifications
  ipcMain.handle('show-notification', async (_, { title, body }) => {
    showTrayNotification(title, body);
    return true;
  });

  // App info
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('get-app-path', (_, name: string) => {
    return app.getPath(name as any);
  });

  // Dialog
  ipcMain.handle('show-open-dialog', async (_, options) => {
    if (!mainWindow) return { canceled: true, filePaths: [] };
    return dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle('show-save-dialog', async (_, options) => {
    if (!mainWindow) return { canceled: true, filePath: undefined };
    return dialog.showSaveDialog(mainWindow, options);
  });

  // Shell
  ipcMain.on('open-external', (_, url: string) => {
    shell.openExternal(url);
  });

  // App quit
  ipcMain.on('app-quit', () => {
    isQuitting = true;
    app.quit();
  });
}

// ========================================================================
// App Lifecycle
// ========================================================================

app.on('second-instance', () => {
  // Someone tried to run a second instance, focus our window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow?.show();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// ========================================================================
// Startup
// ========================================================================

app.whenReady().then(async () => {
  console.log('[PixelPal] Starting Electron main process...');
  console.log(`[PixelPal] Mode: ${isDev() ? 'development' : 'production'}`);

  setupIpcHandlers();
  await createWindow();
  createTray();

  console.log('[PixelPal] Electron main process initialized');
});
