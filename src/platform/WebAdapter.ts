/**
 * WebAdapter - Web platform implementation
 *
 * V69: Wraps existing Web UI interactions into the PlatformAdapter interface
 */

import type { PlatformAdapter, PlatformMessage, AgentState } from './PlatformAdapter'

export class WebAdapter implements PlatformAdapter {
  platform = 'web' as const
  private handlers: ((msg: PlatformMessage) => void)[] = []
  private userId: string
  private username: string

  constructor() {
    this.userId = 'web-user'
    this.username = 'WebUser'
  }

  async sendMessage(text: string): Promise<void> {
    // Web platform uses store/UI - stub for now
    console.log('[Web] send:', text)
  }

  onMessage(handler: (msg: PlatformMessage) => void): void {
    this.handlers.push(handler)
  }

  getUserId(): string {
    return this.userId
  }

  getUsername(): string {
    return this.username
  }

  renderAgentState(state: AgentState): void {
    // Web platform renders state through React components
    console.log('[Web] Agent state:', state.taskCount, 'tasks,', state.memoryCount, 'memories')
  }

  /** @deprecated Use platform-specific adapter instead */
  sendToChat(text: string): void {
    console.warn('[WebAdapter] sendToChat is deprecated, use sendMessage')
    void this.sendMessage(text)
  }
}
