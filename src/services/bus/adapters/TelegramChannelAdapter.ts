/**
 * TelegramChannelAdapter Phase 2
 * V172: Full dynamic import implementation with polling
 * 
 * Uses dynamic import of node-telegram-bot-api to avoid bundling in GitHub Pages
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { unifiedMessageBus } from '../UnifiedMessageBus';
import { botConfigManager } from '../BotConfigManager';

export class TelegramChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'telegram';
  
  private token: string | null = null;
  private bot: any = null;  // TelegramBot instance, lazy loaded

  get enabled(): boolean {
    return !!botConfigManager.config.telegram?.token;
  }

  async start(): Promise<void> {
    const config = botConfigManager.config.telegram;
    if (!config?.token) {
      console.log('[Telegram] No token configured, skipping start');
      return;
    }
    this.token = config.token;
    
    // Dynamic import — MUST NOT be static import (stubbed in web dev via vite alias)
    const { default: TelegramBot } = await import('node-telegram-bot-api');
    this.bot = new TelegramBot(this.token, { polling: true });
    
    this.bot.on('message', (msg: any) => {
      if (!msg.text && !msg.document) return;
      const raw: RawMessage = {
        channel: 'telegram',
        userId: String(msg.from?.id ?? 'unknown'),
        channelUserId: String(msg.chat?.id ?? msg.from?.id),
        content: msg.text || '[non-text message]',
        timestamp: (msg.date ?? Date.now() / 1000) * 1000,
        metadata: { messageId: msg.message_id },
      };
      
      // Check allowed users
      if (config.allowedUsers) {
        const allowed = config.allowedUsers.split('|');
        if (!allowed.includes(raw.userId)) return;
      }
      
      unifiedMessageBus.receive(raw);
    });
    
    console.log('[Telegram] Bot started with polling');
  }

  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.closePolling();
      this.bot = null;
      console.log('[Telegram] Bot stopped');
    }
  }

  /**
   * Convert raw Telegram message to RawMessage format
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
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      chat_id: msg.channelUserId,
      text: response,
    };
  }

  async send(target: unknown, content: string): Promise<void> {
    if (!this.bot) {
      console.warn('[Telegram] Bot not started');
      return;
    }
    const payload = target as { chat_id?: string | number };
    if (!payload.chat_id) {
      console.warn('[Telegram] No chat_id provided');
      return;
    }
    try {
      await this.bot.sendMessage(payload.chat_id, content, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('[Telegram] Send error:', e);
    }
  }
}

// Legacy initialize method for backward compatibility with App.tsx
export function initialize(token: string): void {
  // Phase 2: start() is called from App.tsx lifecycle instead
  console.log('[TelegramChannelAdapter] Legacy initialize called - use start() instead');
}

// Singleton instance for bus registration
export const telegramChannelAdapter = new TelegramChannelAdapter();