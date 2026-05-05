import React, { useState, useEffect } from 'react';
import { Box, Typography, Tooltip, Divider, Collapse } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { FlashOn as FlashIcon } from '@mui/icons-material';
import { ShowChart as ShowChartIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { useTranslation } from 'react-i18next';
import { getLatestEmotionLog, getTextEmotionEmoji } from '../../services/emotion';
import type { TextEmotion } from '../../services/emotion';
import { PersonaSelector } from '../Persona/PersonaSelector';
import { AgentPanel } from '../Agent/AgentPanel';
import { EmotionCurve } from '../EmotionCurve/EmotionCurve';

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onNavigate }) => {
  const { t } = useTranslation();
  const [currentEmotion, setCurrentEmotion] = useState<{ emotion: TextEmotion; emoji: string } | null>(null);
  const [showEmotionCurve, setShowEmotionCurve] = useState(!collapsed); // Show by default when expanded

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

      {/* Agent / 任务中心 nav */}
      <Box sx={{ px: 1 }}>
        <Tooltip title={collapsed ? '任务中心' : ''} placement="right">
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
              bgcolor: 'transparent',
              color: 'primary.main',
              transition: 'all 0.15s ease',
              width: '100%',
              textAlign: 'left',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.08)',
                transform: 'scale(1.05)',
              },
            }}
          >
            <FlashIcon sx={{ fontSize: 18, flexShrink: 0 }} />
            {!collapsed && (
              <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                任务中心
              </Typography>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Agent Panel (shown inline in sidebar when active) */}
      {!collapsed && (
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <AgentPanel />
        </Box>
      )}

      {/* Emotion Curve Toggle + Chart (only when expanded) */}
      {!collapsed && (
        <>
          <Divider sx={{ opacity: 0.15, mx: 1, mt: 1, mb: 0.5 }} />
          <Box sx={{ px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Tooltip title="心情曲线" placement="right">
              <Box
                component="button"
                onClick={() => setShowEmotionCurve(v => !v)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.75,
                  minHeight: 36,
                  borderRadius: 1.5,
                  border: 'none',
                  cursor: 'pointer',
                  bgcolor: showEmotionCurve ? 'rgba(139,92,246,0.15)' : 'transparent',
                  color: showEmotionCurve ? '#8b5cf6' : 'text.secondary',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  textAlign: 'left',
                  '&:hover': {
                    bgcolor: 'rgba(139,92,246,0.1)',
                    color: '#8b5cf6',
                  },
                }}
              >
                <ShowChartIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontSize: 11, fontWeight: 600 }}>
                  心情曲线
                </Typography>
              </Box>
            </Tooltip>
          </Box>
          <Collapse in={showEmotionCurve}>
            <Box sx={{ mx: 1, mb: 1 }}>
              <EmotionCurve compact compactHeight={100} />
            </Box>
          </Collapse>
        </>
      )}

      {/* Persona Selector */}
      <PersonaSelector collapsed={collapsed} />
    </Box>
  );
};

export default Sidebar;
