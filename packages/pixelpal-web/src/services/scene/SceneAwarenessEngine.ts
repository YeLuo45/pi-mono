import { getTimeScene, isWeekend } from './timeScene'
import type { UserStateSignal, UserState } from './userStateScene'
import { SCENE_RESPONSES, type SceneResponse, type SceneContext } from './sceneResponseMap'

class SceneAwarenessEngine {
  private userState: UserStateSignal = { state: 'active', timestamp: Date.now(), context: {} }
  private lastResponseTime = 0
  private idleTimer: ReturnType<typeof setTimeout> | null = null

  updateUserState(signal: UserStateSignal): void {
    const wasIdle = this.userState.state === 'idle'
    this.userState = signal
    this.resetIdleTimer()
  }

  getSceneResponse(): SceneResponse | null {
    const now = Date.now()
    const context = this.buildContext()
    
    for (const response of SCENE_RESPONSES) {
      if (now - this.lastResponseTime < response.cooldownMs) continue
      if (response.triggerCondition(context)) {
        this.lastResponseTime = now
        return response
      }
    }
    return null
  }

  private buildContext(): SceneContext {
    return {
      time: getTimeScene(),
      isWeekend: isWeekend(),
      userState: this.userState.state,
      ...this.userState.context,
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      this.updateUserState({ state: 'idle', timestamp: Date.now(), context: { idleDuration: 300 } })
    }, 300000)  // 5分钟idle
  }

  recordAction(action: string): void {
    this.updateUserState({ state: 'active', timestamp: Date.now(), context: { lastAction: action } })
  }

  recordError(): void {
    const errorCount = (this.userState.context.errorCount || 0) + 1
    const state: UserState = errorCount >= 2 ? 'struggling' : 'active'
    this.updateUserState({ state, timestamp: Date.now(), context: { ...this.userState.context, errorCount } })
  }

  getUserState(): UserStateSignal {
    return this.userState
  }
}

export const sceneAwarenessEngine = new SceneAwarenessEngine()
