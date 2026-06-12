/**
 * Feishu (Lark) Platform Adapter
 * 
 * Integrates PixelPal with Feishu/Lark platform for:
 * - OAuth2 authentication
 * - Incoming message handling (webhook events)
 * - Outgoing message sending via Feishu bot API
 * - Chat completion via Feishu AI (if available)
 * 
 * Feishu Open Platform docs: https://open.feishu.cn/
 */

import type { Message } from '../../types';

// ============================================================
// Types
// ============================================================

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  botName?: string;
}

export interface FeishuToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp in ms
}

export interface FeishuUser {
  unionId: string;
  openId: string;
  name: string;
  avatarUrl?: string;
}

export interface FeishuMessage {
  messageId: string;
  chatId: string;
  sender: FeishuUser;
  content: string; // Plain text content
  createTime: string;
}

export interface FeishuEventPayload {
  schema: string;
  header: {
    event_id: string;
    event_type: string;
    create_time: string;
    token: string;
    app_id: string;
    tenant_key: string;
  };
  event: Record<string, unknown>;
}

// ============================================================
// Constants
// ============================================================

const FEISHU_AUTH_URL = 'https://open.feishu.cn/open-apis/auth/v2/tenant_access_token/internal';
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';
const FEISHU_OAUTH_URL = 'https://open.feishu.cn/open-apis/authen/v1/authorize';
const FEISHU_TOKEN_URL = 'https://open.feishu.cn/open-apis/authen/v1/oidc/access_token';

// ============================================================
// Token Management
// ============================================================

const TOKEN_KEY = 'pixelpal_feishu_token';
const CONFIG_KEY = 'pixelpal_feishu_config';

function saveToken(token: FeishuToken): void {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

function loadToken(): FeishuToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FeishuToken;
  } catch {
    return null;
  }
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function saveConfig(config: FeishuConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadConfig(): FeishuConfig | null {
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FeishuConfig;
  } catch {
    return null;
  }
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

// ============================================================
// OAuth2 Flow
// ============================================================

/**
 * Get the Feishu OAuth authorization URL
 * @param redirectUri Where to redirect after auth (defaults to app origin + /auth/feishu/callback)
 * @param state Random state for CSRF protection
 */
export function getFeishuAuthUrl(redirectUri?: string, state?: string): string {
  const config = loadConfig();
  if (!config?.appId) {
    throw new Error('Feishu App ID not configured. Please enter it in Settings.');
  }

  const redirect = redirectUri || `${window.location.origin}/auth/feishu/callback`;
  const oauthState = state || crypto.randomUUID();

  // Store state for verification
  sessionStorage.setItem('feishu_oauth_state', oauthState);

  const params = new URLSearchParams({
    app_id: config.appId,
    redirect_uri: redirect,
    state: oauthState,
    response_type: 'code',
  });

  return `${FEISHU_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string, redirectUri?: string): Promise<FeishuToken> {
  const config = loadConfig();
  if (!config) {
    throw new Error('Feishu not configured');
  }

  // Get app-level token first
  const appTokenResponse = await fetch(FEISHU_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
  });

  if (!appTokenResponse.ok) {
    throw new Error(`Failed to get Feishu app token: ${appTokenResponse.statusText}`);
  }

  const appTokenData = await appTokenResponse.json();
  if (appTokenData.code !== 0) {
    throw new Error(`Feishu app token error: ${appTokenData.msg}`);
  }

  const appAccessToken = appTokenData.tenant_access_token;

  // Exchange user code for user access token
  const redirect = redirectUri || `${window.location.origin}/auth/feishu/callback`;
  const tokenResponse = await fetch(FEISHU_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to exchange code for token: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  if (tokenData.code !== 0) {
    throw new Error(`Feishu token exchange error: ${tokenData.msg}`);
  }

  const token: FeishuToken = {
    accessToken: tokenData.data.access_token,
    refreshToken: tokenData.data.refresh_token,
    expiresAt: Date.now() + (tokenData.data.expires_in || 7200) * 1000,
  };

  saveToken(token);
  return token;
}

/**
 * Refresh the access token using refresh token
 */
export async function refreshAccessToken(): Promise<FeishuToken> {
  const config = loadConfig();
  const token = loadToken();

  if (!config || !token?.refreshToken) {
    throw new Error('Cannot refresh: no refresh token available');
  }

  // Get app token first
  const appTokenResponse = await fetch(FEISHU_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret,
    }),
  });

  const appTokenData = await appTokenResponse.json();
  const appAccessToken = appTokenData.tenant_access_token;

  // Refresh user token
  const refreshResponse = await fetch(FEISHU_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${appAccessToken}`,
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }),
  });

  const refreshData = await refreshResponse.json();
  if (refreshData.code !== 0) {
    clearToken();
    throw new Error(`Token refresh failed: ${refreshData.msg}`);
  }

  const newToken: FeishuToken = {
    accessToken: refreshData.data.access_token,
    refreshToken: refreshData.data.refresh_token,
    expiresAt: Date.now() + (refreshData.data.expires_in || 7200) * 1000,
  };

  saveToken(newToken);
  return newToken;
}

/**
 * Get a valid access token (refreshing if needed)
 */
