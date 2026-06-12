import type { TimeScene } from './timeScene'
import type { UserState } from './userStateScene'

export type CompositeScene = `${TimeScene}_${UserState}` | TimeScene | UserState

export interface SceneContext {
  time: TimeScene
  isWeekend: boolean
  userState: UserState
  lastAction?: string
  errorCount?: number
  focusTarget?: string
  idleDuration?: number
}

export interface SceneResponse {
  scene: CompositeScene
  triggerCondition: (context: SceneContext) => boolean
  action: {
    type: 'suggest' | 'offer_help' | 'remind' | 'adapt' | 'none'
    message: string
    suggestedAction?: string
  }
  cooldownMs: number
}

export const SCENE_RESPONSES: SceneResponse[] = [
  {
    scene: 'morning_active',
    triggerCondition: (ctx) => ctx.time === 'morning' && ctx.userState === 'active',
    action: { type: 'suggest', message: '早上好！要开始处理今天的任务吗？', suggestedAction: 'review_tasks' },
    cooldownMs: 3600000,
  },
  {
    scene: 'night_idle',
    triggerCondition: (ctx) => ctx.time === 'night' && ctx.userState === 'idle',
    action: { type: 'suggest', message: '已经很晚了，要不要休息一下？', suggestedAction: 'none' },
    cooldownMs: 1800000,
  },
  {
    scene: 'evening_struggling',
    triggerCondition: (ctx) => ctx.time === 'evening' && ctx.userState === 'struggling',
    action: { type: 'offer_help', message: '看起来遇到了困难，要我帮忙吗？', suggestedAction: 'analyze_issue' },
    cooldownMs: 300000,
  },
  {
    scene: 'returning',
    triggerCondition: (ctx) => ctx.userState === 'returning',
    action: { type: 'suggest', message: '欢迎回来！要继续之前的工作吗？', suggestedAction: 'resume_task' },
    cooldownMs: 600000,
  },
]
