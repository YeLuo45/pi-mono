/**
 * V156: EvolutionRule - Types for Rules Engine
 * 
 * Defines types for trigger/action based evolution automation rules.
 */

export type TriggerType = 'conversation_count' | 'emotion_spike' | 'time_based' | 'skill_failure' | 'manual';
export type ActionType = 'analyze_patterns' | 'optimize_strategy' | 'crystallize_skill' | 'full_evolution';

export interface EvolutionRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    config: Record<string, unknown>;
  };
  action: {
    type: ActionType;
    config: Record<string, unknown>;
  };
  personalityId?: string;
  cooldownMs: number;
  lastTriggered: number;
}

export interface EvolutionContext {
  personalityId: string;
  conversationCount: number;
  emotionLevel: number;
  emotionDelta: number;
  recentSkills: string[];
  recentFailures: string[];
  timestamp: number;
}