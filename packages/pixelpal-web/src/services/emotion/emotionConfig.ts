/**
 * Emotion Behavior Configuration
 * 
 * Feature flags and settings for V70 emotion->behavior linkage.
 */

export const EMOTION_BEHAVIOR_CONFIG = {
  enabled: true,
  cooldownMs: 30000,
  minConfidence: 0.5,
  actions: {
    sadness: { enabled: true, action: 'comfort' },
    anger: { enabled: true, action: 'calm' },
    fear: { enabled: true, action: 'calm' },
    joy: { enabled: false, action: 'encourage' },
    surprise: { enabled: true, action: 'focus_suggest' },
  },
}
