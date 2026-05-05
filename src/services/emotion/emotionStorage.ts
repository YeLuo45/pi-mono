/**
 * Emotion Storage - Persistence layer for emotion logs using localStorage
 * 
 * Based on PRD: localStorage 持久化，emotionLogs 数组
 * emotionLog table structure: { id, timestamp, emotion, intensity, context, messageId }
 */

import type { EmotionLogEntry, TextEmotion } from './emotionService';

const STORAGE_KEY = 'pixelpal_emotion_logs';
const MAX_LOGS = 1000; // Keep last 1000 entries

/**
 * Get all emotion logs from localStorage
 */
export function getEmotionLogs(): EmotionLogEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const logs = JSON.parse(data) as EmotionLogEntry[];
    // Validate and filter out any corrupted entries
    return logs.filter(log => 
      log.id && 
      log.timestamp && 
      typeof log.emotion === 'string' &&
      typeof log.intensity === 'number'
    );
  } catch (error) {
    console.error('[EmotionStorage] Failed to load emotion logs:', error);
    return [];
  }
}

/**
 * Save emotion logs to localStorage
 */
function saveEmotionLogs(logs: EmotionLogEntry[]): void {
  try {
    // Keep only the most recent entries if exceeds max
    const toSave = logs.slice(-MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('[EmotionStorage] Failed to save emotion logs:', error);
  }
}

/**
 * Add a new emotion log entry
 */
export function addEmotionLog(entry: EmotionLogEntry): void {
  const logs = getEmotionLogs();
  logs.push(entry);
  saveEmotionLogs(logs);
  
  // Dispatch custom event for real-time updates
  window.dispatchEvent(new CustomEvent('emotion:logAdded', { detail: entry }));
}

/**
 * Get emotion logs within a date range
 */
export function getEmotionLogsByDateRange(startDate: Date, endDate: Date): EmotionLogEntry[] {
  const logs = getEmotionLogs();
  const start = startDate.getTime();
  const end = endDate.getTime();
  
  return logs.filter(log => log.timestamp >= start && log.timestamp <= end);
}

/**
 * Get emotion logs for a specific day
 */
export function getEmotionLogsForDay(date: Date): EmotionLogEntry[] {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getEmotionLogsByDateRange(startOfDay, endOfDay);
}

/**
 * Get the most recent emotion log
 */
export function getLatestEmotionLog(): EmotionLogEntry | null {
  const logs = getEmotionLogs();
  if (logs.length === 0) return null;
  return logs[logs.length - 1];
}

/**
 * Get emotion logs for the last N days
 */
export function getRecentEmotionLogs(days: number = 7): EmotionLogEntry[] {
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  const logs = getEmotionLogs();
  return logs.filter(log => log.timestamp >= cutoff);
}

/**
 * Export emotion logs as JSON
 */
export function exportEmotionLogsAsJson(): string {
  const logs = getEmotionLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Export emotion logs as downloadable file
 */
export function downloadEmotionLogs(): void {
  const json = exportEmotionLogsAsJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pixelpal-emotions-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Clear all emotion logs
 */
export function clearEmotionLogs(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('emotion:logsCleared'));
}

/**
 * Delete a specific emotion log entry by ID
 */
export function deleteEmotionLog(id: string): void {
  const logs = getEmotionLogs();
  const filtered = logs.filter(log => log.id !== id);
  saveEmotionLogs(filtered);
}

/**
 * Get emotion logs aggregated by week (for weekly chart)
 * Returns an array of weekly aggregates with start date, avg intensity, and dominant emotion
 */
export function getEmotionLogsByWeek(weeks: number = 4): {
  weekStart: string;
  avgIntensity: number | null;
  dominantEmotion: TextEmotion | null;
  totalCount: number;
}[] {
  const logs = getEmotionLogs();
  const result: {
    weekStart: string;
    avgIntensity: number | null;
    dominantEmotion: TextEmotion | null;
    totalCount: number;
  }[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weekLogs = logs.filter(log => {
      const t = log.timestamp;
      return t >= weekStart.getTime() && t <= weekEnd.getTime();
    });

    if (weekLogs.length === 0) {
      result.push({
        weekStart: weekStart.toISOString().split('T')[0],
        avgIntensity: null,
        dominantEmotion: null,
        totalCount: 0,
      });
    } else {
      const avgIntensity = Math.round(weekLogs.reduce((s, l) => s + l.intensity, 0) / weekLogs.length);
      const emotionCounts: Record<TextEmotion, number> = {} as any;
      for (const l of weekLogs) {
        emotionCounts[l.emotion] = (emotionCounts[l.emotion] || 0) + 1;
      }
      const dominantEmotion = (Object.entries(emotionCounts) as [TextEmotion, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      result.push({
        weekStart: weekStart.toISOString().split('T')[0],
        avgIntensity,
        dominantEmotion,
        totalCount: weekLogs.length,
      });
    }
  }

  return result;
}

/**
 * Get emotion logs for a specific month
 */
export function getEmotionLogsForMonth(year: number, month: number): EmotionLogEntry[] {
  const logs = getEmotionLogs();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return logs.filter(log => {
    const t = log.timestamp;
    return t >= startDate.getTime() && t <= endDate.getTime();
  });
}

/**
 * Get daily aggregates for the last N days (for chart data)
 */
export function getDailyEmotionAggregates(days: number = 30): {
  date: string;
  avgIntensity: number | null;
  maxIntensity: number | null;
  dominantEmotion: TextEmotion | null;
  count: number;
}[] {
  const logs = getEmotionLogs();
  const result: {
    date: string;
    avgIntensity: number | null;
    maxIntensity: number | null;
    dominantEmotion: TextEmotion | null;
    count: number;
  }[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayLogs = logs.filter(log => {
      const t = log.timestamp;
      return t >= date.getTime() && t < nextDate.getTime();
    });

    if (dayLogs.length === 0) {
      result.push({
        date: date.toISOString().split('T')[0],
        avgIntensity: null,
        maxIntensity: null,
        dominantEmotion: null,
        count: 0,
      });
    } else {
      const intensities = dayLogs.map(l => l.intensity);
      const avgIntensity = Math.round(intensities.reduce((s, i) => s + i, 0) / intensities.length);
      const maxIntensity = Math.max(...intensities);

      const emotionCounts: Record<TextEmotion, number> = {} as any;
      for (const l of dayLogs) {
        emotionCounts[l.emotion] = (emotionCounts[l.emotion] || 0) + 1;
      }
      const dominantEmotion = (Object.entries(emotionCounts) as [TextEmotion, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      result.push({
        date: date.toISOString().split('T')[0],
        avgIntensity,
        maxIntensity,
        dominantEmotion,
        count: dayLogs.length,
      });
    }
  }

  return result;
}

/**
 * Get emotion statistics for analytics
 */
export function getEmotionStats(logs: EmotionLogEntry[]): {
  total: number;
  byEmotion: Record<TextEmotion, number>;
  averageIntensity: number;
  mostFrequent: TextEmotion;
  streakDays: number;
} {
  if (logs.length === 0) {
    return {
      total: 0,
      byEmotion: {
        happy: 0, calm: 0, anxious: 0, angry: 0, sad: 0, excited: 0, exhausted: 0, unknown: 0
      },
      averageIntensity: 0,
      mostFrequent: 'unknown',
      streakDays: 0,
    };
  }

  const byEmotion: Record<TextEmotion, number> = {
    happy: 0, calm: 0, anxious: 0, angry: 0, sad: 0, excited: 0, exhausted: 0, unknown: 0
  };
  
  let totalIntensity = 0;
  
  for (const log of logs) {
    byEmotion[log.emotion]++;
    totalIntensity += log.intensity;
  }
  
  const mostFrequent = Object.entries(byEmotion)
    .reduce((max, [emotion, count]) => 
      count > max.count ? { emotion: emotion as TextEmotion, count } : max,
      { emotion: 'unknown' as TextEmotion, count: 0 }
    ).emotion;
  
  // Calculate streak days (consecutive days with logs)
  const uniqueDays = new Set(
    logs.map(log => new Date(log.timestamp).toISOString().split('T')[0])
  );
  const sortedDays = Array.from(uniqueDays).sort().reverse();
  
  let streakDays = 0;
  const today = new Date().toISOString().split('T')[0];
  
  for (let i = 0; i < sortedDays.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedDateStr = expectedDate.toISOString().split('T')[0];
    
    if (sortedDays.includes(expectedDateStr)) {
      streakDays++;
    } else {
      break;
    }
  }
  
  return {
    total: logs.length,
    byEmotion,
    averageIntensity: Math.round(totalIntensity / logs.length),
    mostFrequent,
    streakDays,
  };
}
