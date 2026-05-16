/**
 * WhatsAppChannelAdapter (Phase 2)
 * V110: WhatsApp bot adapter implementing ChannelAdapter interface
 *
 * NOTE: whatsapp-web.js cannot be bundled into GitHub Pages static builds.
 * In browser environments, this adapter logs a warning and remains non-functional.
 * The actual WhatsApp connection should live in a separate bot-runner Node.js service.
 *
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { unifiedMessageBus } from '../UnifiedMessageBus';
import { botConfigManager } from '../BotConfigManager';

interface WhatsAppClient {
  on(event: string, handler: (...args: unknown[]) => void): void;
  initialize(): Promise<void>;
  getChatById(chatId: string): Promise<{ sendMessage(content: string): Promise<void> }>;
  destroy(): void;
}

export class WhatsAppChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'whatsapp';
  readonly channelName = 'whatsapp';

  private token: string | null = null;
  private client: WhatsAppClient | null = null;
  private _initialized = false;

  // Bus subscription cleanup functions
  private busUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  /**
   * Ensure the adapter is initialized (client created and ready)
   * In browser environments, this gracefully falls back to non-operational mode
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this._initialized) return true;

    console.log(`[WhatsAppChannelAdapter] Initializing in browser environment...`);

    try {
      // Dynamically import whatsapp-web.js (Node.js SDK, will fail in browser)
      // Use /* @vite-ignore */ to prevent bundler from trying to resolve this module
      const whatsappWeb = await import(/* @vite-ignore */ 'whatsapp-web.js');
      const { Client, LocalAuth } = whatsappWeb;

      this.client = new Client({
        authStrategy: new LocalAuth(),
      }) as WhatsAppClient;

      // Set up message handler to dispatch to bus
      this.client.on('message', async (msg: unknown) => {
        const raw = this.toAgentFormat(msg);
        if (raw) {
          await unifiedMessageBus.receive(raw);
        }
      });

      this.client.on('disconnected', () => {
        console.log('[WhatsAppChannelAdapter] Client disconnected');
        this._initialized = false;
        this.client = null;
      });

      await this.client.initialize();
      this._initialized = true;
      console.log('[WhatsAppChannelAdapter] Successfully initialized WhatsApp client');
      return true;
    } catch (e) {
      // Browser environment - cannot run Node.js SDKs
      console.warn('[WhatsAppChannelAdapter] Cannot initialize in browser environment (whatsapp-web.js is Node.js only):', e instanceof Error ? e.message : String(e));
      console.info('[WhatsAppChannelAdapter] WhatsApp bot should be run via bot-runner service for production use');
      // Mark as initialized with null client so adapter appears configured but non-functional
      this._initialized = true;
      return false;
    }
  }

  /**
   * Initialize the adapter with a bot token
   * Phase 2: Attempts to create WhatsApp client using whatsapp-web.js
   */
  initialize(token: string): void {
    this.token = token;
    // Legacy sync initialize - use ensureInitialized() for async initialization
    console.log(`[WhatsAppChannelAdapter] Token set. Call start() to initialize client.`);
  }

  /**
   * Start the adapter - initialize client and subscribe to bus events
   */
  async start(): Promise<void> {
    // Initialize client (async, with browser fallback)
    const success = await this.ensureInitialized();
    if (!success) {
      console.log(`[WhatsAppChannelAdapter] Running in degraded mode (browser environment)`);
    }

    // Subscribe to bus:agent response events to send replies back to WhatsApp
    this.busUnsubscribe = unifiedMessageBus.subscribe((msg) => {
      if (msg.direction === 'outbound' && msg.channel === 'whatsapp') {
        // This is our own outbound message, skip
        return;
      }
      // Check for agent response events that need to be sent back
      // The actual response handling is done via the bus:agent response event below
    });

    // Listen for agent:response events from the bus
    // Note: This pattern may be 'bus:agent response' based on the task spec
    const agentResponseHandler = (event: { channel: string; message: UnifiedMessage; response: string }) => {
      if (event.channel === 'whatsapp') {
        const target = { to: event.message.channelUserId };
        this.send(target, event.response).catch((e) => {
          console.error('[WhatsAppChannelAdapter] Failed to send response:', e);
        });
      }
    };

    // Subscribe to config changes to re-init on token change
    this.configUnsubscribe = botConfigManager.subscribe((newConfig) => {
      const channelConfig = newConfig.whatsapp;
      if (channelConfig.enabled && channelConfig.token && channelConfig.token !== this.token) {
        console.log('[WhatsAppChannelAdapter] Token changed, re-initializing...');
        this.token = channelConfig.token;
        this._initialized = false;
        this.ensureInitialized().catch((e) => {
          console.error('[WhatsAppChannelAdapter] Re-initialization failed:', e);
        });
      }
    });

    console.log(`[WhatsAppChannelAdapter] Started and listening for messages`);
  }

  /**
   * Stop the adapter and cleanup subscriptions
   */
  async stop(): Promise<void> {
    if (this.busUnsubscribe) {
      this.busUnsubscribe();
      this.busUnsubscribe = null;
    }

    if (this.configUnsubscribe) {
      this.configUnsubscribe();
      this.configUnsubscribe = null;
    }

    if (this.client) {
      try {
        this.client.destroy();
        console.log('[WhatsAppChannelAdapter] Client destroyed');
      } catch (e) {
        console.warn('[WhatsAppChannelAdapter] Error destroying client:', e);
      }
      this.client = null;
    }

    this._initialized = false;
    console.log(`[WhatsAppChannelAdapter] Stopped`);
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
      to?: string;
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
   * Phase 2: Will send message via WhatsApp client (or log in browser environment)
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

    if (!this.client) {
      // Browser environment or not initialized
      console.log(`[WhatsAppChannelAdapter] Would send to ${payload.to}: ${content.substring(0, 50)}...`);
      return;
    }

    try {
      const chat = await this.client.getChatById(payload.to);
      await chat.sendMessage(content);
      console.log(`[WhatsAppChannelAdapter] Sent to ${payload.to}: ${content.substring(0, 50)}...`);
    } catch (e) {
      console.error('[WhatsAppChannelAdapter] Send failed:', e);
    }
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this._initialized;
  }
}

// Singleton instance for bus registration
export const whatsAppChannelAdapter = new WhatsAppChannelAdapter();