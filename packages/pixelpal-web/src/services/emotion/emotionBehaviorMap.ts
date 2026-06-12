/**
 * Emotion-Behavior Mapping Table
 * 
 * Maps detected emotions to recommended actions for PixelPal V70
 * Voice emotion -> behavior linkage system.
 */

export type EmotionActionType = 'comfort' | 'encourage' | 'calm' | 'activate' | 'focus_suggest' | 'none'

export interface EmotionAction {
  emotion: string
  confidenceThreshold: number
  action: EmotionActionType
  message: string
  priority: number
}

export const EMOTION_BEHAVIOR_MAP: EmotionAction[] = [
  { emotion: 'sadness', confidenceThreshold: 0.6, action: 'comfort', message: '我感觉到你有些低落，想聊聊吗？', priority: 3 },
  { emotion: 'anger', confidenceThreshold: 0.6, action: 'calm', message: '我理解你有些生气，深呼吸一下？', priority: 4 },
  { emotion: 'fear', confidenceThreshold: 0.5, action: 'calm', message: '别担心，我在这里陪你。', priority: 4 },
  { emotion: 'joy', confidenceThreshold: 0.7, action: 'encourage', message: '你看起来很开心！继续保持~', priority: 1 },
  { emotion: 'surprise', confidenceThreshold: 0.5, action: 'focus_suggest', message: '是什么让你惊讶了？需要我帮忙分析吗？', priority: 2 },
  { emotion: 'neutral', confidenceThreshold: 0.8, action: 'none', message: '', priority: 0 },
]
