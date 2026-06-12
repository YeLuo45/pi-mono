/**
 * V90: Memory Manager - Memory lifecycle management with decay algorithm
 * Handles memory strength decay, retrieval, and importance scoring
 */

import type {
  PersonaMemory,
  MemoryDecayConfig,
  DEFAULT_MEMORY_DECAY_CONFIG,
  MemoryTypeV90,
} from './v90Types';
import {
  getPersonaMemory,
  queryPersonaMemories,
  updatePersonaMemory,
  deletePersonaMemory,
  addPersonaMemory,
} from './memoryStore';

// =============================================================================
// Decay Algorithm Constants
// =============================================================================

const DEFAULT_CONFIG: MemoryDecayConfig = {
  baseDecayPerDay: 0.5,
  decayDelayDays: 14,
  accessBoost: 2,
  maxAccessBoost: 20,
};

// Type-based importance multipliers (higher = decays slower)
const TYPE_IMPORTANCE_MULTIPLIERS: Record<MemoryTypeV90, number> = {
  event: 1.5,      // Events are important, decay slowly
  emotion: 1.8,    // Emotional memories decay very slowly
  preference: 1.2,  // Preferences decay moderately
  fact: 2.0,       // Facts decay very slowly (stable knowledge)
};

// =============================================================================
// Decay Calculation
// =============================================================================

/**
 * Calculate the current strength of a memory based on:
 * - Initial importance
 * - Access count (boosts strength)
 * - Time since last access (decays strength)
 */
export function calculateMemoryStrength(
  memory: PersonaMemory,
  config: MemoryDecayConfig = DEFAULT_CONFIG
): number {
  const now = Date.now();
  const daysSinceAccess = (now - memory.lastAccessedAt) / (1000 * 60 * 60 * 24);
  const daysSinceCreation = (now - memory.createdAt) / (1000 * 60 * 60 * 24);

  // Base strength from importance (0-10 scale)
  let strength = memory.importance * 10; // Convert to 0-100

  // Access boost: logarithmic increase based on access count
  const accessBoost = Math.min(
    config.accessBoost * Math.log(memory.accessCount + 1),
    config.maxAccessBoost
  );
  strength += accessBoost;

  // Type multiplier (important memories decay slower)
  const typeMultiplier = TYPE_IMPORTANCE_MULTIPLIERS[memory.type] ?? 1.0;
  strength *= typeMultiplier / 1.5; // Normalize around 1.0

  // Decay: only applies after decayDelayDays
  if (daysSinceAccess > config.decayDelayDays) {
    const decayDays = daysSinceAccess - config.decayDelayDays;
    const decay = decayDays * config.baseDecayPerDay * typeMultiplier;
    strength = Math.max(0, strength - decay);
  }

  return Math.min(100, Math.max(0, Math.round(strength)));
}

/**
 * Calculate days until a memory decays to a given threshold
 */
export function daysUntilDecayTo(
  memory: PersonaMemory,
  threshold: number = 20,
  config: MemoryDecayConfig = DEFAULT_CONFIG
): number | null {
  const currentStrength = calculateMemoryStrength(memory, config);
  if (currentStrength <= threshold) return 0;

  const typeMultiplier = TYPE_IMPORTANCE_MULTIPLIERS[memory.type] ?? 1.0;
  const effectiveDecayRate = config.baseDecayPerDay * typeMultiplier;
  if (effectiveDecayRate <= 0) return null;

  const decayPerDay = effectiveDecayRate;
  const strengthToLose = currentStrength - threshold;
  return Math.ceil(strengthToLose / decayPerDay);
}

// =============================================================================
// Memory Retrieval with Relevance
// =============================================================================

/**
 * Retrieve memories relevant to a query, with automatic triggering
 * based on keyword matching and conversation context
 */
export async function retrieveRelevantMemories(
  personaId: string,
  query: string,
  options: {
    limit?: number;
    minStrength?: number;
    types?: MemoryTypeV90[];
  } = {}
): Promise<Array<PersonaMemory & { relevanceScore: number; triggerReason?: string }>> {
  const { limit = 10, minStrength = 0, types } = options;

  // Get all memories for persona
  const memories = await queryPersonaMemories({
    personaId,
    ...(types && { tags: types } as any),
    limit: 200,
  });

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/[\s,.!?]+/).filter((w) => w.length > 1);

  const scored: Array<PersonaMemory & { relevanceScore: number; triggerReason?: string }> = [];

  for (const memory of memories) {
    const strength = calculateMemoryStrength(memory);
    if (strength < minStrength) continue;

    let relevanceScore = 0;
    let triggerReason: string | undefined;

    // Content match
    const contentLower = memory.content.toLowerCase();
    const contentMatches = queryWords.filter((w) => contentLower.includes(w));
    if (contentMatches.length > 0) {
      relevanceScore += contentMatches.length * 20;
      triggerReason = `提到"${contentMatches[0]}"`;
    }

    // Tag match
    const tagMatches = memory.tags.filter((t) =>
      queryWords.some((w) => t.toLowerCase().includes(w))
    );
    if (tagMatches.length > 0) {
      relevanceScore += tagMatches.length * 15;
      triggerReason = triggerReason ?? `标签相关: ${tagMatches[0]}`;
    }

    // Type-based relevance for emotion queries
    if (memory.type === 'emotion' && (queryLower.includes('感觉') || queryLower.includes('心情'))) {
      relevanceScore += 25;
      triggerReason = triggerReason ?? '情感记忆';
    }

    // High importance memories get a base boost
    if (memory.importance >= 8) {
      relevanceScore += 10;
    }

    // Recency factor
    const daysSinceAccess = (Date.now() - memory.lastAccessedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 1) relevanceScore += 15;
    else if (daysSinceAccess < 7) relevanceScore += 10;
    else if (daysSinceAccess < 30) relevanceScore += 5;

    if (relevanceScore > 0) {
      scored.push({ ...memory, relevanceScore, triggerReason });
    }
  }

  // Sort by relevance score desc
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return scored.slice(0, limit);
}

