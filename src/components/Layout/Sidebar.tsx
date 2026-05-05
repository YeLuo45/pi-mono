import React, { useState, useEffect } from 'react';
import { Box, Typography, Tooltip, Divider } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { useTranslation } from 'react-i18next';
import { getLatestEmotionLog, getTextEmotionEmoji } from '../../services/emotion';
import type { TextEmotion } from '../../services/emotion';
import { PersonaSelector } from '../Persona/PersonaSelector';

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onNavigate }) => {
  const { t } = useTranslation();
  const [currentEmotion, setCurrentEmotion] = useState<{ emotion: TextEmotion; emoji: string } | null>(null);

  // Load current emotion from storage
  useEffect(() => {
    const loadCurrentEmotion = () => {
      const latest = getLatestEmotionLog();
      if (latest) {
        setCurrentEmotion({
          emotion: latest.emotion,
          emoji: getTextEmotionEmoji(latest.emotion),
        });
      }
    };
    loadCurrentEmotion();

    const handleEmotionUpdate = () => loadCurrentEmotion();
    window.addEventListener('emotion:logAdded', handleEmotionUpdate);
    return () => window.removeEventListener('emotion:logAdded', handleEmotionUpdate);
  }, []);

  return (
    <Box
      sx={{
        width: collapsed ? 52 : 160,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'rgba(15, 10, 30, 0.95)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        transition: 'width 0.2s ease',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo / Title */}
      {!collapsed && (
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>
            PixelPal
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
            AI Companion
          </Typography>
          {currentEmotion && (
            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontSize: 12 }}>
                {currentEmotion.emoji}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>
                {t('emotion.' + currentEmotion.emotion)}
              </Typography>
            </Box>
          )}
        </Box>
      )}
      {collapsed && (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          {currentEmotion ? <Typography variant="caption" sx={{ fontSize: 14 }}>{currentEmotion.emoji}</Typography> : '🛡️'}
        </Box>
      )}

      <Divider sx={{ opacity: 0.15, mx: 1, mb: 1 }} />

      {/* Chat nav */}
      <Box sx={{ px: 1 }}>
        <Tooltip title={collapsed ? t('nav.chat') : ''} placement="right">
          <Box
            component="button"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 1,
              minHeight: 44,
              borderRadius: 1.5,
              border: 'none',
              cursor: 'pointer',
              bgcolor: 'rgba(255,255,255,0.12)',
              color: 'primary.main',
              transition: 'all 0.15s ease',
              width: '100%',
              textAlign: 'left',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.15)',
                transform: 'scale(1.05)',
              },
            }}
          >
            <ChatIcon sx={{ fontSize: 18, flexShrink: 0 }} />
            {!collapsed && (
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                {t('nav.chat')}
              </Typography>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Persona Selector */}
      <PersonaSelector collapsed={collapsed} />
    </Box>
  );
};

export default Sidebar;
