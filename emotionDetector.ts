/**
 * Emotion Detector - Analyzes voice input characteristics to infer user emotion
 * 
 * Uses speech recognition timing and length to estimate:
 * - Speaking rate (chars/sec) as proxy for agitation level
 * - Volume and pitch indicators (when available)
 * 
 * Emotion states:
 * - calm: steady, normal pace
 * - excited: fast + high energy
 * - low_energy: slow pace, low volume
 * - tense: fast + high pitch indicators
 */

export type EmotionState = 'calm' | 'excited' | 'low_energy' | 'tense' | 'unknown';

export interface EmotionResult {
  emotion: EmotionState;
  confidence: number; // 0-1
  metrics: {
    speakingRate: number; // chars per second
    isHighEnergy: boolean;
    isLowEnergy: boolean;
  };
}

// Track speech timing for rate calculation
interface SpeechSegment {
  textLength: number;
  startTime: number;
  endTime: number;
}

const recentSegments: SpeechSegment[] = [];
const MAX_SEGMENTS = 5;

const EMOTION_THRESHOLDS = {
  HIGH_ENERGY_RATE: 5.0,    // chars/sec threshold for "excited"
  LOW_ENERGY_RATE: 1.5,     // chars/sec threshold for "low_energy"
  HIGH_ENERGY_CONFIDENCE: 0.6,
  LOW_ENERGY_CONFIDENCE: 0.5,
};

/**
 * Add a speech segment for analysis
 */
export function addSpeechSegment(transcript: string, durationMs: number): void {
  if (durationMs <= 0 || transcript.length === 0) return;
  
  recentSegments.push({
    textLength: transcript.length,
    startTime: Date.now() - durationMs,
    endTime: Date.now(),
  });
  
  // Keep only recent segments
  while (recentSegments.length > MAX_SEGMENTS) {
    recentSegments.shift();
  }
}

/**
 * Calculate the average speaking rate (chars per second)
 */
function calculateSpeakingRate(): number {
  if (recentSegments.length === 0) return 0;
  
  const totalChars = recentSegments.reduce((sum, s) => sum + s.textLength, 0);
  const totalTime = recentSegments.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  
  if (totalTime <= 0) return 0;
  return (totalChars / totalTime) * 1000; // chars per second
}

/**
 * Detect emotion based on accumulated speech metrics
 */
export function detectEmotion(): EmotionResult {
  const rate = calculateSpeakingRate();
  
  if (rate === 0) {
    return {
      emotion: 'unknown',
      confidence: 0,
      metrics: { speakingRate: 0, isHighEnergy: false, isLowEnergy: false },
    };
  }
  
  let emotion: EmotionState;
  let confidence: number;
  
  if (rate >= EMOTION_THRESHOLDS.HIGH_ENERGY_RATE) {
    emotion = 'excited';
    confidence = Math.min(1, (rate / EMOTION_THRESHOLDS.HIGH_ENERGY_RATE) * EMOTION_THRESHOLDS.HIGH_ENERGY_CONFIDENCE);
  } else if (rate <= EMOTION_THRESHOLDS.LOW_ENERGY_RATE) {
    emotion = 'low_energy';
    confidence = Math.min(1, (EMOTION_THRESHOLDS.LOW_ENERGY_RATE / rate) * EMOTION_THRESHOLDS.LOW_ENERGY_CONFIDENCE);
  } else {
    emotion = 'calm';
    confidence = 0.7;
  }
  
  return {
    emotion,
    confidence,
    metrics: {
      speakingRate: rate,
      isHighEnergy: rate >= EMOTION_THRESHOLDS.HIGH_ENERGY_RATE,
      isLowEnergy: rate <= EMOTION_THRESHOLDS.LOW_ENERGY_RATE,
    },
  };
}

/**
 * Get emotion label with emoji
 */
export function getEmotionLabel(emotion: EmotionState): { emoji: string; label: string } {
  switch (emotion) {
    case 'excited':
      return { emoji: '🎉', label: 'Excited' };
    case 'calm':
      return { emoji: '😌', label: 'Calm' };
    case 'low_energy':
      return { emoji: '😔', label: 'Low Energy' };
    case 'tense':
      return { emoji: '😰', label: 'Tense' };
    default:
      return { emoji: '😐', label: 'Unknown' };
  }
}

/**
 * Clear speech history
 */
export function clearEmotionHistory(): void {
  recentSegments.length = 0;
}

/**
 * Format emotion for system prompt injection
 */
export function formatEmotionContext(emotion: EmotionState, confidence: number): string {
  if (emotion === 'unknown' || confidence < 0.3) {
    return '';
  }
  
  const contextMap: Record<EmotionState, string> = {
    excited: 'user seems excited and energetic',
    calm: 'user seems calm and relaxed',
    low_energy: 'user seems tired or low energy',
    tense: 'user seems nervous or anxious',
    unknown: '',
  };
  
  return `[Emotional Context: ${contextMap[emotion]}]`;
}
