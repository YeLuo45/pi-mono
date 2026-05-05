/**
 * AgentPanel - Main task center panel for the Agent system
 * Displayed as a tab in the Sidebar. Shows agent task queue, stats, and controls.
 */

import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Chip, Divider,
  TextField, Button, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  FlashOn as FlashIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { TaskQueue } from './TaskQueue';
import { taskQueue } from '../../services/agent/taskQueue';
import type { Task, TaskPriority } from '../../services/agent/types';

export const AgentPanel: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('normal');

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
      console.log(`[AgentPanel] Started task: ${task.goal}`);
    }
  };

  const stats = taskQueue.getStats();
  const isRunning = taskQueue.isRunning();

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
          任务中心
        </Typography>

        {/* Quick status */}
        {isRunning ? (
          <Chip
            label="运行中"
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
            label="空闲"
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
            执行下一个
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
              placeholder="输入任务目标..."
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
                <MenuItem value="low">低</MenuItem>
                <MenuItem value="normal">普通</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="urgent">紧急</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => setShowCreate(false)} sx={{ fontSize: 11 }}>
              取消
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateTask}
              disabled={!newGoal.trim()}
              sx={{ fontSize: 11 }}
            >
              创建任务
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
          { label: '队列', value: stats.total, color: '#9E9E9E' },
          { label: '等待', value: stats.pending, color: '#FF9800' },
          { label: '运行', value: stats.running, color: '#2196F3' },
          { label: '暂停', value: stats.paused, color: '#9E9E9E' },
          { label: '完成', value: stats.completed, color: '#4CAF50' },
          { label: '失败', value: stats.failed, color: '#F44336' },
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

      {/* Task queue */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <TaskQueue />
      </Box>
    </Box>
  );
};

export default AgentPanel;
