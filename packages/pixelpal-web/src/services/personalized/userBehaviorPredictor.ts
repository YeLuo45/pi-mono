/**
 * PixelPal V22 - UserBehaviorPredictor
 * 深度个性化学习系统 - 用户行为预测模块
 * 
 * 6 states: focused | resting | social | low_mood | idle | unknown
 */

import { useStore } from '../../store';

// ===== Type Definitions =====

export type BehaviorState = 'focused' | 'resting' | 'social' | 'low_mood' | 'idle' | 'unknown';

export interface BehaviorFeatures {
  mouseVelocity: number;        // 0-1 normalized
  keystrokeRate: number;        // 0-1 normalized (chars per second / 10)
  scrollFrequency: number;      // 0-1 normalized
  tabSwitchRate: number;        // 0-1 normalized
  idleTimeSeconds: number;      // seconds since last activity
  timeOfDay: number;            // 0-24 hours
  dayOfWeek: number;           // 0-6 (Sunday-Saturday)
  messageCount: number;        // messages in last 5 minutes
  emotionValence: number;      // -1 to 1
  emotionArousal: number;      // 0 to 1
  interactionIntensity: number; // 0-1
  socialActivityScore: number; // 0-1
}

export interface BehaviorPrediction {
  state: BehaviorState;
  confidence: number;          // 0-1
  features: BehaviorFeatures;
  stateHistory: Array<{ state: BehaviorState; timestamp: number; confidence: number }>;
  lastUpdated: number;
}

// ===== State Transition Matrix (simplified Markov model) =====
const TRANSITION_PROBS: Record<BehaviorState, Record<BehaviorState, number>> = {
  focused:     { focused: 0.7, resting: 0.1, social: 0.05, low_mood: 0.05, idle: 0.05, unknown: 0.05 },
  resting:     { focused: 0.1, resting: 0.5, social: 0.15, low_mood: 0.1, idle: 0.1, unknown: 0.05 },
  social:      { focused: 0.05, resting: 0.1, social: 0.6, low_mood: 0.05, idle: 0.1, unknown: 0.1 },
  low_mood:    { focused: 0.05, resting: 0.15, social: 0.05, low_mood: 0.55, idle: 0.1, unknown: 0.1 },
  idle:        { focused: 0.1, resting: 0.2, social: 0.1, low_mood: 0.05, idle: 0.5, unknown: 0.05 },
  unknown:     { focused: 0.15, resting: 0.2, social: 0.15, low_mood: 0.15, idle: 0.15, unknown: 0.2 },
};

// ===== Feature extraction =====

function extractFeatures(): BehaviorFeatures {
  const store = useStore.getState();
  const now = Date.now();
  const idleSeconds = (now - store.lastActivityTime) / 1000;

  // Mouse velocity & keystroke rate derived from activity patterns
  const activityLevel = Math.min(1, 1 / (idleSeconds / 60 + 1)); // 1 = very active, 0 = idle
  
  // Time features
  const nowDate = new Date();
  const hour = nowDate.getHours() + nowDate.getMinutes() / 60;
  const dayOfWeek = nowDate.getDay();

  // Interaction intensity (based on recent message activity)
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  const recentMessages = store.messages.filter(m => m.timestamp > fiveMinutesAgo).length;
  const interactionIntensity = Math.min(1, recentMessages / 10);

  // Emotion features
  const emotion = store.currentEmotion;
  const emotionValenceMap: Record<string, number> = {
    happy: 0.8, calm: 0.3, neutral: 0, anxious: -0.4, sad: -0.6, angry: -0.7, unknown: 0,
  };
  const emotionArousalMap: Record<string, number> = {
    happy: 0.7, calm: 0.2, neutral: 0.3, anxious: 0.9, sad: 0.3, angry: 0.8, unknown: 0.3,
  };
  const emotionValence = emotionValenceMap[emotion] ?? 0;
  const emotionArousal = emotionArousalMap[emotion] ?? 0.3;

  // Social activity score (based on collab session or multi-persona usage)
  const socialScore = store.collabSession.active ? 0.8 : (recentMessages > 3 ? 0.3 : 0.1);

  return {
    mouseVelocity: activityLevel,
    keystrokeRate: Math.min(1, activityLevel * 1.2),
    scrollFrequency: Math.min(1, activityLevel * 0.8),
    tabSwitchRate: 0.1, // Browser tab switches not tracked in this context
    idleTimeSeconds: idleSeconds,
    timeOfDay: hour,
    dayOfWeek,
    messageCount: recentMessages,
    emotionValence,
    emotionArousal,
    interactionIntensity,
    socialActivityScore: socialScore,
  };
}

