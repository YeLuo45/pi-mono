/**
 * Daily/Weekly/Monthly Summary Service for PixelPal Companion (V32)
 * 
 * Lightweight keyword-based summarization of conversations.
 * Does NOT use AI — pure frequency analysis and pattern matching.
 */

import { useStore } from '../../store';
import { addMemory } from '../memory/memoryStorage';
import type { MemoryEntry } from '../memory/memoryTypes';

// Keywords for important message detection
const IMPORTANT_KEYWORDS = ['决定', '答应', '承诺', '记得', '约定', '重要'];

// Decision-related keywords
const DECISION_KEYWORDS = ['决定', '答应', '承诺', '约定', '说好了', '就这么办', '没问题', '好的', '好的'];

// Emotion keywords
const POSITIVE_EMOTION_KEYWORDS = ['开心', '高兴', '快乐', '喜欢', '爱', '棒', '不错', '好', '很好', '太棒了', '完美', '哈哈', '笑'];
const NEGATIVE_EMOTION_KEYWORDS = ['难过', '伤心', '生气', '愤怒', '害怕', '担心', '焦虑', '紧张', '郁闷', '烦', '累', '累死了', '不爽'];
const NEUTRAL_EMOTION_KEYWORDS = ['一般', '还好', '还行', '无所谓', '随便'];

// Topic extraction: common Chinese stop words to filter out
const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '吗', '吧', '呢', '啊', '哦', '嗯', '噢',
  '他', '她', '它', '们', '这个', '那个', '这样', '那样', '怎么', '为什么', '哪', '哪个', '多少', '几',
  '可以', '可能', '应该', '需要', '想', '知道', '觉得', '感觉', '认为', '希望', '愿意', '能够',
  '来', '去', '这里', '那里', '这边', '那边', '现在', '今天', '明天', '昨天', '时候', '时间',
  '做', '作', '让', '使', '把', '被', '给', '跟', '对', '比', '还', '又', '再', '已', '已经', '正在',
  '如果', '因为', '所以', '但是', '虽然', '然后', '接着', '或者', '还是', '而且', '并且',
]);

/**
 * Extract keywords from message content using simple frequency analysis
 */
