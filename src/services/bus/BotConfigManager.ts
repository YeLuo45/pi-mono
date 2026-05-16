/**
 * BotConfigManager
 * V102: Manages bot token configuration for Telegram and Discord channels
 * 
 * Stores configuration in localStorage (persisted across sessions)
 * and provides query methods for conditional adapter initialization.
 */

import type { Channel } from './types';

export interface BotChannelConfig {
  enabled: boolean;
  token: string;
  allowFrom: string[]; // List of user IDs allowed to interact (future use)
}

export interface BotConfig {
  telegram: BotChannelConfig;
  discord: BotChannelConfig;
  whatsapp: BotChannelConfig;
  feishu: BotChannelConfig;
  slack: BotChannelConfig;
}

const STORAGE_KEY = 'pixelpal_bot_config';

const DEFAULT_CONFIG: BotConfig = {
  telegram: {
    enabled: false,
    token: '',
    allowFrom: [],
  },
  discord: {
    enabled: false,
    token: '',
    allowFrom: [],
  },
  whatsapp: {
    enabled: false,
    token: '',
    allowFrom: [],
  },
  feishu: {
    enabled: false,
    token: '',
    allowFrom: [],
  },
  slack: {
    enabled: false,
    token: '',
    allowFrom: [],
  },
};

/**
 * BotConfigManager - Singleton for managing bot configurations
 */
class BotConfigManager {
  private config: BotConfig;
  private listeners = new Set<(config: BotConfig) => void>();

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): BotConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<BotConfig>;
        return {
          telegram: { ...DEFAULT_CONFIG.telegram, ...parsed.telegram },
          discord: { ...DEFAULT_CONFIG.discord, ...parsed.discord },
          whatsapp: { ...DEFAULT_CONFIG.whatsapp, ...parsed.whatsapp },
          feishu: { ...DEFAULT_CONFIG.feishu, ...parsed.feishu },
          slack: { ...DEFAULT_CONFIG.slack, ...parsed.slack },
        };
      }
    } catch (e) {
      console.warn('[BotConfigManager] Failed to load config:', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      this.notifyListeners();
    } catch (e) {
      console.error('[BotConfigManager] Failed to save config:', e);
    }
  }

  /**
   * Notify all listeners of config changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.config));
  }

  /**
   * Get full bot configuration
   */
  getConfig(): BotConfig {
    return { ...this.config };
  }

  /**
   * Get configuration for a specific channel
   */
  getChannelConfig(channel: 'telegram' | 'discord' | 'whatsapp' | 'feishu' | 'slack'): BotChannelConfig {
    return { ...this.config[channel] };
  }

  /**
   * Check if a channel is enabled
   */
  isEnabled(channel: 'telegram' | 'discord' | 'whatsapp' | 'feishu' | 'slack'): boolean {
    return this.config[channel].enabled && !!this.config[channel].token;
  }

  /**
   * Check if any channel is configured (for startup decisions)
   */
  hasAnyEnabled(): boolean {
    return this.isEnabled('telegram') || this.isEnabled('discord') || this.isEnabled('whatsapp') || this.isEnabled('feishu') || this.isEnabled('slack');
  }

  /**
   * Update configuration for a specific channel
   */
  updateChannel(channel: 'telegram' | 'discord' | 'whatsapp' | 'feishu' | 'slack', updates: Partial<BotChannelConfig>): void {
    this.config[channel] = {
      ...this.config[channel],
      ...updates,
    };
    this.saveConfig();
  }

  /**
   * Enable or disable a channel
   */
  setEnabled(channel: 'telegram' | 'discord' | 'whatsapp' | 'feishu' | 'slack', enabled: boolean): void {
    this.updateChannel(channel, { enabled });
  }

  /**
   * Set bot token for a channel
   */
  setToken(channel: 'telegram' | 'discord' | 'whatsapp' | 'feishu' | 'slack', token: string): void {
    this.updateChannel(channel, { token: token.trim() });
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  /**
   * Subscribe to configuration changes
   * Returns unsubscribe function
   */
  subscribe(listener: (config: BotConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// Singleton instance
export const botConfigManager = new BotConfigManager();