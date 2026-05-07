/**
 * TaskBreakdown.tsx — V41 Phase 1
 * Collapsible task tree with dependency arrows
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Collapse, IconButton, Tooltip } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import type { Subtask, PersonaRole } from '../../services/collaboration/types';
import { getRoleEmoji, getRoleDisplayName } from '../../services/collaboration/personaRoleRegistry';

const STATUS_COLORS = {
  pending: '#666',
  running: '#863bff',
  completed: '#4caf50',
  failed: '#f44336',
  skipped: '#ff9800',
} as const;

const STATUS_SYMBOLS: Record<string, string> = {
  pending: '⏳',
  running: '🔄',
  completed: '✅',
  failed: '❌',
  skipped: '⏭️',
};

interface TaskNodeProps {
  subtask: Subtask;
  level: number;
  isLast: boolean;
  childLines: boolean[];
}

const TaskNode: React.FC<TaskNodeProps> = ({ subtask, level, isLast, childLines }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const emoji = getRoleEmoji(subtask.responsible as PersonaRole);
  const label = getRoleDisplayName(subtask.responsible as PersonaRole);
  const statusColor = STATUS_COLORS[subtask.status] || '#666';
  const statusSymbol = STATUS_SYMBOLS[subtask.status] || '⏳';

  // Indent per level
  const indent = level * 20;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Tree lines for parent levels */}
      {childLines.map((showLine, i) => (
        showLine && (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              left: i * 20 + 9,
              top: 0,
              bottom: 0,
              width: 1,
              bgcolor: 'rgba(134, 59, 255, 0.2)',
            }}
          />
        )
      ))}

      {/* Main row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          pl: `${indent}px`,
          py: 0.5,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
          borderRadius: 1,
          pr: 1,
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand icon */}
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </IconButton>

        {/* Status dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: statusColor,
            flexShrink: 0,
          }}
        />

        {/* Emoji + role */}
        <Typography sx={{ fontSize: 13 }}>{emoji}</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', flexShrink: 0 }}>
          {label}
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            fontSize: 12,
            color: 'text.primary',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtask.description}
        </Typography>

        {/* Status text */}
        <Typography sx={{ fontSize: 10, color: statusColor, flexShrink: 0 }}>
          {statusSymbol}
        </Typography>
      </Box>

      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box
          sx={{
            pl: `${indent + 32}px`,
            pb: 1,
            pr: 2,
          }}
        >
          {/* Task type */}
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.5 }}>
            {t('collab.task.type')}: {subtask.type}
          </Typography>

          {/* Dependencies */}
          {subtask.dependencies.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{t('collab.task.dependency')}:</Typography>
              {subtask.dependencies.map((depId, i) => (
                <Box
                  key={String(depId)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: '#863bff', fontFamily: 'monospace' }}>
                    {String(depId)}
                  </Typography>
                  {i < subtask.dependencies.length - 1 && (
                    <ArrowIcon sx={{ fontSize: 10, color: 'rgba(134, 59, 255, 0.4)' }} />
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Result preview */}
          {subtask.result && (
            <Typography
              sx={{
                fontSize: 10,
                color: 'text.secondary',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                mt: 0.5,
                p: 0.75,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 0.5,
                border: '1px solid rgba(134, 59, 255, 0.1)',
              }}
            >
              {String(subtask.result).slice(0, 200)}
              {String(subtask.result).length > 200 && '…'}
            </Typography>
          )}

          {/* Error */}
          {subtask.error && (
            <Typography sx={{ fontSize: 10, color: '#f44336', mt: 0.5 }}>
              {t('collab.task.error')}: {subtask.error}
            </Typography>
          )}

          {/* Timestamps */}
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            {subtask.startedAt && (
              <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>
                {t('collab.task.start')}: {new Date(subtask.startedAt).toLocaleTimeString()}
              </Typography>
            )}
            {subtask.completedAt && (
              <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>
                {t('collab.task.complete')}: {new Date(subtask.completedAt).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

interface TaskBreakdownProps {
  /** The main task/goal being decomposed */
  taskTitle?: string;
  /** Subtasks to display in the tree */
  subtasks: Subtask[];
  className?: string;
}

/**
 * TaskBreakdown displays a collapsible tree view of subtasks
 * with dependency arrows showing execution order.
 */
export const TaskBreakdown: React.FC<TaskBreakdownProps> = ({

  taskTitle,
  subtasks,
  className,
}) => {
  const { t } = useTranslation();
  // Default for taskTitle if not provided
  const displayTitle = taskTitle ?? t('collab.task.title');
  // Group subtasks by execution level based on dependencies
  const getExecutionLevel = (subtask: Subtask, allSubtasks: Subtask[]): number => {
    if (subtask.dependencies.length === 0) return 0;
    let maxParentLevel = 0;
    for (const depId of subtask.dependencies) {
      const parent = allSubtasks.find(s => s.id === depId);
      if (parent) {
        maxParentLevel = Math.max(maxParentLevel, getExecutionLevel(parent, allSubtasks) + 1);
      }
    }
    return maxParentLevel;
  };

  // Build tree structure
  const groupedByLevel = subtasks.reduce<Record<number, Subtask[]>>((acc, subtask) => {
    const level = getExecutionLevel(subtask, subtasks);
    if (!acc[level]) acc[level] = [];
    acc[level].push(subtask);
    return acc;
  }, {});

  const maxLevel = Math.max(0, ...Object.keys(groupedByLevel).map(Number));
  const levels = Array.from({ length: maxLevel + 1 }, (_, i) => groupedByLevel[i] || []);

  // Calculate completion
  const completed = subtasks.filter(t => t.status === 'completed').length;
  const total = subtasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Box className={className} sx={{ p: 1.5 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {t('collab.task.view')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
          {completed}/{total} {t('collab.task.progress')}
        </Typography>
        <Typography sx={{ fontSize: 10, color: '#863bff' }}>{progress}%</Typography>
      </Box>

      {/* Task title */}
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          mb: 1,
          bgcolor: 'rgba(134, 59, 255, 0.08)',
          borderRadius: 1,
          border: '1px solid rgba(134, 59, 255, 0.15)',
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 500 }}>
          {taskTitle}
        </Typography>
      </Box>

      {/* Dependency legend */}
      {subtasks.some(s => s.dependencies.length > 0) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ArrowIcon sx={{ fontSize: 10, color: 'rgba(134, 59, 255, 0.4)' }} />
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>{t('collab.task.depRelation')}</Typography>
          </Box>
        </Box>
      )}

      {/* Task tree */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {subtasks.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', py: 2 }}>
            {t('collab.task.empty')}
          </Typography>
        ) : (
          levels.map((levelTasks, levelIndex) =>
            levelTasks.map((subtask, taskIndex) => {
              // Build child lines for tree visualization
              const childLines: boolean[] = [];
              for (let l = 0; l < levelIndex; l++) {
                const prevLevelTasks = levels[l] || [];
                // Check if any task in this level has dependency on tasks in level l
                const hasConnection = levelTasks.some(t =>
                  t.dependencies.some(depId =>
                    prevLevelTasks.some(p => p.id === depId)
                  )
                );
                childLines.push(hasConnection);
              }

              return (
                <TaskNode
                  key={subtask.id}
                  subtask={subtask}
                  level={levelIndex}
                  isLast={taskIndex === levelTasks.length - 1}
                  childLines={childLines}
                />
              );
            })
          )
        )}
      </Box>

      {/* Dependency arrow connector between levels */}
      {levels.length > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, mt: 0.5 }}>
          {levels.slice(1).map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 1,
                height: 12,
                bgcolor: 'rgba(134, 59, 255, 0.15)',
                borderLeft: '1px dashed rgba(134, 59, 255, 0.2)',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TaskBreakdown;
