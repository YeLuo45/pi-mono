/**
 * SlackChannelAdapter (Stub)
 * V109: Slack bot adapter implementing ChannelAdapter interface
 * 
 * NOTE: This is a STUB implementation for type safety and architecture clarity.
 * The actual Slack connection requires @slack/bolt which cannot be bundled
 * into GitHub Pages static builds. The real connection logic should live in a
 * separate bot-runner Node.js service.
 * 
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';

export class SlackChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'slack';
  
  private token: string | null = null;
  private app: unknown = null; // Slack App instance (lazy loaded in Phase 2)

  /**
   * Initialize the adapter with a bot token
   * In Phase 2, this will create the actual Slack App using @slack/bolt
   */
  initialize(token: string): void {
    this.token = token;
    // Phase 2: Dynamic import of @slack/bolt and create app
    // import('@slack/bolt').then(({ App }) => {
    //   this.app = new App({
    //     token: token,
    //     appToken: token.replace('xoxb-', 'xapp-'),
    //   });
    //   this.app.event('message', this.handleMessage.bind(this));
    //   await this.app.start();
    // });
  }

  /**
   * Convert Slack message to RawMessage format
   * Input format matches Slack Bolt event object shape
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const event = raw as {
      user?: string;
      channel?: string;
      text?: string;
      ts?: string;
      subtype?: string;
    };

    // Ignore bot messages and events
    if (event.subtype === 'bot_message') return null;
    if (!event.user) return null;
    if (!event.channel) return null;
    if (!event.text && event.subtype !== 'message_changed') return null;

    return {
      channel: 'slack',
      userId: event.user,
      channelUserId: event.channel,
      content: event.text || '[edited message]',
      timestamp: event.ts ? parseInt(event.ts.split('.')[0]) * 1000 : Date.now(),
      metadata: {
        ts: event.ts,
      },
    };
  }

  /**
   * Convert agent response to Slack message format
   * Returns payload for client.chat.postMessage
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      channel: msg.channelUserId,
      text: response,
    };
  }

  /**
   * Send message to Slack channel
   * Phase 2: Will send message via Slack client
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.token) {
      console.warn('[SlackChannelAdapter] Bot not initialized - no token');
      return;
    }

    const payload = target as { channel?: string };
    if (!payload.channel) {
      console.warn('[SlackChannelAdapter] No channel provided');
      return;
    }

    // Phase 2: Actual implementation would call:
    // await this.app.client.chat.postMessage({
    //   channel: payload.channel,
    //   text: content,
    // });
    console.log(`[SlackChannelAdapter] Would send to ${payload.channel}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this.token !== null && this.app !== null;
  }
}

// Singleton instance for bus registration
export const slackChannelAdapter = new SlackChannelAdapter();