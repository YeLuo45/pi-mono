/**
 * Emotion Service - Text-based emotion detection using keyword matching
 * 
 * Based on PRD: 基于文本关键词 + 规则引擎（简单词库匹配）
 * Detects 7 emotion categories: 开心/平静/焦虑/愤怒/悲伤/兴奋/疲惫
 * 
 * Emotion data model: { id, timestamp, emotion, intensity (0-100), context, messageId }
 */

import type { EmotionState } from '../voice/emotionDetector';

// Extended emotion types for text-based detection (maps to 7 PRD categories)
export type TextEmotion = 'happy' | 'calm' | 'anxious' | 'angry' | 'sad' | 'excited' | 'exhausted' | 'unknown';

export interface EmotionLogEntry {
  id: string;
  timestamp: number;
  emotion: TextEmotion;
  intensity: number;      // 0-100
  context: string;         // text snippet that triggered the emotion
  messageId?: string;      // associated chat message ID
  source: 'text' | 'voice'; // detection method
}

// Map TextEmotion to the EmotionState used by the app
export function mapToEmotionState(emotion: TextEmotion): EmotionState {
  const mapping: Record<TextEmotion, EmotionState> = {
    happy: 'excited',
    calm: 'calm',
    anxious: 'tense',
    angry: 'tense',
    sad: 'low_energy',
    excited: 'excited',
    exhausted: 'low_energy',
    unknown: 'unknown',
  };
  return mapping[emotion];
}

// Keyword dictionaries for each emotion (Chinese + English)
const EMOTION_KEYWORDS: Record<TextEmotion, { zh: string[]; en: string[]; weight: number }> = {
  happy: {
    zh: ['开心', '高兴', '快乐', '愉快', '幸福', '太好了', '真棒', '完美', '喜欢', '爱', '赞', '酷', 'happy', 'joy', 'glad', 'excited', 'wonderful', 'great', 'awesome', 'love', 'nice'],
    en: ['happy', 'joy', 'glad', 'pleased', 'delighted', 'great', 'wonderful', 'awesome', 'love', 'nice', 'excellent'],
    weight: 70,
  },
  calm: {
    zh: ['平静', '安静', '放松', '淡定', '从容', 'peaceful', 'calm', 'relaxed', 'quiet', 'serene', 'tranquil'],
    en: ['calm', 'peaceful', 'relaxed', 'quiet', 'serene', 'tranquil', 'soothing', 'laid back'],
    weight: 50,
  },
  anxious: {
    zh: ['焦虑', '担心', '紧张', '不安', '害怕', '恐惧', '忐忑', '忧虑', '慌忙', '着急', 'anxious', 'worried', 'nervous', 'afraid', 'fear', 'scared', 'uneasy', 'tense', 'stressed'],
    en: ['anxious', 'worried', 'nervous', 'afraid', 'fear', 'scared', 'uneasy', 'stressed', 'concerned', 'panic'],
    weight: 80,
  },
  angry: {
    zh: ['生气', '愤怒', '恼火', '讨厌', '可恶', '气死了', '烦', '讨厌', '恨', '怒', 'angry', 'mad', 'furious', 'annoyed', 'irritated', 'hate', 'rage'],
    en: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'hate', 'rage', 'frustrated', 'upset'],
    weight: 85,
  },
  sad: {
    zh: ['悲伤', '难过', '伤心', '痛苦', '失落', '沮丧', '郁闷', '绝望', '哭', 'sad', 'unhappy', 'depressed', 'grief', 'sorrow', 'miserable', 'heartbroken'],
    en: ['sad', 'unhappy', 'depressed', 'grief', 'sorrow', 'miserable', 'heartbroken', 'down', 'blue', 'gloomy'],
    weight: 75,
  },
  excited: {
    zh: ['兴奋', '激动', '激动人心', '期待', '兴奋不已', '兴奋', 'excited', 'thrilled', 'eager', 'enthused'],
    en: ['excited', 'thrilled', 'eager', 'enthusiastic', 'pumped', 'stoked', 'fired up'],
    weight: 80,
  },
  exhausted: {
    zh: ['疲惫', '累', '困', '疲倦', '累死了', '没精神', '筋疲力尽', 'exhausted', 'tired', 'sleepy', 'fatigue', 'weary', 'drained'],
    en: ['exhausted', 'tired', 'sleepy', 'fatigue', 'weary', 'drained', 'spent', 'worn out'],
    weight: 65,
  },
  unknown: {
    zh: [],
    en: [],
    weight: 0,
  },
};

