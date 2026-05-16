/**
 * WhatsAppChannelAdapter (Stub)
 * V109: WhatsApp bot adapter implementing ChannelAdapter interface
 * 
 * NOTE: This is a STUB implementation for type safety and architecture clarity.
 * The actual WhatsApp connection requires whatsapp-web.js which cannot be bundled
 * into GitHub Pages static builds. The real connection logic should live in a
 * separate bot-runner Node.js service.
 * 
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';

export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'whatsapp';
  
  private token: string | null = null;
  private client: unknown = null; // WhatsApp client instance (lazy loaded in Phase 2)

  /**
   * Initialize the adapter with a bot token
   * In Phase 2, this will create the actual WhatsApp client using whatsapp-web.js
   */
  initialize(token: string): void {
    this.token = token;
    // Phase 2: Dynamic import of whatsapp-web.js and create client
    // import('whatsapp-web.js').then(({ Client, LocalAuth }) => {
    //   this.client = new Client({
    //     authStrategy: new LocalAuth(),
    //   });
    //   this.client.on('message', this.handleMessage.bind(this));
    //   this.client.initialize();
    // });
  }

  /**
   * Convert WhatsApp message to RawMessage format
   * Input format matches whatsapp-web.js Message object shape
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const msg = raw as {
      from?: string;
      fromMe?: boolean;
      body?: string;
      timestamp?: number;
      hasMedia?: boolean;
    };

    // Ignore outgoing messages
    if (msg.fromMe) return null;
    if (!msg.from) return null;
    if (!msg.body && !msg.hasMedia) return null;

    return {
      channel: 'whatsapp',
      userId: msg.from,
      channelUserId: msg.from,
      content: msg.body || '[media message]',
      timestamp: (msg.timestamp ?? Date.now() / 1000) * 1000,
      metadata: {
        hasMedia: msg.hasMedia,
      },
    };
  }

  /**
   * Convert agent response to WhatsApp message format
   * Returns payload for message.reply()
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      to: msg.channelUserId,
      content: response,
    };
  }

  /**
   * Send message to WhatsApp
   * Phase 2: Will send message via WhatsApp client
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.token) {
      console.warn('[WhatsAppChannelAdapter] Bot not initialized - no token');
      return;
    }

    const payload = target as { to?: string };
    if (!payload.to) {
      console.warn('[WhatsAppChannelAdapter] No recipient provided');
      return;
    }

    // Phase 2: Actual implementation would call:
    // const chat = await this.client.getChatById(payload.to);
    // await chat.sendMessage(content);
    console.log(`[WhatsAppChannelAdapter] Would send to ${payload.to}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this.token !== null && this.client !== null;
  }
}

// Singleton instance for bus registration
export const whatsAppChannelAdapter = new WhatsAppChannelAdapter();