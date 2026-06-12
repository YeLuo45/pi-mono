/**
 * PixelPal V22 - ProactiveCareEngine
 * 深度个性化学习系统 - 主动关怀引擎
 * 
 * 4 trigger scenarios + cooldown + night mode + daily cap
 */

import { useStore } from '../../store';
import { userBehaviorPredictor, type BehaviorState } from './userBehaviorPredictor';

// ===== Type Definitions =====

export type CareScenario = 
  | 'inactivity'       // User was idle for too long
  | 'low_mood'         // User detected in low mood
  | 'long_focus'       // User has been focused for too long (burnout prevention)
  | 'social_isolation'; // User has been alone/isolated for extended period

export interface CareAction {
  id: string;
  scenario: CareScenario;
  message: string;           // The care message to show
  messageZh: string;         // Chinese version
  priority: number;         // 1-5 (higher = more important)
  cooldownMinutes: number;  // Minutes before same scenario can trigger again
  isNightAllowed: boolean;   // Whether to show during night mode
  dailyCap: number;         // Max times this scenario can trigger per day
}

export interface CareTriggerRecord {
  scenario: CareScenario;
  timestamp: number;
  triggered: boolean;       // Whether the action was actually shown (not blocked by cap/cooldown)
}

export interface ProactiveCareState {
  enabled: boolean;
  nightModeEnabled: boolean;
  nightStartHour: number;    // Default 22 (10 PM)
  nightEndHour: number;      // Default 7 (7 AM)
  scenarioCooldowns: Record<CareScenario, number>; // Last triggered timestamp
  scenarioDailyCounts: Record<CareScenario, number>; // Counts for today
  scenarioDailyResetDate: string; // Date string for daily reset (YYYY-MM-DD)
  triggerHistory: CareTriggerRecord[];
  pendingAction: CareAction | null;
}

// ===== Care Action Definitions =====

const CARE_ACTIONS: CareAction[] = [
  // Inactivity - gentle reminder after 15+ minutes of idle
  {
    id: 'inactivity_break',
    scenario: 'inactivity',
    message: "Hey! You've been quiet for a while. Want to take a short break or chat about anything?",
    messageZh: "嘿！你已经沉默了一会儿啦。要不要休息一下，或者聊聊天？",
    priority: 3,
    cooldownMinutes: 30,
    isNightAllowed: false,
    dailyCap: 8,
  },
  {
    id: 'inactivity_water',
    scenario: 'inactivity',
    message: "Don't forget to stay hydrated! 💧 A glass of water might be nice right now.",
    messageZh: "记得喝水哦！💧 现在来杯水是个不错的主意~",
    priority: 2,
    cooldownMinutes: 45,
    isNightAllowed: false,
    dailyCap: 6,
  },
  // Low mood - supportive messages
  {
    id: 'low_mood_comfort',
    scenario: 'low_mood',
    message: "I sense you might not be feeling your best. I'm here if you want to talk, no pressure at all.",
    messageZh: "我感觉到你可能心情不太好。如果想聊聊我随时都在，不说话也没关系的~",
    priority: 5,
    cooldownMinutes: 60,
    isNightAllowed: true,
    dailyCap: 10,
  },
  {
    id: 'low_mood_encourage',
    scenario: 'low_mood',
    message: "Rough days happen to everyone. Remember, you're doing better than you think! 🌟",
    messageZh: "每个人都有不顺的时候。记住，你比自己想象的做得更好！🌟",
    priority: 4,
    cooldownMinutes: 120,
    isNightAllowed: true,
    dailyCap: 6,
  },
  // Long focus - prevent burnout
  {
    id: 'focus_burnout',
    scenario: 'long_focus',
    message: "You've been focused for a while! Consider taking a 5-minute break to stretch and rest your eyes.",
    messageZh: "你已经专注很久了！要不要休息5分钟，伸伸懒腰、让眼睛放松一下？",
    priority: 3,
    cooldownMinutes: 40,
    isNightAllowed: false,
    dailyCap: 6,
  },
  {
    id: 'focus_posture',
    scenario: 'long_focus',
    message: "Time for a quick posture check! Sit up straight, roll your shoulders. Your body will thank you. 😊",
    messageZh: "来检查一下姿势吧！坐直一点，耸耸肩。你的身体会感谢你的~ 😊",
    priority: 2,
    cooldownMinutes: 60,
    isNightAllowed: false,
    dailyCap: 4,
  },
  // Social isolation
  {
    id: 'isolation_reachout',
    scenario: 'social_isolation',
    message: "It's been a while since we had a fun chat! Want to play a quick game or just hang out?",
    messageZh: "我们好久没开心地聊天了！想玩个小游戏或者随便聊聊吗？",
    priority: 3,
    cooldownMinutes: 180,
    isNightAllowed: true,
    dailyCap: 4,
  },
  {
    id: 'isolation_share',
    scenario: 'social_isolation',
    message: "I'd love to hear about your day! What's something interesting that happened recently?",
    messageZh: "我想听听你今天过得怎么样！最近有什么有趣的事吗？",
    priority: 2,
    cooldownMinutes: 120,
    isNightAllowed: true,
    dailyCap: 5,
  },
];

