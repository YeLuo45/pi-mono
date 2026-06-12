import { ipcMain, BrowserWindow, dialog, app, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let mainWindowRef: BrowserWindow | null = null;

// Supported file extensions for knowledge base import
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.pdf', '.doc', '.docx'];

/**
 * Initialize file handlers
 */
export function initFileHandlers(window: BrowserWindow): void {
  mainWindowRef = window;

  // Handle file drop
  ipcMain.handle('file:handleDrop', async (_, filePaths: string[]) => {
    const validFiles: { path: string; name: string; content?: string }[] = [];
    
    for (const filePath of filePaths) {
      const ext = path.extname(filePath).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          validFiles.push({
            path: filePath,
            name: path.basename(filePath),
            content,
          });
        } catch (error) {
          console.error(`Failed to read file ${filePath}:`, error);
        }
      }
    }
    
    return validFiles;
  });

  // Handle file import dialog
  ipcMain.handle('file:importDialog', async () => {
    const result = await dialog.showOpenDialog(mainWindowRef!, {
      title: 'Import Knowledge Base Documents',
      filters: [
        { name: 'Documents', extensions: ['txt', 'md', 'pdf', 'doc', 'docx'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    
    const files: { path: string; name: string; content?: string }[] = [];
    
    for (const filePath of result.filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        files.push({
          path: filePath,
          name: path.basename(filePath),
          content,
        });
      } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
      }
    }
    
    return files;
  });

  // Handle export chat history
  ipcMain.handle('file:exportChatHistory', async (_, data: { content: string; filename?: string }) => {
    const result = await dialog.showSaveDialog(mainWindowRef!, {
      title: 'Export Chat History',
      defaultPath: data.filename || `pixelpal-chat-${Date.now()}.txt`,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'Markdown', extensions: ['md'] },
        { name: 'JSON', extensions: ['json'] },
      ],
    });
    
    if (result.canceled || !result.filePath) {
      return { success: false };
    }
    
    try {
      fs.writeFileSync(result.filePath, data.content, 'utf-8');
      return { success: true, path: result.filePath };
    } catch (error) {
      console.error('Failed to export chat history:', error);
      return { success: false, error: String(error) };
    }
  });

  // Open data directory in file explorer
  ipcMain.handle('file:openDataDirectory', async () => {
    const userDataPath = app.getPath('userData');
    shell.openPath(userDataPath);
    return userDataPath;
  });

  // Get data directory path
  ipcMain.handle('file:getDataDirectory', async () => {
    return app.getPath('userData');
  });

  // Open file in system default app
  ipcMain.handle('file:openFile', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Check if running as packaged app and handle file associations
  ipcMain.on('file:setDropZoneEnabled', (_event, _enabled: boolean) => {
    // Could be used to enable/disable drag-drop overlay in renderer
  });
}

/**
 * Handle file opened via file association (Windows registry, etc.)
 */
export function handleFileAssociation(): string | null {
  // Check command line args for file paths (Windows file association)
  const args = process.argv.slice(app.isPackaged ? 1 : 2);
  
  for (const arg of args) {
    if (arg.startsWith('--')) continue; // Skip electron flags
    const ext = path.extname(arg).toLowerCase();
    if (SUPPORTED_EXTENSIONS.includes(ext) && fs.existsSync(arg)) {
      return arg;
    }
  }
  
  return null;
}

/**
 * Cleanup file handlers
 */
export function destroyFileHandlers(): void {
  mainWindowRef = null;
}
