/**
 * Memory Scoring Algorithm for PixelPal Companion
 * 
 * Calculates dynamic importance scores for memory entries based on:
 * - Type base weight (user_preference=70, pet_milestone=80, conversation_summary=50, etc.)
 * - Access frequency bonus (+5 per access)
 * - Time decay (-10 points/day after 30 days of no access)
 * - Final score capped at 0-100
 */

import type { MemoryEntry, MemoryType } from './memoryTypes';

// Base weights for each memory type
export const TYPE_BASE_WEIGHTS: Record<MemoryType, number> = {
  user_preference: 70,
  pet_milestone: 80,
  conversation_summary: 50,
  interaction_log: 40,
  fact: 60,
  preference: 55,
  routine: 45,
  custom: 30,
  daily_summary: 50,
  weekly_summary: 50,
  monthly_summary: 50,
  important_event: 80,
};

// Scoring constants
const ACCESS_BONUS = 5;          // Points added per access
const DECAY_RATE = 10;          // Points deducted per day of inactivity
const DECAY_DELAY_DAYS = 30;   // Days before decay starts
const SCORE_CAP_MIN = 0;
const SCORE_CAP_MAX = 100;

/**
 * Calculate the initial importance score for a newly created memory entry
 */
export function calculateInitialScore(type: MemoryType, baseImportance?: number): number {
  const baseWeight = TYPE_BASE_WEIGHTS[type] ?? 50;
  const initial = baseImportance !== undefined 
    ? Math.round((baseImportance / 10) * 100) // Convert old 0-10 scale to 0-100
    : baseWeight;
  return Math.min(SCORE_CAP_MAX, Math.max(SCORE_CAP_MIN, initial));
}

/**
 * Calculate the dynamic importance score for an existing memory entry
 * Takes into account access frequency and time-based decay
 */
export function calculateDynamicScore(entry: MemoryEntry): number {
  // Start with the initial importance score
  let score = entry.importanceScore;

  // Add access bonus: +5 points per access (capped)
  const accessBonus = Math.min(entry.accessCount * ACCESS_BONUS, 50);
  score += accessBonus;

  // Apply time decay if no access for more than DECAY_DELAY_DAYS
  const daysSinceAccess = Math.floor(
    (Date.now() - entry.lastAccessedAt) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceAccess > DECAY_DELAY_DAYS) {
    const decayDays = daysSinceAccess - DECAY_DELAY_DAYS;
    const decay = decayDays * DECAY_RATE;
    score -= decay;
  }

  // Apply importance metadata bonus if present
  if (entry.metadata?.priority === 'high') {
    score += 10;
  } else if (entry.metadata?.priority === 'critical') {
    score += 20;
  }

  // Cap final score
  return Math.min(SCORE_CAP_MAX, Math.max(SCORE_CAP_MIN, Math.round(score)));
}

/**
 * Recalculate importance based on current dynamic score
 * Called when accessing a memory to update its importance
 */
export function recalculateImportance(entry: MemoryEntry): number {
  return calculateDynamicScore(entry);
}

/**
 * Get importance level label from score
 */
export function getImportanceLevel(score: number): 'trivial' | 'low' | 'normal' | 'important' | 'critical' {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'important';
  if (score >= 50) return 'normal';
  if (score >= 30) return 'low';
  return 'trivial';
}

/**
 * Check if a memory should be auto-summarized based on its score
 */
export function shouldAutoSummarize(entry: MemoryEntry): boolean {
  return entry.importanceScore < 30 && entry.accessCount > 10;
}

/**
 * Get all memory types with their base weights for UI display
 */
export function getTypeWeights(): Array<{ type: MemoryType; weight: number; label: string }> {
  const labels: Record<MemoryType, string> = {
    conversation_summary: 'Conversation Summary',
    user_preference: 'User Preference',
    pet_milestone: 'Pet Milestone',
    interaction_log: 'Interaction Log',
    fact: 'Fact',
    preference: 'Preference',
    routine: 'Routine',
    custom: 'Custom',
    daily_summary: 'Daily Summary',
    weekly_summary: 'Weekly Summary',
    monthly_summary: 'Monthly Summary',
    important_event: 'Important Event',
  };

  return Object.entries(TYPE_BASE_WEIGHTS).map(([type, weight]) => ({
    type: type as MemoryType,
    weight,
    label: labels[type as MemoryType],
  }));
}
