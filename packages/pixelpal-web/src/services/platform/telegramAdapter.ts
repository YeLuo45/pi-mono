/**
 * Telegram Platform Adapter
 * 
 * Integrates PixelPal with Telegram Bot API for messaging.
 * Supports both polling and webhook modes for receiving messages.
 * 
 * Setup instructions:
 * 1. Create a bot via @BotFather in Telegram
 * 2. Get your bot token
 * 3. (Optional) Set up webhook for real-time message delivery
 * 4. Configure the adapter with your bot token
 */

import { useStore } from '../../store';

// ============================================================
// Types
// ============================================================

export interface TelegramConfig {
  botToken: string;
  webhookUrl?: string;
  pollingEnabled: boolean;
  allowedChatIds?: string[]; // Whitelist of chat IDs for security
}

export interface TelegramMessage {
  id: string;
  chatId: string;
  chatTitle?: string;
  from?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
  };
  text: string;
  timestamp: number;
  raw?: Record<string, unknown>;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    date: number;
    text?: string;
  };
}

export interface TelegramSendMessageParams {
  chatId: string;
  text: string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  replyMarkup?: Record<string, unknown>;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

// ============================================================
// Storage Keys
// ============================================================

const TELEGRAM_CONFIG_KEY = 'pixelpal_telegram_config';
const TELEGRAM_OFFSET_KEY = 'pixelpal_telegram_offset';

// ============================================================
// Config Management
// ============================================================

export function getTelegramConfig(): TelegramConfig | null {
  try {
    const stored = localStorage.getItem(TELEGRAM_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored) as TelegramConfig;
    }
  } catch {
    // ignore
  }
  return null;
}

export function saveTelegramConfig(config: TelegramConfig): void {
  localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(config));
}

export function clearTelegramConfig(): void {
  localStorage.removeItem(TELEGRAM_CONFIG_KEY);
  localStorage.removeItem(TELEGRAM_OFFSET_KEY);
}

// ============================================================
// Core API Functions
// ============================================================

function getBotApiUrl(config: TelegramConfig): string {
  return `https://api.telegram.org/bot${config.botToken}`;
}

/**
 * Get bot info to verify the token
 */
export async function getMe(config: TelegramConfig): Promise<TelegramBotInfo> {
  const response = await fetch(`${getBotApiUrl(config)}/getMe`);
  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.statusText}`);
  }
  const data = await response.json() as { ok: boolean; result?: TelegramBotInfo; description?: string };
  if (!data.ok || !data.result) {
    throw new Error(data.description || 'Failed to get bot info');
  }
  return data.result;
}

/**
 * Get updates (polling mode)
 */
export async function getUpdates(
  config: TelegramConfig,
  offset?: number,
  limit = 100,
  timeout = 0
): Promise<TelegramUpdate[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    timeout: String(timeout),
  });
  
  if (offset !== undefined) {
    params.set('offset', String(offset));
  }

  const response = await fetch(`${getBotApiUrl(config)}/getUpdates?${params}`);
  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  const data = await response.json() as { ok: boolean; result?: TelegramUpdate[]; description?: string };
  if (!data.ok) {
    throw new Error(data.description || 'Failed to get updates');
  }

  return data.result || [];
}

/**
 * Send a text message
 */
export async function sendMessage(
  config: TelegramConfig,
  params: TelegramSendMessageParams
): Promise<{ messageId: number; success: boolean }> {
  const response = await fetch(`${getBotApiUrl(config)}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
  if (!data.ok) {
    throw new Error(data.description || 'Failed to send message');
  }

  return { messageId: data.result?.message_id ?? 0, success: true };
}

/**
 * Set webhook for real-time message delivery
 */
