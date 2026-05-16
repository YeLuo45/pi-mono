/**
 * FeishuChannelAdapter (Stub)
 * V109: Feishu (Lark) bot adapter implementing ChannelAdapter interface
 * 
 * NOTE: This is a STUB implementation for type safety and architecture clarity.
 * The actual Feishu connection requires @larksuiteoapi/node-sdk which cannot be bundled
 * into GitHub Pages static builds. The real connection logic should live in a
 * separate bot-runner Node.js service.
 * 
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';

export class FeishuChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'feishu';
  
  private token: string | null = null;
  private client: unknown = null; // Feishu client instance (lazy loaded in Phase 2)

  /**
   * Initialize the adapter with a bot token
   * In Phase 2, this will create the actual Feishu client using @larksuiteoapi/node-sdk
   */
  initialize(token: string): void {
    this.token = token;
    // Phase 2: Dynamic import of @larksuiteoapi/node-sdk and create client
    // import('@larksuiteoapi/node-sdk').then(({ Client }) => {
    //   this.client = new Client({
    //     appId: token.split(':')[0],
    //     appSecret: token.split(':')[1],
    //     logger: console,
    //   });
    // });
  }

  /**
   * Convert Feishu message to RawMessage format
   * Input format matches Feishu SDK event object shape
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const event = raw as {
      sender?: { sender_id?: { open_id?: string } };
      message?: { chat_id?: string; content?: string };
      create_time?: string;
    };

    const userId = event.sender?.sender_id?.open_id;
    if (!userId) return null;
    if (!event.message?.content) return null;

    let content = event.message.content;
    try {
      // Feishu content is JSON string
      const parsed = JSON.parse(content);
      content = parsed.text || content;
    } catch {
      // Keep original content if not JSON
    }

    return {
      channel: 'feishu',
      userId,
      channelUserId: event.message.chat_id || userId,
      content,
      timestamp: event.create_time ? new Date(event.create_time).getTime() : Date.now(),
      metadata: {},
    };
  }

  /**
   * Convert agent response to Feishu message format
   * Returns payload for lark-sdk message API
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      receive_id: msg.channelUserId,
      msg_type: 'text',
      content: JSON.stringify({ text: response }),
    };
  }

  /**
   * Send message to Feishu
   * Phase 2: Will send message via Feishu SDK
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.token) {
      console.warn('[FeishuChannelAdapter] Bot not initialized - no token');
      return;
    }

    const payload = target as { receive_id?: string };
    if (!payload.receive_id) {
      console.warn('[FeishuChannelAdapter] No recipient provided');
      return;
    }

    // Phase 2: Actual implementation would call:
    // await this.client.im.message.create({
    //   receive_id: payload.receive_id,
    //   msg_type: 'text',
    //   content: JSON.stringify({ text: content }),
    // });
    console.log(`[FeishuChannelAdapter] Would send to ${payload.receive_id}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this.token !== null && this.client !== null;
  }
}

// Singleton instance for bus registration
export const feishuChannelAdapter = new FeishuChannelAdapter();