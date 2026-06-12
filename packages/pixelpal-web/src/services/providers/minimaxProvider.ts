/**
 * MiniMax Provider Implementation for PixelPal V96
 * 
 * MiniMax API - OpenAI-compatible API for Chinese AI startup.
 * Supports: abstr5, chatany, speech-02-hd models.
 */

import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export const MINIMAX_MODELS = [
  'abstr5',      // MiniMax flagship model
  'chatany',     // General chat
  'speech-02-hd' // Voice synthesis
] as const;

export const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';

// MiniMax pricing (approximate, per 1M tokens)
const MINIMAX_PRICING = {
  prompt: 0.1,    // $0.1 per 1M tokens
  completion: 0.3, // $0.3 per 1M tokens
} as const;

export type MiniMaxModel = typeof MINIMAX_MODELS[number];

export function createMiniMaxProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}): AIProvider {
  const baseURL = config.baseUrl || MINIMAX_BASE_URL;
  const defaultModel = config.defaultModel || 'abstr5';

  const provider: AIProvider = {
    id: 'minimax',
    name: 'MiniMax',
    icon: '🔮',
    status: 'connected',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const model = options?.model || defaultModel;

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature,
          max_tokens: options?.maxTokens,
          stream: options?.stream || false,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`MiniMax API error: ${response.status} - ${error}`);
      }

      if (options?.stream) {
        let content = '';
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let done = false;
          while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            if (value) {
              content += decoder.decode(value, { stream: !done });
            }
          }
        }
        return { content, model };
      }

      const data = await response.json();
      return {
        content: data.choices?.[0]?.message?.content || '',
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
        model: data.model,
        finishReason: data.choices?.[0]?.finish_reason,
      };
    },

    async embed(texts: string[]): Promise<number[][]> {
      const response = await fetch(`${baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: 'embo',  // MiniMax embedding model
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`MiniMax embeddings error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((d: any) => d.embedding);
    },

    async ping(): Promise<boolean> {
      try {
        const response = await fetch(`${baseURL}/models`, {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
        });
        return response.ok;
      } catch {
        return false;
      }
    },

    estimateTokens(messages: Message[]): number {
      // Rough estimation: ~4 chars per token for Chinese/English mix
      return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
    },

    getCost(): { prompt: number; completion: number } {
      return { ...MINIMAX_PRICING };
    },
  };

  providerManager.register(provider);
  return provider;
}

export default createMiniMaxProvider;
