/**
 * DiscordChannelAdapter Phase 2
 * V172: Full dynamic import implementation with gateway
 * 
 * Uses dynamic import of discord.js to avoid bundling in GitHub Pages
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { unifiedMessageBus } from '../UnifiedMessageBus';
import { botConfigManager } from '../BotConfigManager';

export class DiscordChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'discord';
  
  private token: string | null = null;
  private client: any = null;  // Discord.Client, lazy loaded

  get enabled(): boolean {
    return !!botConfigManager.config.discord?.token;
  }

  async start(): Promise<void> {
    const config = botConfigManager.config.discord;
    if (!config?.token) {
      console.log('[Discord] No token configured, skipping start');
      return;
    }
    this.token = config.token;
    
    // Dynamic import — MUST NOT be static import (stubbed in web dev via vite alias)
    const { Client, GatewayIntentBits } = await import('discord.js');
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    
    this.client.on('messageCreate', async (msg: any) => {
      // Ignore bots
      if (msg.author?.bot) return;
      // Ignore messages without content
      if (!msg.content) return;
      
      const raw: RawMessage = {
        channel: 'discord',
        userId: msg.author?.id ?? 'unknown',
        channelUserId: msg.channelId,
        content: msg.content,
        timestamp: msg.createdTimestamp ?? Date.now(),
        metadata: { guildId: msg.guildId },
      };
      
      // Check allowed channels
      if (config.allowedChannels) {
        const allowed = config.allowedChannels.split('|');
        if (!allowed.includes(raw.channelUserId)) return;
      }
      
      await unifiedMessageBus.receive(raw);
    });
    
    await this.client.login(this.token);
    console.log('[Discord] Client logged in');
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      console.log('[Discord] Client destroyed');
    }
  }

  /**
   * Convert raw Discord message to RawMessage format
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
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      channelId: msg.channelUserId,
      content: response,
    };
  }

  async send(target: unknown, content: string): Promise<void> {
    if (!this.client) {
      console.warn('[Discord] Client not started');
      return;
    }
    const payload = target as { channelId?: string };
    if (!payload.channelId) {
      console.warn('[Discord] No channelId provided');
      return;
    }
    try {
      const channel = await this.client.channels.fetch(payload.channelId);
      if (channel?.isTextBased()) {
        await channel.send(content);
      }
    } catch (e) {
      console.error('[Discord] Send error:', e);
    }
  }
}

// Legacy initialize method for backward compatibility with App.tsx
export function initialize(token: string): void {
  // Phase 2: start() is called from App.tsx lifecycle instead
  console.log('[DiscordChannelAdapter] Legacy initialize called - use start() instead');
}

// Singleton instance for bus registration
export const discordChannelAdapter = new DiscordChannelAdapter();