// ===== State inference =====

function inferStateFromFeatures(features: BehaviorFeatures): { state: BehaviorState; confidence: number } {
  const { idleTimeSeconds, emotionValence, interactionIntensity, socialActivityScore, keystrokeRate } = features;

  // Rule-based inference with weighted scoring
  const scores: Record<BehaviorState, number> = {
    focused: 0,
    resting: 0,
    social: 0,
    low_mood: 0,
    idle: 0,
    unknown: 0,
  };

  // Idle detection
  if (idleTimeSeconds > 300) { // > 5 minutes
    scores.idle += 0.9;
    scores.resting += 0.3;
  } else if (idleTimeSeconds > 120) { // > 2 minutes
    scores.idle += 0.4;
    scores.resting += 0.6;
  } else if (idleTimeSeconds > 60) { // > 1 minute
    scores.resting += 0.3;
  }

  // Focused detection: high keystroke rate, low social, moderate arousal
  if (keystrokeRate > 0.5 && socialActivityScore < 0.3 && interactionIntensity > 0.3) {
    scores.focused += 0.7;
  }

  // Resting detection: moderate activity, low valence (tired), not social
  if (interactionIntensity < 0.3 && socialActivityScore < 0.3 && emotionValence < 0.2) {
    scores.resting += 0.5;
  }

  // Social detection: high social score or collab active
  if (socialActivityScore > 0.5 || interactionIntensity > 0.6) {
    scores.social += 0.7;
  }

  // Low mood detection: negative valence, low interaction
  if (emotionValence < -0.3 && interactionIntensity < 0.4) {
    scores.low_mood += 0.7;
  } else if (emotionValence < -0.5) {
    scores.low_mood += 0.4;
  }

  // Time-of-day modifiers (circadian rhythm influence)
  const hour = features.timeOfDay;
  if (hour >= 23 || hour < 6) {
    // Night time - higher chance of resting/idle
    scores.resting += 0.3;
    scores.idle += 0.2;
  } else if (hour >= 14 && hour <= 16) {
    // Afternoon slump
    scores.resting += 0.2;
  } else if (hour >= 9 && hour <= 12) {
    // Morning peak - more focused
    scores.focused += 0.2;
  }

  // Find highest scoring state
  let maxState: BehaviorState = 'unknown';
  let maxScore = -Infinity;
  for (const [state, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxState = state as BehaviorState;
    }
  }

  // Normalize confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(0.95, maxScore / (totalScore / Object.keys(scores).length + 0.01)) : 0.3;

  return { state: maxState, confidence };
}

// ===== UserBehaviorPredictor class =====

class UserBehaviorPredictor {
  private prediction: BehaviorPrediction;
  private stateHistory: Array<{ state: BehaviorState; timestamp: number; confidence: number }> = [];
  private readonly maxHistoryLength = 50;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private readonly predictionTtlMs = 30000; // Prediction valid for 30 seconds

  constructor() {
    this.prediction = this.computeInitialPrediction();
  }

  private computeInitialPrediction(): BehaviorPrediction {
    const features = extractFeatures();
    const { state, confidence } = inferStateFromFeatures(features);
    const now = Date.now();
    return {
      state,
      confidence,
      features,
      stateHistory: [{ state, timestamp: now, confidence }],
      lastUpdated: now,
    };
  }

