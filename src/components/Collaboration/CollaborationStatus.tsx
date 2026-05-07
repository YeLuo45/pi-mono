/**
 * CollaborationStatus.tsx — V40 Phase 4
 * Real-time display of multi-agent collaboration progress
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Collapse, IconButton, CircularProgress } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import type { CollaborationProgress } from '../../store';

const ROLE_EMOJI: Record<string, string> = {
  MemoryExpert: '🧠',
  EmotionAnalyst: '💜',
  Advisor: '🎯',
  Researcher: '🔍',
  Coder: '💻',
};

const ROLE_LABELS: Record<string, string> = {
  MemoryExpert: 'memoryExpert',
  EmotionAnalyst: 'emotionAnalyst',
  Advisor: 'advisor',
  Researcher: 'researcher',
  Coder: 'coder',
};

const STATUS_ICONS: Record<CollaborationProgress['status'], React.ReactNode> = {
  pending: <Box sx={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #666', bgcolor: 'transparent' }} />,
  running: <CircularProgress size={12} thickness={6} sx={{ color: '#863bff' }} />,
  done: <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#4caf50' }} />,
};

interface RoleCardProps {
  progress: CollaborationProgress;
}

const RoleCard: React.FC<RoleCardProps> = ({ progress }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const emoji = ROLE_EMOJI[progress.role] || '🤖';
  const label = ROLE_LABELS[progress.role] || progress.roleLabel;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(255,255,255,0.03)',
        borderRadius: 1.5,
        border: '1px solid rgba(134,59,255,0.15)',
        overflow: 'hidden',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 1,
          cursor: progress.output ? 'pointer' : 'default',
        }}
        onClick={() => progress.output && setExpanded(!expanded)}
      >
        {STATUS_ICONS[progress.status]}
        <Typography sx={{ fontSize: 14 }}>{emoji}</Typography>
        <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>{label}</Typography>
        {progress.output && (
          <IconButton size="small" sx={{ p: 0.25 }}>
            {expanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        )}
      </Box>

      {/* Expanded output */}
      {progress.output && (
        <Collapse in={expanded}>
          <Box
            sx={{
              px: 1.5,
              pb: 1,
              pt: 0.5,
              borderTop: '1px solid rgba(134,59,255,0.1)',
              bgcolor: 'rgba(0,0,0,0.2)',
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                color: 'text.secondary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                lineHeight: 1.5,
              }}
            >
              {progress.output.length > 300 ? progress.output.slice(0, 300) + '…' : progress.output}
            </Typography>
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

interface CollaborationStatusProps {
  className?: string;
}

export const CollaborationStatus: React.FC<CollaborationStatusProps> = ({
 className }) => {
  const { t } = useTranslation();
  const collaborationMode = useStore((s) => s.collaborationMode);
  const collaborationProgress = useStore((s) => s.collaborationProgress);

  // Show empty indicator when collab mode is on but no active session
  if (!collaborationMode) return null;

  const hasRunningTasks = collaborationProgress.some(p => p.status === 'running');
  const hasCompletedTasks = collaborationProgress.some(p => p.status === 'done');

  return (
    <Box className={className} sx={{ px: 1.5, py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: hasRunningTasks ? '#863bff' : hasCompletedTasks ? '#4caf50' : '#666',
            animation: hasRunningTasks ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(0.85)' },
            },
          }}
        />
        <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {hasRunningTasks ? t('collab.status.analyzing') : hasCompletedTasks ? t('collab.status.completed') : t('collab.status.waiting')}
        </Typography>
      </Box>

      {collaborationProgress.length === 0 && (
        <Box sx={{ py: 1 }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center' }}>
            {t('collab.status.inputHint')}
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {collaborationProgress.map((p) => (
          <RoleCard key={p.role} progress={p} />
        ))}
      </Box>
    </Box>
  );
};
