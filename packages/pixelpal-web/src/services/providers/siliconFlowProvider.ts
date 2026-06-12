/**
 * SiliconFlow Provider Implementation for PixelPal V81
 * 
 * REST-based provider for siliconflow.cn API.
 * OpenAI-compatible API.
 */

import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export function createSiliconFlowProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}): AIProvider {
  const baseURL = config.baseUrl || 'https://api.siliconflow.cn/v1';

  const provider: AIProvider = {
    id: 'siliconflow',
    name: 'SiliconFlow',
    icon: '🌊',
    status: 'connected',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const model = options?.model || config.defaultModel || 'Qwen/Qwen2.5-7B-Instruct';

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
        throw new Error(`SiliconFlow API error: ${response.status} - ${error}`);
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
          model: 'BAAI/bge-m3',
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`SiliconFlow embeddings error: ${response.status}`);
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
  };

  providerManager.register(provider);
  return provider;
}

export default createSiliconFlowProvider;
