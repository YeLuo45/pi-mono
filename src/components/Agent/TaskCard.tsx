/**
 * TaskCard - Individual agent task display card
 * Shows: title/goal, status badge, progress bar, priority, step count
 */

import React from 'react';
import { Box, Typography, Chip, LinearProgress, IconButton, Tooltip } from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
} from '@mui/icons-material';
import type { Task, TaskStatus, TaskPriority } from '../../services/agent/types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: '#9E9E9E', bgColor: 'rgba(158,158,158,0.15)', icon: <PendingIcon sx={{ fontSize: 12 }} /> },
  running: { label: 'Running', color: '#2196F3', bgColor: 'rgba(33,150,243,0.15)', icon: <PlayIcon sx={{ fontSize: 12 }} /> },
  paused: { label: 'Paused', color: '#FF9800', bgColor: 'rgba(255,152,0,0.15)', icon: <PauseIcon sx={{ fontSize: 12 }} /> },
  completed: { label: 'Completed', color: '#4CAF50', bgColor: 'rgba(76,175,80,0.15)', icon: <CheckCircleIcon sx={{ fontSize: 12 }} /> },
  failed: { label: 'Failed', color: '#F44336', bgColor: 'rgba(244,67,54,0.15)', icon: <ErrorIcon sx={{ fontSize: 12 }} /> },
  cancelled: { label: 'Cancelled', color: '#9E9E9E', bgColor: 'rgba(158,158,158,0.1)', icon: <CancelIcon sx={{ fontSize: 12 }} /> },
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  urgent: '#F44336',
  high: '#FF9800',
  normal: '#2196F3',
  low: '#9E9E9E',
};

interface TaskCardProps {
  task: Task;
  onPause?: (taskId: string) => void;
  onResume?: (taskId: string) => void;
  onCancel?: (taskId: string) => void;
  compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onPause,
  onResume,
  onCancel,
  compact = false,
}) => {
  const statusCfg = STATUS_CONFIG[task.status];
  const priorityColor = PRIORITY_COLORS[task.priority];

  const totalSteps = task.steps.length;
  const completedSteps = task.steps.filter((s) => s.status === 'completed').length;
  const currentStep = task.steps[task.currentStepIndex];

  const handlePauseResume = () => {
    if (task.status === 'running' && onPause) {
      onPause(task.id);
    } else if (task.status === 'paused' && onResume) {
      onResume(task.id);
    }
  };

  const canPauseResume = task.status === 'running' || task.status === 'paused';
  const canCancel = task.status === 'pending' || task.status === 'running' || task.status === 'paused';

  return (
    <Box
      sx={{
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.08)',
        bgcolor: 'rgba(255,255,255,0.03)',
        p: compact ? 1.5 : 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'rgba(255,255,255,0.15)',
          bgcolor: 'rgba(255,255,255,0.05)',
        },
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        {/* Priority dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: priorityColor,
            mt: 0.8,
            flexShrink: 0,
          }}
        />

        {/* Title & meta */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: compact ? 12 : 13,
              fontWeight: 600,
              color: task.status === 'completed' ? 'text.secondary' : 'white',
              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
              opacity: task.status === 'cancelled' ? 0.5 : 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {task.goal}
          </Typography>

          {/* Step indicator */}
          {totalSteps > 0 && (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mt: 0.3, display: 'block' }}>
              Step {completedSteps + 1} of {totalSteps}
              {currentStep && ` · ${currentStep.description}`}
            </Typography>
          )}
        </Box>

        {/* Status badge */}
        <Chip
          icon={statusCfg.icon as React.ReactElement}
          label={statusCfg.label}
          size="small"
          sx={{
            fontSize: 10,
            height: 20,
            bgcolor: statusCfg.bgColor,
            color: statusCfg.color,
            border: `1px solid ${statusCfg.color}30`,
            '& .MuiChip-icon': { color: statusCfg.color },
          }}
        />
      </Box>

      {/* Progress bar */}
      {task.status === 'running' && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="determinate"
            value={task.progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: statusCfg.color,
                borderRadius: 2,
              },
            }}
          />
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', mt: 0.3, display: 'block' }}>
            {task.progress}%
          </Typography>
        </Box>
      )}

      {/* Error message */}
      {task.status === 'failed' && task.error && (
        <Typography
          variant="caption"
          sx={{ fontSize: 10, color: '#F44336', display: 'block', mb: 0.5 }}
        >
          ⚠️ {task.error}
        </Typography>
      )}

      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
        {canPauseResume && (
          <Tooltip title={task.status === 'running' ? 'Pause' : 'Resume'}>
            <IconButton size="small" onClick={handlePauseResume} sx={{ p: 0.5 }}>
              {task.status === 'running' ? (
                <PauseIcon sx={{ fontSize: 16, color: '#FF9800' }} />
              ) : (
                <PlayIcon sx={{ fontSize: 16, color: '#2196F3' }} />
              )}
            </IconButton>
          </Tooltip>
        )}
        {canCancel && (
          <Tooltip title="Cancel">
            <IconButton size="small" onClick={() => onCancel?.(task.id)} sx={{ p: 0.5 }}>
              <CancelIcon sx={{ fontSize: 16, color: '#9E9E9E' }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default TaskCard;
