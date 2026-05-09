/**
 * EmotionBehaviorEngine - V70 语音情感→行为联动引擎
 * 
 * Provides emotion-to-action mapping with cooldown logic.
 * Decoupled from AgentExecutor/PlatformAdapter - only provides interfaces.
 */

import { EMOTION_BEHAVIOR_MAP, type EmotionAction, type EmotionActionType } from './emotionBehaviorMap'

class EmotionBehaviorEngine {
  private lastEmotion: string | null = null
  private lastTriggerTime = 0
  private cooldownMs = 30000

  /**
   * Get recommended action for an emotion with confidence score
   */
  getRecommendedAction(emotion: string, confidence: number): EmotionAction | null {
    if (this.isInCooldown()) return null
    
    const action = EMOTION_BEHAVIOR_MAP.find(
      m => m.emotion === emotion && confidence >= m.confidenceThreshold
    )
    
    if (action && action.action !== 'none') {
      this.lastEmotion = emotion
      this.lastTriggerTime = Date.now()
      return action
    }
    return null
  }

  /**
   * Check if engine is in cooldown period
   */
  private isInCooldown(): boolean {
    return Date.now() - this.lastTriggerTime < this.cooldownMs
  }

  /**
   * Set cooldown duration in milliseconds
   */
  setCooldown(ms: number): void {
    this.cooldownMs = ms
  }

  /**
   * Get last triggered emotion
   */
  getLastEmotion(): string | null {
    return this.lastEmotion
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.lastEmotion = null
    this.lastTriggerTime = 0
  }
}

export const emotionBehaviorEngine = new EmotionBehaviorEngine()
