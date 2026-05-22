/**
 * VoiceOutputToggle Component - V92 Multimodal
 * 
 * TTS toggle button with:
 * - On/Off state
 * - Speech rate adjustment
 * - Visual feedback when speaking
 */

import React, { useState, useCallback } from 'react';
import { MyMenu, MySlider } from '../MUI替代';
import { MyIconButton, MyTooltip, MySelect, MyTypography, MyBox } from '../MUI替代';
import {
  VolumeUp as VolumeUpIcon,
  VolumeOff as VolumeOffIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { speechService } from '../../services/multimodal/SpeechService';

interface VoiceOutputToggleProps {
  size?: 'small' | 'medium';
}

export const VoiceOutputToggle: React.FC<VoiceOutputToggleProps> = ({
  size = 'small',
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [localRate, setLocalRate] = useState(() => {
    const stored = useStore.getState().voiceSettings.ttsRate;
    return stored || 1.0;
  });
  
  const voiceSettings = useStore((s) => s.voiceSettings);
  const setVoiceSettings = useStore((s) => s.setVoiceSettings);
  
  const ttsEnabled = voiceSettings.ttsEnabled;
  const isSpeaking = speechService.isSpeaking();
  
  const handleToggle = useCallback(() => {
    const newEnabled = !ttsEnabled;
    setVoiceSettings({ ttsEnabled: newEnabled });
  }, [ttsEnabled, setVoiceSettings]);
  
  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };
  
  const handleSettingsClose = () => {
    setAnchorEl(null);
  };
  
  const handleRateChange = (_: Event, value: number | number[]) => {
    const newRate = value as number;
    setLocalRate(newRate);
    setVoiceSettings({ ttsRate: newRate });
    localStorage.setItem('ttsRate', String(newRate));
  };
  
  const buttonSize = size === 'small' ? 32 : 40;
  const iconSize = size === 'small' ? 18 : 22;
  
  const tooltipTitle = ttsEnabled
    ? isSpeaking
      ? '正在朗读...'
      : '语音输出: 开启'
    : '语音输出: 关闭';

  return (
    <>
      <Tooltip title={tooltipTitle} placement="top" arrow>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            onClick={handleToggle}
            size={size}
            sx={{
              width: buttonSize,
              height: buttonSize,
              flexShrink: 0,
              alignSelf: 'flex-end',
              bgcolor: ttsEnabled ? 'rgba(155, 127, 212, 0.15)' : 'transparent',
              '&:hover': {
                bgcolor: ttsEnabled
                  ? 'rgba(155, 127, 212, 0.25)'
                  : 'rgba(255,255,255,0.08)',
              },
              ...(isSpeaking && {
                animation: 'speakingPulse 1s ease-in-out infinite',
                '@keyframes speakingPulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.6 },
                },
              }),
            }}
          >
            {ttsEnabled ? (
              <VolumeUpIcon sx={{ fontSize: iconSize }} />
            ) : (
              <VolumeOffIcon sx={{ fontSize: iconSize }} />
            )}
          </IconButton>
          
          <IconButton
            onClick={handleSettingsClick}
            size="small"
            sx={{
              p: 0.5,
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
            }}
          >
            <SettingsIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleSettingsClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        slotProps={{
          paper: {
            sx: {
              bgcolor: 'rgba(20, 15, 35, 0.98)',
              border: '1px solid rgba(155, 127, 212, 0.3)',
              minWidth: 200,
              p: 1.5,
            },
          },
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
          语音设置
        </Typography>
        
        <Box sx={{ px: 1, py: 1 }}>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            语速: {localRate.toFixed(1)}x
          </Typography>
          <Slider
            value={localRate}
            onChange={handleRateChange}
            min={0.5}
            max={2.0}
            step={0.1}
            size="small"
            sx={{
              color: 'primary.main',
              '& .MuiSlider-thumb': {
                width: 12,
                height: 12,
              },
            }}
          />
        </Box>
        
        <MenuItem
          onClick={() => {
            // Test TTS
            speechService.speak('你好，这是语音测试。', { rate: localRate });
            handleSettingsClose();
          }}
          sx={{ fontSize: 13, py: 0.75, minHeight: 36 }}
        >
          测试语音
        </MenuItem>
      </Menu>
    </>
  );
};

export default VoiceOutputToggle;
