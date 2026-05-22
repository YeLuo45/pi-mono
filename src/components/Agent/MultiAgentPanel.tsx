// V83 MultiAgentPanel Component
// V89 Updated: Added Agent-Skill collaboration chain display
// 侧边栏Agent列表

import React, { useState, useEffect, useCallback } from 'react';
import { MyBadge, MyListItemIcon, MyAccordion, MyAccordionSummary, MyAccordionDetails } from '../MUI替代';
import { MyBox, MyTypography, MyIconButton, MyTooltip, MyDrawer, MyDivider, MyChip, MyIconButton, MyList, MyListItem, MyListItemText, MyCollapse, MyPaper, MyButton } from '../MUI替代';
import {
  ExpandLess,
  ExpandMore,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Psychology as AgentIcon,
  Dashboard as DashboardIcon,
  FlashOn as SkillIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { eventBus } from '../../services/agents/EventBus';
import { agentManager } from '../../services/agents/AgentManager';
import { TaskBoardModal } from './TaskBoardModal';
import { OrchestratorPanel } from './OrchestratorPanel';
import type { Agent, AgentEvent } from '../../types/agent';
import type { SkillExecution } from '../../services/agent-skill/types';

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

// ===========================================================================
// V89: Agent-Skill Chain Panel Component
// ===========================================================================

interface AgentSkillChainPanelProps {
  agents: Agent[];
}

const AgentSkillChainPanel: React.FC<AgentSkillChainPanelProps> = ({ agents }) => {
  const [skillExecutions, setSkillExecutions] = useState<SkillExecution[]>([]);
  const [expanded, setExpanded] = useState(false);

  const handleSkillEvent = useCallback(() => {
    // Refresh executions for active agents
    const allExecutions: SkillExecution[] = [];
    agents.forEach(agent => {
      const execs = agentManager.getSkillExecutionHistory(agent.id);
      allExecutions.push(...execs);
    });
    setSkillExecutions(allExecutions.slice(-10)); // Last 10
  }, [agents]);

  useEffect(() => {
    // Subscribe to skill execution events
    const unsubStart = eventBus.on('agent-skill:skill:execution_start', handleSkillEvent);
    const unsubComplete = eventBus.on('agent-skill:skill:execution_complete', handleSkillEvent);
    const unsubFailed = eventBus.on('agent-skill:skill:execution_failed', handleSkillEvent);

    return () => {
      unsubStart();
      unsubComplete();
      unsubFailed();
    };
  }, [handleSkillEvent]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return '#9ca3af';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  if (skillExecutions.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        暂无技能协作记录
      </Typography>
    );
  }

  return (
    <Box>
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
        <AccordionSummary sx={{ minHeight: 32, '& .MuiAccordionSummary-content': { my: 0 } }}>
          <Typography variant="caption" sx={{ color: 'primary.main' }}>
            {expanded ? '收起' : '查看'} {skillExecutions.length} 条协作记录
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {skillExecutions.map((exec, idx) => {
              const agent = agents.find(a => a.id === exec.agentId);
              return (
                <Box
                  key={exec.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 0.5,
                    borderRadius: 0.5,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                    {getStatusIcon(exec.status)}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600 }}>
                    {agent?.icon || '🤖'}{agent?.name || exec.agentId}
                  </Typography>
                  <ArrowIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'primary.main' }}>
                    {exec.skillId}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    label={exec.status}
                    size="small"
                    sx={{
                      height: 14,
                      fontSize: 8,
                      bgcolor: `${getStatusColor(exec.status)}20`,
                      color: getStatusColor(exec.status),
                    }}
                  />
                  {exec.confidence !== undefined && (
                    <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                      {Math.round(exec.confidence * 100)}%
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export const MultiAgentPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [taskBoardOpen, setTaskBoardOpen] = useState(false);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const updateAgents = useCallback(() => {
    setAgents(agentManager.getAgents());
  }, []);

  const handleNewMessage = useCallback((event: AgentEvent) => {
    if (event.agentId) {
      setAgents(agentManager.getAgents());
    }
  }, []);

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
  }, [updateAgents, handleNewMessage]);

  const handleRefresh = useCallback(() => {
    setAgents(agentManager.getAgents());
  }, []);

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
            <Tooltip title="Orchestrator">
              <Button
                size="small"
                startIcon={<DashboardIcon />}
                onClick={() => setOrchestratorOpen(true)}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                分解
              </Button>
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
            {agents.map((agent, agentIdx) => (
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

                {agentIdx < agents.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </Box>
            ))}
          </List>
        </Box>

        {/* V89: Agent-Skill Collaboration Chain Section */}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}>
            🔗 Agent×Skill 协作链路
          </Typography>
          <AgentSkillChainPanel agents={agents} />
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

      {/* Orchestrator Panel */}
      <OrchestratorPanel open={orchestratorOpen} onClose={() => setOrchestratorOpen(false)} />
    </>
  );
};

export default MultiAgentPanel;
