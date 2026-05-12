// V84 TaskTree Component
// Visualizes task decomposition tree structure

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CompletedIcon,
  PlayCircle as InProgressIcon,
  Schedule as PendingIcon,
  SwapVert as DependencyIcon,
} from '@mui/icons-material';
import { CriticBadge } from './CriticBadge';
import type { DecomposedTask, ExecutionResult, CriticReview } from '../../types/agent';

interface TaskTreeProps {
  tasks: DecomposedTask[];
  results?: Map<string, ExecutionResult>;
  onTaskClick?: (task: DecomposedTask) => void;
  selectedTaskId?: string;
}

const STATUS_ICONS = {
  pending: <PendingIcon sx={{ fontSize: 16, color: 'text.secondary' }} />,
  in_progress: <InProgressIcon sx={{ fontSize: 16, color: 'warning.main' }} />,
  completed: <CompletedIcon sx={{ fontSize: 16, color: 'success.main' }} />,
};

const STATUS_COLORS = {
  pending: 'grey.400',
  in_progress: 'warning.main',
  completed: 'success.main',
};

const PRIORITY_COLORS = {
  high: 'error',
  medium: 'warning',
  low: 'info',
};

interface TaskNodeProps {
  task: DecomposedTask;
  results?: Map<string, ExecutionResult>;
  onTaskClick?: (task: DecomposedTask) => void;
  selectedTaskId?: string;
  level?: number;
}

const TaskNode: React.FC<TaskNodeProps> = ({
  task,
  results,
  onTaskClick,
  selectedTaskId,
  level = 0,
}) => {
  const [expanded, setExpanded] = useState(level === 0);
  const result = results?.get(task.id);
  const criticReview = result?.criticReview;
  const hasChildren = task.children && task.children.length > 0;

  const handleClick = () => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <Box sx={{ mb: 0.5 }}>
      {/* Task Row */}
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          py: 0.5,
          px: 1,
          borderRadius: 1,
          cursor: onTaskClick ? 'pointer' : 'default',
          bgcolor: selectedTaskId === task.id ? 'action.selected' : 'transparent',
          '&:hover': {
            bgcolor: selectedTaskId === task.id ? 'action.selected' : 'action.hover',
          },
          pl: level * 2 + 1,
        }}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={handleExpand}
            sx={{ p: 0.25, mr: 0.25 }}
          >
            {expanded ? (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            ) : (
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        ) : (
          <Box sx={{ width: 24 }} />
        )}

        {/* Status Icon */}
        {STATUS_ICONS[task.status]}

        {/* Task Title */}
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontSize: 13,
            fontWeight: task.priority === 'high' ? 600 : 400,
          }}
        >
          {task.title}
        </Typography>

        {/* Priority Badge */}
        <Chip
          label={task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
          size="small"
          color={PRIORITY_COLORS[task.priority]}
          sx={{ height: 18, fontSize: 10, mr: 0.5 }}
        />

        {/* Agent Badge */}
        {task.suggestedAgent && (
          <Chip
            label={task.suggestedAgent}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: 10, mr: 0.5 }}
          />
        )}

        {/* Critic Score */}
        {criticReview && (
          <CriticBadge score={criticReview.score} showLabel={false} size="small" />
        )}

        {/* Retry Count */}
        {task.retryCount !== undefined && task.retryCount > 0 && (
          <Chip
            label={`重试${task.retryCount}`}
            size="small"
            color="warning"
            sx={{ height: 18, fontSize: 10 }}
          />
        )}
      </Box>

      {/* Dependencies Indicator */}
      {task.dependencies && task.dependencies.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            pl: level * 2 + 4,
            mb: 0.5,
          }}
        >
          <DependencyIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
            依赖: {task.dependencies.length}个任务
          </Typography>
        </Box>
      )}

      {/* Children */}
      {hasChildren && (
        <Collapse in={expanded}>
          <Box sx={{ pl: 1 }}>
            {/* Connector Line */}
            <Divider sx={{ ml: 1 }} />
          </Box>
        </Collapse>
      )}

      {/* Task Details Panel */}
      {expanded && (task.input || task.output || criticReview) && (
        <Paper
          variant="outlined"
          sx={{
            mx: 2,
            my: 0.5,
            p: 1,
            bgcolor: 'background.default',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          {task.input && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                📥 输入
              </Typography>
              <Typography variant="caption" display="block" sx={{ fontSize: 11 }}>
                {task.input.length > 100 ? `${task.input.substring(0, 100)}...` : task.input}
              </Typography>
            </Box>
          )}

          {task.output && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                📤 输出
              </Typography>
              <Typography variant="caption" display="block" sx={{ fontSize: 11 }}>
                {task.output.length > 150 ? `${task.output.substring(0, 150)}...` : task.output}
              </Typography>
            </Box>
          )}

          {criticReview && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                🔍 Critic评审
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <CriticBadge score={criticReview.score} size="small" />
                {criticReview.issues.length > 0 && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="error.main" sx={{ fontSize: 10 }}>
                      问题: {criticReview.issues.join(', ')}
                    </Typography>
                  </Box>
                )}
                {criticReview.suggestions.length > 0 && (
                  <Box sx={{ mt: 0.25 }}>
                    <Typography variant="caption" color="info.main" sx={{ fontSize: 10 }}>
                      建议: {criticReview.suggestions.join(', ')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export const TaskTree: React.FC<TaskTreeProps> = ({
  tasks,
  results,
  onTaskClick,
  selectedTaskId,
}) => {
  if (tasks.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          暂无任务
        </Typography>
      </Box>
    );
  }

  // Find root tasks (no parent)
  const rootTasks = tasks.filter(t => !t.parentTaskId);

  // Build task map for children lookup
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  // Recursive function to build tree
  const renderTaskWithChildren = (task: DecomposedTask, level: number): React.ReactNode => {
    const children = tasks.filter(t => t.parentTaskId === task.id);

    return (
      <Box key={task.id}>
        <TaskNode
          task={task}
          results={results}
          onTaskClick={onTaskClick}
          selectedTaskId={selectedTaskId}
          level={level}
        />
        {children.map(child => renderTaskWithChildren(child, level + 1))}
      </Box>
    );
  };

  return (
    <Box sx={{ overflow: 'auto' }}>
      {rootTasks.length > 0 ? (
        rootTasks.map(task => renderTaskWithChildren(task, 0))
      ) : (
        // No parent tasks found, render all tasks at root level
        tasks.map(task => (
          <TaskNode
            key={task.id}
            task={task}
            results={results}
            onTaskClick={onTaskClick}
            selectedTaskId={selectedTaskId}
            level={0}
          />
        ))
      )}
    </Box>
  );
};

export default TaskTree;
