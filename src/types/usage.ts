/**
 * Usage Tracking Types for PixelPal V88
 * 
 * Defines types for token usage tracking, cost budgets, and provider statistics.
 */

export interface TokenUsage {
  timestamp: number;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // USD
  responseTime: number; // ms
  success: boolean;
}

export interface CostBudget {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  limit: number; // USD
  current: number;
  resetAt: number;
  enabled: boolean;
  providerId?: string; // Optional: budget specific to a provider
}

export interface ProviderStats {
  provider: string;
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  totalCost: number;
  totalTokens: number;
}

export interface DailyCostTrend {
  date: string; // YYYY-MM-DD
  totalCost: number;
  totalTokens: number;
  callCount: number;
}

export interface UsageSummary {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  successRate: number;
  avgResponseTime: number;
  byProvider: Record<string, {
    cost: number;
    tokens: number;
    calls: number;
  }>;
}

// Provider pricing configuration (per 1M tokens)
export interface ProviderPricing {
  providerId: string;
  promptTokenPrice: number; // USD per 1M tokens
  completionTokenPrice: number; // USD per 1M tokens
}

export const DEFAULT_PRICING: ProviderPricing[] = [
  { providerId: 'openai', promptTokenPrice: 2.5, completionTokenPrice: 10 }, // GPT-4o
  { providerId: 'anthropic', promptTokenPrice: 3, completionTokenPrice: 15 }, // Claude 3.5
  { providerId: 'gemini', promptTokenPrice: 0.125, completionTokenPrice: 0.5 }, // Gemini 1.5
  { providerId: 'siliconflow', promptTokenPrice: 0.5, completionTokenPrice: 0.5 }, // Qwen
  { providerId: 'ollama', promptTokenPrice: 0, completionTokenPrice: 0 }, // Local - free
  { providerId: 'custom', promptTokenPrice: 0, completionTokenPrice: 0 }, // Unknown - free
];
