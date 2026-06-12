import { contextBridge, ipcRenderer } from 'electron';

// ============================================================================
// PixelPal V11 — Preload Script
// Exposes safe APIs to the renderer process via contextBridge
// ============================================================================

// Type definitions for exposed API
export interface ElectronAPI {
  // Window controls
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  windowIsMaximized: () => Promise<boolean>;
  onWindowMaximized: (callback: (isMaximized: boolean) => void) => () => void;

  // Notifications
  showNotification: (title: string, body: string) => Promise<boolean>;
  onNotificationToggle: (callback: (enabled: boolean) => void) => () => void;

  // App info
  getAppVersion: () => Promise<string>;
  getAppPath: (name: string) => Promise<string>;

  // Dialogs
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;

  // Shell
  openExternal: (url: string) => void;

  // App control
  appQuit: () => void;

  // Platform info
  platform: NodeJS.Platform;
}

// ========================================================================
// API Exposure
// ========================================================================

const electronAPI: ElectronAPI = {
  // Window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  windowIsMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowMaximized: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window-maximized', handler);
    return () => ipcRenderer.removeListener('window-maximized', handler);
  },

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  onNotificationToggle: (callback) => {
    const handler = (_: Electron.IpcRendererEvent, enabled: boolean) => callback(enabled);
    ipcRenderer.on('notification-toggle', handler);
    return () => ipcRenderer.removeListener('notification-toggle', handler);
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: (name) => ipcRenderer.invoke('get-app-path', name),

  // Dialogs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  // Shell
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // App control
  appQuit: () => ipcRenderer.send('app-quit'),

  // Platform info
  platform: process.platform,
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Also expose on window for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
