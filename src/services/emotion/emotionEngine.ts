/**
 * EmotionEngine - V21 情感计算引擎核心
 * 
 * 多维情感分析引擎，提供：
 * - 对话级情感分析（分析连续多条消息的情感趋势）
 * - 混合情绪识别（主情绪 + 次情绪）
 * - 情感强度计算
 * - 情绪来源归因
 * - 情绪趋势计算
 * 
 * 基于 PRD V21 情感计算引擎规格
 */

import type { Message } from '../../types';
import type { TextEmotion, EmotionLogEntry } from './emotionService';
import { detectTextEmotion, getTextEmotionColor } from './emotionService';

// --- Data Models ---

/** 多维情感分析结果 */
export interface EmotionAnalysis {
  id: string;
  timestamp: number;
  type: 'text' | 'voice' | 'contextual';  // 检测方法
  primary: TextEmotion;                    // 主情绪
  secondary?: TextEmotion;                 // 次情绪（混合情绪）
  intensity: number;                       // 强度 0-100
  confidence: number;                      // 置信度 0-1
  triggers: string[];                      // 情绪触发因素
  messageIds: string[];                    // 关联消息
}

/** 情绪趋势数据 */
export interface EmotionTrend {
  date: string;                            // YYYY-MM-DD
  averageIntensity: number;                // 平均强度 0-100
  dominantEmotion: TextEmotion;            // 主导情绪
  emotionCounts: Record<TextEmotion, number>; // 各情绪计数
  positiveRatio: number;                   // 正面情绪占比 0-1
  negativeRatio: number;                  // 负面情绪占比 0-1
  trend: 'improving' | 'stable' | 'declining';
}

/** 对话上下文 */
export interface ConversationContext {
  recentMessages: Message[];
  timeWindowMs: number;                   // 时间窗口（毫秒）
  userMessageCount: number;               // 用户消息数量
}

// --- Emotion Categories ---

const POSITIVE_EMOTIONS: TextEmotion[] = ['happy', 'excited', 'calm'];
const NEGATIVE_EMOTIONS: TextEmotion[] = ['anxious', 'angry', 'sad', 'exhausted'];
const NEUTRAL_EMOTIONS: TextEmotion[] = ['calm', 'unknown'];

/** 情绪优先级（用于混合情绪中确定主次）*/
const EMOTION_PRIORITY: Record<TextEmotion, number> = {
  angry: 7,     // 高优先级（需要关注）
  anxious: 6,
  sad: 5,
  excited: 4,
  happy: 3,
  exhausted: 2,
  calm: 1,
  unknown: 0,
};

// --- EmotionEngine Class ---

export class EmotionEngine {
  private static instance: EmotionEngine;

  private constructor() {}

  /** 获取单例实例 */
  public static getInstance(): EmotionEngine {
    if (!EmotionEngine.instance) {
      EmotionEngine.instance = new EmotionEngine();
    }
    return EmotionEngine.instance;
  }