// ===== Helper Functions =====

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function isNightTime(nightStart: number, nightEnd: number): boolean {
  const hour = new Date().getHours();
  if (nightStart > nightEnd) {
    // Overnight night mode (e.g., 22:00 to 07:00)
    return hour >= nightStart || hour < nightEnd;
  }
  return hour >= nightStart && hour < nightEnd;
}

function shouldResetDailyCount(savedDate: string): boolean {
  return savedDate !== getTodayDateString();
}

function canTriggerScenario(
  scenario: CareScenario,
  lastTriggered: number,
  todayCount: number,
  cap: number,
  isNight: boolean,
  action: CareAction
): boolean {
  const now = Date.now();
  const cooldownMs = action.cooldownMinutes * 60 * 1000;

  // Check daily cap
  if (todayCount >= cap) return false;

  // Check cooldown
  if (now - lastTriggered < cooldownMs) return false;

  // Check night mode
  if (isNight && !action.isNightAllowed) return false;

  return true;
}

// ===== ProactiveCareEngine Class =====

class ProactiveCareEngine {
  private state: ProactiveCareState;
  private readonly STORAGE_KEY = 'pixelpal_proactive_care_v22';
  private focusStartTime: number | null = null;
  private readonly focusThresholdMs = 30 * 60 * 1000; // 30 minutes
  private isolationStartTime: number | null = null;
  private readonly isolationThresholdMs = 2 * 60 * 60 * 1000; // 2 hours
  private lastBehaviorState: BehaviorState = 'unknown';

  constructor() {
    this.state = this.loadState();
    this.startMonitoring();
  }

