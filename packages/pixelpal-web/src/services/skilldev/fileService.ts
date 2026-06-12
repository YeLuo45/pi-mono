/**
 * V80 Skill Dev Tools - Virtual File System Service
 * Manages skill code files stored as TypeScript strings in localStorage.
 */

import { SKILL_CODE_TEMPLATES } from '../../data/skillCodeTemplates';

const STORAGE_KEY = 'pixelpal_skilldev_files';

export interface SkillFile {
  id: string;
  name: string;
  path: string; // e.g., 'custom/my-skill.ts'
  code: string;
  createdAt: number;
  updatedAt: number;
  isPreset: boolean;
}

export interface FileTreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeNode[];
  isPreset?: boolean;
}

// Build initial preset files from templates
const createPresetFiles = (): SkillFile[] => {
  return SKILL_CODE_TEMPLATES.map(template => ({
    id: `preset_${template.id}`,
    name: template.name.replace(/\s+/g, '-').toLowerCase() + '.ts',
    path: `presets/${template.name.replace(/\s+/g, '-').toLowerCase()}.ts`,
    code: template.code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPreset: true,
  }));
};

// Get all files from localStorage
export const getAllFiles = (): SkillFile[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Initialize with preset files
      const presets = createPresetFiles();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      return presets;
    }
    return JSON.parse(stored);
  } catch {
    return createPresetFiles();
  }
};

// Save all files to localStorage
const saveFiles = (files: SkillFile[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
};

// Get a single file by path
export const getFileByPath = (path: string): SkillFile | undefined => {
  const files = getAllFiles();
  return files.find(f => f.path === path);
};

// Get a single file by ID
export const getFileById = (id: string): SkillFile | undefined => {
  const files = getAllFiles();
  return files.find(f => f.id === id);
};

// Create a new file
export const createFile = (name: string, code: string, folder: 'custom' | 'chains' = 'custom'): SkillFile => {
  const files = getAllFiles();
  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const newFile: SkillFile = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: sanitizedName.endsWith('.ts') ? sanitizedName : `${sanitizedName}.ts`,
    path: `${folder}/${sanitizedName.endsWith('.ts') ? sanitizedName : `${sanitizedName}.ts`}`,
    code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPreset: false,
  };
  files.push(newFile);
  saveFiles(files);
  return newFile;
};

// Update an existing file
export const updateFile = (id: string, updates: Partial<Pick<SkillFile, 'code' | 'name'>>): SkillFile | null => {
  const files = getAllFiles();
  const index = files.findIndex(f => f.id === id);
  if (index === -1) return null;

  files[index] = {
    ...files[index],
    ...updates,
    updatedAt: Date.now(),
  };
  saveFiles(files);
  return files[index];
};

// Delete a file (only non-preset files)
export const deleteFile = (id: string): boolean => {
  const files = getAllFiles();
  const file = files.find(f => f.id === id);
  if (!file || file.isPreset) return false;

  const newFiles = files.filter(f => f.id !== id);
  saveFiles(newFiles);
  return true;
};

// Rename a file (only non-preset files)
export const renameFile = (id: string, newName: string): SkillFile | null => {
  const files = getAllFiles();
  const file = files.find(f => f.id === id);
  if (!file || file.isPreset) return null;

  const sanitizedName = newName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  const newPath = file.path.replace(file.name, sanitizedName.endsWith('.ts') ? sanitizedName : `${sanitizedName}.ts`);
  const newFileName = sanitizedName.endsWith('.ts') ? sanitizedName : `${sanitizedName}.ts`;

  file.name = newFileName;
  file.path = newPath;
  file.updatedAt = Date.now();
  saveFiles(files);
  return file;
};

// Duplicate a file
export const duplicateFile = (id: string): SkillFile | null => {
  const files = getAllFiles();
  const file = files.find(f => f.id === id);
  if (!file) return null;

  const newFile: SkillFile = {
    ...file,
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: file.name.replace('.ts', '-copy.ts'),
    path: file.path.replace('.ts', '-copy.ts'),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPreset: false,
  };
  files.push(newFile);
  saveFiles(files);
  return newFile;
};

// Build file tree structure
export const buildFileTree = (): FileTreeNode => {
  const files = getAllFiles();

  const root: FileTreeNode = {
    id: 'root',
    name: 'root',
    path: '',
    type: 'folder',
    children: [],
  };

  const folders = new Map<string, FileTreeNode>();

  // Ensure standard folders exist
  ['presets', 'custom', 'chains'].forEach(folderName => {
    const folder: FileTreeNode = {
      id: folderName,
      name: folderName,
      path: folderName,
      type: 'folder',
      children: [],
    };
    folders.set(folderName, folder);
    root.children!.push(folder);
  });

  // Add files to their folders
  files.forEach(file => {
    const parts = file.path.split('/');
    const folderName = parts.length > 1 ? parts[0] : 'custom';
    const folder = folders.get(folderName);
    if (folder && folder.children) {
      folder.children.push({
        id: file.id,
        name: file.name,
        path: file.path,
        type: 'file',
        isPreset: file.isPreset,
      });
    }
  });

  // Sort folders and files
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach(n => n.children && sortNodes(n.children));
  };
  sortNodes(root.children!);

  return root;
};

// Export file as JSON
export const exportFileAsJson = (id: string): string | null => {
  const file = getFileById(id);
  if (!file) return null;
  return JSON.stringify({ name: file.name, code: file.code }, null, 2);
};

// Get presets only
export const getPresetFiles = (): SkillFile[] => {
  return getAllFiles().filter(f => f.isPreset);
};

// Get custom files only
export const getCustomFiles = (): SkillFile[] => {
  return getAllFiles().filter(f => !f.isPreset);
};

// Get chain files only
export const getChainFiles = (): SkillFile[] => {
  return getAllFiles().filter(f => f.path.startsWith('chains/'));
};
