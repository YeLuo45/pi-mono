/**
 * DiscordChannelAdapter (Stub)
 * V102: Discord bot adapter implementing ChannelAdapter interface
 * 
 * NOTE: This is a STUB implementation for type safety and architecture clarity.
 * The actual Discord bot connection requires discord.js which cannot be bundled
 * into GitHub Pages static builds. The real connection logic should live in a
 * separate bot-runner Node.js service.
 * 
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';

export class DiscordChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'discord';
  
  private token: string | null = null;
  private client: unknown = null; // Discord.Client instance (lazy loaded in Phase 2)

  /**
   * Initialize the adapter with a bot token
   * In Phase 2, this will create the actual Discord.Client instance
   */
  initialize(token: string): void {
    this.token = token;
    // Phase 2: Dynamic import of discord.js and create client
    // import('discord.js').then(({ Client, GatewayIntentBits }) => {
    //   this.client = new Client({
    //     intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    //   });
    //   this.client.on('messageCreate', this.handleMessage.bind(this));
    //   this.client.login(token);
    // });
  }

  /**
   * Convert Discord message to RawMessage format
   * Input format matches Discord.js Message object shape
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const msg = raw as {
      author?: { id?: string; bot?: boolean };
      channelId?: string;
      guildId?: string;
      content?: string;
      createdTimestamp?: number;
    };

    // Ignore bot messages
    if (msg.author?.bot) return null;
    if (!msg.channelId) return null;
    if (!msg.content && typeof msg.content !== 'string') return null;

    return {
      channel: 'discord',
      userId: msg.author?.id ?? 'unknown',
      channelUserId: msg.channelId,
      content: msg.content,
      timestamp: msg.createdTimestamp ?? Date.now(),
      metadata: {
        guildId: msg.guildId,
      },
    };
  }

  /**
   * Convert agent response to Discord message format
   * Returns payload for channel.send()
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      channelId: msg.channelUserId,
      content: response,
    };
  }

  /**
   * Send message to Discord channel
   * Phase 2: Will fetch channel and send message
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.token) {
      console.warn('[DiscordChannelAdapter] Bot not initialized - no token');
      return;
    }

    const payload = target as { channelId?: string };
    if (!payload.channelId) {
      console.warn('[DiscordChannelAdapter] No channelId provided');
      return;
    }

    // Phase 2: Actual implementation would call:
    // const channel = await this.client.channels.fetch(payload.channelId);
    // if (channel?.isTextBased()) await channel.send(content);
    console.log(`[DiscordChannelAdapter] Would send to ${payload.channelId}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this.token !== null && this.client !== null;
  }
}

// Singleton instance for bus registration
export const discordChannelAdapter = new DiscordChannelAdapter();