  /**
   * 对话级情感分析
   * 分析最近 N 条消息的整体情感趋势
   */
  public analyzeConversation(context: ConversationContext): EmotionAnalysis {
    const { recentMessages, timeWindowMs } = context;
    const now = Date.now();
    
    // Filter messages within time window
    const relevantMessages = recentMessages.filter(
      m => now - m.timestamp <= timeWindowMs && m.role === 'user'
    );

    if (relevantMessages.length === 0) {
      return this.createEmptyAnalysis();
    }

    // Analyze each message
    const analyses: Array<{
      message: Message;
      emotion: TextEmotion;
      intensity: number;
      keywords: string[];
    }> = [];

    for (const msg of relevantMessages) {
      const result = detectTextEmotion(msg.content);
      analyses.push({
        message: msg,
        emotion: result.emotion,
        intensity: result.intensity,
        keywords: result.matchedKeywords,
      });
    }

    // Determine primary emotion (most frequent with highest total intensity)
    const emotionScores: Record<TextEmotion, { count: number; totalIntensity: number }> = {
      happy: { count: 0, totalIntensity: 0 },
      calm: { count: 0, totalIntensity: 0 },
      anxious: { count: 0, totalIntensity: 0 },
      angry: { count: 0, totalIntensity: 0 },
      sad: { count: 0, totalIntensity: 0 },
      excited: { count: 0, totalIntensity: 0 },
      exhausted: { count: 0, totalIntensity: 0 },
      unknown: { count: 0, totalIntensity: 0 },
    };

    let totalIntensity = 0;
    let maxIntensity = 0;
    const allTriggers: string[] = [];

    for (const a of analyses) {
      emotionScores[a.emotion].count++;
      emotionScores[a.emotion].totalIntensity += a.intensity;
      totalIntensity += a.intensity;
      maxIntensity = Math.max(maxIntensity, a.intensity);
      allTriggers.push(...a.keywords);
    }

    // Find primary emotion (highest weighted score: count * avgIntensity)
    let primaryEmotion: TextEmotion = 'unknown';
    let primaryScore = 0;

    for (const [emotion, data] of Object.entries(emotionScores)) {
      if (emotion === 'unknown' || data.count === 0) continue;
      const avgIntensity = data.totalIntensity / data.count;
      const score = data.count * avgIntensity;
      if (score > primaryScore) {
        primaryScore = score;
        primaryEmotion = emotion as TextEmotion;
      }
    }

    // Find secondary emotion (different from primary, significant presence)
    let secondaryEmotion: TextEmotion | undefined;
    let secondaryScore = 0;

    for (const [emotion, data] of Object.entries(emotionScores)) {
      if (emotion === 'unknown' || emotion === primaryEmotion || data.count === 0) continue;
      const avgIntensity = data.totalIntensity / data.count;
      const score = data.count * avgIntensity;
      // Secondary must have at least 30% of primary score and appear at least once
      if (score > secondaryScore && score >= primaryScore * 0.3 && data.count >= 1) {
        secondaryScore = score;
        secondaryEmotion = emotion as TextEmotion;
      }
    }

    // Calculate overall intensity (average of top intensities)
    const avgIntensity = analyses.length > 0 
      ? analyses.reduce((sum, a) => sum + a.intensity, 0) / analyses.length 
      : 0;

    // Calculate confidence based on agreement and sample size
    const primaryCount = emotionScores[primaryEmotion].count;
    const confidence = this.calculateConfidence(analyses.length, primaryCount, maxIntensity);

    return {
      id: crypto.randomUUID(),
      timestamp: now,
      type: 'contextual',
      primary: primaryEmotion,
      secondary: secondaryEmotion,
      intensity: Math.round(avgIntensity),
      confidence,
      triggers: [...new Set(allTriggers)].slice(0, 5), // Dedupe, limit to 5
      messageIds: relevantMessages.map(m => m.id),
    };
  }

