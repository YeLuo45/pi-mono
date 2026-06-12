/**
 * Custom/OpenAI-Compatible Provider Implementation for PixelPal V81
 * 
 * Generic REST-based provider for any OpenAI-compatible API.
 */

import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export function createCustomProvider(config: {
  id: string;
  name: string;
  icon?: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel?: string;
}): AIProvider {
  const provider: AIProvider = {
    id: config.id,
    name: config.name,
    icon: config.icon || '🔧',
    status: 'unconfigured',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const model = options?.model || config.defaultModel || '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
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
        throw new Error(`Custom provider API error: ${response.status} - ${error}`);
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.defaultModel || 'text-embedding-3-small',
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Custom provider embeddings error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.map((d: any) => d.embedding);
    },

    async ping(): Promise<boolean> {
      try {
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
        });
        return response.ok;
      } catch {
        return false;
      }
    },
  };

  providerManager.register(provider);
  return provider;
}

export default createCustomProvider;
