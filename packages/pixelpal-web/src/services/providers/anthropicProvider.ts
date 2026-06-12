/**
 * Anthropic Provider Implementation for PixelPal V81
 * 
 * Uses the official @anthropic-ai/sdk package.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export function createAnthropicProvider(config: {
  apiKey: string;
  defaultModel?: string;
}): AIProvider {
  const client = new Anthropic({
    apiKey: config.apiKey,
  });

  const provider: AIProvider = {
    id: 'anthropic',
    name: 'Anthropic',
    icon: '🧠',
    status: 'connected',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const model = options?.model || config.defaultModel || 'claude-3-5-sonnet-20241022';
      
      // Anthropic uses a different message format
      const anthropicMessages = messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      const response = await client.messages.create({
        model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        messages: anthropicMessages as any,
      });

      const content = response.content[0];
      const textContent = content.type === 'text' ? content.text : '';

      return {
        content: textContent,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        model: response.model,
        finishReason: response.stop_reason || undefined,
      };
    },

    async ping(): Promise<boolean> {
      try {
        // Simple API check - Anthropic doesn't have a models list endpoint
        await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        });
        return true;
      } catch {
        return false;
      }
    },
  };

  providerManager.register(provider);
  return provider;
}

export default createAnthropicProvider;
