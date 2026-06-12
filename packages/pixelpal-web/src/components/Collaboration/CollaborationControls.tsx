/**
 * CollaborationControls.tsx — V41 Phase 1
 * Pause / Resume / Stop control bar for active collaboration sessions
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MyTypography as Typography, MyIconButton as IconButton, MyTooltip as Tooltip, MyLinearProgress as LinearProgress, MyChip as Chip } from '../MUI替代';
import { Box } from '../ui/Box';
import {
  Pause as PauseIcon,
  PlayArrow as ResumeIcon,
  Stop as StopIcon,
  Replay as RestartIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import type { SessionStatus } from '../../services/collaboration/types';
import { getRoleDisplayName } from '../../services/collaboration/personaRoleRegistry';

interface CollaborationControlsProps {
  /** Current session status */
  status?: SessionStatus;
  /** Current progress message */
  progressMessage?: string;
  /** Overall progress 0-100 */
  progress?: number;
  /** Currently active task names */
  activeTasks?: string[];
  /** Callback when pause is clicked */
  onPause?: () => void;
  /** Callback when resume is clicked */
  onResume?: () => void;
  /** Callback when stop is clicked */
  onStop?: () => void;
  /** Whether controls are disabled */
  disabled?: boolean;
  className?: string;
}

/**
 * CollaborationControls displays a control bar with pause/resume/stop buttons
 * and a progress indicator for the active collaboration session.
 */
export const CollaborationControls: React.FC<CollaborationControlsProps> = ({

  status = 'executing',
  progressMessage,
  progress = 0,
  activeTasks = [],
  onPause,
  onResume,
  onStop,
  disabled = false,
  className,
}) => {
  const { t } = useTranslation();
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Timer: track elapsed time since session started
  useEffect(() => {
    if (status === 'executing' && !isPaused) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status, isPaused]);

  // Reset timer when status changes
  useEffect(() => {
    if (status === 'decomposing' || status === 'done' || status === 'failed') {
      startTimeRef.current = null;
      setTimeElapsed(0);
      setIsPaused(false);
    }
  }, [status]);

  const handlePause = () => {
    setIsPaused(true);
    onPause?.();
  };

  const handleResume = () => {
    setIsPaused(false);
    onResume?.();
  };

  const handleStop = () => {
    setIsPaused(false);
    startTimeRef.current = null;
    setTimeElapsed(0);
    onStop?.();
  };

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Status to display text
  const getStatusText = (): string => {
    if (status === 'decomposing') return t('collab.controls.decomposing');
    if (status === 'aggregating') return t('collab.controls.aggregating');
    if (status === 'done') return t('collab.controls.done');
    if (status === 'failed') return t('collab.controls.failed');
    if (isPaused) return t('collab.controls.paused');
    if (activeTasks.length > 0) {
      return `${activeTasks.map(t => getRoleDisplayName(t as any)).join(', ')}${t('collab.controls.working')}`;
    }
    return progressMessage || t('collab.controls.processing');
  };

  // Progress bar color
  const getProgressColor = (): string => {
    if (status === 'done') return '#4caf50';
    if (status === 'failed') return '#f44336';
    if (isPaused) return '#ff9800';
    return '#863bff';
  };

  // Determine which buttons to show
  const showPause = status === 'executing' && !isPaused;
  const showResume = status === 'executing' && isPaused;
  const showStop = status === 'executing' || isPaused || status === 'decomposing' || status === 'aggregating';

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        bgcolor: 'rgba(0, 0, 0, 0.2)',
        borderTop: '1px solid rgba(134, 59, 255, 0.1)',
      }}
    >
      {/* Progress indicator dot */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: getProgressColor(),
          animation: status === 'executing' && !isPaused ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.5, transform: 'scale(0.85)' },
          },
        }}
      />

      {/* Status text */}
      <Typography
        sx={{
          fontSize: 11,
          color: 'text.secondary',
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {getStatusText()}
      </Typography>

      {/* Time elapsed */}
      {timeElapsed > 0 && (
        <Chip
          size="small"
          label={formatTime(timeElapsed)}
          sx={{
            height: 18,
            fontSize: 9,
            fontFamily: 'monospace',
            bgcolor: 'rgba(0, 0, 0, 0.3)',
            color: 'text.disabled',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        />
      )}

      {/* Progress percentage */}
      {status === 'executing' && (
        <Typography
          sx={{
            fontSize: 10,
            color: 'text.disabled',
            fontFamily: 'monospace',
            minWidth: 28,
            textAlign: 'right',
          }}
        >
          {progress}%
        </Typography>
      )}

      {/* Progress bar (compact) */}
      {(status === 'executing' || status === 'aggregating') && (
        <Box sx={{ width: 60, display: { xs: 'none', sm: 'block' } }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 3,
              borderRadius: 1.5,
              bgcolor: 'rgba(255, 255, 255, 0.06)',
              '& .MuiLinearProgress-bar': {
                bgcolor: getProgressColor(),
                borderRadius: 1.5,
              },
            }}
          />
        </Box>
      )}

      {/* Control buttons */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        {/* Pause button */}
        {showPause && (
          <Tooltip title={t('collab.controls.pause')} placement="top">
            <IconButton
              size="small"
              onClick={handlePause}
              disabled={disabled}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: '#ff9800', bgcolor: 'rgba(255, 152, 0, 0.1)' },
              }}
            >
              <PauseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Resume button */}
        {showResume && (
          <Tooltip title={t('collab.controls.resume')} placement="top">
            <IconButton
              size="small"
              onClick={handleResume}
              disabled={disabled}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: '#4caf50', bgcolor: 'rgba(76, 175, 80, 0.1)' },
              }}
            >
              <ResumeIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Stop button */}
        {showStop && (
          <Tooltip title={t('collab.controls.stop')} placement="top">
            <IconButton
              size="small"
              onClick={handleStop}
              disabled={disabled || status === 'done' || status === 'failed'}
              sx={{
                p: 0.5,
                color: 'text.secondary',
                '&:hover': { color: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.1)' },
                '&.Mui-disabled': { color: 'text.disabled', opacity: 0.5 },
              }}
            >
              <StopIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default CollaborationControls;
