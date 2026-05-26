// V84 OrchestratorPanel Component
// Displays task decomposition tree with full execution flow

import React, { useState, useEffect } from 'react';
import { MyListItemIcon, MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle , MyAvatar as Avatar } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyButton as Button, MyIconButton as IconButton, MyTextField as TextField, MyCollapse, MyPaper as Paper, MyDivider as Divider, MyChip as Chip, MyList, MyListItem, MyListItemText, MyCircularProgress as CircularProgress, MyLinearProgress as LinearProgress, MyTooltip as Tooltip } from '../MUI替代';
import {
  Close as CloseIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as OrchestratorIcon,
  Send as SubmitIcon,
  Summarize as SummaryIcon,
} from '@mui/icons-material';
import { TaskTree } from './TaskTree';
import { CriticBadge } from './CriticBadge';
import { orchestratorService, DEMO_SCENARIOS } from '../../services/agents';
import type { OrchestratorState } from '../../services/agents';
import { eventBus } from '../../services/agents/EventBus';
import type { DecomposedTask, ExecutionResult, DemoScenario } from '../../types/agent';

interface OrchestratorPanelProps {
  open: boolean;
  onClose: () => void;
}

export const OrchestratorPanel: React.FC<OrchestratorPanelProps> = ({ open, onClose }) => {
  const [goal, setGoal] = useState('');
  const [tasks, setTasks] = useState<DecomposedTask[]>([]);
  const [results, setResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [isExecuting, setIsExecuting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTask, setSelectedTask] = useState<DecomposedTask | null>(null);
  const [showDemos, setShowDemos] = useState(true);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = orchestratorService.subscribe((state: OrchestratorState) => {
      setTasks([...state.tasks]);
      setIsExecuting(state.isExecuting);
      setIsComplete(state.isComplete);

      // Update progress
      const completedCount = state.tasks.filter(t => t.status === 'completed').length;
      const totalCount = state.tasks.length;
      setProgress(totalCount > 0 ? (completedCount / totalCount) * 100 : 0);

      // Update results
      if (state.executionResults.size > 0) {
        setResults(new Map(state.executionResults));
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDecompose = () => {
    if (!goal.trim()) return;
    setShowDemos(false);
    setResults(new Map());
    setSummary('');
    orchestratorService.decompose(goal);
  };

  const handleExecuteAll = async () => {
    if (tasks.length === 0) return;
    setIsExecuting(true);
    setResults(new Map());

    try {
      await orchestratorService.executeAllTasks();
      setSummary(orchestratorService.aggregateResults());
    } catch (error) {
      console.error('Execution failed:', error);
    }

    setIsExecuting(false);
  };

  const handleDemoClick = (scenario: DemoScenario) => {
    setGoal(scenario.userRequest);
    setShowDemos(false);
    setResults(new Map());
    setSummary('');
    orchestratorService.decompose(scenario.userRequest);
  };

  const handleTaskClick = (task: DecomposedTask) => {
    setSelectedTask(task);
  };

  const handleReset = () => {
    setGoal('');
    setTasks([]);
    setResults(new Map());
    setSelectedTask(null);
    setIsComplete(false);
    setProgress(0);
    setSummary('');
    setShowDemos(true);
    orchestratorService.reset();
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const approvedCount = Array.from(results.values()).filter(r => r.criticReview?.approved).length;

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
          minHeight: 500,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <OrchestratorIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            🎯 Orchestrator 智能任务分解
          </Typography>
          {tasks.length > 0 && (
            <Chip
              label={`${completedCount}/${tasks.length} 任务`}
              size="small"
              color={isComplete ? 'success' : 'default'}
            />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {tasks.length > 0 && (
            <Tooltip title="重置">
              <IconButton size="small" onClick={handleReset}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Demo Scenarios */}
        {showDemos && tasks.length === 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              📚 演示场景 - 选择一个复杂任务开始体验
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
              {DEMO_SCENARIOS.map(scenario => (
                <Paper
                  key={scenario.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => handleDemoClick(scenario)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                      {scenario.icon}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {scenario.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {scenario.description}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        )}

        {/* Goal Input */}
        {tasks.length === 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              🎯 输入复杂任务目标
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="例如：帮我开发一个用户认证模块，包含登录、注册和密码重置功能"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleDecompose();
                  }
                }}
              />
              <Button
                variant="contained"
                startIcon={<SubmitIcon />}
                onClick={handleDecompose}
                disabled={!goal.trim()}
                sx={{ minWidth: 100 }}
              >
                分解
              </Button>
            </Box>
          </Box>
        )}

        {/* Progress Bar */}
        {isExecuting && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="primary">
                执行中...
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {completedCount}/{tasks.length}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
          </Box>
        )}

        {/* Task Tree */}
        {tasks.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                📋 任务分解树
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {results.size > 0 && (
                  <Chip
                    label={`${approvedCount} 通过审查`}
                    size="small"
                    color={approvedCount === tasks.length ? 'success' : 'warning'}
                  />
                )}
                {!isExecuting && !isComplete && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayIcon />}
                    onClick={handleExecuteAll}
                  >
                    执行全部
                  </Button>
                )}
              </Box>
            </Box>
            <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
              <TaskTree
                tasks={tasks}
                results={results}
                onTaskClick={handleTaskClick}
                selectedTaskId={selectedTask?.id}
              />
            </Paper>
          </Box>
        )}

        {/* Summary */}
        {summary && (
          <Box sx={{ mb: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                bgcolor: 'success.light',
                borderColor: 'success.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <SummaryIcon color="success" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  执行汇总
                </Typography>
              </Box>
              <Typography
                variant="body2"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  m: 0,
                }}
              >
                {summary}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Task Details */}
        {selectedTask && results.has(selectedTask.id) && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              📝 任务详情: {selectedTask.title}
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'background.default' }}>
              {selectedTask.input && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    📥 输入
                  </Typography>
                  <Typography variant="body2">{selectedTask.input}</Typography>
                </Box>
              )}
              {selectedTask.output && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    📤 输出
                  </Typography>
                  <Typography variant="body2">{selectedTask.output}</Typography>
                </Box>
              )}
              {results.get(selectedTask.id)?.criticReview && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    🔍 Critic评审
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <CriticBadge score={results.get(selectedTask.id)!.criticReview!.score} />
                    {results.get(selectedTask.id)!.criticReview!.issues.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="error.main">
                          问题: {results.get(selectedTask.id)!.criticReview!.issues.join(', ')}
                        </Typography>
                      </Box>
                    )}
                    {results.get(selectedTask.id)!.criticReview!.suggestions.length > 0 && (
                      <Box sx={{ mt: 0.25 }}>
                        <Typography variant="caption" color="info.main">
                          建议: {results.get(selectedTask.id)!.criticReview!.suggestions.join(', ')}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        )}

        {/* Flow Diagram */}
        {tasks.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              执行流程
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              <Chip label="用户输入" size="small" variant="outlined" />
              <Typography variant="caption">→</Typography>
              <Chip label="Orchestrator分解" size="small" color="primary" />
              <Typography variant="caption">→</Typography>
              <Chip label="Executor执行" size="small" color="warning" />
              <Typography variant="caption">→</Typography>
              <Chip label="Critic审查" size="small" color="info" />
              <Typography variant="caption">→</Typography>
              <Chip label="汇总结果" size="small" color="success" />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
        {tasks.length > 0 && !isExecuting && (
          <Button onClick={handleReset} startIcon={<RefreshIcon />}>
            重置
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default OrchestratorPanel;
