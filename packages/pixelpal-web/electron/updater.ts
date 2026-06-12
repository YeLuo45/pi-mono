import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import log from 'electron-log';

let mainWindowRef: BrowserWindow | null = null;

// Configure logging
autoUpdater.logger = log;
log.transports.file.level = 'info';

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  progress?: number;
  version?: string;
  error?: string;
}

/**
 * Initialize the auto updater
 */
export function initUpdater(window: BrowserWindow): void {
  mainWindowRef = window;

  // Disable auto download - we want to notify user first
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
    sendStatusToWindow('checking');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info('Update available:', info.version);
    sendStatusToWindow('available', { version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('Update not available');
    sendStatusToWindow('idle');
  });

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    log.info(`Download progress: ${progress.percent.toFixed(1)}%`);
    sendStatusToWindow('downloading', { progress: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info('Update downloaded:', info.version);
    sendStatusToWindow('downloaded', { version: info.version });
  });

  autoUpdater.on('error', (error: Error) => {
    log.error('Update error:', error);
    sendStatusToWindow('error', { error: error.message });
  });

  // Setup IPC handlers
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('Failed to check for updates:', error);
      return null;
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    try {
      return await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('Failed to download update:', error);
      return null;
    }
  });

  ipcMain.handle('updater:installUpdate', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('updater:getStatus', () => {
    return getUpdateStatus();
  });
}

/**
 * Send update status to renderer
 */
function sendStatusToWindow(status: UpdateStatus['status'], data?: Partial<UpdateStatus>): void {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send('updater:status-change', { status, ...data });
  }
}

/**
 * Get current update status
 */
function getUpdateStatus(): UpdateStatus {
  return {
    status: 'idle',
  };
}

/**
 * Cleanup updater
 */
export function destroyUpdater(): void {
  if (mainWindowRef) {
    mainWindowRef = null;
  }
}
