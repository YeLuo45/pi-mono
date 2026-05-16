/**
 * TelegramChannelAdapter (Stub)
 * V102: Telegram bot adapter implementing ChannelAdapter interface
 * 
 * NOTE: This is a STUB implementation for type safety and architecture clarity.
 * The actual Telegram bot connection requires node-telegram-bot-api which cannot
 * be bundled into GitHub Pages static builds. The real connection logic should
 * live in a separate bot-runner Node.js service.
 * 
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';

export class TelegramChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'telegram';
  
  private token: string | null = null;
  private bot: unknown = null; // TelegramBot instance (lazy loaded in Phase 2)

  /**
   * Initialize the adapter with a bot token
   * In Phase 2, this will create the actual TelegramBot instance
   */
  initialize(token: string): void {
    this.token = token;
    // Phase 2: Dynamic import of node-telegram-bot-api and create bot instance
    // import('node-telegram-bot-api').then(({ default: TelegramBot }) => {
    //   this.bot = new TelegramBot(token, { polling: true });
    //   this.setupMessageHandler();
    // });
  }

  /**
   * Convert Telegram message to RawMessage format
   * Input format matches Telegram Bot API Message object shape
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const msg = raw as {
      from?: { id?: number | string };
      chat?: { id?: number | string };
      text?: string;
      document?: unknown;
      date?: number;
      message_id?: number;
    };

    if (!msg.chat?.id && !msg.from?.id) return null;
    // Accept text or document messages
    if (!msg.text && !msg.document) return null;

    return {
      channel: 'telegram',
      userId: String(msg.from?.id ?? 'unknown'),
      channelUserId: String(msg.chat?.id ?? msg.from?.id),
      content: msg.text || '[non-text message]',
      timestamp: (msg.date ?? Date.now() / 1000) * 1000,
      metadata: {
        messageId: msg.message_id,
      },
    };
  }

  /**
   * Convert agent response to Telegram message format
   * Returns payload for bot.sendMessage
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      chat_id: msg.channelUserId,
      text: response,
    };
  }

  /**
   * Send message to Telegram chat
   * Phase 2: Will call bot.sendMessage with the prepared payload
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.token) {
      console.warn('[TelegramChannelAdapter] Bot not initialized - no token');
      return;
    }

    const payload = target as { chat_id?: string | number };
    if (!payload.chat_id) {
      console.warn('[TelegramChannelAdapter] No chat_id provided');
      return;
    }

    // Phase 2: Actual implementation would call:
    // await this.bot.sendMessage(payload.chat_id, content);
    console.log(`[TelegramChannelAdapter] Would send to ${payload.chat_id}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this.token !== null && this.bot !== null;
  }
}

// Singleton instance for bus registration
export const telegramChannelAdapter = new TelegramChannelAdapter();