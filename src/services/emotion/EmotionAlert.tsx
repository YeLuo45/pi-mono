/**
 * EmotionAlert - V21 情绪预警组件
 * 
 * 检测持续负面情绪并主动关怀
 * - 连续3天出现负面情绪（焦虑/愤怒/悲伤）
 * - 单日负面情绪占比超过70%
 * - 情绪强度突然下降
 * 
 * 预警动作：
 * - 主动关怀消息（限每24小时1次）
 * - 侧边栏提示（小幅度视觉提示）
 * - 建议操作
 * 
 * 基于 PRD V21 情绪预警系统规格
 */

import React, { useEffect, useState, useCallback } from 'react';
import { MyBadge } from '../../components/MUI替代';
import { MyBox, MyTypography, MyPaper, MyIconButton, MyChip, MyTooltip, MyFade } from '../../components/MUI替代';
import {
  Favorite as HeartIcon,
  FavoriteBorder as HeartBorderIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getRecentEmotionLogs } from './emotionStorage';
import { emotionResponseEngine } from './emotionResponse';
import { emotionEngine, type EmotionAnalysis } from './emotionEngine';
import type { TextEmotion, EmotionLogEntry } from './emotionService';

// --- Alert Types ---

export type AlertType = 'persistent_negative' | 'high_negative_ratio' | 'emotion_drop' | 'none';

export interface AlertState {
  type: AlertType;
  level: 'normal' | 'mild' | 'moderate' | 'high';
  message: string;
  suggestion?: string;
  lastAlertTime?: number;
}

/** 负面情绪列表 */
const NEGATIVE_EMOTIONS: TextEmotion[] = ['anxious', 'angry', 'sad'];

/** 预警冷却时间（毫秒）*/
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// --- EmotionAlert Component Props ---

interface EmotionAlertProps {
  /** 是否显示在紧凑模式（侧边栏用）*/
  compact?: boolean;
  /** 是否显示详细弹窗（默认显示toast样式）*/
  showDialog?: boolean;
  /** 是否启用预警检测（默认true）*/
  enabled?: boolean;
  /** 预警触发时的回调 */
  onAlertTriggered?: (alert: AlertState, caringMessage: string | null) => void;
  /** 用户点击关闭时的回调 */
  onDismiss?: () => void;
}

// --- Main Component ---

