/**
 * ChannelAdapter Interface
 * V102: Abstraction for channel-specific message handling
 */

import type { Channel, RawMessage, UnifiedMessage } from './types';

export interface ChannelAdapter {
  channel: Channel;

  /** Whether the adapter is enabled based on config */
  get enabled(): boolean;

  /**
   * Start the adapter (lifecycle hook)
   * Called when app initializes and channel is configured
   */
  start(): Promise<void>;

  /**
   * Stop the adapter (lifecycle hook)
   * Called when app shuts down or channel is disabled
   */
  stop(): Promise<void>;

  /**
   * Convert raw channel-specific input to normalized RawMessage
   * Returns null if input cannot be parsed
   */
  toAgentFormat(raw: unknown): RawMessage | null;

  /**
   * Convert agent response to channel-specific output format
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown;

  /**
   * Send message to the channel (for outbound messages)
   */
  send(target: unknown, content: string): Promise<void>;
}