/**
 * DivisionView.tsx — V47 Collaboration Enhancement
 * Shows subtasks grouped by responsible role, with progress per role.
 * Toggle between Level View (original) and Division View (by role).
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MyBox as Box, MyTypography as Typography, MyChip, MyCollapse as Collapse, MyIconButton as IconButton, MyTooltip, MyTabs as Tabs , MyCard as Card, MyTab as Tab } from '../MUI替代';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import type { Subtask } from '../../services/collaboration/types';
import { useStore } from '../../store';
import { getRoleEmoji, getRoleDisplayName } from '../../services/collaboration/personaRoleRegistry';
import type { PersonaRole } from '../../services/collaboration/types';

const DEFAULT_ROLE_EMOJIS: Record<PersonaRole, string> = {
  MemoryExpert: '🧠',
  EmotionAnalyst: '📊',
  Advisor: '💡',
  Researcher: '🔍',
  Coder: '💻',
};

// ============================================================================
// Task Card Component
// ============================================================================

interface SubtaskCardProps {
  subtask: Subtask;
  onRoleEmoji: (role: PersonaRole) => string;
}

const SubtaskCard: React.FC<SubtaskCardProps> = ({ subtask, onRoleEmoji }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  const responsible = subtask.responsible as PersonaRole;
  const emoji = onRoleEmoji(responsible);
  const label = getRoleDisplayName(responsible);

  const statusColor: Record<string, string> = {
    pending: '#9e9e9e',
    executing: '#863bff',
    completed: '#4caf50',
    failed: '#f44336',
  };

  return (
    <Box
      sx={{
        border: '1px solid rgba(134, 59, 255, 0.15)',
        borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.02)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        animation: subtask.status === 'running' ? 'pulse 2s ease-in-out infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { borderColor: 'rgba(134, 59, 255, 0.15)' },
          '50%': { borderColor: 'rgba(134, 59, 255, 0.6)' },
        },
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography sx={{ fontSize: 16 }}>{emoji}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtask.description || t('collab.history.noTask')}
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
            {label} · {subtask.status}
          </Typography>
        </Box>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: statusColor[subtask.status] || '#9e9e9e',
            flexShrink: 0,
          }}
        />
        <IconButton sx={{ p: 0.25 }} size="small">
          {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
        </IconButton>
      </Box>

      {/* Expanded content */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1, pb: 1, pt: 0.5, borderTop: '1px solid rgba(134,59,255,0.1)' }}>
          <Typography sx={{ fontSize: 10, color: 'text.disabled', mb: 0.5 }}>
            {t('collab.task.type')}: {subtask.type}
          </Typography>
          {subtask.dependencies.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{t('collab.task.dependency')}:</Typography>
              {subtask.dependencies.map((depId, i) => (
                <Box key={depId} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <Typography sx={{ fontSize: 10, color: '#863bff', fontFamily: 'monospace' }}>{depId}</Typography>
                  {i < subtask.dependencies.length - 1 && (
                    <ArrowIcon sx={{ fontSize: 10, color: 'rgba(134, 59, 255, 0.4)' }} />
                  )}
                </Box>
              ))}
            </Box>
          )}
          {subtask.error && (
            <Typography sx={{ fontSize: 10, color: '#f44336' }}>
              {t('collab.task.error')}: {subtask.error}
            </Typography>
          )}
          {subtask.completedAt && (
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>
              {t('collab.task.complete')}: {new Date(subtask.completedAt).toLocaleTimeString()}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

// ============================================================================
// Role Group Card
// ============================================================================

interface RoleGroupProps {
  role: PersonaRole;
  tasks: Subtask[];
  onRoleEmoji: (role: PersonaRole) => string;
}

const RoleGroup: React.FC<RoleGroupProps> = ({ role, tasks, onRoleEmoji }) => {
  const { t } = useTranslation();
  const emoji = onRoleEmoji(role);
  const label = getRoleDisplayName(role);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const [expanded, setExpanded] = useState(true);

  return (
    <Box
      sx={{
        border: '1px solid rgba(134, 59, 255, 0.15)',
        borderRadius: 1.5,
        bgcolor: 'rgba(134, 59, 255, 0.04)',
        overflow: 'hidden',
      }}
    >
      {/* Role header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'rgba(134, 59, 255, 0.08)' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography sx={{ fontSize: 20 }}>{emoji}</Typography>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
            {completed}/{total} {t('collab.task.progress')} · {progress}%
          </Typography>
        </Box>
        {/* Progress bar */}
        <Box sx={{ width: 60, height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              bgcolor: progress === 100 ? '#4caf50' : '#863bff',
              borderRadius: 2,
              transition: 'width 0.5s ease',
            }}
          />
        </Box>
        <IconButton sx={{ p: 0.25 }} size="small">
          {expanded ? <ExpandLessIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {/* Task list */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1, pb: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {tasks.map((task) => (
            <SubtaskCard key={task.id} subtask={task} onRoleEmoji={onRoleEmoji} />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};

// ============================================================================
// Main DivisionView Component
// ============================================================================

interface DivisionViewProps {
  subtasks: Subtask[];
  className?: string;
}

export const DivisionView: React.FC<DivisionViewProps> = ({ subtasks, className }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'level' | 'division'>('division');
  const interactionSettings = useStore((s) => s.interactionSettings);

  // Get custom or default emoji for a role
  const getRoleIcon = (role: PersonaRole): string => {
    return interactionSettings.collabRoleIcons?.[role] ?? DEFAULT_ROLE_EMOJIS[role];
  };

  // Group tasks by role
  const groupedByRole = subtasks.reduce<Record<PersonaRole, Subtask[]>>((acc, task) => {
    const role = task.responsible as PersonaRole;
    if (!acc[role]) acc[role] = [];
    acc[role].push(task);
    return acc;
  }, {} as Record<PersonaRole, Subtask[]>);

  const roles = Object.keys(groupedByRole) as PersonaRole[];

  return (
    <Box className={className} sx={{ p: 1.5 }}>
      {/* View mode tabs */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
        <Tabs
          value={viewMode}
          onChange={(_, v) => setViewMode(v)}
          sx={{
            minHeight: 28,
            '& .MuiTabs-indicator': { height: 2 },
            '& .MuiTab-root': { minHeight: 28, py: 0, fontSize: 10 },
          }}
        >
          <Tab value="level" label={t('collab.task.viewLevel', '分层')} />
          <Tab value="division" label={t('collab.task.viewDivision', '分工')} />
        </Tabs>
      </Box>

      {viewMode === 'division' ? (
        // Division view: grouped by role
        roles.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', py: 2 }}>
            {t('collab.task.empty')}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {roles.map((role) => (
              <RoleGroup
                key={role}
                role={role}
                tasks={groupedByRole[role]}
                onRoleEmoji={getRoleIcon}
              />
            ))}
          </Box>
        )
      ) : (
        // Level view: same as original TaskBreakdown (placeholder for reference)
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {subtasks.map((task) => (
            <SubtaskCard key={task.id} subtask={task} onRoleEmoji={getRoleIcon} />
          ))}
        </Box>
      )}
    </Box>
  );
};
