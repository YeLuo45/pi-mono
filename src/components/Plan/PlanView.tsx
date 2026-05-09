/**
 * PlanView — UI for displaying and executing a Plan
 *
 * Shows:
 * - Plan goal
 * - Step list with status indicators (pending / running / completed / failed)
 * - Risk badges per step
 * - Execute / Cancel / Confirm controls
 * - Real-time progress bar
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Collapse,
  IconButton,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Check as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { usePlanExecution } from '../../hooks/usePlanExecution';
import type { PlanStep } from '../../stores/planStore';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<PlanStep['riskLevel'], string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
};

const RISK_LABELS: Record<PlanStep['riskLevel'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

const STATUS_COLORS: Record<PlanStep['status'], string> = {
  pending: '#666',
  running: '#863bff',
  completed: '#4caf50',
  failed: '#f44336',
};

const STATUS_SYMBOLS: Record<PlanStep['status'], string> = {
  pending: '⏳',
  running: '🔄',
  completed: '✅',
  failed: '❌',
};

// ---------------------------------------------------------------------------
// StepRow — single plan step with expand
// ---------------------------------------------------------------------------

interface StepRowProps {
  step: PlanStep;
  index: number;
  isRunning: boolean;
}

const StepRow: React.FC<StepRowProps> = ({ step, index, isRunning }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[step.status ?? 'pending'];
  const statusSymbol = STATUS_SYMBOLS[step.status ?? 'pending'];
  const riskColor = RISK_COLORS[step.riskLevel];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          py: 0.75,
          px: 1,
          cursor: 'pointer',
          borderRadius: 1,
          opacity: isRunning && step.status === 'pending' ? 0.5 : 1,
          transition: 'opacity 0.2s',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Status indicator */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: statusColor,
            flexShrink: 0,
            boxShadow: step.status === 'running' ? `0 0 6px ${statusColor}` : 'none',
            animation: step.status === 'running' ? 'pulse 1s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.4 },
            },
          }}
        />

        {/* Step number */}
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.disabled',
            fontFamily: 'monospace',
            minWidth: 20,
            flexShrink: 0,
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </Typography>

        {/* Tool name badge */}
        {step.toolName && (
          <Chip
            label={step.toolName}
            size="small"
            sx={{
              fontSize: 9,
              height: 16,
              bgcolor: 'rgba(134, 59, 255, 0.15)',
              color: '#863bff',
              fontFamily: 'monospace',
            }}
          />
        )}

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
          {step.description}
        </Typography>

        {/* Risk badge */}
        <Tooltip title={`${RISK_LABELS[step.riskLevel]} — ${t('plan.risk.tooltip')}`}>
          <Chip
            icon={step.riskLevel === 'high' ? <ErrorIcon sx={{ fontSize: 10 }} /> : step.riskLevel === 'medium' ? <WarningIcon sx={{ fontSize: 10 }} /> : <InfoIcon sx={{ fontSize: 10 }} />}
            label={RISK_LABELS[step.riskLevel]}
            size="small"
            sx={{
              fontSize: 9,
              height: 16,
              bgcolor: `${riskColor}15`,
              color: riskColor,
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        </Tooltip>

        {/* Status symbol */}
        <Typography sx={{ fontSize: 12, flexShrink: 0 }}>{statusSymbol}</Typography>

        {/* Expand toggle */}
        <IconButton size="small" sx={{ p: 0.25 }}>
          {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>

      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box sx={{ pl: 4, pr: 2, pb: 1 }}>
          {step.toolName && (
            <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.5 }}>
              {t('plan.step.tool')}: <span style={{ color: '#863bff', fontFamily: 'monospace' }}>{step.toolName}</span>
            </Typography>
          )}
          {Object.keys(step.arguments || {}).length > 0 && (
            <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.5 }}>
              {t('plan.step.args')}:{' '}
              <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                {JSON.stringify(step.arguments)}
              </span>
            </Typography>
          )}
          {step.result && (
            <Box
              sx={{
                mt: 0.5,
                p: 0.75,
                bgcolor: 'rgba(0,0,0,0.2)',
                borderRadius: 0.5,
                border: '1px solid rgba(134, 59, 255, 0.1)',
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  color: 'text.secondary',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {step.result}
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// PlanView
// ---------------------------------------------------------------------------

interface PlanViewProps {
  /** Called when the user confirms execution */
  onExecute?: (plan: unknown) => void;
  /** Called when the user cancels the plan */
  onCancel?: () => void;
}

export const PlanView: React.FC<PlanViewProps> = ({ onExecute, onCancel }) => {
  const { t } = useTranslation();
  const {
    currentPlan,
    planStatus,
    isExecuting,
    currentStepIndex,
    executePlan,
    startExecution,
    abortExecution,
    clearPlan,
  } = usePlanExecution();

  // Determine overall progress
  const totalSteps = currentPlan?.steps.length ?? 0;
  const completedSteps = currentPlan?.steps.filter((s) => s.status === 'completed').length ?? 0;
  const failedSteps = currentPlan?.steps.filter((s) => s.status === 'failed').length ?? 0;
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Determine color for progress bar
  const progressColor =
    planStatus === 'failed' ? '#f44336' :
    planStatus === 'completed' ? '#4caf50' :
    'primary.main';

  const handleExecute = async () => {
    onExecute?.(currentPlan);
    await startExecution();
  };

  const handleCancel = () => {
    abortExecution();
    onCancel?.();
  };

  const handleClear = () => {
    clearPlan();
    onCancel?.();
  };

  // Empty state
  if (!currentPlan) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 1,
          opacity: 0.4,
        }}
      >
        <Typography sx={{ fontSize: 13 }}>{t('plan.empty.title')}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
          {t('plan.empty.subtitle')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ---- Header ---- */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography
          sx={{
            fontSize: 11,
            color: 'text.disabled',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            mb: 0.5,
          }}
        >
          {t('plan.header.label')}
        </Typography>
        <Typography sx={{ fontSize: 14, fontWeight: 500, mb: 0.5 }}>
          {currentPlan.goal}
        </Typography>

        {/* Status chip row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={planStatus === 'executing' ? '执行中' : planStatus === 'completed' ? '已完成' : planStatus === 'failed' ? '失败' : planStatus === 'awaiting_confirmation' ? '待确认' : '草稿'}
            size="small"
            sx={{
              fontSize: 9,
              height: 18,
              bgcolor:
                planStatus === 'executing' ? 'rgba(134, 59, 255,0.15)' :
                planStatus === 'completed' ? 'rgba(76,175,80,0.15)' :
                planStatus === 'failed' ? 'rgba(244,67,54,0.15)' :
                'rgba(158,158,158,0.15)',
              color:
                planStatus === 'executing' ? '#863bff' :
                planStatus === 'completed' ? '#4caf50' :
                planStatus === 'failed' ? '#f44336' :
                '#9e9e9e',
            }}
          />
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
            {completedSteps}/{totalSteps} {t('plan.steps.completed')}
          </Typography>
          {failedSteps > 0 && (
            <Typography sx={{ fontSize: 10, color: '#f44336' }}>
              · {failedSteps} {t('plan.steps.failed')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ---- Progress bar ---- */}
      {(planStatus === 'executing' || planStatus === 'completed' || planStatus === 'failed') && (
        <Box sx={{ px: 2, pt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
              {t('plan.progress')}
            </Typography>
            <Typography sx={{ fontSize: 10, color: progressColor }}>
              {progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant={planStatus === 'executing' ? 'indeterminate' : 'determinate'}
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.06)',
              '& .MuiLinearProgress-bar': {
                bgcolor: progressColor,
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}

      {/* ---- Step list ---- */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {currentPlan.steps.map((step, index) => (
            <StepRow
              key={step.id}
              step={step}
              index={index}
              isRunning={planStatus === 'executing'}
            />
          ))}
        </Box>

        {/* Suggestions */}
        {currentPlan.suggestions.length > 0 && planStatus === 'draft' && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1 }} />
            <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.75 }}>
              {t('plan.suggestions.label')}
            </Typography>
            {currentPlan.suggestions.map((s, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 0.5,
                  mb: 0.5,
                }}
              >
                <Typography sx={{ fontSize: 10, color: '#863bff', flexShrink: 0 }}>
                  ›
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {s}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ---- Action buttons ---- */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: 1,
          justifyContent: 'flex-end',
        }}
      >
        {/* Clear (draft / idle) */}
        {(planStatus === 'draft' || planStatus === 'idle' || planStatus === 'completed' || planStatus === 'failed') && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleClear}
            sx={{ fontSize: 11, py: 0.5, px: 1.5, minWidth: 0, borderColor: 'rgba(255,255,255,0.12)' }}
          >
            {t('plan.action.clear')}
          </Button>
        )}

        {/* Cancel (while executing) */}
        {planStatus === 'executing' && (
          <>
            <Button
              size="small"
              variant="outlined"
              startIcon={<StopIcon sx={{ fontSize: 12 }} />}
              onClick={handleCancel}
              sx={{
                fontSize: 11,
                py: 0.5,
                px: 1.5,
                minWidth: 0,
                borderColor: 'rgba(244,67,54,0.4)',
                color: '#f44336',
                '&:hover': { borderColor: '#f44336', bgcolor: 'rgba(244,67,54,0.08)' },
              }}
            >
              {t('plan.action.cancel')}
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<StopIcon sx={{ fontSize: 12 }} />}
              disabled
              sx={{ fontSize: 11, py: 0.5, px: 1.5, minWidth: 0 }}
            >
              {t('plan.action.executing')}
            </Button>
          </>
        )}

        {/* Execute (awaiting_confirmation or draft) */}
        {(planStatus === 'awaiting_confirmation' || planStatus === 'draft') && (
          <Button
            size="small"
            variant="contained"
            startIcon={<PlayIcon sx={{ fontSize: 12 }} />}
            onClick={handleExecute}
            sx={{ fontSize: 11, py: 0.5, px: 1.5, minWidth: 0 }}
          >
            {t('plan.action.execute')}
          </Button>
        )}

        {/* Done (completed) */}
        {planStatus === 'completed' && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CheckIcon sx={{ fontSize: 12 }} />}
            onClick={handleClear}
            sx={{
              fontSize: 11,
              py: 0.5,
              px: 1.5,
              minWidth: 0,
              borderColor: 'rgba(76,175,80,0.4)',
              color: '#4caf50',
              '&:hover': { borderColor: '#4caf50', bgcolor: 'rgba(76,175,80,0.08)' },
            }}
          >
            {t('plan.action.done')}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default PlanView;