// Intensity modifiers based on text patterns
const INTENSITY_PATTERNS = {
  veryHigh: [/太\s*棒了|超级|非常|极其|十分|very\s*much|extremely|incredibly|absolutely/, 20],
  high: [/!{2,}|！{2,}/, 15],
  question: [/[?？]{2,}/, 5],  // questions slightly reduce positive emotions
  negation: [/不|没|不是|无|no|not|never|don't|doesn't|didn't|won't|wouldn't/, -10],
};

/**
 * Detect emotion from text content using keyword matching
 */
export function detectTextEmotion(text: string): { emotion: TextEmotion; intensity: number; matchedKeywords: string[] } {
  if (!text || text.trim().length === 0) {
    return { emotion: 'unknown', intensity: 0, matchedKeywords: [] };
  }

  const lowerText = text.toLowerCase();
  const emotionScores: Record<TextEmotion, { score: number; keywords: string[] }> = {
    happy: { score: 0, keywords: [] },
    calm: { score: 0, keywords: [] },
    anxious: { score: 0, keywords: [] },
    angry: { score: 0, keywords: [] },
    sad: { score: 0, keywords: [] },
    excited: { score: 0, keywords: [] },
    exhausted: { score: 0, keywords: [] },
    unknown: { score: 0, keywords: [] },
  };

  // Score each emotion based on keyword matches
  for (const [emotion, config] of Object.entries(EMOTION_KEYWORDS)) {
    if (emotion === 'unknown') continue;
    const emp = emotion as TextEmotion;
    
    for (const keyword of config.zh) {
      if (lowerText.includes(keyword.toLowerCase())) {
        emotionScores[emp].score += config.weight;
        emotionScores[emp].keywords.push(keyword);
      }
    }
    for (const keyword of config.en) {
      if (lowerText.includes(keyword.toLowerCase())) {
        emotionScores[emp].score += config.weight;
        emotionScores[emp].keywords.push(keyword);
      }
    }
  }

  // Find the emotion with highest score
  let bestEmotion: TextEmotion = 'unknown';
  let bestScore = 0;

  for (const [emotion, data] of Object.entries(emotionScores)) {
    if (emotion === 'unknown') continue;
    if (data.score > bestScore) {
      bestScore = data.score;
      bestEmotion = emotion as TextEmotion;
    }
  }

  // Calculate intensity (0-100) based on score and modifiers
  let intensity = Math.min(100, bestScore);
  
  // Apply intensity modifiers
  for (const [pattern, modifier] of Object.entries(INTENSITY_PATTERNS)) {
    const [regex] = pattern.startsWith('very') 
      ? [INTENSITY_PATTERNS.veryHigh]
      : pattern === 'high'
      ? [INTENSITY_PATTERNS.high]
      : pattern === 'question'
      ? [INTENSITY_PATTERNS.question]
      : [INTENSITY_PATTERNS.negation];
    
    if ((regex[0] as RegExp).test(text)) {
      intensity = Math.max(0, Math.min(100, intensity + (regex[1] as number)));
    }
  }

  // If no keywords matched, determine from overall sentiment
  if (bestEmotion === 'unknown') {
    // Default to calm for normal conversational text
    const avgLength = text.length;
    if (avgLength > 0) {
      return { emotion: 'calm', intensity: 30, matchedKeywords: [] };
    }
    return { emotion: 'unknown', intensity: 0, matchedKeywords: [] };
  }

  return {
    emotion: bestEmotion,
    intensity: Math.max(10, Math.min(100, intensity)), // At least 10 if detected
    matchedKeywords: emotionScores[bestEmotion].keywords,
  };
}

/**
 * Create an emotion log entry
 */
export function createEmotionLogEntry(
  text: string,
  messageId?: string,
  source: 'text' | 'voice' = 'text'
): EmotionLogEntry {
  const { emotion, intensity, matchedKeywords } = detectTextEmotion(text);
  
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    emotion,
    intensity,
    context: matchedKeywords.length > 0 
      ? matchedKeywords.slice(0, 3).join(', ') 
      : text.slice(0, 50),
    messageId,
    source,
  };
}