export async function getValidToken(): Promise<string> {
  const token = loadToken();

  if (!token) {
    throw new Error('Not authenticated with Feishu. Please connect your Feishu account.');
  }

  // Check if token is expired (with 5 minute buffer)
  if (token.expiresAt - Date.now() < 5 * 60 * 1000) {
    const newToken = await refreshAccessToken();
    return newToken.accessToken;
  }

  return token.accessToken;
}

/**
 * Sign out - clear all Feishu auth data
 */
export function signOut(): void {
  clearToken();
  clearConfig();
}

// ============================================================
// Bot API - Send Messages
// ============================================================

/**
 * Send a text message to a Feishu chat
 */
export async function sendMessage(chatId: string, content: string): Promise<{ messageId: string }> {
  const token = await getValidToken();

  const response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to send message: ${data.msg}`);
  }

  return { messageId: data.data.message_id };
}

/**
 * Send a message with inline keyboard (interactive buttons)
 */
export async function sendInteractiveMessage(
  chatId: string,
  content: string,
  elements: Array<{ tag: string; text?: { content: string; tag: string }; actions?: Array<{ tag: string; action: Record<string, unknown> }> }>
): Promise<{ messageId: string }> {
  const token = await getValidToken();

  const response = await fetch(`${FEISHU_API_BASE}/im/v1/messages?receive_id_type=chat_id`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify({
        elements,
      }),
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to send interactive message: ${data.msg}`);
  }

  return { messageId: data.data.message_id };
}

// ============================================================
// User Info
// ============================================================

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<FeishuUser> {
  const token = await getValidToken();

  const response = await fetch(`${FEISHU_API_BASE}/authen/v1/user_info`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get user info: ${data.msg}`);
  }

  return {
    unionId: data.data.union_id,
    openId: data.data.open_id,
    name: data.data.name,
    avatarUrl: data.data.avatar_url,
  };
}

// ============================================================
// Message Handling - Webhook Event Processing
// ============================================================

export type FeishuMessageHandler = (message: FeishuMessage) => Promise<void>;

const messageHandlers = new Set<FeishuMessageHandler>();

/**
 * Register a handler for incoming Feishu messages
 * @returns Unsubscribe function
 */
export function onFeishuMessage(handler: FeishuMessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

/**
 * Process an incoming Feishu webhook event
 * Call this from your webhook endpoint handler
 */
export async function processFeishuEvent(payload: FeishuEventPayload): Promise<void> {
  const { event_type, event } = payload.header;

  // Handle different event types
  if (event_type === 'im.message.receive_v1') {
    const messageEvent = event as {
      message: {
        message_id: string;
        chat_id: string;
        create_time: string;
        body: { content: string };
        sender: { sender_id: { open_id: string }; tenant_key: string };
        sender: { sender_id: { open_id: string }; tenant_key: string; sender_type: string };
      };
    };

    const message: FeishuMessage = {
      messageId: messageEvent.message.message_id,
      chatId: messageEvent.message.chat_id,
      sender: {
        unionId: '',
        openId: messageEvent.message.sender.sender_id.open_id,
        name: '', // Would need extra API call to get name
      },
      content: messageEvent.message.body.content,
      createTime: messageEvent.message.create_time,
    };

    // Parse content - Feishu sends as JSON string
    try {
      const parsed = JSON.parse(message.content);
      message.content = parsed.text || message.content;
    } catch {
      // Already plain text
    }

    // Notify all handlers
    for (const handler of messageHandlers) {
      try {
        await handler(message);
      } catch (err) {
        console.error('[FeishuPlatformAdapter] Message handler error:', err);
      }
    }
  }
}

// ============================================================
// Chat Completion via Feishu AI (if available)
// ============================================================

/**
 * Send a chat completion request to Feishu AI
 * Note: This requires Feishu AI to be enabled for your app
 */
export async function feishuChatCompletion(
  messages: Message[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const token = await getValidToken();

  // Convert messages to Feishu AI format
  const feishuMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await fetch(`${FEISHU_API_BASE}/cognitive_llm/v1/chat_completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messages: feishuMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`Feishu AI request failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Feishu AI error: ${data.msg}`);
  }

  return data.data.choices?.[0]?.message?.content || '';
}

// ============================================================
// Utility
// ============================================================

/**
 * Check if Feishu is configured and has valid credentials
 */
export function isFeishuConfigured(): boolean {
  const config = loadConfig();
  const token = loadToken();
  return !!(config?.appId && config?.appSecret && token);
}

/**
 * Check if the user is authenticated with Feishu
 */
export function isAuthenticated(): boolean {
  const token = loadToken();
  if (!token) return false;
  return token.expiresAt > Date.now();
}

/**
 * Get bot info
 */
export async function getBotInfo(): Promise<{ name: string; avatarUrl?: string }> {
  const token = await getValidToken();

  const response = await fetch(`${FEISHU_API_BASE}/bot/v3/info`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Failed to get bot info: ${data.msg}`);
  }

  return {
    name: data.data.app_name,
    avatarUrl: data.data.app_icon,
  };
}

// ============================================================
// Singleton Export
// ============================================================

export const feishuPlatform = {
  getAuthUrl: getFeishuAuthUrl,
  exchangeCodeForToken,
  getValidToken,
  refreshAccessToken,
  signOut,
  sendMessage,
  sendInteractiveMessage,
  getCurrentUser,
  onFeishuMessage,
  processFeishuEvent,
  feishuChatCompletion,
  isConfigured: isFeishuConfigured,
  isAuthenticated,
  getBotInfo,
};
