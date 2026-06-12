/**
 * Memory Summarization Service - AI-powered conversation summarization
 * 
 * Provides automatic summarization of chat conversations and memory compression.
 * Uses the model registry adapter for AI calls.
 */

import type { Message } from '../../types';
import type { MemoryEntry } from './memoryTypes';
import { callWithPrompt, type CallOptions } from '../ai/model-registry-adapter';

export interface SummarizationResult {
  summary: string;
  topics: string[];
  entities: ExtractedEntity[];
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPoints: string[];
  suggestedMemoryType: MemoryEntry['type'];
  suggestedTags: string[];
  importanceScore: number; // 0-10
}

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'place' | 'object' | 'concept' | 'event' | 'task';
  mentions: number;
}

const SUMMARIZATION_PROMPT_TEMPLATE = `You are a memory analyst AI. Analyze the following conversation and provide a structured summary.

CONVERSATION:
{conversation}

Please respond with a JSON object containing:
{
  "summary": "A 2-3 sentence summary of the conversation",
  "topics": ["topic1", "topic2", "topic3"],
  "entities": [{"name": "entity name", "type": "person|place|object|concept|event|task", "mentions": count}],
  "sentiment": "positive|neutral|negative",
  "keyPoints": ["key point 1", "key point 2"],
  "suggestedMemoryType": "conversation_summary|user_preference|fact|preference|routine",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "importanceScore": 5
}

Rules:
- Summary should be concise but capture the essential information
- Topics should be 2-4 word labels
- Importance score: 1-3 for trivial, 4-6 for normal, 7-9 for important, 10 for critical
- suggestedMemoryType: conversation_summary for general chats, user_preference for likes/dislikes, fact for factual info, preference for short-term preferences, routine for recurring patterns
- Include only entities that are explicitly mentioned and seem significant`;

const EXTRACTION_PROMPT_TEMPLATE = `Extract factual information and key details from this text:

{text}

Respond with a JSON array of facts, each with:
- "fact": the extracted fact
- "type": "preference|habit|fact|goal|relationship|location"
- "confidence": 0-1

Examples:
- {"fact": "User prefers dark mode", "type": "preference", "confidence": 0.9}
- {"fact": "User works at Google", "type": "fact", "confidence": 0.95}
- {"fact": "User exercises every morning", "type": "habit", "confidence": 0.85}`;

/**
 * Summarize a conversation
 */
export async function summarizeConversation(
  messages: Message[],
  options: CallOptions = {}
): Promise<SummarizationResult> {
  if (messages.length === 0) {
    return {
      summary: '',
      topics: [],
      entities: [],
      sentiment: 'neutral',
      keyPoints: [],
      suggestedMemoryType: 'conversation_summary',
      suggestedTags: [],
      importanceScore: 0,
    };
  }

  // Format conversation
  const conversation = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  try {
    const result = await callWithPrompt(
      SUMMARIZATION_PROMPT_TEMPLATE.replace('{conversation}', conversation),
      {
        temperature: 0.3,
        maxTokens: 1000,
        ...options,
      }
    );

    if (!result.success || !result.content) {
      throw new Error(result.error || 'Summarization failed');
    }

    return parseSummarizationResult(result.content);
  } catch (error) {
    console.error('Summarization error:', error);
    // Fallback to simple extraction
    return simpleSummarize(messages);
  }
}

/**
 * Parse JSON result from AI summarization
 */
function parseSummarizationResult(content: string): SummarizationResult {
  try {
    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || '',
        topics: parsed.topics || [],
        entities: parsed.entities || [],
        sentiment: parsed.sentiment || 'neutral',
        keyPoints: parsed.keyPoints || [],
        suggestedMemoryType: parsed.suggestedMemoryType || 'conversation_summary',
        suggestedTags: parsed.suggestedTags || [],
        importanceScore: parsed.importanceScore ?? 5,
      };
    }
  } catch (e) {
    console.error('Parse error:', e);
  }

  // Fallback
  return {
    summary: content.slice(0, 200),
    topics: [],
    entities: [],
    sentiment: 'neutral',
    keyPoints: [],
    suggestedMemoryType: 'conversation_summary',
    suggestedTags: [],
    importanceScore: 5,
  };
}

/**
 * Simple summarization fallback (no AI)
 */
function simpleSummarize(messages: Message[]): SummarizationResult {
  const userMessages = messages.filter(m => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1];

  return {
    summary: lastUserMessage ? lastUserMessage.content.slice(0, 150) : 'Conversation occurred',
    topics: extractSimpleTopics(messages),
    entities: [],
    sentiment: 'neutral',
    keyPoints: [],
    suggestedMemoryType: 'conversation_summary',
    suggestedTags: [],
    importanceScore: 5,
  };
}

