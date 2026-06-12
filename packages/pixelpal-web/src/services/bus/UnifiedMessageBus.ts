/**
 * UnifiedMessageBus
 * V101: Core message bus with subscription model for multi-channel support
 */

import type { Channel, RawMessage, UnifiedMessage } from './types';
import type { ChannelAdapter } from './ChannelAdapter';
import { userIdentityResolver } from './UserIdentityResolver';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class UnifiedMessageBus {
  private adapters = new Map<Channel, ChannelAdapter>();
  private subscribers = new Set<(msg: UnifiedMessage) => void>();

  /**
   * Register a channel adapter
   */
  registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channel, adapter);
  }

  /**
   * Unregister a channel adapter
   */
  unregisterAdapter(channel: Channel): void {
    this.adapters.delete(channel);
  }

  /**
   * Receive raw message from any channel, dispatch as UnifiedMessage
   */
  async receive(raw: RawMessage): Promise<UnifiedMessage> {
    // Resolve or create userId
    let userId = await userIdentityResolver.resolve(raw.channel, raw.channelUserId);
    if (!userId) {
      userId = await userIdentityResolver.autoCreate(raw.channel, raw.channelUserId);
    }

    // Create unified message
    const msg: UnifiedMessage = {
      id: generateUUID(),
      channel: raw.channel,
      userId,
      content: raw.content,
      timestamp: raw.timestamp || Date.now(),
      sessionId: this.resolveSessionId(raw),
      direction: 'inbound',
      metadata: raw.metadata,
    };

    // Dispatch to all subscribers
    this.subscribers.forEach((fn) => {
      try {
        fn(msg);
      } catch (e) {
        console.warn('[UnifiedMessageBus] Subscriber error:', e);
      }
    });

    return msg;
  }

  /**
   * Subscribe to unified message stream
   * Returns unsubscribe function
   */
  subscribe(handler: (msg: UnifiedMessage) => void): () => void {
    this.subscribers.add(handler);
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Resolve userId across channels (session stitching)
   */
  async resolveUserId(channel: Channel, channelUserId: string): Promise<string | null> {
    return userIdentityResolver.resolve(channel, channelUserId);
  }

  /**
   * Send message through a specific channel adapter
   */
  async send(channel: Channel, target: unknown, content: string): Promise<void> {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`[UnifiedMessageBus] No adapter registered for channel: ${channel}`);
    }
    await adapter.send(target, content);
  }

  /**
   * Get adapter for a channel
   */
  getAdapter(channel: Channel): ChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  /**
   * Generate session ID based on userId and channel
   */
  private resolveSessionId(raw: RawMessage): string {
    // For now, session is userId + channel
    // In future, could be more sophisticated stitching across channels
    return `session_${raw.userId}_${raw.channel}`;
  }
}

export const unifiedMessageBus = new UnifiedMessageBus();