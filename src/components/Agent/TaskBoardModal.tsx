// V83 TaskBoardModal Component
// 任务看板（Kanban三列）

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as RunIcon,
} from '@mui/icons-material';
import { eventBus } from '../../services/agents/EventBus';
import { taskScheduler } from '../../services/agents/TaskScheduler';
import { agentManager } from '../../services/agents/AgentManager';
import { AgentThoughtBubble } from './AgentThoughtBubble';
import type { Task, AgentEvent } from '../../types/agent';

interface TaskBoardModalProps {
  open: boolean;
  onClose: () => void;
}

export const TaskBoardModal: React.FC<TaskBoardModalProps> = ({ open, onClose }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [thoughts, setThoughts] = useState<Array<{ agentId: string; content: string; type: string }>>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (open) {
      // Subscribe to task events
      const unsubTaskCreated = eventBus.on('task:created', handleTaskEvent);
      const unsubTaskAssigned = eventBus.on('task:assigned', handleTaskEvent);
      const unsubTaskStatus = eventBus.on('task:status_changed', handleTaskEvent);
      const unsubTaskCompleted = eventBus.on('task:completed', handleTaskEvent);
      const unsubTaskFailed = eventBus.on('task:failed', handleTaskEvent);
      const unsubAgentMessage = eventBus.on('agent:message', handleAgentMessage);

      // Load pending tasks
      setTasks(taskScheduler.getPending());

      return () => {
        unsubTaskCreated();
        unsubTaskAssigned();
        unsubTaskStatus();
        unsubTaskCompleted();
        unsubTaskFailed();
        unsubAgentMessage();
      };
    }
  }, [open]);

  const handleTaskEvent = (event: AgentEvent) => {
    setTasks(taskScheduler.getPending());
  };

  const handleAgentMessage = (event: AgentEvent) => {
    if (event.payload && typeof event.payload === 'object' && 'content' in (event.payload as any)) {
      const msg = event.payload as { content: string; type: string };
      setThoughts(prev => [
        ...prev.slice(-4),
        { agentId: event.agentId || '', content: msg.content, type: msg.type },
      ]);
    }
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;

    const task: Task = {
      id: `task_${Date.now()}`,
      title: newTaskTitle,
      description: newTaskTitle,
      status: 'pending',
      children: [],
    };

    // Schedule the task
    taskScheduler.schedule(task, async () => {
      await agentManager.assignTask(task, 'executor');
    });

    setNewTaskTitle('');
  };

  const handleRunDemo = async () => {
    // Demo: Run a simple multi-agent coordination
    setThoughts([]);

    const { orchestratorTask, subTasks } = await agentManager.coordinateTask('帮我分析一下今天的天气');

    setTasks(prev => [...prev, orchestratorTask, ...subTasks]);

    // Show thoughts
    setThoughts(prev => [
      ...prev,
      { agentId: 'orchestrator', content: '收到请求：帮我分析一下今天的天气', type: 'thought' },
      { agentId: 'orchestrator', content: '正在分解任务...', type: 'action' },
      { agentId: 'planner', content: '创建执行计划：获取天气数据 -> 分析数据 -> 输出结果', type: 'thought' },
      { agentId: 'executor', content: '正在获取天气数据...', type: 'action' },
      { agentId: 'executor', content: '天气数据：晴，温度25度', type: 'result' },
      { agentId: 'critic', content: '结果看起来合理，但建议增加湿度信息', type: 'critique' },
    ]);
  };

  const handleClearTasks = () => {
    taskScheduler.clear();
    setTasks([]);
    setThoughts([]);
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          📋 任务看板
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<RunIcon />}
            size="small"
            variant="outlined"
            onClick={handleRunDemo}
          >
            运行演示
          </Button>
          <Button
            startIcon={<DeleteIcon />}
            size="small"
            variant="outlined"
            color="error"
            onClick={handleClearTasks}
          >
            清空
          </Button>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Add Task Input */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="输入新任务..."
            value={newTaskTitle}
            onChange={e => setNewTaskTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
          />
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={handleAddTask}
            disabled={!newTaskTitle.trim()}
          >
            添加
          </Button>
        </Box>

        {/* Kanban Board */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          {/* Pending Column */}
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label="待处理" size="small" sx={{ bgcolor: 'grey.500' }} />
              <Typography variant="caption" color="text.secondary">
                {pendingTasks.length}
              </Typography>
            </Box>
            <List dense disablePadding>
              {pendingTasks.map(task => (
                <ListItem
                  key={task.id}
                  sx={{
                    bgcolor: 'background.default',
                    borderRadius: 1,
                    mb: 0.5,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <ListItemText
                    primary={task.title}
                    secondary={task.assignedAgent ? `分配给: ${task.assignedAgent}` : undefined}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              ))}
              {pendingTasks.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                  暂无待处理任务
                </Typography>
              )}
            </List>
          </Paper>

          {/* In Progress Column */}
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label="进行中" size="small" color="warning" />
              <Typography variant="caption" color="text.secondary">
                {inProgressTasks.length}
              </Typography>
            </Box>
            <List dense disablePadding>
              {inProgressTasks.map(task => (
                <ListItem
                  key={task.id}
                  sx={{
                    bgcolor: 'warning.main',
                    opacity: 0.1,
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemText
                    primary={task.title}
                    secondary={task.assignedAgent ? `分配给: ${task.assignedAgent}` : undefined}
                    primaryTypographyProps={{ variant: 'body2', sx: { color: 'warning.contrastText' } }}
                    secondaryTypographyProps={{ variant: 'caption', sx: { color: 'warning.contrastText' } }}
                  />
                </ListItem>
              ))}
              {inProgressTasks.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                  暂无进行中任务
                </Typography>
              )}
            </List>
          </Paper>

          {/* Completed Column */}
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label="已完成" size="small" color="success" />
              <Typography variant="caption" color="text.secondary">
                {completedTasks.length}
              </Typography>
            </Box>
            <List dense disablePadding>
              {completedTasks.map(task => (
                <ListItem
                  key={task.id}
                  sx={{
                    bgcolor: 'success.main',
                    opacity: 0.1,
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <ListItemText
                    primary={task.title}
                    secondary={task.assignedAgent ? `分配给: ${task.assignedAgent}` : undefined}
                    primaryTypographyProps={{ variant: 'body2', sx: { color: 'success.contrastText' } }}
                    secondaryTypographyProps={{ variant: 'caption', sx: { color: 'success.contrastText' } }}
                  />
                </ListItem>
              ))}
              {completedTasks.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ p: 1 }}>
                  暂无已完成任务
                </Typography>
              )}
            </List>
          </Paper>
        </Box>

        {/* Agent Thoughts Section */}
        {thoughts.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              💭 Agent思考过程
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {thoughts.map((thought, idx) => (
                <AgentThoughtBubble
                  key={idx}
                  agentId={thought.agentId}
                  content={thought.content}
                  type={thought.type as 'thought' | 'action' | 'result' | 'critique'}
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskBoardModal;
