/**
 * V80 Skill Dev Tools - FileTree Component
 * Collapsible tree view for skill files with context menu support.
 */

import React, { useState, useCallback } from 'react';
import { MyMenu as Menu, MyListItemIcon as ListItemIcon, MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyMenuItem as MenuItem } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MySelect, MyListItemText as ListItemText, MyDivider as Divider, MyTextField as TextField, MyButton as Button, MyTooltip as Tooltip } from '../MUI替代';
import {
  CreateNewFolder as NewFolderIcon,
  Description as FileIcon,
  Folder as FolderIcon,
  ExpandMore as ExpandIcon,
  ChevronRight as ChevronRightIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  DriveFileRenameOutline as RenameIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { FileTreeNode } from '../../services/skilldev/fileService';

interface FileTreeProps {
  tree: FileTreeNode;
  activeFileId: string | null;
  onFileSelect: (id: string, path: string) => void;
  onFileCreate: (name: string, folder: 'custom' | 'chains') => void;
  onFileDelete: (id: string) => void;
  onFileRename: (id: string, newName: string) => void;
  onFileDuplicate: (id: string) => void;
}

interface TreeItemProps {
  node: FileTreeNode;
  level: number;
  activeFileId: string | null;
  onFileSelect: (id: string, path: string) => void;
  onContextMenu: (event: React.MouseEvent, node: FileTreeNode) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  level,
  activeFileId,
  onFileSelect,
  onContextMenu,
  expandedFolders,
  onToggleFolder,
}) => {
  const isExpanded = expandedFolders.has(node.id);
  const isActive = node.id === activeFileId;

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggleFolder(node.id);
    } else {
      onFileSelect(node.id, node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, node);
  };

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pl: level * 1.5,
          py: 0.25,
          pr: 0.5,
          cursor: 'pointer',
          borderRadius: 1,
          bgcolor: isActive ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
          '&:hover': { bgcolor: isActive ? 'rgba(94, 106, 210, 0.2)' : 'rgba(255,255,255,0.04)' },
          gap: 0.5,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        {node.type === 'folder' && (
          <>
            {isExpanded ? (
              <ExpandIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            ) : (
              <ChevronRightIcon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
            )}
          </>
        )}
        {node.type === 'folder' ? (
          <FolderIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
        ) : (
          <FileIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
        )}
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            color: isActive ? 'primary.main' : 'text.secondary',
            fontWeight: isActive ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {node.name}
        </Typography>
        {node.type === 'file' && (
          <IconButton
            size="small"
            sx={{ p: 0.25, opacity: 0.5, '&:hover': { opacity: 1 } }}
            onClick={handleContextMenu}
          >
            <MoreIcon sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>
      {node.type === 'folder' && isExpanded && node.children && (
        <Box>
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              level={level + 1}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </Box>
      )}
    </>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  activeFileId,
  onFileCreate,
  onFileDelete,
  onFileRename,
  onFileDuplicate,
  onFileSelect,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['presets', 'custom', 'chains']));
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; node: FileTreeNode } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileFolder, setNewFileFolder] = useState<'custom' | 'chains'>('custom');

  const handleToggleFolder = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent, node: FileTreeNode) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      node,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleRename = useCallback(() => {
    if (contextMenu?.node) {
      setRenameId(contextMenu.node.id);
      setRenameValue(contextMenu.node.name);
      setRenameDialogOpen(true);
    }
    handleCloseContextMenu();
  }, [contextMenu, handleCloseContextMenu]);

  const handleRenameSubmit = useCallback(() => {
    if (renameId && renameValue.trim()) {
      onFileRename(renameId, renameValue.trim());
    }
    setRenameDialogOpen(false);
    setRenameId(null);
    setRenameValue('');
  }, [renameId, renameValue, onFileRename]);

  const handleDelete = useCallback(() => {
    if (contextMenu?.node) {
      onFileDelete(contextMenu.node.id);
    }
    handleCloseContextMenu();
  }, [contextMenu, onFileDelete, handleCloseContextMenu]);

  const handleDuplicate = useCallback(() => {
    if (contextMenu?.node) {
      onFileDuplicate(contextMenu.node.id);
    }
    handleCloseContextMenu();
  }, [contextMenu, onFileDuplicate, handleCloseContextMenu]);

  const handleNewFile = useCallback((folder: 'custom' | 'chains') => {
    setNewFileFolder(folder);
    setNewFileName('');
    setNewFileDialogOpen(true);
  }, []);

  const handleNewFileSubmit = useCallback(() => {
    if (newFileName.trim()) {
      onFileCreate(newFileName.trim(), newFileFolder);
    }
    setNewFileDialogOpen(false);
    setNewFileName('');
  }, [newFileName, newFileFolder, onFileCreate]);

  const isPreset = contextMenu?.node?.isPreset;

  return (
    <Box
      sx={{
        width: 200,
        height: '100%',
        bgcolor: 'rgba(0,0,0,0.2)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Files
        </Typography>
        <Tooltip title="New File">
          <IconButton size="small" sx={{ p: 0.5 }} onClick={() => handleNewFile('custom')}>
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Tree */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
        {tree.children?.map((folder) => (
          <Box key={folder.id}>
            <TreeItem
              node={folder}
              level={0}
              activeFileId={activeFileId}
              onFileSelect={onFileSelect}
              onContextMenu={handleContextMenu}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
            />
          </Box>
        ))}
      </Box>

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        sx={{
          '& .MuiPaper-root': {
            bgcolor: 'rgba(20, 20, 25, 0.98)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          },
        }}
      >
        {!isPreset && (
          <MenuItem onClick={handleRename} dense>
            <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Rename</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDuplicate} dense>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        {!isPreset && (
          <>
            <Divider />
            <MenuItem onClick={handleDelete} dense sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={() => setRenameDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Rename File</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameSubmit} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>

      {/* New File Dialog */}
      <Dialog open={newFileDialogOpen} onClose={() => setNewFileDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>New Skill File</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button
              size="small"
              variant={newFileFolder === 'custom' ? 'contained' : 'outlined'}
              onClick={() => setNewFileFolder('custom')}
            >
              Custom
            </Button>
            <Button
              size="small"
              variant={newFileFolder === 'chains' ? 'contained' : 'outlined'}
              onClick={() => setNewFileFolder('chains')}
            >
              Chains
            </Button>
          </Box>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="File Name"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNewFileSubmit()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewFileDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleNewFileSubmit} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FileTree;
