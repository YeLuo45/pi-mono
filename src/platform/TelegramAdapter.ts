/**
 * TelegramAdapter - Telegram platform implementation
 *
 * V69: Skeleton implementation for Telegram Bot API integration
 */

import type { PlatformAdapter, PlatformMessage, AgentState } from './PlatformAdapter'

const TELEGRAM_API = 'https://api.telegram.org/bot' + (import.meta.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '')

export class TelegramAdapter implements PlatformAdapter {
  platform = 'telegram' as const
  private offset = 0
  private handlers: ((msg: PlatformMessage) => void)[] = []
  private chatId: string = 'telegram-user'

  async sendMessage(text: string): Promise<void> {
    // Stub: POST to TELEGRAM_API/sendMessage
    console.log('[Telegram] send:', text)
    // TODO: Implement actual Telegram API call when bot token is configured
    if (TELEGRAM_API.includes('undefined') || TELEGRAM_API.endsWith('bot')) {
      console.log('[Telegram] Bot token not configured, message not sent')
      return
    }
    try {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'MarkdownV2'
        })
      })
    } catch (err) {
      console.error('[Telegram] Failed to send message:', err)
    }
  }

  onMessage(handler: (msg: PlatformMessage) => void): void {
    this.handlers.push(handler)
  }

  async poll(): Promise<void> {
    // Long polling: GET TELEGRAM_API/getUpdates?offset=${this.offset}
    if (!TELEGRAM_API.includes('undefined') && !TELEGRAM_API.endsWith('bot')) {
      try {
        const response = await fetch(`${TELEGRAM_API}/getUpdates?offset=${this.offset}&timeout=30`)
        const data = await response.json() as { ok: boolean; result?: Array<{ update_id: number; message?: { message_id: number; from?: { id: number; first_name: string; username?: string }; chat: { id: number }; date: number; text?: string } }> }
        if (data.ok && data.result) {
          for (const update of data.result) {
            if (update.message) {
              const msg: PlatformMessage = {
                id: String(update.message.message_id),
                from: update.message.from?.first_name || 'Unknown',
                text: update.message.text || '',
                timestamp: update.message.date * 1000
              }
              this.chatId = String(update.message.chat.id)
              this.offset = update.update_id + 1
              this.handlers.forEach(h => h(msg))
            }
          }
        }
      } catch (err) {
        console.error('[Telegram] Poll error:', err)
      }
    }
  }

  getUserId(): string {
    return 'telegram-user'
  }

  getUsername(): string {
    return 'TelegramUser'
  }

  renderAgentState(state: AgentState): void {
    this.sendMessage(`Agent状态: ${state.taskCount}任务, ${state.memoryCount}条记忆`)
  }
}
