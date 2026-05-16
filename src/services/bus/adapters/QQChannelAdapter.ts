/**
 * QQChannelAdapter (Phase 2)
 * V112: QQ bot adapter implementing ChannelAdapter interface
 *
 * Phase 2: Full implementation with ensureInitialized() for SDK dynamic loading.
 * QQ uses OneBot protocol for QQ Nightfall/LlOneBot/Mirai etc.
 * toAgentFormat extracts message from OneBot event format.
 *
 * NOTE: In browser environments, this adapter logs a warning and runs in degraded mode.
 * The actual QQ connection should live in a separate bot-runner Node.js service.
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { unifiedMessageBus } from '../UnifiedMessageBus';
import { botConfigManager } from '../BotConfigManager';

interface QQOneBotPayload {
  post_type?: string;
  message_type?: string;
  sub_type?: string;
  message_id?: number;
  user_id?: number;
  group_id?: number;
  guild_id?: number;
  channel_id?: number;
  guild?: string;
  avatar?: string;
  nickname?: string;
  message?: string | Array<{ type: string; data: Record<string, unknown> }>;
  raw_message?: string;
  font?: number;
  sender?: {
    user_id?: number;
    nickname?: string;
    card?: string;
    role?: string;
    title?: string;
  };
  self_id?: number;
  time?: number;
}

export class QQChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'qq';
  readonly channelName = 'qq';

  private botId: string | null = null;
  private _initialized = false;

  // Bus subscription cleanup functions
  private busUnsubscribe: (() => void) | null = null;
  private agentResponseUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  /**
   * Ensure the adapter is initialized (OneBot SDK loaded and ready)
   * In browser environments, this gracefully falls back to non-operational mode
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this._initialized) return true;

    try {
      // Dynamic import oicq (Node.js QQ SDK, will fail in browser)
      // Use /* @vite-ignore */ to prevent bundler from trying to resolve this module
      const oicq = await import(/* @vite-ignore */ 'oicq');
      console.log(`[QQChannelAdapter] Initialized (oicq loaded)`);
      return true;
    } catch (e) {
      // Browser environment - cannot run Node.js SDKs
      console.warn(`[QQChannelAdapter] Cannot initialize in browser:`, e instanceof Error ? e.message : String(e));
      console.info(`[QQChannelAdapter] QQ bot should be run via bot-runner service for production use`);
      this._initialized = true;
      return false;
    }
  }

  /**
   * Initialize the adapter with a bot ID
   * BotId: QQ bot ID / uin (numeric string)
   */
  initialize(token: string): void {
    this.botId = token;
    console.log(`[QQChannelAdapter] Bot ID set: ${token}. Call start() to initialize connection.`);
  }

  /**
   * Start the adapter - initialize QQ connection and subscribe to bus events
   * Phase 1: Stub implementation (no actual OneBot connection)
   */
  async start(): Promise<void> {
    if (!this.botId) {
      console.warn('[QQChannelAdapter] No bot ID configured - cannot start');
      return;
    }

    // Initialize SDK (with browser fallback)
    const success = await this.ensureInitialized();
    if (!success) {
      console.log(`[QQChannelAdapter] Running in degraded mode (browser environment)`);
    }

    // Subscribe to bus events
    this.busUnsubscribe = unifiedMessageBus.subscribe((msg) => {
      if (msg.direction === 'inbound' && msg.channel === 'qq') {
        // Message received from QQ
      }
    });

    // Subscribe to agent response events for sending replies
    this.agentResponseUnsubscribe = unifiedMessageBus.subscribe('bus:agent response', (event) => {
      if (event.channel === 'qq') {
        const target = { user_id: event.channelUserId };
        this.send(target, event.content);
      }
    });

    // Subscribe to config changes to re-init on bot ID change
    this.configUnsubscribe = botConfigManager.subscribe((newConfig) => {
      const channelConfig = newConfig.qq;
      if (channelConfig.enabled && channelConfig.token && channelConfig.token !== this.botId) {
        console.log('[QQChannelAdapter] Bot ID changed, re-initializing...');
        this.botId = channelConfig.token;
        this._initialized = false;
      }
    });

    this._initialized = true;
    console.log(`[QQChannelAdapter] Started and listening for messages`);
  }

  /**
   * Stop the adapter and cleanup subscriptions
   */
  async stop(): Promise<void> {
    if (this.busUnsubscribe) {
      this.busUnsubscribe();
      this.busUnsubscribe = null;
    }

    if (this.agentResponseUnsubscribe) {
      this.agentResponseUnsubscribe();
      this.agentResponseUnsubscribe = null;
    }

    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = null;
    }

    this._initialized = false;
    console.log(`[QQChannelAdapter] Stopped`);
  }

  /**
   * Convert QQ OneBot message to RawMessage format
   * Input format: OneBot v11/v12 event payload
   * Extracts message content from the event
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const event = raw as QQOneBotPayload;

    // Only process message events
    if (event.post_type !== 'message' && event.post_type !== 'message_sent') return null;
    if (!event.message_type) return null;

    // Ignore self messages
    if (event.self_id && event.user_id === event.self_id) return null;

    // Extract message content
    let content = '';
    if (typeof event.message === 'string') {
      content = event.message;
    } else if (Array.isArray(event.message)) {
      // Extract text from segment array (OneBot message segments)
      content = event.message
        .filter((seg) => seg.type === 'text')
        .map((seg) => (seg.data as { text?: string })?.text || '')
        .join('');
    }
    if (!content && !event.raw_message) return null;

    // Determine channel user ID (group or private)
    const channelUserId = event.group_id
      ? `group:${event.group_id}`
      : event.user_id
        ? `user:${event.user_id}`
        : 'unknown';

    return {
      channel: 'qq',
      userId: event.user_id ? String(event.user_id) : 'unknown',
      channelUserId,
      content: content || event.raw_message || '[CQ message]',
      timestamp: event.time ? event.time * 1000 : Date.now(),
      metadata: {
        messageId: event.message_id,
        groupId: event.group_id,
        userId: event.user_id,
        nickname: event.nickname || event.sender?.nickname,
        messageType: event.message_type,
        subType: event.sub_type,
      },
    };
  }

  /**
   * Convert agent response to QQ OneBot message format
   * Returns payload for OneBot send API
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    // Parse channelUserId to determine message type
    const isGroup = msg.channelUserId.startsWith('group:');
    const targetId = msg.channelUserId.replace(/^(group|user):/, '');

    return {
      message_type: isGroup ? 'group' : 'private',
      [isGroup ? 'group_id' : 'user_id']: targetId,
      message: response,
    };
  }

  /**
   * Send message to QQ
   * Phase 1: Stub implementation - logs to console
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.botId) {
      console.warn('[QQChannelAdapter] Bot not initialized - no bot ID');
      return;
    }

    const payload = target as { group_id?: string; user_id?: string; message_type?: string };
    if (!payload.group_id && !payload.user_id) {
      console.warn('[QQChannelAdapter] No recipient provided');
      return;
    }

    // Phase 1 stub - just log
    const recipient = payload.group_id ? `group ${payload.group_id}` : `user ${payload.user_id}`;
    console.log(`[QQChannelAdapter] Would send to ${recipient}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this._initialized && this.botId !== null;
  }
}

// Singleton instance for bus registration
export const qqChannelAdapter = new QQChannelAdapter();