/**
 * Provider Manager for PixelPal V81
 * 
 * Singleton that manages all registered AI providers,
 * handles routing, fallback, and configuration persistence.
 */

import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse, ProviderConfig, ProviderSettings } from './types';
import { DEFAULT_PROVIDERS, PROVIDER_BASE_URLS } from '../../data/defaultProviders';

const STORAGE_KEY = 'pixelpal-provider-settings';

// Singleton state
let instance: ProviderManager | null = null;

class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private settings: ProviderSettings = {
    defaultProviderId: 'openai',
    fallbackOrder: [],
    configs: {},
  };

  constructor() {
    if (instance) {
      return instance;
    }
    instance = this;
    this.loadSettings();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load provider settings:', e);
    }
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save provider settings:', e);
    }
  }

  /**
   * Register a new provider
   */
  register(provider: AIProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a provider
   */
  unregister(id: string): void {
    this.providers.delete(id);
  }

  /**
   * Get a specific provider by ID
   */
  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * List all registered providers
   */
  list(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get list of provider IDs that have valid configurations
   */
  getConfiguredProviders(): string[] {
    return Object.keys(this.settings.configs).filter(
      id => this.settings.configs[id]?.enabled && this.settings.configs[id]?.apiKey
    );
  }

  /**
   * Set the default provider
   */
  setDefault(id: string): void {
    this.settings.defaultProviderId = id;
    this.saveSettings();
  }

  /**
   * Get the default provider ID
   */
  getDefaultId(): string {
    return this.settings.defaultProviderId;
  }

  /**
   * Set the fallback order
   */
  setFallbackOrder(ids: string[]): void {
    this.settings.fallbackOrder = ids;
    this.saveSettings();
  }

  /**
   * Get the fallback order
   */
  getFallbackOrder(): string[] {
    return this.settings.fallbackOrder;
  }

  /**
   * Get provider configuration
   */
  getConfig(id: string): ProviderConfig | undefined {
    return this.settings.configs[id];
  }

  /**
   * Update provider configuration
   */
  setConfig(id: string, config: ProviderConfig): void {
    this.settings.configs[id] = config;
    this.saveSettings();
  }

  /**
   * Remove provider configuration
   */
  removeConfig(id: string): void {
    delete this.settings.configs[id];
    this.saveSettings();
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): Record<string, ProviderConfig> {
    return { ...this.settings.configs };
  }

  /**
   * Chat with a specific provider
   */
  async chat(providerId: string, messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    const config = this.settings.configs[providerId];
    const mergedOptions: ChatOptions = {
      model: options?.model || config?.defaultModel,
      temperature: options?.temperature ?? config?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? config?.maxTokens ?? 4096,
      stream: options?.stream ?? false,
      ...options,
    };

    return provider.chat(messages, mergedOptions);
  }

  /**
   * Chat with the default provider
   */
  async chatDefault(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
    const defaultId = this.settings.defaultProviderId;
    
    // Try default provider first
    try {
      return await this.chat(defaultId, messages, options);
    } catch (error) {
      // Try fallback providers
      for (const fallbackId of this.settings.fallbackOrder) {
        if (fallbackId === defaultId) continue;
        try {
          return await this.chat(fallbackId, messages, options);
        } catch {
          // Continue to next fallback
        }
      }
      throw error;
    }
  }

  /**
   * Ping a provider to check connectivity
   */
  async ping(providerId: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider?.ping) {
      // If no ping method, try a simple chat with a minimal message
      try {
        await provider?.chat([{ id: '1', role: 'user', content: 'ping', timestamp: Date.now() }], { maxTokens: 1 });
        return true;
      } catch {
        return false;
      }
    }
    return provider.ping();
  }

  /**
   * Update provider status based on connectivity
   */
  async refreshProviderStatus(providerId: string): Promise<void> {
    const provider = this.providers.get(providerId);
    if (provider) {
      const connected = await this.ping(providerId);
      provider.status = connected ? 'connected' : 'error';
    }
  }

  /**
   * Get provider definition (static info)
   */
  getProviderDefinition(id: string) {
    return DEFAULT_PROVIDERS.find(p => p.id === id);
  }

  /**
   * Get all provider definitions
   */
  getAllProviderDefinitions() {
    return [...DEFAULT_PROVIDERS];
  }
}

// Export singleton instance
export const providerManager = new ProviderManager();
export default providerManager;
