/**
 * V90: Relationship Tracker - User-Persona relationship modeling
 * Tracks relationship stages, intimacy, trust, and shared memories
 */

import type {
  RelationshipLevel,
  RelationshipStage,
  RelationshipMilestone,
  RelationshipConfig,
  DEFAULT_RELATIONSHIP_CONFIG,
} from './v90Types';
import {
  getRelationship,
  saveRelationship,
  getMilestonesForPersona,
  addMilestone,
  unlockMilestone,
  getAllRelationships,
} from './memoryStore';
import { getAllPersonaMemories } from './memoryStore';

const DEFAULT_CONFIG = {
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

// =============================================================================
// Relationship Stage Calculation
// =============================================================================

export function calculateStage(
  intimacy: number,
  trust: number,
  sharedMemories: number,
  config: RelationshipConfig = DEFAULT_CONFIG
): RelationshipStage {
  const thresholds = config.stageThresholds;

  if (
    intimacy >= thresholds.close.intimacy &&
    trust >= thresholds.close.trust &&
    sharedMemories >= thresholds.close.sharedMemories
  ) {
    return 'close';
  }
  if (
    intimacy >= thresholds.friend.intimacy &&
    trust >= thresholds.friend.trust &&
    sharedMemories >= thresholds.friend.sharedMemories
  ) {
    return 'friend';
  }
  if (
    intimacy >= thresholds.acquaintance.intimacy &&
    trust >= thresholds.acquaintance.trust &&
    sharedMemories >= thresholds.acquaintance.sharedMemories
  ) {
    return 'acquaintance';
  }
  return 'stranger';
}

export function getStageLabel(stage: RelationshipStage): string {
  const labels: Record<RelationshipStage, string> = {
    stranger: '陌生人',
    acquaintance: '熟人',
    friend: '朋友',
    close: '挚友',
  };
  return labels[stage];
}

export function getStageDescription(stage: RelationshipStage): string {
  const descriptions: Record<RelationshipStage, string> = {
    stranger: '初次见面，保持礼貌距离',
    acquaintance: '有些了解，但还不够熟悉',
    friend: '已经认识，可以畅所欲言',
    close: '非常亲密，无话不谈',
  };
  return descriptions[stage];
}

export function getStageColor(stage: RelationshipStage): string {
  const colors: Record<RelationshipStage, string> = {
    stranger: '#f44336',
    acquaintance: '#ff9800',
    friend: '#ffeb3b',
    close: '#4caf50',
  };
  return colors[stage];
}

// =============================================================================
// Relationship Operations
// =============================================================================

/**
 * Initialize a relationship for a persona
 */
export async function initializeRelationship(
  personaId: string
): Promise<RelationshipLevel> {
  let relationship = await getRelationship(personaId);
  if (!relationship) {
    relationship = {
      level: 'stranger',
      intimacy: 0,
      trust: 0,
      sharedMemories: 0,
      lastInteractionAt: Date.now(),
      interactionCount: 0,
    };
    await saveRelationship(personaId, relationship);

    // Create initial milestone
    await addMilestone({
      personaId,
      timestamp: Date.now(),
      type: 'first_greeting',
      description: '初次相遇',
      unlocked: true,
    });
  }
  return relationship;
}

/**
 * Record an interaction and update relationship
 */
export async function recordInteraction(
  personaId: string,
  interactionType: keyof typeof DEFAULT_CONFIG.interactionPoints,
  config: RelationshipConfig = DEFAULT_CONFIG
): Promise<RelationshipLevel> {
  const relationship = await initializeRelationship(personaId);
  const points = config.interactionPoints[interactionType];

  if (!points) {
    console.warn(`Unknown interaction type: ${interactionType}`);
    return relationship;
  }

  // Update values
  const newIntimacy = Math.max(0, Math.min(100, relationship.intimacy + points.intimacy));
  const newTrust = Math.max(0, Math.min(100, relationship.trust + points.trust));

  // Count shared memories
  const memories = await getAllPersonaMemories(personaId);
  const sharedMemories = memories.filter(
    (m) => m.importance >= 5
  ).length;

  // Calculate new stage
  const newLevel = calculateStage(newIntimacy, newTrust, sharedMemories, config);

  const updated: RelationshipLevel = {
    level: newLevel,
    intimacy: newIntimacy,
    trust: newTrust,
    sharedMemories,
    lastInteractionAt: Date.now(),
    interactionCount: relationship.interactionCount + 1,
  };

  await saveRelationship(personaId, updated);

  // Check for milestone unlocks
  await checkMilestones(personaId, newLevel, updated);

  return updated;
}

/**
 * Check and unlock milestones based on relationship progress
 */
async function checkMilestones(
  personaId: string,
  newLevel: RelationshipStage,
  relationship: RelationshipLevel
): Promise<void> {
  const milestones = await getMilestonesForPersona(personaId);
  const milestoneTypes = milestones.map((m) => m.type);

  // First secret shared
  if (!milestoneTypes.includes('first_secret') && relationship.trust >= 30) {
    const m = await addMilestone({
      personaId,
      timestamp: Date.now(),
      type: 'first_secret',
      description: '分享了第一个秘密',
      unlocked: true,
    });
  }

  // First conflict
  if (!milestoneTypes.includes('first_conflict') && relationship.intimacy >= 25) {
    const m = await addMilestone({
      personaId,
      timestamp: Date.now(),
      type: 'first_conflict',
      description: '经历了第一次分歧',
      unlocked: true,
    });
  }

  // First support
  if (!milestoneTypes.includes('first_support') && relationship.trust >= 50) {
    const m = await addMilestone({
      personaId,
      timestamp: Date.now(),
      type: 'first_support',
      description: '提供了第一次支持',
      unlocked: true,
    });
  }

  // Deep connection
  if (!milestoneTypes.includes('deep_connection') && newLevel === 'friend') {
    const m = await addMilestone({
      personaId,
      timestamp: Date.now(),
      type: 'deep_connection',
      description: '建立深层连接',
      unlocked: true,
    });
  }

  // Trust built
  if (!milestoneTypes.includes('trust_built') && relationship.trust >= 70) {
    const m = await addMilestone({
      personaId,
      timestamp: Date.now(),
      type: 'trust_built',
      description: '信任坚不可摧',
      unlocked: true,
    });
  }
}

/**
 * Apply decay to relationship when inactive
 */
export async function applyRelationshipDecay(
  personaId: string,
  config: RelationshipConfig = DEFAULT_CONFIG
): Promise<RelationshipLevel | null> {
  const relationship = await getRelationship(personaId);
  if (!relationship) return null;

  const daysSinceInteraction = (Date.now() - relationship.lastInteractionAt) / (1000 * 60 * 60 * 24);

  if (daysSinceInteraction <= config.decayDelayDays) {
    return relationship;
  }

  const weeksInactive = Math.floor((daysSinceInteraction - config.decayDelayDays) / 7);
  const decay = weeksInactive * config.decayRatePerWeek;

  if (decay < 1) return relationship;

  const updated: RelationshipLevel = {
    ...relationship,
    intimacy: Math.max(0, relationship.intimacy - decay),
    trust: Math.max(0, relationship.trust - decay),
    level: calculateStage(
      Math.max(0, relationship.intimacy - decay),
      Math.max(0, relationship.trust - decay),
      relationship.sharedMemories,
      config
    ),
  };

  await saveRelationship(personaId, updated);
  return updated;
}

// =============================================================================
// Relationship Retrieval
// =============================================================================

/**
 * Get the current relationship with a persona
 */
export async function getPersonaRelationship(personaId: string): Promise<RelationshipLevel | null> {
  return getRelationship(personaId);
}

/**
 * Get all relationships
 */
export async function getAllPersonaRelationships(): Promise<
  Array<RelationshipLevel & { personaId: string }>
> {
  return getAllRelationships();
}

/**
 * Get relationship progress towards next stage
 */
export async function getRelationshipProgress(personaId: string): Promise<{
  currentStage: RelationshipStage;
  nextStage: RelationshipStage | null;
  progress: number; // 0-100
  intimacyToNext: number;
  trustToNext: number;
  memoriesToNext: number;
}> {
  const relationship = await getRelationship(personaId);
  if (!relationship) {
    return {
      currentStage: 'stranger',
      nextStage: 'acquaintance',
      progress: 0,
      intimacyToNext: 20,
      trustToNext: 15,
      memoriesToNext: 3,
    };
  }

  const thresholds = DEFAULT_CONFIG.stageThresholds;
  const stages: RelationshipStage[] = ['stranger', 'acquaintance', 'friend', 'close'];
  const currentIdx = stages.indexOf(relationship.level);

  if (currentIdx === stages.length - 1) {
    return {
      currentStage: 'close',
      nextStage: null,
      progress: 100,
      intimacyToNext: 0,
      trustToNext: 0,
      memoriesToNext: 0,
    };
  }

  const nextStage = stages[currentIdx + 1];
  const next = thresholds[nextStage];

  const intimacyProgress = Math.max(0, Math.min(100,
    ((relationship.intimacy - thresholds[relationship.level].intimacy) /
      (next.intimacy - thresholds[relationship.level].intimacy)) * 100
  ));
  const trustProgress = Math.max(0, Math.min(100,
    ((relationship.trust - thresholds[relationship.level].trust) /
      (next.trust - thresholds[relationship.level].trust)) * 100
  ));
  const memoryProgress = Math.max(0, Math.min(100,
    ((relationship.sharedMemories - thresholds[relationship.level].sharedMemories) /
      (next.sharedMemories - thresholds[relationship.level].sharedMemories)) * 100
  ));

  const progress = Math.round((intimacyProgress + trustProgress + memoryProgress) / 3);

  return {
    currentStage: relationship.level,
    nextStage,
    progress,
    intimacyToNext: Math.max(0, next.intimacy - relationship.intimacy),
    trustToNext: Math.max(0, next.trust - relationship.trust),
    memoriesToNext: Math.max(0, next.sharedMemories - relationship.sharedMemories),
  };
}

// =============================================================================
// Dialogue Style Based on Relationship
// =============================================================================

/**
 * Get dialogue style adjustments based on relationship level
 */
export function getDialogueStyleAdjustments(relationship: RelationshipLevel): {
  formality: 'formal' | 'casual' | 'intimate';
  emojiFrequency: 'low' | 'medium' | 'high';
  greetingLength: 'short' | 'medium' | 'long';
  topics: 'safe' | 'varied' | 'personal';
} {
  switch (relationship.level) {
    case 'stranger':
      return {
        formality: 'formal',
        emojiFrequency: 'low',
        greetingLength: 'short',
        topics: 'safe',
      };
    case 'acquaintance':
      return {
        formality: 'casual',
        emojiFrequency: 'medium',
        greetingLength: 'medium',
        topics: 'varied',
      };
    case 'friend':
      return {
        formality: 'casual',
        emojiFrequency: 'high',
        greetingLength: 'medium',
        topics: 'personal',
      };
    case 'close':
      return {
        formality: 'intimate',
        emojiFrequency: 'high',
        greetingLength: 'long',
        topics: 'personal',
      };
  }
}
