/**
 * V90: Personality Engine - Personality vector management and evolution
 * Handles personality trait changes based on conversation content
 */

import type {
  PersonalityVector,
  PersonaEvolution,
  PersonalityEvolutionConfig,
  PersonalityChangeRequest,
  DEFAULT_EVOLUTION_CONFIG,
} from './v90Types';
import { addEvolution, getEvolutionsForPersona, getLatestEvolution, confirmEvolution } from './memoryStore';
import { DEFAULT_PERSONALITY_VECTOR } from './v90Types';

const DEFAULT_CONFIG = {
  minDeltaThreshold: 5,
  maxDeltaPerInteraction: 3,
  snapshotIntervalDays: 7,
  requireUserConfirmation: true,
};

// =============================================================================
// Vector Operations
// =============================================================================

export function createPersonalityVector(partial?: Partial<PersonalityVector>): PersonalityVector {
  return { ...DEFAULT_PERSONALITY_VECTOR, ...partial };
}

export function clonePersonalityVector(v: PersonalityVector): PersonalityVector {
  return { ...v };
}

/**
 * Calculate the difference between two personality vectors
 */
export function calculateVectorDelta(
  current: PersonalityVector,
  proposed: PersonalityVector
): Partial<PersonalityVector> {
  return {
    openness: proposed.openness - current.openness,
    conscientiousness: proposed.conscientiousness - current.conscientiousness,
    extraversion: proposed.extraversion - current.extraversion,
    agreeableness: proposed.agreeableness - current.agreeableness,
    stability: proposed.stability - current.stability,
    humor: proposed.humor - current.humor,
    empathy: proposed.empathy - current.empathy,
    creativity: proposed.creativity - current.creativity,
  };
}

/**
 * Calculate the magnitude of a personality change
 */
export function calculateChangeMagnitude(delta: Partial<PersonalityVector>): number {
  let sum = 0;
  for (const value of Object.values(delta)) {
    if (value !== undefined) {
      sum += value * value;
    }
  }
  return Math.sqrt(sum);
}

/**
 * Apply a delta to a personality vector, clamped to 0-100
 */
export function applyDelta(
  vector: PersonalityVector,
  delta: Partial<PersonalityVector>,
  maxChange = DEFAULT_CONFIG.maxDeltaPerInteraction
): PersonalityVector {
  const result = { ...vector };
  for (const [key, value] of Object.entries(delta)) {
    if (value !== undefined) {
      const clampedDelta = Math.max(-maxChange, Math.min(maxChange, value));
      (result as any)[key] = Math.max(0, Math.min(100, Math.round((result as any)[key] + clampedDelta)));
    }
  }
  return result;
}

/**
 * Check if two vectors are approximately equal
 */
export function vectorsApproximatelyEqual(
  a: PersonalityVector,
  b: PersonalityVector,
  threshold = 1
): boolean {
  for (const key of Object.keys(a)) {
    if (Math.abs((a as any)[key] - (b as any)[key]) > threshold) {
      return false;
    }
  }
  return true;
}

// =============================================================================
// Evolution Analysis
// =============================================================================

/**
 * Analyze conversation content to detect personality trait influences
 * Returns proposed changes to personality vector
 */
export function analyzeConversationForPersonality(
  conversationSummary: string,
  currentVector: PersonalityVector
): Partial<PersonalityVector> {
  const changes: Partial<PersonalityVector> = {};
  const lowerContent = conversationSummary.toLowerCase();

  // Openness: learning, exploring new ideas
  if (lowerContent.includes('学习') || lowerContent.includes('探索') || lowerContent.includes('好奇')) {
    changes.openness = 1;
  }

  // Conscientiousness: planning, organizing, completing tasks
  if (lowerContent.includes('计划') || lowerContent.includes('完成') || lowerContent.includes('组织')) {
    changes.conscientiousness = 1;
  }

  // Extraversion: socializing, expressing excitement
  if (lowerContent.includes('兴奋') || lowerContent.includes('社交') || lowerContent.includes('朋友')) {
    changes.extraversion = 1;
  }

  // Agreeableness: empathy, helping, supporting
  if (lowerContent.includes('理解') || lowerContent.includes('帮助') || lowerContent.includes('支持')) {
    changes.agreeableness = 1;
  }

  // Stability: emotional regulation, calm responses
  if (lowerContent.includes('冷静') || lowerContent.includes('平静') || lowerContent.includes('理性')) {
    changes.stability = 1;
  }

  // Humor: jokes, wit, playful responses
  if (lowerContent.includes('笑话') || lowerContent.includes('幽默') || lowerContent.includes('有趣')) {
    changes.humor = 1;
  }

  // Empathy: understanding emotions, compassionate responses
  if (lowerContent.includes('感受') || lowerContent.includes('理解你的感受') || lowerContent.includes('心疼')) {
    changes.empathy = 1;
  }

  // Creativity: brainstorming, innovative ideas
  if (lowerContent.includes('创意') || lowerContent.includes('想象') || lowerContent.includes('新想法')) {
    changes.creativity = 1;
  }

  // Negative changes (personality decrease in traits)
  if (lowerContent.includes('放弃') || lowerContent.includes('逃避')) {
    changes.conscientiousness = -1;
  }
  if (lowerContent.includes('冷漠') || lowerContent.includes('不理')) {
    changes.agreeableness = -1;
    changes.empathy = -1;
  }

  return changes;
}

