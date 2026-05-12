// V83 MultiAgentPanel Component
// 侧边栏Agent列表

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  Drawer,
  Divider,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Paper,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Psychology as AgentIcon,
} from '@mui/icons-material';
import { eventBus } from '../../services/agents/EventBus';
import { agentManager } from '../../services/agents/AgentManager';
import { TaskBoardModal } from './TaskBoardModal';
import type { Agent, AgentEvent } from '../../types/agent';

const STATUS_COLORS: Record<Agent['status'], string> = {
  idle: '#9ca3af',
  running: '#10b981',
  thinking: '#f59e0b',
  waiting: '#6366f1',
};

const STATUS_LABELS: Record<Agent['status'], string> = {
  idle: '空闲',
  running: '运行中',
  thinking: '思考中',
  waiting: '等待中',
};

export const MultiAgentPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [taskBoardOpen, setTaskBoardOpen] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  useEffect(() => {
    // Initialize agents
    agentManager.initialize();
    setAgents(agentManager.getAgents());

    // Subscribe to agent events
    const unsubCreated = eventBus.on('agent:created', updateAgents);
    const unsubStatus = eventBus.on('agent:status_changed', updateAgents);
    const unsubMessage = eventBus.on('agent:message', handleNewMessage);

    return () => {
      unsubCreated();
      unsubStatus();
      unsubMessage();
    };
  }, []);

  const updateAgents = () => {
    setAgents(agentManager.getAgents());
  };

  const handleNewMessage = (event: AgentEvent) => {
    if (event.agentId) {
      setAgents(agentManager.getAgents());
    }
  };

  const handleRefresh = () => {
    setAgents(agentManager.getAgents());
  };

  const runningCount = agents.filter(a => a.status === 'running' || a.status === 'thinking').length;

  const toggleAgentExpand = (agentId: string) => {
    setExpandedAgent(expandedAgent === agentId ? null : agentId);
  };

  return (
    <>
      {/* Floating Button */}
      <Tooltip title="多Agent协作" placement="left">
        <IconButton
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            '&:hover': {
              backgroundColor: 'primary.dark',
            },
          }}
        >
          <Badge
            badgeContent={runningCount}
            color="error"
            sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 18, minWidth: 18 } }}
          >
            <AgentIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Side Panel */}
      <Drawer
        anchor="right"
        open={isOpen}
        onClose={() => setIsOpen(false)}
        PaperProps={{
          sx: {
            width: 320,
            bgcolor: 'background.paper',
            borderLeft: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
              🤖 Agent协作
            </Typography>
            <Chip label={`${agents.length}个Agent`} size="small" sx={{ height: 22 }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="刷新">
              <IconButton size="small" onClick={handleRefresh}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="任务看板">
              <IconButton size="small" onClick={() => setTaskBoardOpen(true)}>
                <PlayIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="关闭">
              <IconButton size="small" onClick={() => setIsOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Agent List */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
          <List disablePadding>
            {agents.map(agent => (
              <Box key={agent.id}>
                <ListItem
                  onClick={() => toggleAgentExpand(agent.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: 'pointer',
                    bgcolor: agent.status !== 'idle' ? 'action.hover' : 'transparent',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <Avatar
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: 14,
                        bgcolor: STATUS_COLORS[agent.status],
                      }}
                    >
                      {agent.icon}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {agent.name}
                        </Typography>
                        <Chip
                          label={STATUS_LABELS[agent.status]}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            bgcolor: STATUS_COLORS[agent.status],
                            color: 'white',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      agent.currentTask
                        ? `任务: ${agent.currentTask}`
                        : agent.capabilities.slice(0, 2).join(', ')
                    }
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                  {expandedAgent === agent.id ? <ExpandLess /> : <ExpandMore />}
                </ListItem>

                {/* Expanded Message History */}
                <Collapse in={expandedAgent === agent.id}>
                  <Box sx={{ pl: 4, pr: 1, pb: 1 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1,
                        maxHeight: 200,
                        overflow: 'auto',
                        bgcolor: 'background.default',
                      }}
                    >
                      {agent.messages.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          暂无消息
                        </Typography>
                      ) : (
                        agent.messages.slice(-5).map(msg => (
                          <Box
                            key={msg.id}
                            sx={{
                              mb: 0.5,
                              p: 0.5,
                              borderRadius: 0.5,
                              bgcolor:
                                msg.type === 'thought'
                                  ? 'warning.main'
                                  : msg.type === 'action'
                                  ? 'info.main'
                                  : msg.type === 'result'
                                  ? 'success.main'
                                  : 'error.main',
                              opacity: 0.8,
                            }}
                          >
                            <Typography variant="caption" sx={{ fontSize: 10, color: 'white' }}>
                              [{msg.type}] {msg.content}
                            </Typography>
                          </Box>
                        ))
                      )}
                    </Paper>
                  </Box>
                </Collapse>

                {agents.indexOf(agent) < agents.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </Box>
            ))}
          </List>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {runningCount > 0 ? `⚡ ${runningCount} 个Agent正在运行` : '✓ 所有Agent空闲'}
          </Typography>
        </Box>
      </Drawer>

      {/* Task Board Modal */}
      <TaskBoardModal open={taskBoardOpen} onClose={() => setTaskBoardOpen(false)} />
    </>
  );
};

export default MultiAgentPanel;