/**
 * Get emoji for TextEmotion
 */
export function getTextEmotionEmoji(emotion: TextEmotion): string {
  const emojis: Record<TextEmotion, string> = {
    happy: '😄',
    calm: '😌',
    anxious: '😰',
    angry: '😠',
    sad: '😢',
    excited: '🎉',
    exhausted: '😴',
    unknown: '😐',
  };
  return emojis[emotion];
}

/**
 * Get label for TextEmotion
 */
export function getTextEmotionLabel(emotion: TextEmotion, t: (key: string) => string): string {
  const labels: Record<TextEmotion, string> = {
    happy: t('emotion.happy'),
    calm: t('emotion.calm'),
    anxious: t('emotion.anxious'),
    angry: t('emotion.angry'),
    sad: t('emotion.sad'),
    excited: t('emotion.excited'),
    exhausted: t('emotion.exhausted'),
    unknown: t('emotion.unknown'),
  };
  return labels[emotion];
}

/**
 * Get color for TextEmotion (for charts/UI)
 */
export function getTextEmotionColor(emotion: TextEmotion): string {
  const colors: Record<TextEmotion, string> = {
    happy: '#FFD700',    // gold
    calm: '#4CAF50',      // green
    anxious: '#FF9800',   // orange
    angry: '#F44336',     // red
    sad: '#2196F3',       // blue
    excited: '#E91E63',   // pink
    exhausted: '#9E9E9E', // grey
    unknown: '#757575',   // dark grey
  };
  return colors[emotion];
}

/**
 * Group emotion logs by date
 */
export function groupEmotionLogsByDate(logs: EmotionLogEntry[]): Record<string, EmotionLogEntry[]> {
  const grouped: Record<string, EmotionLogEntry[]> = {};
  
  for (const log of logs) {
    const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(log);
  }
  
  // Sort each day's entries by timestamp descending
  for (const dateKey of Object.keys(grouped)) {
    grouped[dateKey].sort((a, b) => b.timestamp - a.timestamp);
  }
  
  return grouped;
}

/**
 * Calculate emotion distribution (for pie chart data)
 */
export function calculateEmotionDistribution(logs: EmotionLogEntry[]): Record<TextEmotion, number> {
  const distribution: Record<TextEmotion, number> = {
    happy: 0,
    calm: 0,
    anxious: 0,
    angry: 0,
    sad: 0,
    excited: 0,
    exhausted: 0,
    unknown: 0,
  };
  
  for (const log of logs) {
    distribution[log.emotion]++;
  }
  
  return distribution;
}

/**
 * Check if negative emotion persists for more than threshold days (for P1 emotion alerts)
 */
export function checkPersistentNegativeEmotion(logs: EmotionLogEntry[], thresholdDays = 3): boolean {
  const now = Date.now();
  const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;
  const cutoff = now - thresholdMs;
  
  const negativeEmotions: TextEmotion[] = ['anxious', 'angry', 'sad'];
  const recentNegatives = logs.filter(
    log => log.timestamp > cutoff && negativeEmotions.includes(log.emotion)
  );
  
  // Check if there are negative emotions on at least thresholdDays separate days
  const negativeDays = new Set(
    recentNegatives.map(log => new Date(log.timestamp).toISOString().split('T')[0])
  );
  
  return negativeDays.size >= thresholdDays;
}