export const EmotionAlert: React.FC<EmotionAlertProps> = ({
  compact = false,
  showDialog = false,
  enabled = true,
  onAlertTriggered,
  onDismiss,
}) => {
  const { t } = useTranslation();
  
  // Alert state
  const [alertState, setAlertState] = useState<AlertState>({
    type: 'none',
    level: 'normal',
    message: '',
  });
  
  // Visibility state for toast
  const [visible, setVisible] = useState(false);
  
  // Last alert time (persisted in sessionStorage)
  const [lastAlertTime, setLastAlertTime] = useState<number>(() => {
    const saved = sessionStorage.getItem('pixelpal_emotion_alert_last');
    return saved ? parseInt(saved, 10) : 0;
  });

  // --- Alert Detection Logic ---

  const checkForAlerts = useCallback((): AlertState => {
    if (!enabled) {
      return { type: 'none', level: 'normal', message: '' };
    }

    // Check cooldown
    const now = Date.now();
    if (lastAlertTime > 0 && now - lastAlertTime < ALERT_COOLDOWN_MS) {
      return { type: 'none', level: 'normal', message: '' };
    }

    // Get recent emotion logs (last 7 days)
    const logs = getRecentEmotionLogs(7);
    
    if (logs.length === 0) {
      return { type: 'none', level: 'normal', message: '' };
    }

    // Check 1: Persistent negative emotion (3+ consecutive days)
    const persistentCheck = checkPersistentNegativeEmotion(logs);
    if (persistentCheck.triggered) {
      return {
        type: 'persistent_negative',
        level: persistentCheck.level,
        message: persistentCheck.message,
        suggestion: '想聊聊吗？我在这里陪着你 💙',
      };
    }

    // Check 2: High negative ratio (>70% negative emotions today)
    const ratioCheck = checkHighNegativeRatio(logs);
    if (ratioCheck.triggered) {
      return {
        type: 'high_negative_ratio',
        level: ratioCheck.level,
        message: ratioCheck.message,
        suggestion: '要不要休息一下，或者听点音乐放松？🎵',
      };
    }

    // Check 3: Emotion intensity sudden drop
    const dropCheck = checkEmotionDrop(logs);
    if (dropCheck.triggered) {
      return {
        type: 'emotion_drop',
        level: dropCheck.level,
        message: dropCheck.message,
        suggestion: '发生什么了吗？愿意说说吗？🤗',
      };
    }

    return { type: 'none', level: 'normal', message: '' };
  }, [enabled, lastAlertTime]);

  // --- Run Alert Check ---

  useEffect(() => {
    if (!enabled) return;

    // Check on mount and periodically
    const interval = setInterval(() => {
      const alert = checkForAlerts();
      if (alert.type !== 'none') {
        setAlertState(alert);
        setVisible(true);

        // Generate caring message
        const caringMessage = emotionResponseEngine.generateCaringMessage(alert.type as any);
        
        // Fire callback
        onAlertTriggered?.(alert, caringMessage);

        // Update last alert time
        const now = Date.now();
        setLastAlertTime(now);
        sessionStorage.setItem('pixelpal_emotion_alert_last', now.toString());
      }
    }, 60 * 1000); // Check every minute

    // Initial check
    const initialAlert = checkForAlerts();
    if (initialAlert.type !== 'none') {
      setAlertState(initialAlert);
      setVisible(true);
      onAlertTriggered?.(initialAlert, emotionResponseEngine.generateCaringMessage(initialAlert.type as any));
    }

    return () => clearInterval(interval);
  }, [checkForAlerts, enabled, onAlertTriggered]);

  // --- Dismiss Handler ---

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  // --- Get Alert Icon & Color ---

  const getAlertStyle = () => {
    switch (alertState.level) {
      case 'high':
        return { color: '#F44336', bgcolor: 'rgba(244, 67, 54, 0.1)' };
      case 'moderate':
        return { color: '#FF9800', bgcolor: 'rgba(255, 152, 0, 0.1)' };
      case 'mild':
        return { color: '#2196F3', bgcolor: 'rgba(33, 150, 243, 0.1)' };
      default:
        return { color: '#757575', bgcolor: 'rgba(117, 117, 117, 0.1)' };
    }
  };

  const alertStyle = getAlertStyle();

  // --- Compact Mode (Sidebar Badge) ---

  if (compact) {
    return (
      <Tooltip title={alertState.message || t('emotion.alert.noAlert')}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: alertState.type !== 'none' ? alertStyle.bgcolor : 'transparent',
            transition: 'all 0.3s ease',
          }}
        >
          {alertState.type !== 'none' ? (
            <Badge
              overlap="circular"
              badgeContent={
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: alertStyle.color,
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)', opacity: 1 },
                      '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                      '100%': { transform: 'scale(1)', opacity: 1 },
                    },
                  }}
                />
              }
            >
              <HeartIcon sx={{ fontSize: 20, color: alertStyle.color }} />
            </Badge>
          ) : (
            <HeartBorderIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
          )}
        </Box>
      </Tooltip>
    );
  }

  // --- Full Alert Toast ---

  return (
    <Fade in={visible && alertState.type !== 'none'} unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          maxWidth: 360,
          p: 2,
          bgcolor: alertStyle.bgcolor,
          border: `1px solid ${alertStyle.color}30`,
          borderRadius: 3,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Icon */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: `${alertStyle.color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PsychologyIcon sx={{ color: alertStyle.color, fontSize: 24 }} />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontSize: 13, fontWeight: 600, color: alertStyle.color }}
              >
                {t('emotion.alert.title')}
              </Typography>
              <Chip
                label={t(`emotion.alert.level.${alertState.level}`)}
                size="small"
                sx={{
                  height: 18,
                  fontSize: 10,
                  bgcolor: `${alertStyle.color}20`,
                  color: alertStyle.color,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            </Box>
            
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.5 }}>
              {alertState.message}
            </Typography>
            
            {alertState.suggestion && (
              <Typography 
                variant="body2" 
                sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}
              >
                💡 {alertState.suggestion}
              </Typography>
            )}
          </Box>

          {/* Dismiss Button */}
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ 
              color: 'text.disabled',
              '&:hover': { color: 'text.primary' },
              p: 0.5,
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Paper>
    </Fade>
  );
};

// --- Helper Functions ---

/**
 * Check for persistent negative emotion (3+ days)
 */
function checkPersistentNegativeEmotion(logs: EmotionLogEntry[]): {
  triggered: boolean;
  level: 'normal' | 'mild' | 'moderate' | 'high';
  message: string;
} {
  // Group logs by date
  const byDate = new Map<string, { hasNegative: boolean; negativeDays: Set<string> }>();
  
  for (const log of logs) {
    const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
    
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, { hasNegative: false, negativeDays: new Set() });
    }
    
    const dayData = byDate.get(dateKey)!;
    if (NEGATIVE_EMOTIONS.includes(log.emotion)) {
      dayData.hasNegative = true;
      dayData.negativeDays.add(dateKey);
    }
  }

  // Count consecutive negative days from today backwards
  let consecutiveNegativeDays = 0;
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateKey = checkDate.toISOString().split('T')[0];
    
    const dayData = byDate.get(dateKey);
    if (dayData?.hasNegative) {
      consecutiveNegativeDays++;
    } else if (i > 0) {
      // Allow today to have no negative (still checking)
      break;
    }
  }

  if (consecutiveNegativeDays >= 3) {
    const level = consecutiveNegativeDays >= 5 ? 'high' : consecutiveNegativeDays >= 4 ? 'moderate' : 'mild';
    return {
      triggered: true,
      level,
      message: `已连续 ${consecutiveNegativeDays} 天出现负面情绪，让我来陪陪你吧 💙`,
    };
  }

  return { triggered: false, level: 'normal', message: '' };
}

/**
 * Check for high negative emotion ratio (>70% today)
 */
function checkHighNegativeRatio(logs: EmotionLogEntry[]): {
  triggered: boolean;
  level: 'normal' | 'mild' | 'moderate' | 'high';
  message: string;
} {
  const today = new Date().toISOString().split('T')[0];
  
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp).toISOString().split('T')[0];
    return logDate === today;
  });

  if (todayLogs.length < 3) {
    return { triggered: false, level: 'normal', message: '' };
  }

  const negativeCount = todayLogs.filter(log => NEGATIVE_EMOTIONS.includes(log.emotion)).length;
  const negativeRatio = negativeCount / todayLogs.length;

  if (negativeRatio > 0.7) {
    const level = negativeRatio > 0.9 ? 'high' : negativeRatio > 0.8 ? 'moderate' : 'mild';
    return {
      triggered: true,
      level,
      message: `今天 ${Math.round(negativeRatio * 100)}% 的情绪都是负面的呢，记得照顾好自己 🤗`,
    };
  }

  return { triggered: false, level: 'normal', message: '' };
}

/**
 * Check for sudden emotion drop
 */
function checkEmotionDrop(logs: EmotionLogEntry[]): {
  triggered: boolean;
  level: 'normal' | 'mild' | 'moderate' | 'high';
  message: string;
} {
  if (logs.length < 2) {
    return { triggered: false, level: 'normal', message: '' };
  }

  // Sort by timestamp descending
  const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
  
  // Get most recent emotions
  const recent = sorted.slice(0, Math.min(3, sorted.length));
  const previous = sorted.slice(3, Math.min(6, sorted.length));

  if (previous.length === 0) {
    return { triggered: false, level: 'normal', message: '' };
  }

  // Calculate average intensity
  const recentAvgIntensity = recent.reduce((sum, l) => sum + l.intensity, 0) / recent.length;
  const previousAvgIntensity = previous.reduce((sum, l) => sum + l.intensity, 0) / previous.length;

  // Check for intensity drop
  const dropThreshold = 40; // 40% drop
  if (previousAvgIntensity > 0) {
    const dropPercent = ((previousAvgIntensity - recentAvgIntensity) / previousAvgIntensity) * 100;
    
    if (dropPercent >= dropThreshold) {
      const level = dropPercent >= 60 ? 'high' : dropPercent >= 50 ? 'moderate' : 'mild';
      return {
        triggered: true,
        level,
        message: `感觉你情绪下降了不少，发生了什么吗？💙`,
      };
    }
  }

  // Check for positive -> negative transition
  const recentEmotions = recent.map(l => l.emotion);
  const previousEmotions = previous.map(l => l.emotion);

  const recentHasPositive = recentEmotions.some(e => 
    ['happy', 'excited'].includes(e)
  );
  const recentHasNegative = recentEmotions.some(e => NEGATIVE_EMOTIONS.includes(e));
  const previousHasPositive = previousEmotions.some(e => 
    ['happy', 'excited'].includes(e)
  );

  if (previousHasPositive && recentHasNegative && recentHasPositive === false) {
    return {
      triggered: true,
      level: 'moderate',
      message: `从开心的状态变得有些低落，发生什么了吗？🤗`,
    };
  }

  return { triggered: false, level: 'normal', message: '' };
}

// --- Export for external use ---

/**
 * Helper to trigger alert check externally
 */
export function checkEmotionAlertState(): AlertState {
  const logs = getRecentEmotionLogs(7);
  
  // Check persistent negative
  const persistentCheck = checkPersistentNegativeEmotion(logs);
  if (persistentCheck.triggered) {
    return {
      type: 'persistent_negative',
      level: persistentCheck.level,
      message: persistentCheck.message,
      suggestion: '想聊聊吗？我在这里陪着你 💙',
    };
  }

  // Check high negative ratio
  const ratioCheck = checkHighNegativeRatio(logs);
  if (ratioCheck.triggered) {
    return {
      type: 'high_negative_ratio',
      level: ratioCheck.level,
      message: ratioCheck.message,
      suggestion: '要不要休息一下，或者听点音乐放松？🎵',
    };
  }

  // Check emotion drop
  const dropCheck = checkEmotionDrop(logs);
  if (dropCheck.triggered) {
    return {
      type: 'emotion_drop',
      level: dropCheck.level,
      message: dropCheck.message,
      suggestion: '发生什么了吗？愿意说说吗？🤗',
    };
  }

  return { type: 'none', level: 'normal', message: '' };
}