export async function setWebhook(config: TelegramConfig, webhookUrl: string): Promise<boolean> {
  const response = await fetch(`${getBotApiUrl(config)}/setWebhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const data = await response.json() as { ok: boolean; description?: string };
  if (!data.ok) {
    throw new Error(data.description || 'Failed to set webhook');
  }

  return true;
}

/**
 * Delete webhook (switch back to polling)
 */
export async function deleteWebhook(config: TelegramConfig): Promise<boolean> {
  const response = await fetch(`${getBotApiUrl(config)}/deleteWebhook`);
  const data = await response.json() as { ok: boolean; description?: string };
  if (!data.ok) {
    throw new Error(data.description || 'Failed to delete webhook');
  }
  return true;
}

/**
 * Get current webhook info
 */
export async function getWebhookInfo(config: TelegramConfig): Promise<{ url?: string; hasCustomCertificate: boolean; pendingUpdateCount: number }> {
  const response = await fetch(`${getBotApiUrl(config)}/getWebhookInfo`);
  const data = await response.json() as { ok: boolean; result?: Record<string, unknown> };
  if (!data.ok || !data.result) {
    return { hasCustomCertificate: false, pendingUpdateCount: 0 };
  }
  return data.result as { url?: string; hasCustomCertificate: boolean; pendingUpdateCount: number };
}

/**
 * Convert Telegram update to our TelegramMessage format
 */
export function parseTelegramMessage(update: TelegramUpdate): TelegramMessage | null {
  if (!update.message) return null;

  const msg = update.message;
  return {
    id: String(msg.message_id),
    chatId: String(msg.chat.id),
    chatTitle: msg.chat.title,
    from: msg.from ? {
      id: String(msg.from.id),
      firstName: msg.from.first_name,
      lastName: msg.from.last_name,
      username: msg.from.username,
    } : undefined,
    text: msg.text || '',
    timestamp: msg.date * 1000, // Convert to ms
    raw: update as Record<string, unknown>,
  };
}

/**
 * Check if a chat ID is allowed (whitelist security)
 */
export function isChatAllowed(config: TelegramConfig, chatId: string): boolean {
  if (!config.allowedChatIds || config.allowedChatIds.length === 0) {
    return true; // No whitelist = allow all
  }
  return config.allowedChatIds.includes(chatId);
}

// ============================================================
// Polling Manager
// ============================================================

let pollingInterval: ReturnType<typeof setInterval> | null = null;
let lastUpdateId: number | undefined = undefined;
let messageCallback: ((msg: TelegramMessage) => void) | null = null;

/**
 * Start polling for messages
 */
export async function startPolling(
  onMessage: (msg: TelegramMessage) => void,
  onError?: (error: Error) => void
): Promise<void> {
  const config = getTelegramConfig();
  if (!config) {
    onError?.(new Error('Telegram not configured'));
    return;
  }

  // Load saved offset
  const savedOffset = localStorage.getItem(TELEGRAM_OFFSET_KEY);
  if (savedOffset) {
    lastUpdateId = parseInt(savedOffset, 10);
  }

  messageCallback = onMessage;

  // Stop any existing polling
  stopPolling();

  const poll = async () => {
    try {
      const updates = await getUpdates(config, lastUpdateId);

      for (const update of updates) {
        // Check security whitelist
        const msg = parseTelegramMessage(update);
        if (!msg) continue;
        if (!isChatAllowed(config, msg.chatId)) {
          console.log('[Telegram] Ignoring message from disallowed chat:', msg.chatId);
          continue;
        }

        // Update offset
        lastUpdateId = update.update_id + 1;
        localStorage.setItem(TELEGRAM_OFFSET_KEY, String(lastUpdateId));

        // Deliver message
        messageCallback?.(msg);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Initial poll
  await poll();

  // Continue polling every 3 seconds
  pollingInterval = setInterval(poll, 3000);
}

/**
 * Stop polling
 */
export function stopPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  messageCallback = null;
}

// ============================================================
// Integration with PixelPal Store
// ============================================================

/**
 * Send a message to the PixelPal chat from a Telegram message
 * This bridges Telegram messages into the app's message system
 */
export function createMessageFromTelegram(msg: TelegramMessage): { role: 'user'; content: string } {
  const sender = msg.from?.firstName || msg.from?.username || 'Telegram User';
  return {
    role: 'user',
    content: `[From Telegram${msg.chatTitle ? ` (${msg.chatTitle})` : ''} ${sender}]: ${msg.text}`,
  };
}

/**
 * Forward a PixelPal AI response to Telegram
 */
export async function forwardToTelegram(response: string, chatId?: string): Promise<boolean> {
  const config = getTelegramConfig();
  if (!config) return false;

  const targetChatId = chatId || config.allowedChatIds?.[0];
  if (!targetChatId) return false;

  try {
    await sendMessage(config, {
      chatId: targetChatId,
      text: response,
      parseMode: 'MarkdownV2',
    });
    return true;
  } catch (err) {
    console.error('[Telegram] Failed to forward message:', err);
    return false;
  }
}

/**
 * Connect Telegram to the store's message system
 * Returns cleanup function
 */
export function connectTelegramToStore(
  onAiResponse?: (response: string, chatId: string) => Promise<void>
): () => void {
  const handleTelegramMessage = async (msg: TelegramMessage) => {
    // Check if this is a command vs regular message
    if (msg.text.startsWith('/')) {
      // Handle commands
      if (msg.text === '/start') {
        await sendMessage(getTelegramConfig()!, {
          chatId: msg.chatId,
          text: 'Welcome to PixelPal! This bot is connected to your PixelPal AI companion.',
        });
      } else if (msg.text === '/help') {
        await sendMessage(getTelegramConfig()!, {
          chatId: msg.chatId,
          text: 'Send any message and PixelPal will respond. Configure webhook in the PixelPal settings for real-time updates.',
        });
      }
      return;
    }

    // Create message for store
    const storeMessage = createMessageFromTelegram(msg);
    
    // Add to store
    useStore.getState().addMessage(storeMessage);

    // Note: Actual AI response handling would be done by the ChatPanel component
    // This just forwards the message to the chat system
  };

  // Start polling
  startPolling(handleTelegramMessage, (err) => {
    console.error('[Telegram] Polling error:', err);
  });

  // Return cleanup
  return () => {
    stopPolling();
  };
}

// ============================================================
// Utility
// ============================================================

/**
 * Test the Telegram connection
 */
export async function testTelegramConnection(botToken: string): Promise<{ success: boolean; message: string; botInfo?: TelegramBotInfo }> {
  const testConfig: TelegramConfig = { botToken, pollingEnabled: false };
  
  try {
    const botInfo = await getMe(testConfig);
    return { success: true, message: `Connected as @${botInfo.username}`, botInfo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, message: msg };
  }
}

/**
 * Format a message for Telegram (escape special characters for MarkdownV2)
 */
export function escapeMarkdownV2(text: string): string {
  const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escaped = text;
  for (const char of specialChars) {
    escaped = escaped.split(char).join(`\\${char}`);
  }
  return escaped;
}
