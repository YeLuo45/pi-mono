export * from './emotionService';
export * from './emotionStorage';
export * from './emotionEngine';
export * from './emotionResponse';
export { EmotionAlert, checkEmotionAlertState } from './EmotionAlert';
export type { AlertType, AlertState } from './EmotionAlert';

// V70 Emotion-Behavior linkage
export { emotionBehaviorEngine } from './EmotionBehaviorEngine';
export { EMOTION_BEHAVIOR_MAP } from './emotionBehaviorMap';
export { EMOTION_BEHAVIOR_CONFIG } from './emotionConfig';

// Re-export storage query functions for convenience
export {
  getEmotionLogs,
  getEmotionLogsByDateRange,
  getEmotionLogsForDay,
  getRecentEmotionLogs,
  getLatestEmotionLog,
  getEmotionStats,
  getEmotionLogsByWeek,
  getEmotionLogsForMonth,
  getDailyEmotionAggregates,
} from './emotionStorage';
