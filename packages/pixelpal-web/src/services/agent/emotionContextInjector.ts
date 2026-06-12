/**
 * EmotionContextInjector - Injects emotion context into agent prompts and handles emotional responses
 *
 * Integrates EmotionBehaviorEngine with AgentExecutor to provide:
 * - Emotion-aware task decomposition prompts
 * - Emotional response delivery after task completion
 */

import type { EmotionContext } from './types'

class EmotionContextInjector {
  private currentContext: EmotionContext = {
    detected: false,
    emotion: null,
    confidence: 0,
    recommendedAction: null,
    triggered: false,
  }

  /**
   * Detect current emotion from the emotion engine
   * Note: This returns the current cached context.
   * The UI layer should call updateEmotionContext() to refresh this.
   */
  detectEmotion(): EmotionContext {
    return this.currentContext
  }

  /**
   * Get current emotion context
   */
  getContext(): EmotionContext {
    return this.currentContext
  }

  /**
   * Update emotion context (called by UI layer when emotion changes)
   */
  updateEmotionContext(
    emotion: string | null,
    confidence: number,
    action: { type: string; message: string } | null
  ): void {
    this.currentContext = {
      detected: !!emotion,
      emotion,
      confidence,
      recommendedAction: action as EmotionContext['recommendedAction'],
      triggered: false,
    }
  }

  /**
   * Mark the emotional response as triggered
   */
  markTriggered(): void {
    this.currentContext.triggered = true
  }

  /**
   * Format emotion context as a string for injection into prompts
   */
  formatForPrompt(): string {
    const ctx = this.currentContext
    if (!ctx.detected || !ctx.emotion) {
      return ''
    }

    let prompt = `\n[用户情绪状态]\n情绪: ${ctx.emotion} (置信度: ${(ctx.confidence * 100).toFixed(0)}%)`

    if (ctx.recommendedAction && ctx.recommendedAction.type !== 'none') {
      prompt += `\n建议响应方式: ${ctx.recommendedAction.type}`
      prompt += `\n建议消息: "${ctx.recommendedAction.message}"`
    }

    return prompt
  }
}

export const emotionContextInjector = new EmotionContextInjector()
