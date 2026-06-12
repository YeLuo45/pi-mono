/**
 * Ollama Provider Implementation for PixelPal V81
 * 
 * REST-based provider for local Ollama server.
 * OpenAI-compatible API at localhost:11434.
 */

import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export function createOllamaProvider(config: {
  baseUrl?: string;
  defaultModel?: string;
}): AIProvider {
  const baseURL = config.baseUrl || 'http://localhost:11434/v1';

  const provider: AIProvider = {
    id: 'ollama',
    name: 'Ollama',
    icon: '🦙',
    status: 'unconfigured',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const model = options?.model || config.defaultModel || 'llama3';

      const response = await fetch(`${baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(`Ollama API error: ${response.status} - ${error}`);
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
      // Ollama uses /api/embeddings endpoint
      const embeddingHost = baseURL.replace('/v1', '');
      const embeddings: number[][] = [];

      for (const text of texts) {
        const response = await fetch(`${embeddingHost}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.defaultModel || 'llama3',
            prompt: text,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama embeddings error: ${response.status}`);
        }

        const data = await response.json();
        embeddings.push(data.embedding);
      }

      return embeddings;
    },

    async ping(): Promise<boolean> {
      try {
        const response = await fetch(`${baseURL}/models`, { method: 'GET' });
        return response.ok;
      } catch {
        return false;
      }
    },
  };

  providerManager.register(provider);
  return provider;
}

export default createOllamaProvider;
