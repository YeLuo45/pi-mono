/**
 * AgentPanel - Main task center panel for the Agent system
 * Agent task center: queue, stats, and controls (macOS split layout uses MacItemList + detail).
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyChip as Chip, MyDivider, MyTextField as TextField, MyButton as Button, MySelect as Select , MyFormControl as FormControl, MyMenuItem as MenuItem } from '../MUI替代';
import {
  Add as AddIcon,
  FlashOn as FlashIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { TaskQueue } from './TaskQueue';
import { TaskCard } from './TaskCard';
import { taskQueue } from '../../services/agent/taskQueue';
import { useMacSplitStore } from '../../stores/macSplitStore';
import { agentExecutor } from '../../services/agent/agentExecutor';
import { memoryManager } from '../../services/agent/memory/memoryManager';
import { saveTaskQueue } from '../../services/storage/taskStorage';
import type { Task, TaskPriority } from '../../services/agent/types';
import { useSceneAwareness } from '../../hooks/useSceneAwareness';

export const AgentPanel: React.FC<{ splitLayout?: boolean }> = ({ splitLayout = false }) => {
  const { t } = useTranslation();
  const agentTaskId = useMacSplitStore((s) => s.agentTaskId);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal');
  const [memoryStats, setMemoryStats] = useState({ count: 0, preview: null as string | null });

  // Scene awareness tracking
  const { recordAction, recordError } = useSceneAwareness();

  const handleCreateTask = () => {
    if (!newGoal.trim()) return;

    const task: Task = {
      id: crypto.randomUUID(),
      goal: newGoal.trim(),
      status: 'pending',
      priority: newPriority,
      steps: [],
      currentStepIndex: 0,
      context: {},
      createdAt: Date.now(),
      progress: 0,
    };

    taskQueue.enqueue(task, newPriority);
    setNewGoal('');
    setShowCreate(false);
  };

  const handleStartNext = () => {
    const task = taskQueue.startNext();
    if (task) {
      recordAction('task_start');
      console.log(`[AgentPanel] Starting task via executor: ${task.goal}`);
      // Wire up executor callbacks for persistence
      agentExecutor.onTaskProgress = async () => {
        await saveTaskQueue(taskQueue.getAllTasks(), taskQueue.getRunningTaskId());
      };
      agentExecutor.onTaskComplete = async () => {
        recordAction('task_complete');
        await saveTaskQueue(taskQueue.getAllTasks(), null);
      };
      agentExecutor.onTaskFail = async () => {
        recordError();
        await saveTaskQueue(taskQueue.getAllTasks(), null);
      };
      void agentExecutor.executeTask(task.id);
    }
  };

  const stats = taskQueue.getStats();
  const isRunning = taskQueue.isRunning();

  // Update memory stats periodically
  useEffect(() => {
    const updateMemoryStats = () => {
      setMemoryStats(memoryManager.getStats());
    };
    updateMemoryStats();
    const interval = setInterval(updateMemoryStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!splitLayout) return;
    const refresh = () => setTasks([...taskQueue.getAllTasks()]);
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [splitLayout]);

  const selectedTask = splitLayout ? tasks.find((t) => t.id === agentTaskId) : undefined;

  const handleClearMemory = () => {
    memoryManager.clear();
    setMemoryStats({ count: 0, preview: null });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <FlashIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
          {t('agent.taskCenter', '任务中心')}
        </Typography>

        {/* Quick status */}
        {isRunning ? (
          <Chip
            label={t('agent.running', '运行中')}
            size="small"
            sx={{
              fontSize: 10,
              height: 20,
              bgcolor: 'rgba(33,150,243,0.15)',
              color: '#2196F3',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 },
              },
            }}
          />
        ) : (
          <Chip
            label={t('agent.idle', '空闲')}
            size="small"
            sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(158,158,158,0.15)', color: '#9E9E9E' }}
          />
        )}

        {/* Quick start button */}
        {!isRunning && stats.pending > 0 && (
          <Button
            size="small"
            variant="contained"
            onClick={handleStartNext}
            sx={{ fontSize: 10, py: 0.3, px: 1, minWidth: 0 }}
          >
            {t('agent.executeNext', '执行下一个')}
          </Button>
        )}

        {/* Create task toggle */}
        <IconButton
          size="small"
          onClick={() => setShowCreate((v) => !v)}
          sx={{ p: 0.5 }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Quick create form */}
      {showCreate && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              placeholder={t('agent.taskGoalPlaceholder', '输入任务目标...')}
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              size="small"
              fullWidth
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateTask();
                if (e.key === 'Escape') setShowCreate(false);
              }}
              sx={{
                '& .MuiInputBase-input': { fontSize: 12 },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                sx={{ fontSize: 12 }}
              >
                <MenuItem value="low">{t('agent.priorityLow', '低')}</MenuItem>
                <MenuItem value="normal">{t('agent.priorityNormal', '普通')}</MenuItem>
                <MenuItem value="high">{t('agent.priorityHigh', '高')}</MenuItem>
                <MenuItem value="urgent">{t('agent.priorityUrgent', '紧急')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => setShowCreate(false)} sx={{ fontSize: 11 }}>
              {t('common.cancel', '取消')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateTask}
              disabled={!newGoal.trim()}
              sx={{ fontSize: 11 }}
            >
              {t('agent.createTask', '创建任务')}
            </Button>
          </Box>
        </Box>
      )}

      {/* Stats summary bar */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: 2,
        }}
      >
        {[
          { label: t('agent.queue', '队列'), value: stats.total, color: '#9E9E9E' },
          { label: t('agent.waiting', '等待'), value: stats.pending, color: '#FF9800' },
          { label: t('agent.running', '运行'), value: stats.running, color: '#2196F3' },
          { label: t('agent.paused', '暂停'), value: stats.paused, color: '#9E9E9E' },
          { label: t('agent.completed', '完成'), value: stats.completed, color: '#4CAF50' },
          { label: t('agent.failed', '失败'), value: stats.failed, color: '#F44336' },
        ].map(({ label, value, color }) => (
          <Box key={label} sx={{ textAlign: 'center' }}>
            <Typography
              variant="caption"
              sx={{ fontSize: 14, fontWeight: 700, color, display: 'block', lineHeight: 1 }}
            >
              {value}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Memory status bar */}
      <Box
        sx={{
          px: 2,
          py: 0.75,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'rgba(255,255,255,0.02)',
        }}
      >
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
          {t('agent.memory', '记忆')}: {memoryStats.count}
        </Typography>
        {memoryStats.preview && (
          <Typography
            variant="caption"
            sx={{ fontSize: 9, color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {memoryStats.preview}
          </Typography>
        )}
        <IconButton
          size="small"
          onClick={handleClearMemory}
          sx={{ p: 0.25, opacity: memoryStats.count > 0 ? 1 : 0.3 }}
          disabled={memoryStats.count === 0}
        >
          <DeleteIcon sx={{ fontSize: 12 }} />
        </IconButton>
      </Box>

      {/* Task queue / selected task detail */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {splitLayout ? (
          <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
            {selectedTask ? (
              <TaskCard
                task={selectedTask}
                onPause={() => taskQueue.pauseCurrent()}
                onResume={() => taskQueue.resume(selectedTask.id)}
                onCancel={() => taskQueue.dequeue(selectedTask.id)}
              />
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                {t('macos.selectItem', '选择一项以查看详情')}
              </Typography>
            )}
          </Box>
        ) : (
          <TaskQueue />
        )}
      </Box>
    </Box>
  );
};

export default AgentPanel;
