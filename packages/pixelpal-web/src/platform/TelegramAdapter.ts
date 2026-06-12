/**
 * TelegramAdapter - Telegram platform implementation
 *
 * V76: Real Telegram Bot API integration with long polling
 */

import type { PlatformAdapter, PlatformMessage } from './PlatformAdapter'

const API_BASE = 'https://api.telegram.org/bot'

export class TelegramAdapter implements PlatformAdapter {
  platform = 'telegram' as const
  private token: string
  private offset = 0
  private handlers: ((msg: PlatformMessage) => void)[] = []
  private polling = false
  private chatId = ''

  constructor() {
    this.token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || ''
  }

  private get api(): string {
    return `${API_BASE}${this.token}`
  }

  private async getUpdates(): Promise<any[]> {
    if (!this.token) return []
    try {
      const resp = await fetch(`${this.api}/getUpdates?offset=${this.offset}&timeout=10&allowed_updates=message`)
      const data = await resp.json()
      return data.ok ? data.result : []
    } catch (e) {
      console.error('[Telegram] getUpdates error:', e)
      return []
    }
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.token) {
      console.warn('[Telegram] Bot token not configured')
      return
    }
    if (!this.chatId) {
      console.warn('[Telegram] No chatId set, message not sent')
      return
    }
    try {
      const resp = await fetch(`${this.api}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'Markdown',
        }),
      })
      const data = await resp.json()
      if (!data.ok) {
        console.warn('[Telegram] sendMessage failed:', data.description)
      }
    } catch (e) {
      console.error('[Telegram] sendMessage error:', e)
    }
  }

  async startPolling(): Promise<void> {
    if (this.polling) return
    if (!this.token) {
      console.warn('[Telegram] Bot token not configured, cannot start polling')
      return
    }
    this.polling = true
    console.log('[Telegram] Starting long polling...')
    this.poll().catch(console.error)
  }

  private async poll(): Promise<void> {
    while (this.polling) {
      try {
        const updates = await this.getUpdates()
        for (const update of updates) {
          this.offset = update.update_id + 1
          if (update.message && update.message.chat) {
            this.chatId = update.message.chat.id.toString()
            const msg: PlatformMessage = {
              id: update.update_id.toString(),
              text: update.message.text || '',
              from: update.message.from?.username || update.message.from?.first_name || 'unknown',
              timestamp: update.message.date * 1000,
              platform: 'telegram',
              chatId: this.chatId,
            }
            this.handlers.forEach(h => {
              try { h(msg) } catch (e) { console.error('[Telegram] handler error:', e) }
            })
          }
        }
      } catch (e) {
        console.error('[Telegram] poll error:', e)
      }
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  stopPolling(): void {
    this.polling = false
  }

  onMessage(handler: (msg: PlatformMessage) => void): void {
    this.handlers.push(handler)
  }

  removeHandler(handler: (msg: PlatformMessage) => void): void {
    this.handlers = this.handlers.filter(h => h !== handler)
  }

  getUserId(): string {
    return this.chatId || 'telegram-user'
  }

  getUsername(): string {
    return 'TelegramUser'
  }

  renderAgentState(state: { taskCount: number; memoryCount: number }): void {
    this.sendMessage(`Agent状态: ${state.taskCount}任务, ${state.memoryCount}条记忆`)
  }
}
