import { Tray, Menu, nativeImage, Notification, app, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tray instance
let tray: Tray | null = null;

// State
let isAlwaysOnTop = false;
let isOnline = true;
let mainWindowRef: Electron.BrowserWindow | null = null;

// Status icons for online/offline
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ICON_PATHS = {
  online: 'icon.png',
  offline: 'icon.png', // Could use different icon for offline
};

/**
 * Create system tray with enhanced right-click menu
 */
export function createTray(window: Electron.BrowserWindow): Tray {
  mainWindowRef = window;

  // Create tray icon
  const iconPath = path.join(__dirname, '../renderer/icon.png');
  let trayIcon: nativeImage;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } else {
    // Fallback: create empty icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('PixelPal');

  // Set initial context menu
  updateContextMenu();

  // Double-click to restore window
  tray.on('double-click', restoreWindow);

  // Single click also restores on Windows
  tray.on('click', () => {
    if (process.platform === 'win32') {
      restoreWindow();
    }
  });

  return tray;
}

/**
 * Update context menu with all menu items
 */
function updateContextMenu(): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    // Header
    {
      label: 'PixelPal',
      enabled: false,
    },
    { type: 'separator' },
    // Main actions
    {
      label: 'Open PixelPal',
      click: () => restoreWindow(),
    },
    {
      label: 'Settings',
      click: () => {
        restoreWindow();
        mainWindowRef?.webContents.send('navigate', '/settings');
      },
    },
    {
      label: 'Help',
      click: () => {
        restoreWindow();
        shell.openExternal('https://github.com/YeLuo45/pixel-pal-web#readme');
      },
    },
    {
      label: 'About',
      click: () => {
        restoreWindow();
        mainWindowRef?.webContents.send('navigate', '/settings');
      },
    },
    { type: 'separator' },
    // Status indicator
    {
      label: isOnline ? '🟢 Online' : '🔴 Offline',
      enabled: false,
    },
    { type: 'separator' },
    // Options
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: isAlwaysOnTop,
      click: (menuItem) => {
        isAlwaysOnTop = menuItem.checked;
        mainWindowRef?.setAlwaysOnTop(isAlwaysOnTop);
        mainWindowRef?.webContents.send('always-on-top-changed', isAlwaysOnTop);
      },
    },
    { type: 'separator' },
    // Quit
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Restore and focus the main window
 */
export function restoreWindow(): void {
  if (mainWindowRef) {
    if (mainWindowRef.isMinimized()) mainWindowRef.restore();
    mainWindowRef.show();
    mainWindowRef.focus();
  }
}

/**
 * Show a native notification with optional tray balloon (Windows)
 */
export function showNotification(title: string, body: string): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: path.join(__dirname, '../renderer/icon.png'),
      silent: false,
    });

    notification.on('click', () => {
      restoreWindow();
    });

    notification.show();

    // On Windows, show tray balloon if window is hidden
    if (process.platform === 'win32' && mainWindowRef && !mainWindowRef.isVisible()) {
      // Tray balloon is shown via the notification
    }
  }
}

/**
 * Update tray icon based on online status
 */
export function setOnlineStatus(online: boolean): void {
  isOnline = online;
  if (tray) {
    const tooltip = online ? 'PixelPal - Online' : 'PixelPal - Offline';
    tray.setToolTip(tooltip);
    updateContextMenu();
  }
}

/**
 * Update tray icon
 */
export function setTrayIcon(iconPath: string): void {
  if (tray && fs.existsSync(iconPath)) {
    const newIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray.setImage(newIcon);
  }
}

/**
 * Update always-on-top checkbox state
 */
export function setAlwaysOnTopState(value: boolean): void {
  isAlwaysOnTop = value;
  updateContextMenu();
}

/**
 * Destroy tray
 */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
