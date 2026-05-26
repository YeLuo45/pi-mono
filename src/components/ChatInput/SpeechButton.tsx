/**
 * SpeechButton - Microphone button for voice input (STT)
 * 
 * Features:
 * - Click to start/stop speech recognition
 * - Animated pulse effect while listening
 * - Tooltip showing recognized (interim) transcript
 * - Integrates with useSpeechRecognition hook
 * - V63: Emotion detection from speech timing
 */

import React, { useState, useEffect } from 'react';
import { MyIconButton as IconButton, MyTooltip as Tooltip } from '../MUI替代';
import { Box } from '../ui/Box';
import { Mic as MicIcon, MicOff as MicOffIcon } from '@mui/icons-material';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';
import { detectEmotion, type EmotionResult } from '../../services/voice/emotionDetector';

interface SpeechButtonProps {
  onTranscriptChange?: (transcript: string) => void;
  onEmotionDetected?: (result: EmotionResult) => void; // V63: emotion detection callback
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export const SpeechButton: React.FC<SpeechButtonProps> = ({
  onTranscriptChange,
  onEmotionDetected, // V63
  disabled = false,
  size = 'small',
}) => {
  const {
    transcript,
    interimTranscript,
    isListening,
    error,
    durationMs, // V63: speech duration
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Notify parent when transcript changes (V63: also detect emotion)
  useEffect(() => {
    if (transcript && onTranscriptChange) {
      onTranscriptChange(transcript);
    }
    // V63: Detect emotion when we have a final transcript with valid duration
    if (transcript && durationMs > 0 && onEmotionDetected) {
      try {
        const result = detectEmotion(transcript, durationMs);
        onEmotionDetected(result);
      } catch (err) {
        console.warn('[SpeechButton] Emotion detection failed:', err);
      }
    }
  }, [transcript, durationMs, onTranscriptChange, onEmotionDetected]);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      // Start with Chinese locale (can be extended for language selection)
      const lang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
      const started = startListening(lang);
      if (started) {
        // Clear previous transcript when starting fresh
        resetTranscript();
      }
    }
  };

  const displayTranscript = interimTranscript || transcript;

  const buttonSize = size === 'small' ? 32 : 40;
  const iconSize = size === 'small' ? 18 : 22;

  // Tooltip content
  const tooltipTitle = isListening
    ? (interimTranscript ? `识别中: ${interimTranscript}` : '正在聆听...')
    : error
    ? error
    : displayTranscript
    ? `已识别: ${displayTranscript}`
    : '点击说话';

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: 'rgba(20, 15, 35, 0.98)',
            border: '1px solid rgba(155, 127, 212, 0.3)',
            fontSize: 11,
            maxWidth: 280,
          },
        },
      }}
    >
      <span>
        <IconButton
          onClick={handleClick}
          disabled={disabled}
          size={size}
          sx={{
            width: buttonSize,
            height: buttonSize,
            flexShrink: 0,
            alignSelf: 'flex-end',
            position: 'relative',
            bgcolor: isListening ? 'rgba(255, 80, 80, 0.15)' : 'transparent',
            '&:hover': {
              bgcolor: isListening ? 'rgba(255, 80, 80, 0.25)' : 'rgba(255,255,255,0.08)',
            },
            ...(isListening && {
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  boxShadow: '0 0 0 0 rgba(255, 80, 80, 0.4)',
                },
                '50%': {
                  boxShadow: '0 0 0 8px rgba(255, 80, 80, 0)',
                },
              },
            }),
          }}
        >
          {isListening ? (
            // Animated bars when listening
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.3,
                height: iconSize,
              }}
            >
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 2,
                    height: iconSize * (0.4 + Math.random() * 0.6),
                    bgcolor: 'error.main',
                    borderRadius: 1,
                    animation: `soundwave 0.5s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                    '@keyframes soundwave': {
                      '0%': { height: iconSize * 0.3 },
                      '100%': { height: iconSize * (0.6 + Math.random() * 0.4) },
                    },
                  }}
                />
              ))}
            </Box>
          ) : (
            <MicIcon sx={{ fontSize: iconSize }} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default SpeechButton;
