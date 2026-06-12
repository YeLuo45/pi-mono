/**
 * Emotion Detector - Analyzes speech characteristics to infer emotional state
 * 
 * Uses speaking rate (chars/sec) as the primary emotion proxy:
 * - Fast rate + high volume = excited
 * - Fast rate + high pitch = tense  
 * - Slow rate + low volume = low_energy
 * - Steady rate = calm
 */

export type EmotionState = 'excited' | 'calm' | 'tense' | 'low_energy' | 'unknown';

export interface EmotionResult {
  emotion: EmotionState;
  confidence: number;        // 0-1
  speechRate: number;         // chars per second
  label: string;              // e.g. "😊 兴奋"
  context: string;             // for system prompt injection
  transcript: string;          // original transcript text (V65)
}

// Internal tracking
let recentSegments: Array<{ text: string; durationMs: number; timestamp: number }> = [];

const EMOTION_THRESHOLDS = {
  SPEECH_RATE_FAST: 5.0,      // chars/sec
  SPEESS_RATE_SLOW: 2.0,      // chars/sec
  CONFIDENCE_HIGH: 0.8,
  CONFIDENCE_MEDIUM: 0.5,
};

/**
 * Add a speech segment for analysis
 */
export function addSpeechSegment(text: string, durationMs: number): void {
  const now = Date.now();
  recentSegments.push({ text, durationMs, timestamp: now });
  // Keep only last 10 segments
  if (recentSegments.length > 10) {
    recentSegments = recentSegments.slice(-10);
  }
}

/**
 * Detect emotion from speech characteristics
 */
export function detectEmotion(text: string, durationMs: number): EmotionResult {
  // Clear old segments (older than 30 seconds)
  const now = Date.now();
  recentSegments = recentSegments.filter(s => now - s.timestamp < 30000);

  const speechRate = durationMs > 0 ? (text.length / (durationMs / 1000)) : 0;

  let emotion: EmotionState = 'unknown';
  let confidence = 0.5;

  if (speechRate >= EMOTION_THRESHOLDS.SPEECH_RATE_FAST) {
    // Fast speech = excited or tense
    // Check for exclamation marks or question marks (excitement vs anxiety)
    const hasExclamation = /[!！]/.test(text);
    const hasQuestion = /[?？]/.test(text);
    
    if (hasExclamation || text.length > 50) {
      emotion = 'excited';
      confidence = EMOTION_THRESHOLDS.CONFIDENCE_HIGH;
    } else if (hasQuestion || /[A-Z]/.test(text)) {
      emotion = 'tense';
      confidence = EMOTION_THRESHOLDS.CONFIDENCE_MEDIUM;
    } else {
      emotion = 'excited';
      confidence = EMOTION_THRESHOLDS.CONFIDENCE_MEDIUM;
    }
  } else if (speechRate <= EMOTION_THRESHOLDS.SPEESS_RATE_SLOW) {
    emotion = 'low_energy';
    confidence = text.length < 10 ? EMOTION_THRESHOLDS.CONFIDENCE_MEDIUM : EMOTION_THRESHOLDS.CONFIDENCE_HIGH;
  } else {
    emotion = 'calm';
    confidence = EMOTION_THRESHOLDS.CONFIDENCE_HIGH;
  }

  return {
    emotion,
    confidence,
    speechRate: Math.round(speechRate * 10) / 10,
    label: getEmotionLabel(emotion),
    context: formatEmotionContext(emotion),
    transcript: text,
  };
}

/**
 * Get emoji + text label for emotion
 */
export function getEmotionLabel(emotion: EmotionState): string {
  const labels: Record<EmotionState, string> = {
    excited: '😊 兴奋',
    calm: '😌 平静',
    tense: '😰 紧张',
    low_energy: '😔 低落',
    unknown: '😐 未知',
  };
  return labels[emotion] || labels.unknown;
}

/**
 * Format emotion context string for system prompt injection
 */
export function formatEmotionContext(emotion: EmotionState): string {
  if (emotion === 'unknown') return '';
  const contextMap: Record<EmotionState, string> = {
    excited: 'user seems excited and energetic',
    calm: 'user seems calm and relaxed',
    tense: 'user seems anxious or nervous',
    low_energy: 'user seems tired or low in energy',
    unknown: '',
  };
  return `[Emotional Context: ${contextMap[emotion]}]`;
}

/**
 * Clear emotion history
 */
export function clearEmotionHistory(): void {
  recentSegments = [];
}

// ============================================
// V65: Emotion Curve integration
// ============================================

import type { TextEmotion } from '../emotion/emotionService';

/**
 * V65: Map EmotionState (from voice detection) to TextEmotion (for EmotionCurve)
 * EmotionState: 'excited' | 'calm' | 'tense' | 'low_energy' | 'unknown'
 * TextEmotion:  'happy' | 'calm' | 'anxious' | 'angry' | 'sad' | 'excited' | 'exhausted' | 'unknown'
 * 
 * Mapping:
 * - excited     -> 'excited'
 * - calm        -> 'calm'
 * - tense       -> 'anxious'
 * - low_energy  -> 'exhausted'
 * - unknown     -> 'unknown'
 */
export function mapEmotionStateToTextEmotion(state: EmotionState): TextEmotion {
  const map: Record<EmotionState, TextEmotion> = {
    excited: 'excited',
    calm: 'calm',
    tense: 'anxious',
    low_energy: 'exhausted',
    unknown: 'unknown',
  };
  return map[state];
}

// ============================================
// V28: Emotion Engine Upgrade - Score & Colors
// ============================================

/**
 * Emotion to color mapping for UI visualization
 */
export const emotionColors: Record<string, string> = {
  // Positive emotions
  happy: '#FFEB3B',
  joyful: '#FFEB3B',
  excited: '#FF9800',
  // Neutral emotions
  calm: '#2196F3',
  neutral: '#9E9E9E',
  // Negative emotions
  angry: '#F44336',
  sad: '#9C27B0',
  anxious: '#FF5722',
  fearful: '#673AB7',
  tense: '#FF5722',
  low_energy: '#607D8B',
  // Debate-specific
  concerned: '#FF5722',
  agreeing: '#4CAF50',
  disagreeing: '#F44336',
};

/**
 * Convert emotion string to numeric score (0-100)
 * Higher = more positive, Lower = more negative
 */
export function emotionToScore(emotion: string): number {
  const scores: Record<string, number> = {
    happy: 85,
    joyful: 90,
    excited: 80,
    calm: 60,
    neutral: 50,
    concerned: 35,
    anxious: 40,
    tense: 30,
    fearful: 20,
    sad: 30,
    angry: 15,
    low_energy: 25,
    agreeing: 70,
    disagreeing: 45,
  };
  return scores[emotion.toLowerCase()] ?? 50;
}

/**
 * Get emotion color with fallback
 */
export function getEmotionColor(emotion: string): string {
  return emotionColors[emotion.toLowerCase()] ?? '#9E9E9E';
}
