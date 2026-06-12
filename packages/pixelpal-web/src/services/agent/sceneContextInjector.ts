import { sceneAwarenessEngine, getTimeScene, isWeekend } from '../scene'
import type { SceneContext } from './types'

class SceneContextInjector {
  private currentContext: SceneContext = {
    detected: false,
    timeScene: null,
    isWeekend: false,
    userState: null,
    sceneResponse: null,
    triggered: false,
  }

  detectScene(): SceneContext {
    const timeScene = getTimeScene()
    const userStateSignal = sceneAwarenessEngine.getUserState()
    const response = sceneAwarenessEngine.getSceneResponse()

    this.currentContext = {
      detected: true,
      timeScene,
      isWeekend: isWeekend(),
      userState: userStateSignal.state,
      sceneResponse: response
        ? {
            type: response.action.type as SceneContext['sceneResponse']['type'],
            message: response.action.message,
            suggestedAction: response.action.suggestedAction
          }
        : null,
      triggered: false,
    }

    return this.currentContext
  }

  getContext(): SceneContext {
    return this.currentContext
  }

  markTriggered(): void {
    this.currentContext.triggered = true
  }

  formatForPrompt(): string {
    const ctx = this.currentContext
    if (!ctx.detected) return ''

    let prompt = `\n[用户场景状态]\n`

    // 时间场景
    if (ctx.timeScene) {
      const timeLabels: Record<string, string> = {
        morning: '早晨 (6:00-9:00)',
        work: '工作时间 (9:00-12:00)',
        afternoon: '午间 (12:00-14:00)',
        late_afternoon: '下午 (14:00-18:00)',
        evening: '晚间 (18:00-22:00)',
        night: '深夜 (22:00-6:00)',
      }
      prompt += `时间: ${timeLabels[ctx.timeScene] || ctx.timeScene}\n`
      prompt += `周末: ${ctx.isWeekend ? '是' : '否'}\n`
    }

    // 用户状态
    if (ctx.userState) {
      const stateLabels: Record<string, string> = {
        active: '活跃（正在操作）',
        idle: '闲置（长时间无操作）',
        returning: '刚回来（从闲置恢复）',
        struggling: '遇到困难（操作多次失败）',
        deep_focus: '深度专注',
      }
      prompt += `用户状态: ${stateLabels[ctx.userState] || ctx.userState}\n`
    }

    // 场景响应建议
    if (ctx.sceneResponse && ctx.sceneResponse.type !== 'none') {
      prompt += `场景建议: ${ctx.sceneResponse.type}\n`
      prompt += `建议消息: "${ctx.sceneResponse.message}"\n`
      if (ctx.sceneResponse.suggestedAction && ctx.sceneResponse.suggestedAction !== 'none') {
        prompt += `建议行动: ${ctx.sceneResponse.suggestedAction}\n`
      }
    }

    return prompt
  }
}

export const sceneContextInjector = new SceneContextInjector()