/**
 * Simple topic extraction without AI
 */
function extractSimpleTopics(messages: Message[]): string[] {
  const topics: string[] = [];
  const topicKeywords = [
    'work', 'meeting', 'project', 'task', 'deadline',
    'home', 'family', 'friend', 'party', 'event',
    'travel', 'trip', 'vacation', 'hotel', 'flight',
    'food', 'restaurant', 'recipe', 'cook', 'eat',
    'movie', 'book', 'music', 'game', 'sport', 'exercise',
    'health', 'doctor', 'medicine', 'sleep', 'stress',
    'learning', 'study', 'course', 'book', 'tutorial',
    'shopping', 'buy', 'order', 'deliver', 'gift',
  ];

  const allText = messages.map(m => m.content).join(' ').toLowerCase();

  for (const keyword of topicKeywords) {
    if (allText.includes(keyword) && !topics.includes(keyword)) {
      topics.push(keyword);
    }
  }

  return topics.slice(0, 5);
}

/**
 * Extract facts from text
 */
export async function extractFacts(text: string): Promise<Array<{
  fact: string;
  type: 'preference' | 'habit' | 'fact' | 'goal' | 'relationship' | 'location';
  confidence: number;
}>> {
  try {
    const result = await callWithPrompt(
      EXTRACTION_PROMPT_TEMPLATE.replace('{text}', text),
      { temperature: 0.2, maxTokens: 500 }
    );

    if (!result.success || !result.content) {
      return [];
    }

    try {
      const parsed = JSON.parse(result.content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Generate a memory entry from a summarization result
 */
export function createMemoryFromSummary(
  result: SummarizationResult,
  conversationId?: string
): Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'> {
  return {
    type: result.suggestedMemoryType,
    content: result.summary,
    importance: result.importanceScore,
    importanceScore: result.importanceScore,
    tags: result.suggestedTags,
    metadata: {
      topics: result.topics,
      sentiment: result.sentiment,
      keyPoints: result.keyPoints,
      entities: result.entities,
      conversationId,
    },
  };
}

/**
 * Batch summarize multiple conversations
 */
export async function batchSummarize(
  conversationGroups: Message[][]
): Promise<SummarizationResult[]> {
  return Promise.all(conversationGroups.map(msgs => summarizeConversation(msgs)));
}

/**
 * Compress memories - merge similar low-importance memories
 */
export async function compressMemories(memories: MemoryEntry[]): Promise<MemoryEntry[]> {
  // Simple compression: merge memories with same tags, keep highest importance
  const byTag = new Map<string, MemoryEntry[]>();

  for (const memory of memories) {
    const tagKey = memory.tags.sort().join(',') || 'untagged';
    if (!byTag.has(tagKey)) {
      byTag.set(tagKey, []);
    }
    byTag.get(tagKey)!.push(memory);
  }

  const compressed: MemoryEntry[] = [];

  for (const [, group] of byTag) {
    if (group.length === 1) {
      compressed.push(group[0]);
    } else {
      // Keep the most important/most accessed
      const best = group.reduce((a, b) =>
        (a.importance * Math.log(a.accessCount + 1)) > (b.importance * Math.log(b.accessCount + 1)) ? a : b
      );
      compressed.push({
        ...best,
        content: `[Compressed from ${group.length} entries]\n${best.content}`,
        metadata: {
          ...best.metadata,
          compressedFrom: group.length,
          compressedIds: group.map(m => m.id),
        },
      });
    }
  }

  return compressed;
}

/**
 * Generate insight from memory patterns
 */
export async function generateMemoryInsights(memories: MemoryEntry[]): Promise<string[]> {
  if (memories.length < 3) return [];

  const insights: string[] = [];

  // Analyze access patterns
  const accessCounts = memories.map(m => m.accessCount);
  const avgAccess = accessCounts.reduce((a, b) => a + b, 0) / accessCounts.length;
  const highAccess = memories.filter(m => m.accessCount > avgAccess * 2);

  if (highAccess.length > 0) {
    insights.push(`You frequently revisit ${highAccess.length} memories - these seem important to you!`);
  }

  // Analyze topics
  const allTags = memories.flatMap(m => m.tags);
  const tagCounts = new Map<string, number>();
  for (const tag of allTags) {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topTags.length > 0) {
    insights.push(`Your top interests: ${topTags.map(([t]) => t).join(', ')}`);
  }

  // Analyze recency
  const recent = memories.filter(m => Date.now() - m.createdAt < 7 * 24 * 60 * 60 * 1000);
  if (recent.length > 0) {
    insights.push(`${recent.length} new memories from the past week`);
  }

  return insights;
}
