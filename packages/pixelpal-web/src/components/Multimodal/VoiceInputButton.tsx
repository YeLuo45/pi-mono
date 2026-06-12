/**
 * VoiceInputButton Component - V92 Multimodal
 * 
 * Microphone button with:
 * - Press-and-hold or click-to-talk modes
 * - Waveform animation during recording
 * - Real-time transcription display
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MyIconButton as IconButton, MyTooltip as Tooltip, MyBox as Box, MyTypography } from '../MUI替代';
import { Mic as MicIcon, MicOff as MicOffIcon } from '@mui/icons-material';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { voiceRecorder, type RecordingResult } from '../../services/multimodal/VoiceRecorder';
import { speechService } from '../../services/multimodal/SpeechService';
import type { VoiceMessage } from '../../types/multimodal';

interface VoiceInputButtonProps {
  onTranscriptChange?: (transcript: string) => void;
  onVoiceMessage?: (voiceMessage: VoiceMessage) => void;
  onEmotionDetected?: (result: { emotion: string; confidence: number }) => void;
  disabled?: boolean;
  size?: 'small' | 'medium';
  mode?: 'toggle' | 'press';  // toggle: click to start/stop, press: hold to record
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscriptChange,
  onVoiceMessage,
  onEmotionDetected,
  disabled = false,
  size = 'small',
  mode = 'toggle',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showWaveform, setShowWaveform] = useState(false);
  
  const {
    transcript,
    interimTranscript,
    isListening,
    error,
    durationMs,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();
  
  // Handle transcript updates
  useEffect(() => {
    if (transcript && onTranscriptChange) {
      onTranscriptChange(transcript);
    }
    
    // Detect emotion from final transcript
    if (transcript && durationMs > 0 && onEmotionDetected) {
      const result = speechService.detectEmotionFromText(transcript, durationMs);
      onEmotionDetected({
        emotion: result.emotion,
        confidence: result.confidence,
      });
    }
  }, [transcript, durationMs, onTranscriptChange, onEmotionDetected]);
  
  // Toggle mode: click to start/stop
  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      setShowWaveform(false);
    } else {
      const lang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
      const started = startListening(lang);
      if (started) {
        setShowWaveform(true);
      }
    }
  }, [isListening, startListening, stopListening]);
  
  // Press mode: mouse down to start, mouse up to stop
  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    
    const lang = navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US';
    const started = startListening(lang);
    if (started) {
      setIsRecording(true);
      setShowWaveform(true);
    }
  }, [disabled, startListening]);
  
  const handleMouseUp = useCallback(() => {
    if (isRecording) {
      stopListening();
      setIsRecording(false);
      setShowWaveform(false);
    }
  }, [isRecording, stopListening]);
  
  // Audio level visualization
  useEffect(() => {
    if (showWaveform && voiceRecorder.isSupported()) {
      const updateLevel = (level: number) => {
        setAudioLevel(level);
      };
      
      // Start recording with level monitoring
      voiceRecorder.startRecording({ onAudioLevel: updateLevel });
      
      return () => {
        voiceRecorder.cancelRecording();
      };
    }
  }, [showWaveform]);
  
  const displayTranscript = interimTranscript || transcript;
  const isActive = isListening || isRecording;
  
  const buttonSize = size === 'small' ? 32 : 40;
  const iconSize = size === 'small' ? 18 : 22;
  
  const tooltipTitle = isActive
    ? displayTranscript
      ? `识别中: ${displayTranscript}`
      : '正在聆听...'
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
        {mode === 'press' ? (
          <IconButton
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => isRecording && handleMouseUp()}
            disabled={disabled}
            size={size}
            sx={{
              width: buttonSize,
              height: buttonSize,
              flexShrink: 0,
              alignSelf: 'flex-end',
              bgcolor: isActive ? 'rgba(255, 80, 80, 0.15)' : 'transparent',
              '&:hover': {
                bgcolor: isActive ? 'rgba(255, 80, 80, 0.25)' : 'rgba(255,255,255,0.08)',
              },
              ...(isActive && {
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
            {isActive ? (
              <WaveformIcon size={iconSize} level={audioLevel} />
            ) : (
              <MicIcon sx={{ fontSize: iconSize }} />
            )}
          </IconButton>
        ) : (
          <IconButton
            onClick={handleToggle}
            disabled={disabled}
            size={size}
            sx={{
              width: buttonSize,
              height: buttonSize,
              flexShrink: 0,
              alignSelf: 'flex-end',
              bgcolor: isActive ? 'rgba(255, 80, 80, 0.15)' : 'transparent',
              '&:hover': {
                bgcolor: isActive ? 'rgba(255, 80, 80, 0.25)' : 'rgba(255,255,255,0.08)',
              },
              ...(isActive && {
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
            {isActive ? (
              <WaveformIcon size={iconSize} level={audioLevel} />
            ) : (
              <MicIcon sx={{ fontSize: iconSize }} />
            )}
          </IconButton>
        )}
      </span>
    </Tooltip>
  );
};

/**
 * Animated waveform bars component
 */
const WaveformIcon: React.FC<{ size: number; level: number }> = ({ size, level }) => {
  const barCount = 3;
  const heights = [0.4, 0.6, 0.3];
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.3,
        height: size,
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <Box
          key={i}
          sx={{
            width: 2,
            height: size * (heights[i] + level * 0.5),
            bgcolor: 'error.main',
            borderRadius: 1,
            animation: `soundwave 0.5s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.1}s`,
            '@keyframes soundwave': {
              '0%': { height: size * 0.3 },
              '100%': { height: size * (0.6 + level * 0.4) },
            },
          }}
        />
      ))}
    </Box>
  );
};

export default VoiceInputButton;
