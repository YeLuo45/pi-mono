/**
 * Weekly Summary Service for PixelPal Companion (V57)
 * 
 * AI-powered weekly conversation summary generation.
 * Uses ModelRegistry to call MiniMax API for intelligent summarization.
 * Stores results in memory storage as 'weekly_summary' MemoryEntry type.
 */

import { getRegistry } from '../ai/model-registry-adapter';
import { loadMessages } from '../storage/messageStorage';
import { addMemory, queryMemories } from '../memory/memoryStorage';
import type { MemoryEntry } from '../memory/memoryTypes';

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  summary: string;
  topics: string[];
  actionItems: string[];
  createdAt: number;
}

/**
 * Calculate the start and end of the current week (Monday 00:00 to Sunday 23:59:59)
 */
function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate days to subtract to get to Monday
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

/**
 * Calculate week range for a specific date
 */
function getWeekRangeForDate(date: Date): { weekStart: Date; weekEnd: Date } {
  const dayOfWeek = date.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse a JSON string safely, trying multiple formats
 */
function parseAIResponse(content: string): Partial<WeeklySummary> {
  // Try to extract JSON from the response
  let jsonStr = content;
  
  // If the content has markdown code blocks, extract the inner content
  const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  
  // Also try to find raw JSON object in the content
  const rawJsonMatch = content.match(/\{[\s\S]*\}/);
  if (rawJsonMatch) {
    jsonStr = rawJsonMatch[0];
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      summary: parsed.summary || '',
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
  } catch {
    // If JSON parsing fails, return empty
    return {
      summary: content.slice(0, 500),
      topics: [],
      actionItems: [],
    };
  }
}

/**
 * Generate a weekly summary for the current week
 * Returns the created WeeklySummary or null if no messages found
 */
export async function generateWeeklySummary(): Promise<WeeklySummary | null> {
  const { weekStart, weekEnd } = getCurrentWeekRange();
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekEnd.getTime();
  
  // Load messages from IndexedDB
  const allMessages = await loadMessages();
  
  // Filter messages within this week
  const weekMessages = allMessages.filter(
    (m) => m.timestamp >= weekStartMs && m.timestamp <= weekEndMs && m.role !== 'system'
  );
  
  if (weekMessages.length === 0) {
    console.log('[WeeklySummary] No messages found for this week');
    return null;
  }
  
  // Prepare conversation text for AI summarization
  const conversationText = weekMessages
    .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
    .join('\n');
  
  // Build the prompt for AI summarization
  const prompt = `请分析以下一周的对话记录，生成一份结构化的周报摘要。

## 对话记录：
${conversationText.slice(0, 4000)}

## 要求：
请以JSON格式返回周报，包含以下字段：
- summary: 本周对话的整体摘要（100-200字）
- topics: 本周讨论的主要话题列表（3-5个）
- actionItems: 本周确定的任务或待办事项列表（0-3个）

请直接返回JSON，不要包含其他文字。格式如下：
{
  "summary": "...",
  "topics": ["话题1", "话题2", "话题3"],
  "actionItems": ["待办1", "待办2"]
}`;

  // Call AI using ModelRegistry
  const registry = getRegistry();
  const result = await registry.callWithPrompt(prompt, { maxTokens: 1024 });
  
  if (!result.success) {
    console.error('[WeeklySummary] AI call failed:', result.error);
    throw new Error(result.error || 'AI summarization failed');
  }
  
  // Parse AI response
  const parsed = parseAIResponse(result.content);
  
  // Create WeeklySummary object
  const weeklySummary: WeeklySummary = {
    weekStart,
    weekEnd,
    summary: parsed.summary || '周报生成失败',
    topics: parsed.topics || [],
    actionItems: parsed.actionItems || [],
    createdAt: Date.now(),
  };
  
  // Store as a memory entry
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekEnd);
  
  const memory = await addMemory({
    type: 'weekly_summary',
    content: JSON.stringify(weeklySummary),
    importance: 70,
    tags: ['自动摘要', 'AI周报', `week-${weekStartStr}`],
    metadata: {
      weekStart: weekStartMs,
      weekEnd: weekEndMs,
      weekStartStr,
      weekEndStr,
      messageCount: weekMessages.length,
      summaryText: weeklySummary.summary,
      topics: weeklySummary.topics,
      actionItems: weeklySummary.actionItems,
      createdBy: 'ai',
    },
  });
  
  console.log('[WeeklySummary] Created memory entry:', memory.id);
  
  return weeklySummary;
}

/**
 * Get all weekly summaries from memory storage
 */
export async function getWeeklySummaries(): Promise<WeeklySummary[]> {
  const memories = await queryMemories({
    type: 'weekly_summary',
    limit: 50,
  });
  
  return memories
    .map((m) => {
      try {
        // Try to parse the JSON content
        const parsed = JSON.parse(m.content);
        return {
          weekStart: new Date(parsed.weekStart),
          weekEnd: new Date(parsed.weekEnd),
          summary: parsed.summary || '',
          topics: parsed.topics || [],
          actionItems: parsed.actionItems || [],
          createdAt: m.createdAt,
        } as WeeklySummary;
      } catch {
        // Fallback for old format or plain text content
        return {
          weekStart: new Date(m.metadata?.weekStart || Date.now()),
          weekEnd: new Date(m.metadata?.weekEnd || Date.now()),
          summary: m.content.slice(0, 300),
          topics: (m.metadata?.topics as string[]) || [],
          actionItems: (m.metadata?.actionItems as string[]) || [],
          createdAt: m.createdAt,
        } as WeeklySummary;
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Get the most recent weekly summary
 */
export async function getLatestSummary(): Promise<WeeklySummary | null> {
  const summaries = await getWeeklySummaries();
  return summaries[0] || null;
}

/**
 * Check if a summary already exists for the current week
 */
export async function hasCurrentWeekSummary(): Promise<boolean> {
  const { weekStart, weekEnd } = getCurrentWeekRange();
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekEnd.getTime();
  
  const memories = await queryMemories({
    type: 'weekly_summary',
    limit: 10,
  });
  
  return memories.some((m) => {
    const meta = m.metadata;
    if (meta?.weekStart && meta?.weekEnd) {
      return meta.weekStart === weekStartMs && meta.weekEnd === weekEndMs;
    }
    // Fallback: check if createdAt falls within this week
    return m.createdAt >= weekStartMs && m.createdAt <= weekEndMs;
  });
}

/**
 * Check if it's currently Sunday (day 0)
 */
export function isSunday(): boolean {
  return new Date().getDay() === 0;
}

/**
 * Check if it's been more than 7 days since last summary
 */
export async function shouldPromptForSummary(): Promise<boolean> {
  const latest = await getLatestSummary();
  if (!latest) return true;
  
  const daysSinceLastSummary = (Date.now() - latest.createdAt) / (1000 * 60 * 60 * 24);
  return daysSinceLastSummary >= 7 || isSunday();
}
