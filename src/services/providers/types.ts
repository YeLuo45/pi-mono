/**
 * Provider Abstraction Types for PixelPal V81
 * 
 * Defines the AIProvider interface and related types for
 * multi-LLM provider support.
 */

import type { Message } from '../../types';

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model?: string;
  finishReason?: string;
}

export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'error' | 'unconfigured';
  
  /**
   * Send a chat completion request
   */
  chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse>;
  
  /**
   * Generate embeddings for text(s)
   */
  embed?(texts: string[]): Promise<number[][]>;
  
  /**
   * Check if the provider is reachable
   */
  ping?(): Promise<boolean>;
  
  /**
   * Estimate token count for a message array (for cost estimation)
   */
  estimateTokens?(messages: Message[]): number;
  
  /**
   * Get cost per 1K tokens for this provider
   */
  getCost?(): { prompt: number; completion: number };
}

export interface ProviderConfig {
  id: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

export interface ProviderSettings {
  defaultProviderId: string;
  fallbackOrder: string[];
  configs: Record<string, ProviderConfig>;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  models: string[];
  defaultModel: string;
  supportsEmbeddings: boolean;
}
