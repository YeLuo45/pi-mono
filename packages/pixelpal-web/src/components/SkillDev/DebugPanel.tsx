/**
 * V80 Skill Dev Tools - DebugPanel Component
 * Test input + run button for executing skills with custom context.
 */

import React, { useState, useCallback } from 'react';
import { MyTypography as Typography, MyTextField as TextField, MyButton as Button, MyStack, MyCircularProgress as CircularProgress, MyChip as Chip, MyIconButton as IconButton, MyTooltip as Tooltip, MyDivider } from '../MUI替代';
import { Box } from '../ui/Box';
import {
  Play as RunIcon,
  Square as StopIcon,
  RotateCcw as ResetIcon,
  ChevronDown as ExpandIcon,
  ChevronUp as CollapseIcon,
} from 'lucide-react';

interface DebugPanelProps {
  onRun: (input: string, context: Record<string, unknown>) => void;
  onStop?: () => void;
  isRunning: boolean;
  executionStatus?: 'idle' | 'running' | 'success' | 'error';
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  onRun,
  onStop,
  isRunning = false,
  executionStatus = 'idle',
}) => {
  const [testInput, setTestInput] = useState('Hello, run my skill');
  const [contextJson, setContextJson] = useState(
    JSON.stringify(
      {
        personaId: 'default',
        sceneId: '',
        metadata: { triggeredFrom: 'devtools' },
      },
      null,
      2
    )
  );
  const [contextExpanded, setContextExpanded] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  const handleRun = useCallback(() => {
    // Validate JSON
    try {
      const context = JSON.parse(contextJson);
      setContextError(null);
      onRun(testInput, context);
    } catch (e) {
      setContextError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [testInput, contextJson, onRun]);

  const handleReset = useCallback(() => {
    setTestInput('Hello, run my skill');
    setContextJson(
      JSON.stringify(
        {
          personaId: 'default',
          sceneId: '',
          metadata: { triggeredFrom: 'devtools' },
        },
        null,
        2
      )
    );
    setContextError(null);
  }, []);

  const handleContextChange = useCallback((value: string) => {
    setContextJson(value);
    // Validate on change
    try {
      JSON.parse(value);
      setContextError(null);
    } catch (e) {
      setContextError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, []);

  const statusColor = {
    idle: 'text.secondary',
    running: 'info.main',
    success: 'success.main',
    error: 'error.main',
  }[executionStatus];

  const statusLabel = {
    idle: 'Ready',
    running: 'Running...',
    success: 'Success',
    error: 'Error',
  }[executionStatus];

  return (
    <Box
      css={{
        height: 200,
        display: 'flex',
        flexDirection: 'column',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        bgcolor: 'rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <Box
        css={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box css={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Debug
          </Typography>
          <Chip
            label={statusLabel}
            size="small"
            sx={{
              height: 18,
              fontSize: 9,
              fontWeight: 600,
              bgcolor: `${statusColor}20`,
              color: statusColor,
              border: 'none',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Box>
        <Box css={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Reset">
            <IconButton size="small" onClick={handleReset} sx={{ p: 0.5 }}>
              <ResetIcon css={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box css={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', p: 1.5, gap: 1 }}>
        {/* Test Input */}
        <TextField
          size="small"
          fullWidth
          multiline
          maxRows={2}
          placeholder="Test input message..."
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          sx={{
            flexShrink: 0,
            '& .MuiInputBase-root': {
              fontSize: 12,
              fontFamily: "'Fira Code', monospace",
            },
          }}
          InputProps={{
            sx: { bgcolor: 'rgba(255,255,255,0.03)' },
          }}
        />

        {/* Context Toggle + JSON Editor */}
        <Box css={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Button
            size="small"
            onClick={() => setContextExpanded((v) => !v)}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: 11,
              px: 1,
              py: 0.25,
              minHeight: 'auto',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
            }}
            endIcon={contextExpanded ? <CollapseIcon css={{ fontSize: 12 }} /> : <ExpandIcon css={{ fontSize: 12 }} />}
          >
            Context (JSON)
          </Button>

          {contextExpanded && (
            <Box css={{ flex: 1, overflow: 'hidden' }}>
              <TextField
                size="small"
                fullWidth
                multiline
                placeholder='{"personaId": "default"}'
                value={contextJson}
                onChange={(e) => handleContextChange(e.target.value)}
                error={!!contextError}
                helperText={contextError ? 'Invalid JSON' : ''}
                sx={{
                  height: '100%',
                  '& .MuiInputBase-root': {
                    height: '100%',
                    fontSize: 11,
                    fontFamily: "'Fira Code', monospace",
                    alignItems: 'flex-start',
                  },
                  '& .MuiInputBase-input': {
                    overflow: 'auto !important',
                  },
                }}
                InputProps={{
                  sx: { bgcolor: 'rgba(255,255,255,0.03)', p: 1 },
                }}
              />
            </Box>
          )}
        </Box>

        {/* Run Button */}
        <Box css={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={isRunning ? <CircularProgress size={12} color="inherit" /> : <RunIcon css={{ fontSize: 14 }} />}
            onClick={isRunning ? onStop : handleRun}
            disabled={!!contextError || !testInput.trim()}
            sx={{
              minWidth: 80,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: isRunning ? 'error.main' : 'primary.main',
              '&:hover': { bgcolor: isRunning ? 'error.dark' : 'primary.dark' },
            }}
          >
            {isRunning ? 'Stop' : 'Run'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default DebugPanel;
