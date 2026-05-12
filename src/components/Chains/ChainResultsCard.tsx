/**
 * ChainResultsCard — displays chain execution results in chat (V79)
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  Chip,
  Stack,
  Divider,
  alpha,
} from '@mui/material';
import {
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircle as SuccessIcon,
  Cancel as ErrorIcon,
  SkipNext as SkipIcon,
} from '@mui/icons-material';
import type { ChainExecutionResult, ChainStepResult } from '../../services/skills/types';

interface ChainResultsCardProps {
  result: ChainExecutionResult;
  chainName?: string;
}

const StepItem: React.FC<{ step: ChainStepResult; index: number }> = ({ step, index }) => {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    completed: <SuccessIcon sx={{ fontSize: 14, color: '#4caf50' }} />,
    failed: <ErrorIcon sx={{ fontSize: 14, color: '#f44336' }} />,
    skipped: <SkipIcon sx={{ fontSize: 14, color: '#ff9800' }} />,
  }[step.status];

  const statusColor = {
    completed: '#4caf50',
    failed: '#f44336',
    skipped: '#ff9800',
  }[step.status];

  return (
    <Box
      sx={{
        bgcolor: 'rgba(255,255,255,0.03)',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      {/* Step header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', width: 16 }}>
          {index + 1}.
        </Typography>
        {statusIcon}
        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, flex: 1, color: statusColor }}>
          {step.skillId}
        </Typography>
        <Chip
          label={step.status}
          size="small"
          sx={{
            height: 16,
            fontSize: 9,
            bgcolor: alpha(statusColor, 0.15),
            color: statusColor,
            textTransform: 'capitalize',
            '& .MuiChip-label': { px: 0.6 },
          }}
        />
        {expanded ? (
          <CollapseIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        ) : (
          <ExpandIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
        )}
      </Box>

      {/* Step details */}
      <Collapse in={expanded}>
        <Divider sx={{ opacity: 0.1 }} />
        <Box sx={{ px: 1.5, py: 1 }}>
          {/* Input */}
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Input
          </Typography>
          <Box
            sx={{
              bgcolor: 'rgba(0,0,0,0.2)',
              borderRadius: 0.5,
              p: 0.75,
              mt: 0.25,
              mb: 0.75,
            }}
          >
            <Typography
              variant="caption"
              component="pre"
              sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}
            >
              {JSON.stringify(step.input, null, 2)}
            </Typography>
          </Box>

          {/* Output */}
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Output
          </Typography>
          <Box
            sx={{
              bgcolor: 'rgba(0,0,0,0.2)',
              borderRadius: 0.5,
              p: 0.75,
              mt: 0.25,
              maxHeight: 120,
              overflow: 'auto',
            }}
          >
            <Typography
              variant="caption"
              component="pre"
              sx={{ fontSize: 10, color: step.error ? 'error.main' : 'text.primary', fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}
            >
              {step.output || step.error || '(no output)'}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

export const ChainResultsCard: React.FC<ChainResultsCardProps> = ({ result, chainName }) => {
  const [expanded, setExpanded] = useState(true);

  const statusColor = result.success ? '#4caf50' : '#f44336';

  return (
    <Box
      sx={{
        bgcolor: 'rgba(15, 17, 23, 0.95)',
        border: `1px solid ${alpha(statusColor, 0.3)}`,
        borderRadius: 2,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${alpha(statusColor, 0.15)}`,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Typography variant="h6" sx={{ fontSize: 16 }}>
          ⛓️
        </Typography>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
            {chainName || 'Chain'} Result
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            {result.steps.filter((s) => s.status === 'completed').length}/{result.steps.length} steps completed
            {' • '}
            {result.durationMs}ms
          </Typography>
        </Box>
        <Chip
          label={result.success ? 'Success' : 'Failed'}
          size="small"
          sx={{
            bgcolor: alpha(statusColor, 0.15),
            color: statusColor,
            fontWeight: 600,
            fontSize: 10,
            height: 20,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
        {expanded ? (
          <CollapseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        ) : (
          <ExpandIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        )}
      </Box>

      {/* Steps */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, py: 1, maxHeight: 400, overflowY: 'auto' }}>
          <Stack spacing={0.5}>
            {result.steps.map((step, idx) => (
              <StepItem key={step.stepId} step={step} index={idx} />
            ))}
          </Stack>
        </Box>

        {/* Final result */}
        {result.finalResult && (
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Final Result
            </Typography>
            <Box
              sx={{
                bgcolor: alpha('#9c27b0', 0.1),
                borderRadius: 1,
                p: 1,
                mt: 0.5,
                border: `1px solid ${alpha('#9c27b0', 0.2)}`,
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 12, color: 'text.primary', whiteSpace: 'pre-wrap' }}>
                {result.finalResult}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error */}
        {result.error && (
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ fontSize: 9, color: 'error.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Error
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 11, color: 'error.main', mt: 0.5 }}>
              {result.error}
            </Typography>
          </Box>
        )}
      </Collapse>
    </Box>
  );
};