/**
 * Create a personality change request based on analysis
 */
export function createChangeRequest(
  currentVector: PersonalityVector,
  proposedVector: PersonalityVector,
  trigger: string,
  confidence = 0.7
): PersonalityChangeRequest {
  const delta = calculateVectorDelta(currentVector, proposedVector);
  const magnitude = calculateChangeMagnitude(delta);

  return {
    currentVector,
    proposedVector,
    delta,
    trigger,
    confidence,
    reasoning: generateChangeReasoning(delta, trigger),
  };
}

/**
 * Generate a human-readable description of personality changes
 */
export function generateChangeReasoning(delta: Partial<PersonalityVector>, trigger: string): string {
  const changes: string[] = [];

  for (const [trait, change] of Object.entries(delta)) {
    if (change === undefined || Math.abs(change) < 1) continue;

    const traitLabels: Record<string, string> = {
      openness: '开放性',
      conscientiousness: '尽责性',
      extraversion: '外向性',
      agreeableness: '宜人性',
      stability: '稳定性',
      humor: '幽默感',
      empathy: '共情能力',
      creativity: '创造力',
    };

    const label = traitLabels[trait] ?? trait;
    if (change > 0) {
      changes.push(`${label}提升`);
    } else {
      changes.push(`${label}下降`);
    }
  }

  if (changes.length === 0) {
    return '人格特质无显著变化';
  }

  return `由于"${trigger}"，${changes.join('、')}。`;
}

// =============================================================================
// Evolution Lifecycle
// =============================================================================

/**
 * Check if a personality change should be proposed
 */
export function shouldProposeChange(
  delta: Partial<PersonalityVector>,
  config: PersonalityEvolutionConfig = DEFAULT_CONFIG
): boolean {
  const magnitude = calculateChangeMagnitude(delta);
  return magnitude >= config.minDeltaThreshold;
}

/**
 * Propose and record a personality evolution
 */
export async function proposeEvolution(
  personaId: string,
  currentVector: PersonalityVector,
  delta: Partial<PersonalityVector>,
  trigger: string,
  config: PersonalityEvolutionConfig = DEFAULT_CONFIG
): Promise<PersonaEvolution | null> {
  if (!shouldProposeChange(delta, config)) {
    return null;
  }

  const proposedVector = applyDelta(currentVector, delta, config.maxDeltaPerInteraction);
  const evolution = await addEvolution({
    personaId,
    timestamp: Date.now(),
    personalitySnapshot: proposedVector,
    trigger,
    userConfirmed: !config.requireUserConfirmation, // Auto-confirm if not required
    changeDescription: generateChangeReasoning(delta, trigger),
  });

  return evolution;
}

/**
 * Confirm or reject a proposed evolution
 */
export async function confirmPersonalityChange(
  evolutionId: string,
  confirmed: boolean
): Promise<PersonalityVector | null> {
  await confirmEvolution(evolutionId, confirmed);
  if (confirmed) {
    // Evolution confirmed - return the new vector
    const evolutions = Object.values(await getEvolutionsForPersona('')).find((e) => e.id === evolutionId);
    return evolutions?.personalitySnapshot ?? null;
  }
  return null;
}

// =============================================================================
// Evolution Retrieval
// =============================================================================

/**
 * Get the evolution history for a persona
 */
export async function getEvolutionHistory(personaId: string): Promise<PersonaEvolution[]> {
  return getEvolutionsForPersona(personaId);
}

/**
 * Get the current personality vector from the latest confirmed evolution
 */
export async function getCurrentPersonalityVector(personaId: string): Promise<PersonalityVector> {
  const latest = await getLatestEvolution(personaId);
  return latest?.personalitySnapshot ?? DEFAULT_PERSONALITY_VECTOR;
}

/**
 * Get evolution trajectory data for visualization
 */
export async function getEvolutionTrajectory(
  personaId: string
): Promise<Array<{ timestamp: number; vector: PersonalityVector; label: string }>> {
  const evolutions = await getEvolutionsForPersona(personaId);

  return evolutions
    .filter((e) => e.userConfirmed)
    .map((e) => ({
      timestamp: e.timestamp,
      vector: e.personalitySnapshot,
      label: e.changeDescription ?? e.trigger,
    }));
}

// =============================================================================
// Personality Type Calculation
// =============================================================================

/**
 * Calculate a personality type label based on vector values
 */
export function getPersonalityTypeLabel(vector: PersonalityVector): string {
  const traits: Array<{ name: string; value: number }> = [
    { name: '开放', value: vector.openness },
    { name: '尽责', value: vector.conscientiousness },
    { name: '外向', value: vector.extraversion },
    { name: '宜人', value: vector.agreeableness },
    { name: '稳定', value: vector.stability },
  ];

  // Sort by value descending
  traits.sort((a, b) => b.value - a.value);

  // Get top two traits
  const top = traits.slice(0, 2).map((t) => t.name);

  if (vector.humor > 70 && vector.empathy > 70) {
    return '温暖幽默型';
  }
  if (vector.openness > 70 && vector.creativity > 70) {
    return '创意探索型';
  }
  if (vector.agreeableness > 70 && vector.empathy > 70) {
    return '善解人意型';
  }
  if (vector.conscientiousness > 70 && vector.stability > 70) {
    return '沉稳可靠型';
  }
  if (vector.extraversion > 70) {
    return '活泼开朗型';
  }

  return `典型${top.join('-')}型`;
}
