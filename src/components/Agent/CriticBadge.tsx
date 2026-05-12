// V84 CriticBadge Component
// Displays critic score badge with color coding (green/yellow/red)

import React from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import {
  CheckCircle as GreenIcon,
  Warning as YellowIcon,
  Error as RedIcon,
} from '@mui/icons-material';

interface CriticBadgeProps {
  score: number; // 0-10
  showLabel?: boolean;
  size?: 'small' | 'medium';
  tooltip?: boolean;
}

const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
  if (score >= 8) return 'success';
  if (score >= 5) return 'warning';
  return 'error';
};

const getScoreIcon = (score: number) => {
  if (score >= 8) return <GreenIcon sx={{ fontSize: 12 }} />;
  if (score >= 5) return <YellowIcon sx={{ fontSize: 12 }} />;
  return <RedIcon sx={{ fontSize: 12 }} />;
};

const getScoreLabel = (score: number): string => {
  if (score >= 8) return '优秀';
  if (score >= 5) return '一般';
  return '需改进';
};

export const CriticBadge: React.FC<CriticBadgeProps> = ({
  score,
  showLabel = true,
  size = 'small',
  tooltip = true,
}) => {
  const color = getScoreColor(score);
  const icon = getScoreIcon(score);
  const label = getScoreLabel(score);

  const badge = (
    <Chip
      size={size}
      icon={icon}
      label={showLabel ? `${score.toFixed(1)} ${label}` : score.toFixed(1)}
      color={color}
      sx={{
        height: size === 'small' ? 22 : 28,
        fontSize: size === 'small' ? 11 : 12,
        '& .MuiChip-icon': {
          color: 'inherit',
        },
      }}
    />
  );

  if (tooltip) {
    return (
      <Tooltip title={`Critic评分: ${score}/10 - ${label}`} placement="top">
        {badge}
      </Tooltip>
    );
  }

  return badge;
};

// Compact version for inline display
export const CriticScoreMini: React.FC<{ score: number }> = ({ score }) => {
  const color = getScoreColor(score);

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        bgcolor: `${color}.main`,
        color: 'white',
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      {score.toFixed(0)}
    </Box>
  );
};

export default CriticBadge;
