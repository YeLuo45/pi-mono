/**
 * Browser dev stub — node-telegram-bot-api requires Node.js and is not bundled for web.
 */

export default class TelegramBot {
  constructor(_token: string, _options?: unknown) {}

  on(_event: string, _handler: (...args: unknown[]) => void): void {}

  async closePolling(): Promise<void> {}

  async sendMessage(_chatId: string | number, _text: string, _options?: unknown): Promise<void> {
    console.warn('[Telegram] node-telegram-bot-api stub loaded — Node.js runtime required for Telegram bot');
  }
}
