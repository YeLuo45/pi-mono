/**
 * TaskQueue - Agent task list panel connected to agentStore
 * Displays all agent tasks with real-time status, allows control actions
 */

import React, { useEffect, useState } from 'react';
import { MyTypography as Typography, MyChip as Chip, MyTabs as Tabs, MyIconButton as IconButton, MyTooltip as Tooltip , MyTab as Tab } from '../MUI替代';
import { Box } from '../ui/Box';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { TaskCard } from './TaskCard';
import { taskQueue } from '../../services/agent/taskQueue';
import { agentExecutor } from '../../services/agent/agentExecutor';
import { loadTaskQueue, saveTaskQueue } from '../../services/storage/taskStorage';
import type { Task, TaskStatus } from '../../services/agent/types';

type FilterTab = 'all' | 'running' | 'pending' | 'completed' | 'failed';

interface TaskQueueProps {
  onTaskSelect?: (task: Task) => void;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({ onTaskSelect }) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [tasks, setTasks] = useState<Task[]>([]);

  // Sync with TaskQueue instance
  const refreshTasks = () => {
    setTasks([...taskQueue.getAllTasks()]);
  };

  useEffect(() => {
    // Restore persisted queue from IndexedDB
    loadTaskQueue().then((persisted) => {
      if (persisted && persisted.tasks.length > 0) {
        console.log('[TaskQueue] Restoring persisted queue with', persisted.tasks.length, 'tasks');
        // Re-hydrate taskQueue from persisted data
        // For now: restore pending/completed tasks, resume running task
        const runningTask = persisted.tasks.find((t) => t.id === persisted.runningTaskId);
        if (runningTask && runningTask.status === 'running') {
          console.log('[TaskQueue] Resuming running task:', runningTask.id);
          void agentExecutor.executeTask(runningTask.id);
        }
      }
    }).catch((err) => {
      console.warn('[TaskQueue] Failed to restore queue:', err);
    });

    refreshTasks();

    // Listen for task events
    const onStart = (task: Task) => { refreshTasks(); };
    const onComplete = (task: Task) => {
      refreshTasks();
      void saveTaskQueue(taskQueue.getAllTasks(), null);
    };
    const onFail = (task: Task) => {
      refreshTasks();
      void saveTaskQueue(taskQueue.getAllTasks(), null);
    };
    const onProgress = (task: Task) => {
      refreshTasks();
      void saveTaskQueue(taskQueue.getAllTasks(), taskQueue.getRunningTaskId());
    };

    taskQueue.onTaskStart = onStart;
    taskQueue.onTaskComplete = onComplete;
    taskQueue.onTaskFail = onFail;
    taskQueue.onTaskProgress = onProgress;

    return () => {
      taskQueue.onTaskStart = undefined;
      taskQueue.onTaskComplete = undefined;
      taskQueue.onTaskFail = undefined;
      taskQueue.onTaskProgress = undefined;
    };
  }, []);

  // Also poll periodically for status changes
  useEffect(() => {
    const interval = setInterval(refreshTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'running') return task.status === 'running';
    if (filter === 'pending') return task.status === 'pending' || task.status === 'paused';
    if (filter === 'completed') return task.status === 'completed';
    if (filter === 'failed') return task.status === 'failed' || task.status === 'cancelled';
    return true;
  });

  const runningCount = tasks.filter((t) => t.status === 'running').length;
  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'paused').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const failedCount = tasks.filter((t) => t.status === 'failed' || t.status === 'cancelled').length;

  const handlePause = (taskId: string) => {
    taskQueue.pauseCurrent();
    refreshTasks();
  };

  const handleResume = (taskId: string) => {
    taskQueue.resume(taskId);
    refreshTasks();
  };

  const handleCancel = (taskId: string) => {
    taskQueue.dequeue(taskId);
    refreshTasks();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Stats row */}
      <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', flex: 1 }}>
          {tasks.length} total tasks
        </Typography>
        <Chip label={`${runningCount} running`} size="small" sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(33,150,243,0.15)', color: '#2196F3' }} />
        <Chip label={`${pendingCount} pending`} size="small" sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(158,158,158,0.15)', color: '#9E9E9E' }} />
        <Chip label={`${completedCount} done`} size="small" sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(76,175,80,0.15)', color: '#4CAF50' }} />
        {failedCount > 0 && (
          <Chip label={`${failedCount} failed`} size="small" sx={{ fontSize: 9, height: 18, bgcolor: 'rgba(244,67,54,0.15)', color: '#F44336' }} />
        )}
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={refreshTasks} sx={{ p: 0.3 }}>
            <RefreshIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onChange={(_, v) => setFilter(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          minHeight: 36,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          '& .MuiTab-root': { minHeight: 36, fontSize: 11, px: 1.5 },
        }}
      >
        <Tab value="all" label="All" />
        <Tab value="running" label="Running" />
        <Tab value="pending" label="Pending" />
        <Tab value="completed" label="Completed" />
        <Tab value="failed" label="Failed" />
      </Tabs>

      {/* Task list */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        {filteredTasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.4 }}>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              No tasks
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.disabled' }}>
              Agent tasks will appear here
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredTasks.map((task) => (
              <Box
                key={task.id}
                onClick={() => onTaskSelect?.(task)}
                sx={{ cursor: onTaskSelect ? 'pointer' : 'default' }}
              >
                <TaskCard
                  task={task}
                  onPause={handlePause}
                  onResume={handleResume}
                  onCancel={handleCancel}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TaskQueue;