  /** Start continuous prediction updates (every 10 seconds) */
  startAutoUpdate(intervalMs = 10000): void {
    if (this.updateInterval) return;
    this.updateInterval = setInterval(() => {
      this.update();
    }, intervalMs);
  }

  /** Stop auto updates */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /** Force a prediction update using current store state */
  update(): BehaviorPrediction {
    const features = extractFeatures();
    const inferred = inferStateFromFeatures(features);

    // Apply Markov transition probability for smoothness
    const prevState = this.prediction.state;
    const transitionProbs = TRANSITION_PROBS[prevState];
    const transitionBias = transitionProbs[inferred.state] ?? 0.1;

    // Blend inferred state with transition probability
    const blendedConfidence = inferred.confidence * 0.7 + transitionBias * 0.3;
    const blendedState = blendedConfidence > 0.4 ? inferred.state : prevState;

    const now = Date.now();
    const newEntry = { state: blendedState, timestamp: now, confidence: blendedConfidence };

    this.stateHistory.push(newEntry);
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory = this.stateHistory.slice(-this.maxHistoryLength);
    }

    this.prediction = {
      state: blendedState,
      confidence: blendedConfidence,
      features,
      stateHistory: [...this.stateHistory],
      lastUpdated: now,
    };

    return this.prediction;
  }

  /** Get current prediction (returns cached if still fresh) */
  getPrediction(): BehaviorPrediction {
    const now = Date.now();
    if (now - this.prediction.lastUpdated > this.predictionTtlMs) {
      return this.update();
    }
    return this.prediction;
  }

  /** Get current behavior state only */
  getCurrentState(): BehaviorState {
    return this.getPrediction().state;
  }

  /** Get confidence of current prediction */
  getConfidence(): number {
    return this.getPrediction().confidence;
  }

  /** Get state history for the last N minutes */
  getRecentStates(minutes = 30): Array<{ state: BehaviorState; timestamp: number; confidence: number }> {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.prediction.stateHistory.filter(h => h.timestamp > cutoff);
  }

  /** Get dominant state in recent history */
  getDominantState(minutes = 30): BehaviorState {
    const recent = this.getRecentStates(minutes);
    if (recent.length === 0) return 'unknown';
    const counts: Record<BehaviorState, number> = { focused: 0, resting: 0, social: 0, low_mood: 0, idle: 0, unknown: 0 };
    for (const h of recent) {
      counts[h.state]++;
    }
    return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as BehaviorState) ?? 'unknown';
  }

  /** Predict next likely state */
  predictNextState(): BehaviorState {
    const current = this.prediction.state;
    const probs = TRANSITION_PROBS[current];
    const entries = Object.entries(probs) as [BehaviorState, number][];
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let rand = Math.random() * total;
    for (const [state, prob] of entries) {
      rand -= prob;
      if (rand <= 0) return state;
    }
    return current;
  }

  /** Get features used in last prediction */
  getFeatures(): BehaviorFeatures {
    return this.prediction.features;
  }

  /** Reset predictor state */
  reset(): void {
    this.stateHistory = [];
    this.prediction = this.computeInitialPrediction();
  }
}

// Singleton instance
export const userBehaviorPredictor = new UserBehaviorPredictor();

// React hook for components
import { useSyncExternalStore } from 'react';

export function useBehaviorState(): BehaviorState {
  return useSyncExternalStore(
    (callback) => {
      const interval = setInterval(() => callback(), 10000);
      return () => clearInterval(interval);
    },
    () => userBehaviorPredictor.getCurrentState(),
    () => 'unknown'
  );
}

export function useBehaviorPrediction(): BehaviorPrediction {
  return useSyncExternalStore(
    (callback) => {
      const interval = setInterval(() => callback(), 10000);
      return () => clearInterval(interval);
    },
    () => userBehaviorPredictor.getPrediction(),
    () => userBehaviorPredictor.getPrediction()
  );
}