/**
 * Get memories that should trigger automatic recall
 */
export async function getTriggeredMemories(
  personaId: string,
  conversationContext: string
): Promise<Array<PersonaMemory & { triggerReason: string }>> {
  const relevant = await retrieveRelevantMemories(personaId, conversationContext, {
    limit: 5,
    minStrength: 30,
  });

  return relevant
    .filter((m) => m.relevanceScore >= 30)
    .map((m) => ({
      ...m,
      triggerReason: m.triggerReason ?? '相关内容',
    }));
}

// =============================================================================
// Memory Weakening (forgetting less important details)
// =============================================================================

/**
 * Apply decay to all memories for a persona (called periodically)
 * Returns count of decayed memories
 */
export async function applyDecayToAllMemories(
  personaId: string
): Promise<{ decayed: number; removed: number }> {
  const memories = await queryPersonaMemories({ personaId, limit: 500 });
  let decayed = 0;
  let removed = 0;

  for (const memory of memories) {
    const strength = calculateMemoryStrength(memory);

    // Remove extremely weak memories (below 5)
    if (strength < 5 && memory.accessCount > 3) {
      await deletePersonaMemory(memory.id);
      removed++;
    } else {
      // Update the stored importance to reflect decay
      const normalizedStrength = Math.round(strength / 10); // Back to 0-10 scale
      await updatePersonaMemory(memory.id, {
        importance: Math.max(0, normalizedStrength),
      });
      decayed++;
    }
  }

  return { decayed, removed };
}

// =============================================================================
// Memory Consolidation
// =============================================================================

/**
 * Consolidate similar memories into a single summary
 * Called when too many similar memories accumulate
 */
export async function consolidateMemories(
  personaId: string,
  type: MemoryTypeV90
): Promise<PersonaMemory | null> {
  const memories = await queryPersonaMemories({ personaId, limit: 50 });

  const sameType = memories.filter((m) => m.type === type);

  if (sameType.length < 5) return null;

  // Find most recent high-importance memory to keep
  const toKeep = sameType.sort((a, b) => {
    const scoreA = a.importance * Math.log(a.accessCount + 1);
    const scoreB = b.importance * Math.log(b.accessCount + 1);
    return scoreB - scoreA;
  })[0];

  // Merge content from others into a summary
  const othersContent = sameType
    .filter((m) => m.id !== toKeep.id)
    .map((m) => m.content)
    .join(' | ');

  if (othersContent.length > 500) {
    const summaryContent = `综合记忆: ${toKeep.content} (另有${sameType.length - 1}条相关记忆)`;
    await updatePersonaMemory(toKeep.id, {
      content: summaryContent,
      importance: Math.min(10, toKeep.importance + 1),
    });

    // Delete the others
    for (const m of sameType) {
      if (m.id !== toKeep.id) {
        await deletePersonaMemory(m.id);
      }
    }

    return (await getPersonaMemory(toKeep.id)) as PersonaMemory;
  }

  return null;
}

// =============================================================================
// Memory Suggestion (for AI context injection)
// =============================================================================

/**
 * Build a memory context string for injecting into AI prompts
 */
export async function buildMemoryContextString(
  personaId: string,
  maxLength = 1500
): Promise<string> {
  const memories = await queryPersonaMemories({ personaId, limit: 50 });

  // Prioritize high-strength memories
  const withStrength = memories.map((m) => ({
    ...m,
    strength: calculateMemoryStrength(m),
  }));

  withStrength.sort((a, b) => b.strength - a.strength);

  const parts: string[] = [];
  let totalLength = 0;

  for (const memory of withStrength) {
    if (memory.strength < 20) continue;

    const typeLabel = {
      event: '📅事件',
      emotion: '💝情感',
      preference: '⭐偏好',
      fact: '📚事实',
    }[memory.type];

    const entry = `${typeLabel} ${memory.content}`;
    const entryLength = entry.length + 2;

    if (totalLength + entryLength > maxLength) break;

    parts.push(entry);
    totalLength += entryLength;
  }

  if (parts.length === 0) return '';

  return `【记忆上下文】\n${parts.join('\n')}`;
}

/**
 * Get a summary of memory statistics for display
 */
export async function getMemoryStatsV90(personaId: string): Promise<{
  totalMemories: number;
  byType: Record<MemoryTypeV90, number>;
  averageStrength: number;
  oldestMemory: number | null;
  newestMemory: number | null;
  highPriorityCount: number;
}> {
  const memories = await queryPersonaMemories({ personaId, limit: 500 });

  const byType: Record<MemoryTypeV90, number> = {
    event: 0,
    emotion: 0,
    preference: 0,
    fact: 0,
  };

  let totalStrength = 0;
  let oldest: number | null = null;
  let newest: number | null = null;
  let highPriorityCount = 0;

  for (const memory of memories) {
    byType[memory.type]++;
    const strength = calculateMemoryStrength(memory);
    totalStrength += strength;

    if (oldest === null || memory.createdAt < oldest) oldest = memory.createdAt;
    if (newest === null || memory.createdAt > newest) newest = memory.createdAt;
    if (memory.importance >= 8 || strength >= 70) highPriorityCount++;
  }

  return {
    totalMemories: memories.length,
    byType,
    averageStrength: memories.length > 0 ? Math.round(totalStrength / memories.length) : 0,
    oldestMemory: oldest,
    newestMemory: newest,
    highPriorityCount,
  };
}
