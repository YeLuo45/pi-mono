/**
 * Google Gemini Provider Implementation for PixelPal V81
 * 
 * Uses the official @google/generative-ai package.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Message } from '../../types';
import type { AIProvider, ChatOptions, ChatResponse } from './types';
import { providerManager } from './providerManager';

export function createGeminiProvider(config: {
  apiKey: string;
  defaultModel?: string;
}): AIProvider {
  const client = new GoogleGenerativeAI(config.apiKey);

  const provider: AIProvider = {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '💎',
    status: 'connected',

    async chat(messages: Message[], options?: ChatOptions): Promise<ChatResponse> {
      const modelName = options?.model || config.defaultModel || 'gemini-1.5-flash';
      const model = client.getGenerativeModel({ model: modelName });

      // Convert messages to Gemini format
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const generationConfig: any = {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
      };

      const result = await model.generateContent({
        contents,
        generationConfig,
      });

      const response = result.response;
      const text = response.text();

      return {
        content: text,
        model: modelName,
      };
    },

    async embed(texts: string[]): Promise<number[][]> {
      // Gemini doesn't have a direct embeddings API in the same way
      // Use text-embedding-004 or similar via REST
      const model = client.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddings: number[][] = [];
      
      for (const text of texts) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
      }
      
      return embeddings;
    },

    async ping(): Promise<boolean> {
      try {
        const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        await model.generateContent('ping');
        return true;
      } catch {
        return false;
      }
    },
  };

  providerManager.register(provider);
  return provider;
}

export default createGeminiProvider;
