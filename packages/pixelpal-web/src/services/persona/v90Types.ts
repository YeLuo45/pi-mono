/**
 * V90: Persona Deepening Types
 * Long-term memory, personality evolution, emotional memory, and relationship modeling
 */

// =============================================================================
// 1. 长期记忆 (Long-term Memory)
// =============================================================================

export type MemoryTypeV90 = 'event' | 'preference' | 'fact' | 'emotion';

export interface PersonaMemory {
  id: string;
  personaId: string;
  content: string;
  importance: number; // 0-10
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
  type: MemoryTypeV90;
  /** Emotional tone of this memory */
  emotion?: string;
  /** Associated relationship milestone */
  relationshipMilestone?: string;
}

// =============================================================================
// 2. 人格进化 (Personality Evolution)
// =============================================================================

export interface PersonalityVector {
  openness: number;         // 0-100 开放性
  conscientiousness: number; // 0-100 尽责性
  extraversion: number;      // 0-100 外向性
  agreeableness: number;     // 0-100 宜人性
  stability: number;          // 0-100 稳定性
  humor: number;              // 0-100 幽默感
  empathy: number;            // 0-100 共情能力
  creativity: number;         // 0-100 创造力
}

export interface PersonaEvolution {
  id: string;
  personaId: string;
  timestamp: number;
  personalitySnapshot: PersonalityVector;
  trigger: string;
  userConfirmed: boolean;
  /** Human-readable description of what changed */
  changeDescription?: string;
}

// =============================================================================
// 3. 情感记忆 (Emotional Memory)
// =============================================================================

export interface EmotionalMoment {
  id: string;
  personaId: string;
  timestamp: number;
  content: string;
  emotion: string;           // happy, excited, calm, anxious, angry, sad, moved, grateful
  intensity: number;          // 1-10
  userInitiated: boolean;     // Did user trigger this moment?
  anniversary?: boolean;       // Is this an anniversary to remember?
  anniversaryDate?: number;   // The date to annually remind
  tags: string[];
}

export interface EmotionTrend {
  date: number;
  dominantEmotion: string;
  intensity: number;
  conversationCount: number;
}

// =============================================================================
// 4. 关系建模 (Relationship Modeling)
// =============================================================================

export type RelationshipStage = 'stranger' | 'acquaintance' | 'friend' | 'close';

export interface RelationshipLevel {
  level: RelationshipStage;
  intimacy: number;           // 0-100 亲密度
  trust: number;              // 0-100 信任度
  sharedMemories: number;     // Shared memory count
  lastInteractionAt: number;  // Last meaningful interaction timestamp
  interactionCount: number;   // Total meaningful interactions
}

export interface RelationshipMilestone {
  id: string;
  personaId: string;
  timestamp: number;
  type: 'first_greeting' | 'first_secret' | 'first_conflict' | 'first_support' | 'deep_connection' | 'trust_built';
  description: string;
  unlocked: boolean;
}

// =============================================================================
// 5. Personality Engine Types
// =============================================================================

export interface PersonalityEvolutionConfig {
  /** Minimum delta to trigger a personality change */
  minDeltaThreshold: number;
  /** Maximum delta per interaction */
  maxDeltaPerInteraction: number;
  /** Days between evolution snapshots */
  snapshotIntervalDays: number;
  /** Whether user confirmation is required for changes */
  requireUserConfirmation: boolean;
}

export interface PersonalityChangeRequest {
  currentVector: PersonalityVector;
  proposedVector: PersonalityVector;
  delta: Partial<PersonalityVector>;
  trigger: string;
  confidence: number; // 0-1, how confident the engine is about this change
  reasoning: string;
}

// =============================================================================
// 6. Relationship Engine Types
// =============================================================================

export interface RelationshipConfig {
  /** Thresholds for level transitions */
  stageThresholds: Record<RelationshipStage, { intimacy: number; trust: number; sharedMemories: number }>;
  /** Points earned per interaction type */
  interactionPoints: Record<string, { intimacy: number; trust: number }>;
  /** Days without interaction before decay starts */
  decayDelayDays: number;
  /** Decay rate per week of inactivity */
  decayRatePerWeek: number;
}

// =============================================================================
// 7. Memory Decay Types
// =============================================================================

export interface MemoryDecayConfig {
  /** Base decay rate per day (after initial period) */
  baseDecayPerDay: number;
  /** Days before decay starts */
  decayDelayDays: number;
  /** Importance boost per access */
  accessBoost: number;
  /** Maximum importance boost from access */
  maxAccessBoost: number;
}

export interface MemoryWithDecay extends PersonaMemory {
  currentStrength: number;   // Decay-adjusted strength
  decayRate: number;          // Current decay rate
  lastDecayAt: number;        // Last decay calculation timestamp
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_PERSONALITY_VECTOR: PersonalityVector = {
  openness: 50,
  conscientiousness: 50,
  extraversion: 50,
  agreeableness: 50,
  stability: 50,
  humor: 50,
  empathy: 50,
  creativity: 50,
};

export const DEFAULT_RELATIONSHIP_CONFIG: RelationshipConfig = {
  stageThresholds: {
    stranger: { intimacy: 0, trust: 0, sharedMemories: 0 },
    acquaintance: { intimacy: 20, trust: 15, sharedMemories: 3 },
    friend: { intimacy: 45, trust: 40, sharedMemories: 10 },
    close: { intimacy: 75, trust: 70, sharedMemories: 25 },
  },
  interactionPoints: {
    greeting: { intimacy: 1, trust: 0 },
    deep_conversation: { intimacy: 5, trust: 3 },
    personal_secret: { intimacy: 8, trust: 10 },
    conflict: { intimacy: -3, trust: -5 },
    support: { intimacy: 6, trust: 8 },
    gift: { intimacy: 4, trust: 2 },
    anniversary: { intimacy: 10, trust: 5 },
  },
  decayDelayDays: 7,
  decayRatePerWeek: 2,
};

export const DEFAULT_EVOLUTION_CONFIG: PersonalityEvolutionConfig = {
  minDeltaThreshold: 5,
  maxDeltaPerInteraction: 3,
  snapshotIntervalDays: 7,
  requireUserConfirmation: true,
};

export const DEFAULT_MEMORY_DECAY_CONFIG: MemoryDecayConfig = {
  baseDecayPerDay: 0.5,
  decayDelayDays: 14,
  accessBoost: 2,
  maxAccessBoost: 20,
};
