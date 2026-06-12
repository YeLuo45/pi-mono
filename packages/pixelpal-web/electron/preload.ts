import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setAlwaysOnTop: (value: boolean) => ipcRenderer.invoke('window:setAlwaysOnTop', value),
  getAlwaysOnTop: () => ipcRenderer.invoke('window:getAlwaysOnTop'),

  // Minimize to tray
  setMinimizeToTray: (value: boolean) => ipcRenderer.invoke('window:setMinimizeToTray', value),
  getMinimizeToTray: () => ipcRenderer.invoke('window:getMinimizeToTray'),

  // Tray notifications
  showNotification: (title: string, body: string) => ipcRenderer.invoke('tray:showNotification', title, body),
  setOnlineStatus: (online: boolean) => ipcRenderer.invoke('tray:setOnlineStatus', online),

  // Login item (auto-start)
  getLoginItemSettings: () => ipcRenderer.invoke('app:getLoginItemSettings'),
  setLoginItemSettings: (openAtLogin: boolean) => ipcRenderer.invoke('app:setLoginItemSettings', openAtLogin),

  // App info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getName: () => ipcRenderer.invoke('app:getName'),
  getPath: (name: 'userData' | 'appData' | 'home' | 'desktop' | 'documents' | 'downloads') =>
    ipcRenderer.invoke('app:getPath', name),

  // External links
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Settings persistence
  saveSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:save', settings),
  loadSettings: () => ipcRenderer.invoke('settings:load'),

  // File handling
  importFiles: () => ipcRenderer.invoke('file:importDialog'),
  handleFileDrop: (filePaths: string[]) => ipcRenderer.invoke('file:handleDrop', filePaths),
  exportChatHistory: (data: { content: string; filename?: string }) =>
    ipcRenderer.invoke('file:exportChatHistory', data),
  openDataDirectory: () => ipcRenderer.invoke('file:openDataDirectory'),
  getDataDirectory: () => ipcRenderer.invoke('file:getDataDirectory'),
  openFile: (filePath: string) => ipcRenderer.invoke('file:openFile', filePath),

  // Auto updater
  checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
  getUpdateStatus: () => ipcRenderer.invoke('updater:getStatus'),

  // Event listeners
  onAlwaysOnTopChanged: (callback: (value: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: boolean) => callback(value);
    ipcRenderer.on('always-on-top-changed', handler);
    return () => ipcRenderer.removeListener('always-on-top-changed', handler);
  },
  onUpdateStatusChanged: (callback: (status: { status: string; progress?: number; version?: string; error?: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: { status: string; progress?: number; version?: string; error?: string }) => callback(status);
    ipcRenderer.on('updater:status-change', handler);
    return () => ipcRenderer.removeListener('updater:status-change', handler);
  },
  onNavigate: (callback: (path: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string) => callback(path);
    ipcRenderer.on('navigate', handler);
    return () => ipcRenderer.removeListener('navigate', handler);
  },
  onFileOpened: (callback: (filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath);
    ipcRenderer.on('file:opened', handler);
    return () => ipcRenderer.removeListener('file:opened', handler);
  },
});

// Type declaration for the exposed API
declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      setAlwaysOnTop: (value: boolean) => Promise<boolean>;
      getAlwaysOnTop: () => Promise<boolean>;
      setMinimizeToTray: (value: boolean) => Promise<boolean>;
      getMinimizeToTray: () => Promise<boolean>;
      showNotification: (title: string, body: string) => Promise<void>;
      setOnlineStatus: (online: boolean) => Promise<void>;
      getLoginItemSettings: () => Promise<{ openAtLogin: boolean }>;
      setLoginItemSettings: (openAtLogin: boolean) => Promise<{ openAtLogin: boolean }>;
      getVersion: () => Promise<string>;
      getName: () => Promise<string>;
      getPath: (name: 'userData' | 'appData' | 'home' | 'desktop' | 'documents' | 'downloads') => Promise<string>;
      openExternal: (url: string) => Promise<void>;
      saveSettings: (settings: Record<string, unknown>) => Promise<boolean>;
      loadSettings: () => Promise<Record<string, unknown>>;
      importFiles: () => Promise<{ path: string; name: string; content?: string }[]>;
      handleFileDrop: (filePaths: string[]) => Promise<{ path: string; name: string; content?: string }[]>;
      exportChatHistory: (data: { content: string; filename?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
      openDataDirectory: () => Promise<string>;
      getDataDirectory: () => Promise<string>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      checkForUpdates: () => Promise<unknown>;
      downloadUpdate: () => Promise<unknown>;
      installUpdate: () => Promise<void>;
      getUpdateStatus: () => Promise<{ status: string }>;
      onAlwaysOnTopChanged: (callback: (value: boolean) => void) => () => void;
      onUpdateStatusChanged: (callback: (status: { status: string; progress?: number; version?: string; error?: string }) => void) => () => void;
      onNavigate: (callback: (path: string) => void) => () => void;
      onFileOpened: (callback: (filePath: string) => void) => () => void;
    };
  }
}
