/**
 * OpenAI Provider Implementation for PixelPal V81
 * 
 * Uses the official OpenAI npm package.
 */

import OpenAI from 'openai';
import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export function createOpenAIProvider(config: {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
}): AIProvider {
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || 'https://api.openai.com/v1',
  });

  const provider: AIProvider = {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    status: 'connected',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const model = options?.model || config.defaultModel || 'gpt-4o';
      
      const openAIMessages = messages.map(m => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      const response = await client.chat.completions.create({
        model,
        messages: openAIMessages,
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stream: options?.stream || false,
      });

      if (options?.stream) {
        // For streaming, accumulate content
        let content = '';
        // @ts-ignore - streaming response
        for await (const chunk of response) {
          content += chunk.choices[0]?.delta?.content || '';
        }
        return { content, model };
      }

      const choice = response.choices[0];
      return {
        content: choice.message.content || '',
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        model: response.model,
        finishReason: choice.finish_reason || undefined,
      };
    },

    async embed(texts: string[]): Promise<number[][]> {
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      return response.data.map(d => d.embedding);
    },

    async ping(): Promise<boolean> {
      try {
        await client.models.list();
        return true;
      } catch {
        return false;
      }
    },
  };

  // Register and return
  providerManager.register(provider);
  return provider;
}

export default createOpenAIProvider;
