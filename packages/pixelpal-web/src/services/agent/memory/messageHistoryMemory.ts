/**
 * messageHistoryMemory - Extract memories from message history
 * 
 * Uses rule-based filtering to extract meaningful information from
 * recent chat messages without requiring LLM processing.
 */

import type { Message } from '../../../types';
import type { MemoryEntry, MemoryImportance, MemoryEntryType } from './MemoryContext';

// ============================================================================
// Pattern matching rules for memory extraction
// ============================================================================

// Patterns that indicate factual statements
const FACT_PATTERNS = [
  /^(事实|其实|实际上|实际上)/i,
  /知道|记得|认知/i,
  /\d+(年|月|日|点|分钟|小时|天)/,
  /位于|处在|是\d+/,
];

// Patterns that indicate user preferences
const PREFERENCE_PATTERNS = [
  /喜欢|偏好|倾向|希望|想要|比较|宁愿/i,
  /不喜欢|讨厌|拒绝|避免/i,
  /通常|一般|习惯/i,
  /最好|更好|首选/i,
];

// Patterns that indicate task completion
const TASK_RESULT_PATTERNS = [
  /完成|搞定|做好|结束|结束/i,
  /结果|成功|失败|搞定/i,
  /已经|好了|完成/i,
];

// Patterns to exclude (questions, commands, filler)
const EXCLUDE_PATTERNS = [
  /^[?？]/,
  /吗[?？]?$/,
  /好[吗呢吧]?[?？]?$/,
  /来帮我|帮我|帮我一下/i,
  /可以吗|行不行|行吗|行吧/i,
  /^嗯$|^啊$|^哦$|^呀$/,
];

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Determine the type of memory entry based on content analysis
 */
function classifyContent(content: string): { type: MemoryEntryType; importance: MemoryImportance } {
  const lowerContent = content.toLowerCase();
  
  // Check for preference patterns first (highest priority)
  for (const pattern of PREFERENCE_PATTERNS) {
    if (pattern.test(lowerContent)) {
      const importance: MemoryImportance = 
        /喜欢|讨厌|希望|想要/.test(lowerContent) ? 'high' : 'medium';
      return { type: 'preference', importance };
    }
  }
  
  // Check for fact patterns
  for (const pattern of FACT_PATTERNS) {
    if (pattern.test(lowerContent)) {
      return { type: 'fact', importance: 'medium' };
    }
  }
  
  // Check for task result patterns
  for (const pattern of TASK_RESULT_PATTERNS) {
    if (pattern.test(lowerContent)) {
      return { type: 'task_result', importance: 'medium' };
    }
  }
  
  return { type: 'context', importance: 'low' };
}

/**
 * Check if a message should be excluded from memory extraction
 */
function shouldExclude(content: string): boolean {
  const lowerContent = content.toLowerCase().trim();
  
  // Too short or too long
  if (lowerContent.length < 5 || lowerContent.length > 500) return true;
  
  // Matches exclude patterns
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(lowerContent)) return true;
  }
  
  // Mostly numbers or special chars (likely code, time, etc.)
  const alphaRatio = lowerContent.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').length / lowerContent.length;
  if (alphaRatio < 0.3) return true;
  
  return false;
}

/**
 * Clean and normalize message content for memory storage
 */
function normalizeContent(content: string): string {
  return content
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 300); // Max 300 chars
}

// ============================================================================
// Main extraction function
// ============================================================================

/**
 * Extract memory entries from a list of messages
 * 
 * @param messages - Recent messages to analyze
 * @param limit - Maximum number of memory entries to extract (default 20)
 * @returns Array of memory entries extracted from messages
 */
export function extractMemoriesFromMessages(
  messages: Message[],
  limit = 20
): Omit<MemoryEntry, 'id' | 'createdAt'>[] {
  if (!messages || messages.length === 0) return [];
  
  // Take last 50 messages for analysis
  const recentMessages = messages.slice(-50);
  const extracted: Omit<MemoryEntry, 'id' | 'createdAt'>[] = [];
  const seen = new Set<string>();
  
  for (const msg of recentMessages) {
    if (shouldExclude(msg.content)) continue;
    
    const { type, importance } = classifyContent(msg.content);
    const normalizedContent = normalizeContent(msg.content);
    
    // Avoid duplicate entries
    const contentHash = normalizedContent.toLowerCase().slice(0, 50);
    if (seen.has(contentHash)) continue;
    seen.add(contentHash);
    
    extracted.push({
      type,
      content: `[${type}] ${normalizedContent}`,
      importance,
    });
    
    if (extracted.length >= limit) break;
  }
  
  // Sort by importance (high first)
  const importanceOrder = { high: 0, medium: 1, low: 2 };
  extracted.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);
  
  return extracted;
}

/**
 * Extract memory from a task result
 * 
 * @param taskId - The task ID
 * @param result - The task result content
 * @returns Memory entry for the task result
 */
export function extractMemoryFromTaskResult(
  taskId: string,
  result: string
): Omit<MemoryEntry, 'id' | 'createdAt'> {
  const content = result.length > 200 ? result.slice(0, 200) + '...' : result;
  
  return {
    type: 'task_result',
    content: `[task_result] 任务 ${taskId.slice(0, 8)}: ${content}`,
    importance: 'medium',
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days expiry
  };
}
