/**
 * Message Embedding Service
 * 
 * Generates embeddings for chat messages using the ModelRegistry's
 * first enabled provider (priority 0).
 * 
 * Uses MiniMax embeddings endpoint:
 *   POST https://api.minimax.chat/v1/embeddings
 *   Body: { "model": "embo1", "input": "text" }
 *   Response: { "data": [{ "embedding": [...] }] }
 * 
 * Falls back to OpenAI-compatible format if using other providers.
 */

import type { Message } from '../../types';
import { getRegistry } from '../ai/model-registry-adapter';

/**
 * Embed a single text using the first enabled provider's embedding endpoint.
 * Returns empty array on failure (non-blocking).
 */
export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }

  try {
    const registry = getRegistry();
    const defaultModel = registry.getDefaultModel();

    if (!defaultModel || !defaultModel.apiKey) {
      console.warn('[MessageEmbedding] No enabled model with API key available');
      return [];
    }

    const { apiBaseUrl, apiKey, provider } = defaultModel;

    // MiniMax uses a specific format
    if (provider === 'minimax') {
      const response = await fetch(`${apiBaseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'embo1',
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[MessageEmbedding] MiniMax embedding failed:', response.status, errorText);
        return [];
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;
      if (!embedding) {
        console.warn('[MessageEmbedding] No embedding in response');
        return [];
      }

      return embedding;
    }

    // OpenAI-compatible format for other providers
    const openAIResponse = await fetch(`${apiBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: defaultModel.modelName,
        input: text,
      }),
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.warn('[MessageEmbedding] OpenAI-compatible embedding failed:', openAIResponse.status, errorText);
      return [];
    }

    const data = await openAIResponse.json();
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) {
      console.warn('[MessageEmbedding] No embedding in OpenAI-compatible response');
      return [];
    }

    return embedding;
  } catch (err) {
    console.warn('[MessageEmbedding] Embedding generation failed:', err);
    return [];
  }
}

/**
 * Embed multiple messages, returning a map of messageId -> embedding.
 * Failures are non-blocking - individual failures return empty array.
 */
export async function embedMessages(messages: Message[]): Promise<Map<string, number[]>> {
  const results = new Map<string, number[]>();

  // Filter out system/tool messages and empty content
  const embeddable = messages.filter(
    m => m.role !== 'system' && m.role !== 'tool' && m.content.trim().length > 0
  );

  // Process in parallel
  const promises = embeddable.map(async (msg) => {
    const embedding = await embedText(msg.content);
    return { id: msg.id, embedding };
  });

  const resolved = await Promise.all(promises);

  for (const { id, embedding } of resolved) {
    if (embedding.length > 0) {
      results.set(id, embedding);
    }
  }

  return results;
}