function extractKeywords(messages: Array<{ content: string }>, maxKeywords = 10): string[] {
  const wordFreq: Record<string, number> = {};
  
  for (const msg of messages) {
    // Split by common delimiters and extract 2-4 character phrases
    const tokens = msg.content.split(/[\s\n，。、！？,.!?]+/).filter(t => t.length >= 2 && t.length <= 6);
    
    for (const token of tokens) {
      if (STOP_WORDS.has(token)) continue;
      // Check if token contains meaningful characters (Chinese/alpha)
      if (!/[\u4e00-\u9fa5a-zA-Z]/.test(token)) continue;
      wordFreq[token] = (wordFreq[token] || 0) + 1;
    }
  }
  
  // Sort by frequency and return top keywords
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Extract decisions/promises from messages
 */
function extractDecisions(messages: Array<{ content: string }>): string[] {
  const decisions: string[] = [];
  
  for (const msg of messages) {
    for (const keyword of DECISION_KEYWORDS) {
      if (msg.content.includes(keyword)) {
        // Extract the sentence containing the keyword
        const sentences = msg.content.split(/[。！？.!?]/);
        for (const sentence of sentences) {
          if (sentence.includes(keyword) && sentence.trim().length > 5 && sentence.trim().length < 200) {
            decisions.push(`[${keyword}] ${sentence.trim()}`);
            break;
          }
        }
        break;
      }
    }
  }
  
  // Deduplicate and limit
  return [...new Set(decisions)].slice(0, 5);
}

/**
 * Extract emotion keywords from messages
 */
function extractEmotions(messages: Array<{ content: string }>): { positive: number; negative: number; neutral: number; details: string[] } {
  let positive = 0;
  let negative = 0;
  let neutral = 0;
  const details: string[] = [];
  
  for (const msg of messages) {
    let found = false;
    for (const kw of POSITIVE_EMOTION_KEYWORDS) {
      if (msg.content.includes(kw)) { positive++; found = true; break; }
    }
    if (!found) {
      for (const kw of NEGATIVE_EMOTION_KEYWORDS) {
        if (msg.content.includes(kw)) { negative++; found = true; break; }
      }
    }
    if (!found) {
      for (const kw of NEUTRAL_EMOTION_KEYWORDS) {
        if (msg.content.includes(kw)) { neutral++; break; }
      }
    }
  }
  
  if (positive > 0) details.push(`积极词汇 ${positive} 次`);
  if (negative > 0) details.push(`消极词汇 ${negative} 次`);
  if (neutral > 0) details.push(`中性词汇 ${neutral} 次`);
  
  return { positive, negative, neutral, details };
}

/**
 * Get emotion summary string
 */
function getEmotionSummary(messages: Array<{ content: string }>): string {
  const { positive, negative, neutral } = extractEmotions(messages);
  if (positive === 0 && negative === 0 && neutral === 0) return '情感状态：无明显情感波动';
  if (positive > negative && positive > neutral) return '情感状态：整体积极';
  if (negative > positive && negative > neutral) return '情感状态：存在负面情绪';
  if (neutral > positive && neutral > negative) return '情感状态：整体平淡';
  if (positive > 0 && negative > 0) return '情感状态：有积极互动，也有负面情绪';
  return '情感状态：整体平稳';
}

/**
 * Filter messages by personaId and date range
 */
function filterMessagesByDate(
  messages: Array<{ personaId?: string; timestamp: number }>,
  personaId: string,
  date: string
): Array<{ content: string; role: string }> {
  const dayStart = new Date(date).setHours(0, 0, 0, 0);
  const dayEnd = new Date(date).setHours(23, 59, 59, 999);
  
  const allMessages = useStore.getState().messages;
  return allMessages
    .filter(m =>
      (m.personaId === personaId || !m.personaId) &&
      m.timestamp >= dayStart &&
      m.timestamp <= dayEnd
    )
    .map(m => ({ content: m.content, role: m.role }));
}

/**
 * Filter messages for a date range (7 days for weekly, 30 days for monthly)
 */
function filterMessagesByDateRange(
  personaId: string,
  startDate: string,
  days: number
): Array<{ content: string; role: string; timestamp?: number }> {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  const startMs = start.setHours(0, 0, 0, 0);
  const endMs = end.setHours(23, 59, 59, 999);

  const allMessages = useStore.getState().messages;
  return allMessages
    .filter(m =>
      (m.personaId === personaId || !m.personaId) &&
      m.timestamp >= startMs &&
      m.timestamp <= endMs
    )
    .map(m => ({ content: m.content, role: m.role, timestamp: m.timestamp }));
}

/**
 * Generate a daily summary MemoryEntry
 */
export async function generateDailySummary(personaId: string, date: string): Promise<MemoryEntry | null> {
  const messages = filterMessagesByDate(useStore.getState().messages, personaId, date);
  
  if (messages.length === 0) {
    return null;
  }
  
  const userMessages = messages.filter(m => m.role === 'user');
  const allMessages = messages;
  
  // Extract topics (keywords from all messages)
  const topics = extractKeywords(allMessages, 8);
  
  // Extract decisions
  const decisions = extractDecisions(allMessages);
  
  // Get emotion summary
  const emotionSummary = getEmotionSummary(allMessages);
  
  // Build summary content
  let content = `📅 每日摘要 ${date}\n\n`;
  content += `讨论主题：${topics.length > 0 ? topics.join('、') : '无'}\n`;
  content += `${emotionSummary}\n`;
  content += `对话轮次：${messages.length}\n`;
  content += `用户消息：${userMessages.length}\n`;
  
  if (decisions.length > 0) {
    content += `\n💡 重要事件：\n${decisions.map(d => `  ${d}`).join('\n')}`;
  }
  
  // Store as memory entry
  const memory = await addMemory({
    type: 'daily_summary',
    content,
    importance: 60,
    tags: ['自动摘要', '日总结', ...topics.slice(0, 3)],
    metadata: {
      date,
      topicCount: topics.length,
      messageCount: messages.length,
      userMessageCount: userMessages.length,
    },
    personaId,
  });
  
  return memory;
}

/**
 * Generate a weekly summary MemoryEntry
 */
export async function generateWeeklySummary(personaId: string, weekStartDate: string): Promise<MemoryEntry | null> {
  const messages = filterMessagesByDateRange(personaId, weekStartDate, 7);
  
  if (messages.length === 0) {
    return null;
  }
  
  const userMessages = messages.filter(m => m.role === 'user');
  const allMessages = messages;
  
  // Extract topics
  const topics = extractKeywords(allMessages, 12);
  
  // Extract decisions
  const decisions = extractDecisions(allMessages);
  
  // Emotion summary
  const emotionSummary = getEmotionSummary(allMessages);
  
  // Calculate topic distribution
  const topicCounts: Record<string, number> = {};
  for (const topic of topics) {
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  }
  
  // Get intimacy from store
  const intimacyValue = useStore.getState().personaIntimacy[personaId] || 0;
  const intimacyLevel = intimacyValue > 80 ? '亲密' : intimacyValue > 50 ? '友好' : intimacyValue > 20 ? '一般' : '陌生';
  
  // Build summary content
  let content = `📆 周报摘要 ${weekStartDate} 开始的一周\n\n`;
  content += `总对话轮次：${messages.length}\n`;
  content += `用户消息：${userMessages.length}\n`;
  content += `亲密度：${intimacyValue} (${intimacyLevel})\n\n`;
  content += `高频话题：${topics.length > 0 ? topics.join('、') : '无'}\n`;
  content += `${emotionSummary}\n`;
  
  if (decisions.length > 0) {
    content += `\n💡 本周重要决定：\n${decisions.map(d => `  ${d}`).join('\n')}`;
  }
  
  // Store as memory entry
  const memory = await addMemory({
    type: 'weekly_summary',
    content,
    importance: 70,
    tags: ['自动摘要', '周总结', ...topics.slice(0, 4)],
    metadata: {
      weekStartDate,
      topicCount: topics.length,
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      intimacy: intimacyValue,
    },
    personaId,
  });
  
  return memory;
}

/**
 * Generate a monthly summary MemoryEntry
 */
export async function generateMonthlySummary(personaId: string, month: string): Promise<MemoryEntry | null> {
  // month format: YYYY-MM
  const [year, monthNum] = month.split('-').map(Number);
  const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
  
  const messages = filterMessagesByDateRange(personaId, startDate, 30);
  
  if (messages.length === 0) {
    return null;
  }
  
  const userMessages = messages.filter(m => m.role === 'user');
  const allMessages = messages;
  
  // Extract topics
  const topics = extractKeywords(allMessages, 15);
  
  // Extract decisions
  const decisions = extractDecisions(allMessages);
  
  // Emotion summary
  const emotionSummary = getEmotionSummary(allMessages);
  
  // Get intimacy from store
  const intimacyValue = useStore.getState().personaIntimacy[personaId] || 0;
  const intimacyLevel = intimacyValue > 80 ? '亲密' : intimacyValue > 50 ? '友好' : intimacyValue > 20 ? '一般' : '陌生';
  
  // Count unique days with conversation
  const uniqueDays = new Set(
    messages.map(m => {
      const d = new Date(m.timestamp || Date.now());
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  ).size;
  
  // Build summary content
  let content = `📊 月度摘要 ${month}\n\n`;
  content += `总对话轮次：${messages.length}\n`;
  content += `活跃天数：${uniqueDays}\n`;
  content += `用户消息：${userMessages.length}\n`;
  content += `亲密度：${intimacyValue} (${intimacyLevel})\n\n`;
  content += `热门话题：${topics.length > 0 ? topics.join('、') : '无'}\n`;
  content += `${emotionSummary}\n`;
  
  if (decisions.length > 0) {
    content += `\n💡 本月重要决定：\n${decisions.slice(0, 8).map(d => `  ${d}`).join('\n')}`;
  }
  
  // Store as memory entry
  const memory = await addMemory({
    type: 'monthly_summary',
    content,
    importance: 75,
    tags: ['自动摘要', '月总结', ...topics.slice(0, 5)],
    metadata: {
      month,
      topicCount: topics.length,
      messageCount: messages.length,
      userMessageCount: userMessages.length,
      activeDays: uniqueDays,
      intimacy: intimacyValue,
    },
    personaId,
  });
  
  return memory;
}

/**
 * Check if a message contains important keywords and create a MemoryEntry if so
 * Returns the created MemoryEntry or null
 */
export async function checkAndTagImportantMessage(
  content: string,
  personaId: string
): Promise<MemoryEntry | null> {
  for (const keyword of IMPORTANT_KEYWORDS) {
    if (content.includes(keyword)) {
      // Extract the relevant sentence
      const sentences = content.split(/[。！？.!?]/);
      let eventText = content;
      for (const sentence of sentences) {
        if (sentence.includes(keyword) && sentence.trim().length > 5 && sentence.trim().length < 300) {
          eventText = sentence.trim();
          break;
        }
      }
      
      const memory = await addMemory({
        type: 'important_event',
        content: `💡 重要事件：[${keyword}] ${eventText}`,
        importance: 85,
        tags: ['重要', keyword, '自动标记'],
        metadata: {
          keyword,
          originalLength: content.length,
        },
        personaId,
      });
      
      return memory;
    }
  }
  
  return null;
}

/**
 * Generate yesterday's summary for active persona on app startup
 * Returns true if a summary was generated
 */
export async function generateYesterdaySummaryIfNeeded(): Promise<boolean> {
  const { activePersonaId } = useStore.getState();
  if (!activePersonaId) return false;
  
  const lastSummaryKey = `lastSummaryTime_${activePersonaId}`;
  const lastSummary = localStorage.getItem(lastSummaryKey);
  const now = Date.now();
  
  // Check if we need to generate a summary (> 24 hours)
  if (lastSummary) {
    const elapsed = now - parseInt(lastSummary, 10);
    const DAY = 24 * 60 * 60 * 1000;
    if (elapsed < DAY) {
      return false;
    }
  }
  
  // Generate yesterday's summary
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
  
  const memory = await generateDailySummary(activePersonaId, yesterdayStr);
  
  if (memory) {
    localStorage.setItem(lastSummaryKey, String(now));
    return true;
  }
  
  return false;
}
