/**
 * V80 Skill Dev Tools - Main Page
 * Three-panel IDE layout: FileTree | CodeEditor + DebugPanel | ConsolePanel
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { MyTypography as Typography, MyButton as Button, MyIconButton as IconButton, MyTooltip as Tooltip, MyChip as Chip, MyStack , MySelect as Select } from '../components/MUI替代';
import { Box } from '../components/ui/Box';
import { useNavigate } from 'react-router-dom';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  PlayArrow as RunIcon,
  Stop as StopIcon,
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import { FileTree } from '../components/SkillDev/FileTree';
import { CodeEditor, type ValidationError } from '../components/SkillDev/CodeEditor';
import { ConsolePanel, type ConsoleEntry } from '../components/SkillDev/ConsolePanel';
import { DebugPanel } from '../components/SkillDev/DebugPanel';
import { SkillPreview } from '../components/SkillDev/SkillPreview';
import {
  buildFileTree,
  getFileById,
  createFile,
  updateFile,
  deleteFile,
  renameFile,
  duplicateFile,
  type SkillFile,
} from '../services/skilldev/fileService';
import { SKILL_CODE_TEMPLATES } from '../data/skillCodeTemplates';

interface SkillDevPageProps {
  // Optional prop for direct skill testing
  initialSkillId?: string;
}

export const SkillDevPage: React.FC<SkillDevPageProps> = ({ initialSkillId }) => {
  const navigate = useNavigate();
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  // Load file tree
  const [tree, setTree] = useState(() => buildFileTree());

  // Refresh file tree
  const refreshTree = useCallback(() => {
    setTree(buildFileTree());
  }, []);

  // Load file when selected
  const handleFileSelect = useCallback((id: string, path: string) => {
    const file = getFileById(id);
    if (file) {
      setActiveFileId(id);
      setActiveCode(file.code);
      setValidationErrors([]);
    }
  }, []);

  // Create new file
  const handleFileCreate = useCallback((name: string, folder: 'custom' | 'chains') => {
    const template = SKILL_CODE_TEMPLATES[0];
    const newFile = createFile(name, template.code, folder);
    refreshTree();
    handleFileSelect(newFile.id, newFile.path);
  }, [refreshTree, handleFileSelect]);

  // Delete file
  const handleFileDelete = useCallback((id: string) => {
    const file = getFileById(id);
    if (file?.isPreset) return; // Can't delete presets
    deleteFile(id);
    if (activeFileId === id) {
      setActiveFileId(null);
      setActiveCode('');
    }
    refreshTree();
    addConsoleEntry('info', `Deleted: ${file?.name || id}`);
  }, [activeFileId, refreshTree]);

  // Rename file
  const handleFileRename = useCallback((id: string, newName: string) => {
    renameFile(id, newName);
    refreshTree();
    addConsoleEntry('info', `Renamed to: ${newName}`);
  }, [refreshTree]);

  // Duplicate file
  const handleFileDuplicate = useCallback((id: string) => {
    const newFile = duplicateFile(id);
    if (newFile) {
      refreshTree();
      handleFileSelect(newFile.id, newFile.path);
      addConsoleEntry('info', `Duplicated: ${newFile.name}`);
    }
  }, [refreshTree, handleFileSelect]);

  // Save current file
  const handleSave = useCallback(() => {
    if (!activeFileId) return;
    const updated = updateFile(activeFileId, { code: activeCode });
    if (updated) {
      addConsoleEntry('success', `Saved: ${updated.name}`);
    }
  }, [activeFileId, activeCode]);

  // Code change handler
  const handleCodeChange = useCallback((value: string) => {
    setActiveCode(value);
  }, []);

  // Validation handler
  const handleValidation = useCallback((errors: ValidationError[]) => {
    setValidationErrors(errors);
  }, []);

  // Add console entry
  const addConsoleEntry = useCallback((level: ConsoleEntry['level'], message: string, data?: unknown) => {
    setConsoleEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        level,
        message,
        timestamp: Date.now(),
        data,
      },
    ]);
  }, []);

  // Clear console
  const handleClearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  // Run skill
  const handleRun = useCallback(async (input: string, context: Record<string, unknown>) => {
    if (!activeCode.trim()) {
      addConsoleEntry('error', 'No code to execute');
      return;
    }

    setIsRunning(true);
    setExecutionStatus('running');
    addConsoleEntry('info', 'Starting skill execution...');
    addConsoleEntry('info', `Input: ${input}`);
    addConsoleEntry('info', `Context: ${JSON.stringify(context)}`);

    const startTime = Date.now();

    try {
      // Create a sandboxed execution environment
      const executeSkill = async () => {
        // Build skill code with context injection
        const fullCode = `
          const context = arguments[0];
          ${activeCode}
          
          // Execute the skill
          if (typeof skill !== 'undefined' && skill.execute) {
            return skill.execute(context);
          } else {
            throw new Error('Skill does not export a valid execute function');
          }
        `;

        // Create async function and execute
        const fn = new Function('context', fullCode);
        return await fn(context);
      };

      // Set execution timeout (30 seconds max)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout (30s)')), 30000);
      });

      const result = await Promise.race([executeSkill(), timeoutPromise]);

      const duration = Date.now() - startTime;

      addConsoleEntry('success', `Completed in ${duration}ms`, result);
      setExecutionStatus('success');

      if (result.success) {
        addConsoleEntry('info', `Response: ${result.response}`);
      } else {
        addConsoleEntry('error', `Error: ${result.error || 'Unknown error'}`);
        setExecutionStatus('error');
      }

      if (result.steps) {
        result.steps.forEach((step: { description: string; status: string }, index: number) => {
          addConsoleEntry('info', `Step ${index + 1}: ${step.description} [${step.status}]`);
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      addConsoleEntry('error', `Execution failed: ${errorMessage}`);
      setExecutionStatus('error');
    } finally {
      setIsRunning(false);
    }
  }, [activeCode, addConsoleEntry]);

  // Stop execution
  const handleStop = useCallback(() => {
    setIsRunning(false);
    setExecutionStatus('idle');
    addConsoleEntry('warn', 'Execution cancelled');
  }, [addConsoleEntry]);

  // Load initial file
  useEffect(() => {
    if (!activeFileId && tree.children) {
      // Find first non-preset file or first preset
      for (const folder of tree.children) {
        if (folder.children && folder.children.length > 0) {
          const firstFile = folder.children[0];
          const file = getFileById(firstFile.id);
          if (file) {
            setActiveFileId(file.id);
            setActiveCode(file.code);
            break;
          }
        }
      }
    }
  }, [tree, activeFileId]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Get current file info
  const currentFile = useMemo(() => {
    if (!activeFileId) return null;
    return getFileById(activeFileId);
  }, [activeFileId]);

  const hasErrors = validationErrors.some(e => e.severity === 'error');

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          bgcolor: 'rgba(0,0,0,0.2)',
        }}
      >
        <Tooltip title="Back">
          <IconButton size="small" onClick={() => navigate('/')} sx={{ color: 'text.secondary' }}>
            <BackIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 700 }}>
          Skill Dev Tools
        </Typography>

        {/* File info */}
        {currentFile && (
          <>
            <Chip
              label={currentFile.name}
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                bgcolor: 'rgba(255,255,255,0.05)',
                '& .MuiChip-label': { px: 1 },
              }}
            />
            {hasErrors && (
              <Chip
                label={`${validationErrors.filter(e => e.severity === 'error').length} errors`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: 10,
                  bgcolor: 'rgba(242, 104, 117, 0.2)',
                  color: 'error.main',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            )}
          </>
        )}

        <Box sx={{ flex: 1 }} />

        {/* Actions */}
        <Button
          size="small"
          variant={showPreview ? 'contained' : 'outlined'}
          startIcon={<PreviewIcon sx={{ fontSize: 14 }} />}
          onClick={() => setShowPreview((v) => !v)}
          sx={{ fontSize: 11, minWidth: 'auto' }}
        >
          Preview
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
          onClick={handleSave}
          disabled={!activeFileId}
          sx={{ fontSize: 11, minWidth: 'auto' }}
        >
          Save
        </Button>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: FileTree */}
        <FileTree
          tree={tree}
          activeFileId={activeFileId}
          onFileSelect={handleFileSelect}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          onFileRename={handleFileRename}
          onFileDuplicate={handleFileDuplicate}
        />

        {/* Center: CodeEditor + DebugPanel */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Editor */}
          <Box sx={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {activeFileId ? (
              <>
                <CodeEditor
                  code={activeCode}
                  onChange={handleCodeChange}
                  onValidation={handleValidation}
                />
                {/* Preview overlay */}
                {showPreview && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 320,
                      maxHeight: 'calc(100% - 16px)',
                      overflow: 'auto',
                      zIndex: 10,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                      borderRadius: 2,
                    }}
                  >
                    <SkillPreview
                      name=""
                      description=""
                      code={activeCode}
                    />
                  </Box>
                )}
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                  Select a file to edit
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<BackIcon />}
                  onClick={() => handleFileCreate('my-skill', 'custom')}
                  sx={{ fontSize: 12 }}
                >
                  Create New Skill
                </Button>
              </Box>
            )}
          </Box>

          {/* Debug Panel */}
          <DebugPanel
            onRun={handleRun}
            onStop={handleStop}
            isRunning={isRunning}
            executionStatus={executionStatus}
          />
        </Box>

        {/* Right: ConsolePanel */}
        <ConsolePanel
          entries={consoleEntries}
          onClear={handleClearConsole}
        />
      </Box>
    </Box>
  );
};

export default SkillDevPage;
