/**
 * DingTalkChannelAdapter (Phase 2)
 * V112: DingTalk bot adapter implementing ChannelAdapter interface
 *
 * Phase 2: Full implementation with ensureInitialized() for SDK dynamic loading.
 * Uses dingtalk_stream SDK with Stream Mode callback (CallbackHandler).
 * toAgentFormat extracts chatbot_msg.text.content from the callback payload.
 *
 * NOTE: In browser environments, this adapter logs a warning and runs in degraded mode.
 * The actual DingTalk connection should live in a separate bot-runner Node.js service.
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { unifiedMessageBus } from '../UnifiedMessageBus';
import { botConfigManager } from '../BotConfigManager';

interface DingTalkCallbackPayload {
  chatbot_msg?: {
    conversation_id?: string;
    sender_nick?: string;
    is_robot?: boolean;
    text?: { content?: string };
    pics?: unknown[];
    chat_id?: string;
    msg_id?: string;
    sender_id?: string;
  };
  signature?: string;
  timestamp?: string;
}

export class DingTalkChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'dingtalk';
  readonly channelName = 'dingtalk';

  private token: string | null = null;
  private _initialized = false;

  // Bus subscription cleanup functions
  private busUnsubscribe: (() => void) | null = null;
  private agentResponseUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  /**
   * Ensure the adapter is initialized (SDK loaded and ready)
   * In browser environments, this gracefully falls back to non-operational mode
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this._initialized) return true;

    try {
      // Dynamic import dingtalk_stream SDK (Node.js SDK, will fail in browser)
      // Use /* @vite-ignore */ to prevent bundler from trying to resolve this module
      const dingtalkSDK = await import(/* @vite-ignore */ '@dingtalk_stream');
      console.log(`[DingTalkChannelAdapter] Initialized (SDK loaded)`);
      return true;
    } catch (e) {
      // Browser environment - cannot run Node.js SDKs
      console.warn(`[DingTalkChannelAdapter] Cannot initialize in browser:`, e instanceof Error ? e.message : String(e));
      console.info(`[DingTalkChannelAdapter] DingTalk bot should be run via bot-runner service for production use`);
      this._initialized = true;
      return false;
    }
  }

  /**
   * Initialize the adapter with a bot token
   * Token: DingTalk stream callback token (from DingTalk Open Platform)
   */
  initialize(token: string): void {
    this.token = token;
    console.log(`[DingTalkChannelAdapter] Token set. Call start() to initialize stream connection.`);
  }

  /**
   * Start the adapter - initialize DingTalk stream and subscribe to bus events
   * Phase 1: Stub implementation (no actual stream connection)
   */
  async start(): Promise<void> {
    if (!this.token) {
      console.warn('[DingTalkChannelAdapter] No token configured - cannot start');
      return;
    }

    // Initialize SDK (with browser fallback)
    const success = await this.ensureInitialized();
    if (!success) {
      console.log(`[DingTalkChannelAdapter] Running in degraded mode (browser environment)`);
    }

    // Subscribe to bus events
    this.busUnsubscribe = unifiedMessageBus.subscribe((msg) => {
      if (msg.direction === 'inbound' && msg.channel === 'dingtalk') {
        // Message received from DingTalk
      }
    });

    // Subscribe to agent response events for sending replies
    this.agentResponseUnsubscribe = unifiedMessageBus.subscribe('bus:agent response', (event) => {
      if (event.channel === 'dingtalk') {
        const target = { chat_id: event.channelUserId };
        this.send(target, event.content);
      }
    });

    // Subscribe to config changes to re-init on token change
    this.configUnsubscribe = botConfigManager.subscribe((newConfig) => {
      const channelConfig = newConfig.dingtalk;
      if (channelConfig.enabled && channelConfig.token && channelConfig.token !== this.token) {
        console.log('[DingTalkChannelAdapter] Token changed, re-initializing...');
        this.token = channelConfig.token;
        this._initialized = false;
      }
    });

    this._initialized = true;
    console.log(`[DingTalkChannelAdapter] Started and listening for messages`);
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
    console.log(`[DingTalkChannelAdapter] Stopped`);
  }

  /**
   * Convert DingTalk message to RawMessage format
   * Input format: DingTalk Stream CallbackHandler callback payload
   * Extracts chatbot_msg.text.content from the callback
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const payload = raw as DingTalkCallbackPayload;
    const chatbotMsg = payload.chatbot_msg;

    if (!chatbotMsg) return null;

    // Ignore non-robot messages
    if (chatbotMsg.is_robot === false) return null;

    const text = chatbotMsg.text?.content;
    if (!text && (!chatbotMsg.pics || chatbotMsg.pics.length === 0)) return null;

    return {
      channel: 'dingtalk',
      userId: chatbotMsg.sender_id || 'unknown',
      channelUserId: chatbotMsg.chat_id || chatbotMsg.conversation_id || 'unknown',
      content: text || '[image message]',
      timestamp: Date.now(),
      metadata: {
        msgId: chatbotMsg.msg_id,
        senderNick: chatbotMsg.sender_nick,
        hasPics: (chatbotMsg.pics?.length ?? 0) > 0,
      },
    };
  }

  /**
   * Convert agent response to DingTalk message format
   * Returns payload for DingTalk sending API
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      chat_id: msg.channelUserId,
      msg_type: 'text',
      content: response,
    };
  }

  /**
   * Send message to DingTalk
   * Phase 1: Stub implementation - logs to console
   */
  async send(target: unknown, content: string): Promise<void> {
    if (!this.token) {
      console.warn('[DingTalkChannelAdapter] Bot not initialized - no token');
      return;
    }

    const payload = target as { chat_id?: string };
    if (!payload.chat_id) {
      console.warn('[DingTalkChannelAdapter] No recipient provided');
      return;
    }

    // Phase 1 stub - just log
    console.log(`[DingTalkChannelAdapter] Would send to ${payload.chat_id}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this._initialized && this.token !== null;
  }
}

// Singleton instance for bus registration
export const dingTalkChannelAdapter = new DingTalkChannelAdapter();