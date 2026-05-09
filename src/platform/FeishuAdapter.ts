/**
 * FeishuAdapter - Feishu (Lark) platform implementation
 *
 * V69: Skeleton implementation for Feishu Open Platform integration
 */

import type { PlatformAdapter, PlatformMessage, AgentState } from './PlatformAdapter'

const FEISHU_API = 'https://open.feishu.cn/open-apis'

export class FeishuAdapter implements PlatformAdapter {
  platform = 'feishu' as const
  private handlers: ((msg: PlatformMessage) => void)[] = []
  private chatId: string = 'feishu-user'

  async sendMessage(text: string): Promise<void> {
    // Stub: console.log('[Feishu] send:', text)
    console.log('[Feishu] send:', text)
    // TODO: Implement actual Feishu API call when app is configured
    const appId = import.meta.env.VITE_FEISHU_APP_ID || process.env.FEISHU_APP_ID
    if (!appId) {
      console.log('[Feishu] App ID not configured, message not sent')
      return
    }
    try {
      // Feishu message sending requires OAuth token - implement when configured
      console.log('[Feishu] Message sending not yet implemented')
    } catch (err) {
      console.error('[Feishu] Failed to send message:', err)
    }
  }

  onMessage(handler: (msg: PlatformMessage) => void): void {
    this.handlers.push(handler)
  }

  async handleWebhook(payload: any): Promise<void> {
    // Parse Feishu message format and call handlers
    try {
      const event = payload?.event
      if (event && event.message) {
        const msg: PlatformMessage = {
          id: event.message.message_id,
          from: event.message.sender?.sender_id?.open_id || 'unknown',
          text: typeof event.message.content === 'string' 
            ? JSON.parse(event.message.content).text || event.message.content 
            : event.message.content?.text || '',
          timestamp: new Date(event.message.create_time).getTime()
        }
        this.chatId = event.message.chat_id
        this.handlers.forEach(h => h(msg))
      }
    } catch (err) {
      console.error('[Feishu] Webhook handler error:', err)
    }
  }

  getUserId(): string {
    return 'feishu-user'
  }

  getUsername(): string {
    return 'FeishuUser'
  }

  renderAgentState(state: AgentState): void {
    this.sendMessage(`Agent状态: ${state.taskCount}任务, ${state.memoryCount}条记忆`)
  }
}
