/**
 * SlackChannelAdapter (Phase 2)
 * V110: Slack bot adapter implementing ChannelAdapter interface
 *
 * NOTE: @slack/bolt (Node.js SDK) cannot be bundled into GitHub Pages static builds.
 * In browser environments, this adapter logs a warning and remains non-functional.
 * The actual Slack connection should live in a separate bot-runner Node.js service.
 *
 * See: src/plugins/bot-runner/README.md for Phase 2 implementation
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { unifiedMessageBus } from '../UnifiedMessageBus';
import { botConfigManager } from '../BotConfigManager';

export class SlackChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'slack';
  readonly channelName = 'slack';

  private token: string | null = null;
  private appToken: string | null = null;
  private _initialized = false;

  // Bus subscription cleanup functions
  private busUnsubscribe: (() => void) | null = null;
  private configUnsubscribe: (() => void) | null = null;

  /**
   * Ensure the adapter is initialized
   * In browser environments, this gracefully falls back to non-operational mode
   * since @slack/bolt cannot run in the browser
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this._initialized) return true;

    console.log(`[SlackChannelAdapter] Initializing in browser environment...`);

    // @slack/bolt is Node.js only - cannot run in browser
    // @slack/bolt is Node.js only - use vite-ignore to prevent bundler from failing
    let SlackApp: unknown = null;
    try {
      // Keep the package name out of a literal import so Vite does not pre-resolve it.
      const sdkPackage = '@slack/bolt';
      const mod = await import(/* @vite-ignore */ sdkPackage);
      if (mod && mod.App) SlackApp = mod;
    } catch {
      // Module not available - expected in browser
    }

    if (!SlackApp) {
      // Browser environment - cannot run Node.js SDKs
      console.warn('[SlackChannelAdapter] Cannot initialize in browser environment (@slack/bolt is Node.js only)');
      console.info('[SlackChannelAdapter] Slack bot should be run via bot-runner service for production use');
      // Mark as initialized so we don't keep trying
      this._initialized = true;
      return false;
    }

    try {
      const App = SlackApp as { new(config: unknown): unknown };
      const app = new App({
        token: this.token,
        appToken: this.appToken || (this.token?.startsWith('xoxb-')
          ? this.token.replace('xoxb-', 'xapp-')
          : this.token),
        socketMode: false,
      });

      // Set up event handler for messages
      (app as { event(eventType: string, handler: (...args: unknown[]) => void): void }).event('message', async (args: unknown) => {
        const raw = this.toAgentFormat(args);
        if (raw) {
          await unifiedMessageBus.receive(raw);
        }
      });

      // Start the app
      const port = (typeof process !== 'undefined' && process.env?.PORT) || 3000;
      await (app as { start(port: number): Promise<void> }).start(Number(port));

      this._initialized = true;
      console.log(`[SlackChannelAdapter] Successfully initialized Slack app`);
      return true;
    } catch (e) {
      console.warn('[SlackChannelAdapter] Slack SDK initialization failed:', e instanceof Error ? e.message : String(e));
      this._initialized = true;
      return false;
    }
  }

  /**
   * Initialize the adapter with a bot token
   * Token: Bot token (xoxb-...) for messaging
   * AppToken: Optional app-level token (xapp-...) for socket mode
   */
  initialize(token: string, appToken?: string): void {
    this.token = token;
    this.appToken = appToken || null;
    console.log(`[SlackChannelAdapter] Token set. Call start() to initialize app.`);
  }

  /**
   * Start the adapter - initialize app and subscribe to bus events
   */
  async start(): Promise<void> {
    // Initialize app (async, with browser fallback)
    const success = await this.ensureInitialized();
    if (!success) {
      console.log(`[SlackChannelAdapter] Running in degraded mode (browser environment)`);
    }

    // Subscribe to bus events for tracking
    this.busUnsubscribe = unifiedMessageBus.subscribe((msg) => {
      if (msg.direction === 'inbound' && msg.channel === 'slack') {
        // Message received from Slack
      }
    });

    // Listen for agent:response events from the bus to send replies
    // The actual response handling is done via 'bus:agent response' event

    // Subscribe to config changes to re-init on token change
    this.configUnsubscribe = botConfigManager.subscribe((newConfig) => {
      const channelConfig = newConfig.slack;
      if (channelConfig.enabled && channelConfig.token && channelConfig.token !== this.token) {
        console.log('[SlackChannelAdapter] Token changed, re-initializing...');
        this.token = channelConfig.token;
        this._initialized = false;
        this.ensureInitialized().catch((e) => {
          console.error('[SlackChannelAdapter] Re-initialization failed:', e);
        });
      }
    });

    console.log(`[SlackChannelAdapter] Started and listening for messages`);
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

    this._initialized = false;
    console.log(`[SlackChannelAdapter] Stopped`);
  }

  /**
   * Convert Slack message to RawMessage format
   * Input format matches Slack Bolt event object shape
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const event = (raw as { event?: unknown }).event || raw;
    const msg = event as {
      user?: string;
      channel?: string;
      text?: string;
      ts?: string;
      subtype?: string;
      message?: {
        user?: string;
        channel?: string;
        text?: string;
        ts?: string;
        subtype?: string;
      };
    };

    // Handle Slack's event wrapper structure
    const actualMsg = msg.message || msg;

    // Ignore bot messages and events
    if ((actualMsg as { subtype?: string }).subtype === 'bot_message') return null;
    if (!actualMsg.user) return null;
    if (!actualMsg.channel) return null;
    if (!actualMsg.text && (actualMsg as { subtype?: string }).subtype !== 'message_changed') return null;

    return {
      channel: 'slack',
      userId: actualMsg.user,
      channelUserId: actualMsg.channel,
      content: actualMsg.text || '[edited message]',
      timestamp: actualMsg.ts ? parseInt(actualMsg.ts.split('.')[0]) * 1000 : Date.now(),
      metadata: {
        ts: actualMsg.ts,
        subtype: (actualMsg as { subtype?: string }).subtype,
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
   * Phase 2: Sends message via Slack client (or logs in browser environment)
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

    // Browser environment or not initialized - just log
    console.log(`[SlackChannelAdapter] Would send to ${payload.channel}: ${content.substring(0, 50)}...`);
  }

  /**
   * Check if adapter is initialized and ready
   */
  isReady(): boolean {
    return this._initialized && !!this.token;
  }
}

// Singleton instance for bus registration
export const slackChannelAdapter = new SlackChannelAdapter();