  private loadState(): ProactiveCareState {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProactiveCareState;
        // Reset daily counts if it's a new day
        if (shouldResetDailyCount(parsed.scenarioDailyResetDate)) {
          parsed.scenarioDailyCounts = { inactivity: 0, low_mood: 0, long_focus: 0, social_isolation: 0 };
          parsed.scenarioDailyResetDate = getTodayDateString();
        }
        return parsed;
      }
    } catch {}
    return this.getDefaultState();
  }

  private getDefaultState(): ProactiveCareState {
    return {
      enabled: true,
      nightModeEnabled: true,
      nightStartHour: 22,
      nightEndHour: 7,
      scenarioCooldowns: { inactivity: 0, low_mood: 0, long_focus: 0, social_isolation: 0 },
      scenarioDailyCounts: { inactivity: 0, low_mood: 0, long_focus: 0, social_isolation: 0 },
      scenarioDailyResetDate: getTodayDateString(),
      triggerHistory: [],
      pendingAction: null,
    };
  }

  private saveState(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch {}
  }

  private startMonitoring(): void {
    // Check behavior state every 30 seconds
    setInterval(() => this.evaluateScenarios(), 30000);
  }

  /** Evaluate all scenarios and trigger if conditions met */
  private evaluateScenarios(): void {
    if (!this.state.enabled) return;

    const prediction = userBehaviorPredictor.getPrediction();
    const currentState = prediction.state;
    const features = prediction.features;
    const now = Date.now();

    // Check daily reset
    if (shouldResetDailyCount(this.state.scenarioDailyResetDate)) {
      this.state.scenarioDailyCounts = { inactivity: 0, low_mood: 0, long_focus: 0, social_isolation: 0 };
      this.state.scenarioDailyResetDate = getTodayDateString();
    }

    const isNight = isNightTime(this.state.nightStartHour, this.state.nightEndHour);

    // === Scenario 1: Inactivity ===
    if (currentState === 'idle' && features.idleTimeSeconds > 300) {
      this.tryTrigger('inactivity', isNight);
    }

    // === Scenario 2: Low mood ===
    if (currentState === 'low_mood') {
      this.tryTrigger('low_mood', isNight);
    }

    // === Scenario 3: Long focus (track consecutive focus) ===
    if (currentState === 'focused') {
      if (this.focusStartTime === null) {
        this.focusStartTime = now;
      } else if (now - this.focusStartTime > this.focusThresholdMs) {
        this.tryTrigger('long_focus', isNight);
        this.focusStartTime = now; // Reset after triggering
      }
    } else {
      this.focusStartTime = null; // Reset when not focused
    }

    // === Scenario 4: Social isolation ===
    if (currentState === 'resting' || currentState === 'idle') {
      if (this.isolationStartTime === null) {
        this.isolationStartTime = now;
      } else if (now - this.isolationStartTime > this.isolationThresholdMs) {
        this.tryTrigger('social_isolation', isNight);
        this.isolationStartTime = now;
      }
    } else if (currentState === 'social') {
      this.isolationStartTime = null; // Reset on social activity
    }

    this.lastBehaviorState = currentState;
    this.saveState();
  }

  private tryTrigger(scenario: CareScenario, isNight: boolean): void {
    const now = Date.now();
    const lastTriggered = this.state.scenarioCooldowns[scenario];
    const todayCount = this.state.scenarioDailyCounts[scenario];

    // Find best available action for this scenario
    const availableActions = CARE_ACTIONS
      .filter(a => a.scenario === scenario)
      .filter(a => canTriggerScenario(scenario, lastTriggered, todayCount, a.dailyCap, isNight, a))
      .sort((a, b) => b.priority - a.priority);

    if (availableActions.length === 0) return;

    const action = availableActions[0];
    const store = useStore.getState();
    const language = store.language;

    // Record the trigger attempt
    const record: CareTriggerRecord = {
      scenario,
      timestamp: now,
      triggered: true,
    };
    this.state.triggerHistory.push(record);
    if (this.state.triggerHistory.length > 100) {
      this.state.triggerHistory = this.state.triggerHistory.slice(-100);
    }

    // Update counters
    this.state.scenarioCooldowns[scenario] = now;
    this.state.scenarioDailyCounts[scenario]++;

    // Set pending action
    this.state.pendingAction = action;
    this.saveState();

    // Show care message via pet message
    const message = language === 'zh' ? action.messageZh : action.message;
    store.setPetMessage(message);

    // Also create a toast/notification for more visibility
    this.dispatchCareNotification(action, message);

    this.saveState();
  }

  private dispatchCareNotification(action: CareAction, message: string): void {
    // Dispatch custom event for UI components to listen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pixelpal-care-action', {
        detail: { action, message }
      }));
    }
  }

  /** Dismiss current pending care action */
  dismissCurrentAction(): void {
    this.state.pendingAction = null;
    this.saveState();
  }

  /** Get current pending care action */
  getPendingAction(): CareAction | null {
    return this.state.pendingAction;
  }

  /** Manually trigger a care action for a scenario (for testing) */
  triggerManually(scenario: CareScenario): boolean {
    if (!this.state.enabled) return false;
    const isNight = isNightTime(this.state.nightStartHour, this.state.nightEndHour);
    this.tryTrigger(scenario, isNight);
    return this.state.pendingAction !== null;
  }

  /** Enable/disable the care engine */
  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
    this.saveState();
  }

  /** Enable/disable night mode */
  setNightModeEnabled(enabled: boolean): void {
    this.state.nightModeEnabled = enabled;
    this.saveState();
  }

  /** Set night mode hours */
  setNightHours(start: number, end: number): void {
    this.state.nightStartHour = start;
    this.state.nightEndHour = end;
    this.saveState();
  }

  /** Get all scenario counts for today */
  getTodayScenarioCounts(): Record<CareScenario, number> {
    return { ...this.state.scenarioDailyCounts };
  }

  /** Get trigger history */
  getTriggerHistory(minutes?: number): CareTriggerRecord[] {
    if (!minutes) return [...this.state.triggerHistory];
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.state.triggerHistory.filter(r => r.timestamp > cutoff);
  }

  /** Get engine state */
  getState(): ProactiveCareState {
    return { ...this.state };
  }

  /** Check if engine is enabled */
  isEnabled(): boolean {
    return this.state.enabled;
  }
}

// Singleton instance
export const proactiveCareEngine = new ProactiveCareEngine();

// React hook for components
import { useSyncExternalStore } from 'react';

export function useProactiveCareState(): ProactiveCareState {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('pixelpal-care-action', callback as EventListener);
      return () => window.removeEventListener('pixelpal-care-action', callback as EventListener);
    },
    () => proactiveCareEngine.getState(),
    () => proactiveCareEngine.getState()
  );
}

export function usePendingCareAction(): CareAction | null {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('pixelpal-care-action', callback as EventListener);
      return () => window.removeEventListener('pixelpal-care-action', callback as EventListener);
    },
    () => proactiveCareEngine.getPendingAction(),
    () => null
  );
}

export { CARE_ACTIONS };