  /**
   * 多维情绪检测（单条消息）
   * Returns primary + secondary emotions with intensities
   */
  public detectMultiDimensionalEmotion(text: string): EmotionAnalysis {
    const result = detectTextEmotion(text);
    const { emotion: primary, intensity, matchedKeywords } = result;

    // Detect potential secondary emotion
    let secondary: TextEmotion | undefined;

    // Simple heuristic for secondary detection
    // If we detect a high-intensity positive, check for underlying anxiety
    if (primary === 'excited' && intensity > 80) {
      // Check for mixed excitement + nervousness
      if (/紧张|担心|焦虑|nervous|worried|anxious/i.test(text)) {
        secondary = 'anxious';
      }
    }

    // If we detect happy but with high intensity negation words, might be掩饰
    if (primary === 'happy' && intensity > 70) {
      if (/可是|但是|不过|but|however|though/i.test(text)) {
        secondary = 'anxious'; // Possible hidden concern
      }
    }

    // Calculate confidence based on keyword matches and intensity
    const keywordCount = matchedKeywords.length;
    const confidence = Math.min(1, 0.3 + keywordCount * 0.15 + intensity / 200);

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'text',
      primary,
      secondary,
      intensity,
      confidence: Math.round(confidence * 100) / 100,
      triggers: matchedKeywords.slice(0, 3),
      messageIds: [],
    };
  }

  /**
   * 计算情绪趋势
   * 分析过去 N 天的情绪数据
   */
  public calculateTrend(logs: EmotionLogEntry[], windowDays: number): EmotionTrend[] {
    const now = Date.now();
    const cutoff = now - (windowDays * 24 * 60 * 60 * 1000);
    
    // Filter to window
    const relevantLogs = logs.filter(log => log.timestamp >= cutoff);

    // Group by date
    const byDate = new Map<string, EmotionLogEntry[]>();
    for (const log of relevantLogs) {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, []);
      }
      byDate.get(dateKey)!.push(log);
    }

    // Calculate trend for each day
    const trends: EmotionTrend[] = [];
    const dates = Array.from(byDate.keys()).sort();

    for (const date of dates) {
      const dayLogs = byDate.get(date)!;
      
      // Count emotions
      const emotionCounts: Record<TextEmotion, number> = {
        happy: 0, calm: 0, anxious: 0, angry: 0, sad: 0, excited: 0, exhausted: 0, unknown: 0
      };
      
      let totalIntensity = 0;
      let positiveCount = 0;
      let negativeCount = 0;

      for (const log of dayLogs) {
        emotionCounts[log.emotion]++;
        totalIntensity += log.intensity;
        
        if (POSITIVE_EMOTIONS.includes(log.emotion)) positiveCount++;
        else if (NEGATIVE_EMOTIONS.includes(log.emotion)) negativeCount++;
      }

      const avgIntensity = dayLogs.length > 0 ? totalIntensity / dayLogs.length : 0;
      const total = dayLogs.length;
      
      // Find dominant emotion
      let dominantEmotion: TextEmotion = 'unknown';
      let maxCount = 0;
      for (const [emotion, count] of Object.entries(emotionCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantEmotion = emotion as TextEmotion;
        }
      }

      // Calculate ratios
      const positiveRatio = total > 0 ? positiveCount / total : 0;
      const negativeRatio = total > 0 ? negativeCount / total : 0;

      trends.push({
        date,
        averageIntensity: Math.round(avgIntensity),
        dominantEmotion,
        emotionCounts,
        positiveRatio: Math.round(positiveRatio * 100) / 100,
        negativeRatio: Math.round(negativeRatio * 100) / 100,
        trend: 'stable', // Will be calculated below
      });
    }

    // Calculate trend direction (improving/stable/declining)
    // Based on last 3 days of negative ratio
    if (trends.length >= 3) {
      const recentTrends = trends.slice(-3);
      const recentNegRatio = recentTrends.reduce((sum, t) => sum + t.negativeRatio, 0) / 3;
      
      if (recentNegRatio < 0.3) {
        recentTrends.forEach(t => { t.trend = 'improving'; });
      } else if (recentNegRatio > 0.5) {
        recentTrends.forEach(t => { t.trend = 'declining'; });
      } else {
        recentTrends.forEach(t => { t.trend = 'stable'; });
      }
    }

    return trends;
  }

  /**
   * 判断情绪是否显著变化（从一种情绪骤变为另一种）
   */
  public detectEmotionShift(current: TextEmotion, previous: TextEmotion, intensityThreshold = 30): boolean {
    // Check if emotion category changed significantly
    const currentIsNegative = NEGATIVE_EMOTIONS.includes(current);
    const previousIsNegative = NEGATIVE_EMOTIONS.includes(previous);
    const currentIsPositive = POSITIVE_EMOTIONS.includes(current);
    const previousIsPositive = POSITIVE_EMOTIONS.includes(previous);

    // Major shift: positive -> negative or vice versa
    if (previousIsPositive && currentIsNegative) return true;
    if (previousIsNegative && currentIsPositive) return true;

    // High priority emotion emerged
    const currentPriority = EMOTION_PRIORITY[current];
    const previousPriority = EMOTION_PRIORITY[previous];

    if (currentPriority >= 5 && currentPriority > previousPriority + 2) {
      return true;
    }

    return false;
  }

  /**
   * 获取情绪分析的解释文本
   */
  public getEmotionExplanation(analysis: EmotionAnalysis): string {
    const parts: string[] = [];

    // Primary emotion
    const emotionLabels: Record<TextEmotion, string> = {
      happy: '开心',
      calm: '平静',
      anxious: '焦虑',
      angry: '愤怒',
      sad: '悲伤',
      excited: '兴奋',
      exhausted: '疲惫',
      unknown: '未知',
    };

    parts.push(`主要情绪：${emotionLabels[analysis.primary]}`);
    
    if (analysis.secondary) {
      parts.push(`混合情绪：${emotionLabels[analysis.secondary]}`);
    }

    parts.push(`强度：${analysis.intensity}%`);
    parts.push(`置信度：${Math.round(analysis.confidence * 100)}%`);

    if (analysis.triggers.length > 0) {
      parts.push(`触发词：${analysis.triggers.join(', ')}`);
    }

    return parts.join(' | ');
  }

  // --- Private Helpers ---

  private createEmptyAnalysis(): EmotionAnalysis {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'text',
      primary: 'unknown',
      intensity: 0,
      confidence: 0,
      triggers: [],
      messageIds: [],
    };
  }

  private calculateConfidence(sampleSize: number, primaryCount: number, maxIntensity: number): number {
    // More messages = higher confidence
    const sampleWeight = Math.min(1, sampleSize / 5);
    
    // Higher agreement = higher confidence
    const agreement = sampleSize > 0 ? primaryCount / sampleSize : 0;
    
    // Higher intensity = higher confidence
    const intensityWeight = maxIntensity / 100;

    // Weighted average
    const confidence = (sampleWeight * 0.3) + (agreement * 0.5) + (intensityWeight * 0.2);
    
    return Math.round(Math.min(1, confidence) * 100) / 100;
  }
}

// --- Export singleton helper ---

export const emotionEngine = EmotionEngine.getInstance();
