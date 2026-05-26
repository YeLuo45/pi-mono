/**
 * ActionBadge.tsx — Inline Action Badge for PixelPal V3
 * 
 * Displays an action badge embedded within chat text.
 * The badge appears inline with a type-specific color scheme.
 */

import React from 'react';
import Box from '../ui/Box';
import { MyTypography as Typography , MyBadge as Badge } from '../MUI替代';
import { ACTION_COLORS, ACTION_ICONS, ACTION_LABELS } from '../../services/actions/ActionTypes';
import type { CompanionActionType } from '../../services/actions/ActionTypes';

interface ActionBadgeProps {
  type: CompanionActionType;
  label?: string;
  pulse?: boolean;
  size?: 'small' | 'medium';
  onClick?: () => void;
}

export const ActionBadge: React.FC<ActionBadgeProps> = ({
  type,
  label,
  pulse = false,
  size = 'small',
  onClick,
}) => {
  const colors = ACTION_COLORS[type];
  const icon = ACTION_ICONS[type];
  const displayLabel = label ?? ACTION_LABELS[type];

  const isSmall = size === 'small';

  return (
    <Box
      component="span"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.3,
        px: isSmall ? 0.6 : 0.8,
        py: isSmall ? 0.1 : 0.2,
        borderRadius: 1,
        bgcolor: colors.bgColor,
        color: colors.color,
        fontSize: isSmall ? 10 : 12,
        fontWeight: 600,
        verticalAlign: 'middle',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        animation: pulse ? 'badgePulse 0.6s ease-out' : 'none',
        '@keyframes badgePulse': {
          '0%': { transform: 'scale(1)', opacity: 0 },
          '50%': { transform: 'scale(1.15)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        '&:hover': onClick
          ? {
              bgcolor: colors.bgColor.replace('0.15', '0.25'),
              filter: 'brightness(1.1)',
            }
          : {},
      }}
    >
      <Typography
        component="span"
        sx={{
          fontSize: isSmall ? 9 : 11,
          lineHeight: 1,
          fontFamily: 'monospace',
        }}
      >
        {icon}
      </Typography>
      <Typography
        component="span"
        sx={{
          fontSize: isSmall ? 9 : 11,
          lineHeight: 1,
          fontWeight: 700,
          letterSpacing: '0.02em',
        }}
      >
        {displayLabel}
      </Typography>
    </Box>
  );
};

export default ActionBadge;
