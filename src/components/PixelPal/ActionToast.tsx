/**
 * ActionToast.tsx — Proactive Action Toast for PixelPal V3
 * 
 * A toast notification that displays the current proactive action.
 * Appears as a floating card near the PixelPal pet.
 * Shows the action content with type-specific styling and optional action buttons.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Paper, Typography, IconButton, Button, Fade } from '@mui/material';
import { Close as CloseIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { ACTION_COLORS, ACTION_ICONS } from '../../services/actions/ActionTypes';
import type { CompanionAction } from '../../services/actions/ActionTypes';

interface ActionToastProps {
  action: CompanionAction;
  onDismiss: () => void;
  onActionTake?: (action: CompanionAction) => void;
  /** Position anchor relative to pet position */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const ActionToast: React.FC<ActionToastProps> = ({
  action,
  onDismiss,
  onActionTake,
  position = 'bottom-right',
}) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const colors = ACTION_COLORS[action.type];
  const icon = ACTION_ICONS[action.type];

  // Auto-dismiss is handled by ActionEngine, but fade out on dismiss
  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const renderContent = () => {
    switch (action.type) {
      case 'celebrate':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: colors.color }}>
              🎉 {action.achievement}
            </Typography>
          </Box>
        );

      case 'greet':
        return (
          <Typography sx={{ fontSize: 13, color: colors.color }}>
            {action.greeting}
          </Typography>
        );

      case 'remind':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 10, color: colors.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⏰ {t('action.reminder', '提醒')}
              </Typography>
              {action.urgency === 'overdue' && (
                <Box sx={{ px: 0.5, py: 0.1, borderRadius: 0.5, bgcolor: 'rgba(244,67,54,0.2)', fontSize: 9, color: '#F44336', fontWeight: 700 }}>
                  {t('action.overdue', '已过期')}
                </Box>
              )}
              {action.urgency === 'soon' && (
                <Box sx={{ px: 0.5, py: 0.1, borderRadius: 0.5, bgcolor: 'rgba(255,152,0,0.2)', fontSize: 9, color: '#FF9800', fontWeight: 700 }}>
                  {t('action.soon', '即将到期')}
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 13, color: 'white', fontWeight: 600 }}>
              {action.content}
            </Typography>
            {onActionTake && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<CheckIcon sx={{ fontSize: 12 }} />}
                  onClick={() => { onActionTake(action); handleDismiss(); }}
                  sx={{ fontSize: 10, py: 0.25, px: 1, minWidth: 0 }}
                >
                  {t('action.doNow', '马上做')}
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleDismiss}
                  sx={{ fontSize: 10, py: 0.25, px: 1, color: 'text.secondary', minWidth: 0 }}
                >
                  {t('action.later', '稍后')}
                </Button>
              </Box>
            )}
          </Box>
        );

      case 'suggest':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 10, color: colors.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                💡 {t('action.suggest', '建议')}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'white' }}>
              {action.suggestion}
            </Typography>
            {action.reason && (
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                {action.reason}
              </Typography>
            )}
          </Box>
        );

      case 'memory_recall':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography sx={{ fontSize: 10, color: colors.color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🧠 {t('action.memory', '记忆')}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'white' }}>
              {action.topic}
            </Typography>
          </Box>
        );

      case 'text':
      default:
        return (
          <Typography sx={{ fontSize: 13, color: 'white' }}>
            {action.content}
          </Typography>
        );
    }
  };

  // Determine position relative to pet
  const isBottom = position.startsWith('bottom');
  const isLeft = position.startsWith('left');

  return (
    <Fade in={visible} timeout={300}>
      <Paper
        sx={{
          position: 'fixed',
          bottom: isBottom ? 80 : 'auto',
          top: !isBottom ? 80 : 'auto',
          right: isLeft ? 'auto' : 16,
          left: isLeft ? 16 : 'auto',
          maxWidth: 280,
          p: 1.5,
          borderRadius: 2,
          bgcolor: 'rgba(20, 12, 40, 0.96)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          border: `1px solid ${colors.bgColor}`,
          zIndex: 99997,
          backdropFilter: 'blur(8px)',
          animation: 'toastSlideIn 0.3s ease-out',
          '@keyframes toastSlideIn': {
            from: { opacity: 0, transform: `translateY(${isBottom ? 10 : -10}px) scale(0.95)` },
            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
          },
        }}
      >
        {/* Header with icon and dismiss */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{
              p: 0.25,
              opacity: 0.5,
              '&:hover': { opacity: 1 },
              mt: -0.25,
              mr: -0.5,
            }}
          >
            <CloseIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ mt: 0.5 }}>
          {renderContent()}
        </Box>
      </Paper>
    </Fade>
  );
};

export default ActionToast;
