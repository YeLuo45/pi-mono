/**
 * Milestone Tracking Service — V35
 * 
 * Tracks and creates milestone memories for persona growth events:
 * - Intimacy level changes (陌生人 → 熟人 → 朋友 → 挚友 → 灵魂伴侣)
 * - Active day milestones (7-day, 30-day, 100-day marks)
 * 
 * Milestones are stored as MemoryEntry with type='important_event' and tags=['milestone', ...].
 */

import { addMemory, queryMemories } from '../memory/memoryStorage';
import type { MemoryEntry } from '../memory/memoryTypes';
import { useStore } from '../../store';

// ============================================================================
// LocalStorage keys
// ============================================================================

const PREV_LEVEL_KEY = (personaId: string) => `milestone_prevLevel_${personaId}`;
const CREATED_KEY = (personaId: string) => `milestone_created_${personaId}`;

// ============================================================================
// Intimacy level helpers
// ============================================================================

export function getIntimacyLevelName(intimacy: number): string {
  if (intimacy < 20) return '陌生人';
  if (intimacy < 40) return '熟人';
  if (intimacy < 60) return '朋友';
  if (intimacy < 80) return '挚友';
  return '灵魂伴侣';
}

// ============================================================================
// Core milestone creation
// ============================================================================

/**
 * Create a milestone memory entry and persist to IndexedDB.
 */
export async function createMilestone(
  personaId: string,
  content: string,
  tags: string[] = []
): Promise<MemoryEntry> {
  const entry = await addMemory({
    type: 'important_event',
    content,
    importance: 70,
    tags: ['milestone', ...tags],
    personaId,
  });
  
  // Track created milestone IDs in localStorage
  const created: string[] = JSON.parse(localStorage.getItem(CREATED_KEY(personaId)) || '[]');
  created.push(entry.id);
  localStorage.setItem(CREATED_KEY(personaId), JSON.stringify(created));
  
  return entry;
}

// ============================================================================
// Icon resolution
// ============================================================================

/**
 * Returns an emoji icon based on milestone content keywords.
 */
export function getMilestoneIcon(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('初次见面') || lower.includes('first')) return '🚀';
  if (lower.includes('亲密度') || lower.includes('intimacy') || lower.includes('level')) return '⬆️';
  if (lower.includes('100天') || lower.includes('100 day')) return '🏆';
  if (lower.includes('30天') || lower.includes('30 day')) return '🎉';
  if (lower.includes('7天') || lower.includes('7 day')) return '📅';
  if (lower.includes('协作') || lower.includes('collab')) return '🤝';
  if (lower.includes('第一次') || lower.includes('first')) return '⭐';
  return '🎊';
}

// ============================================================================
// Milestone checking
// ============================================================================

/**
 * Check and create milestone memories for a persona.
 * 
 * Checks:
 * 1. Intimacy level change → creates level-up milestone
 * 2. Active day milestones (7-day, 30-day, 100-day) → creates day milestone
 */
export async function checkAndCreateMilestones(personaId: string): Promise<void> {
  const { personaIntimacy, messages } = useStore.getState();
  
  // --- 1. Intimacy level change ---
  const currentIntimacy = personaIntimacy[personaId] ?? 0;
  const prevLevel = parseInt(localStorage.getItem(PREV_LEVEL_KEY(personaId)) || '0', 10);
  
  // Only create milestone if intimacy changed meaningfully (crossed a level threshold)
  // Level thresholds: 20, 40, 60, 80, 100
  const crossedLevel = (
    (prevLevel < 20 && currentIntimacy >= 20) ||
    (prevLevel < 40 && currentIntimacy >= 40) ||
    (prevLevel < 60 && currentIntimacy >= 60) ||
    (prevLevel < 80 && currentIntimacy >= 80) ||
    (prevLevel < 100 && currentIntimacy >= 100)
  );
  
  if (crossedLevel && currentIntimacy > prevLevel) {
    const levelName = getIntimacyLevelName(currentIntimacy);
    const prevLevelName = getIntimacyLevelName(prevLevel);
    const content = `亲密度提升：${prevLevelName} → ${levelName}（${currentIntimacy}）`;
    await createMilestone(personaId, content, ['intimacy-up', `level-${currentIntimacy}`]);
    localStorage.setItem(PREV_LEVEL_KEY(personaId), String(Math.floor(currentIntimacy)));
  } else if (prevLevel === 0 && currentIntimacy > 0) {
    // First time tracking — store current level without creating milestone
    localStorage.setItem(PREV_LEVEL_KEY(personaId), String(Math.floor(currentIntimacy)));
  }
  
  // --- 2. Active day milestones ---
  const personaMessages = messages.filter((m) => m.personaId === personaId);
  if (personaMessages.length === 0) return;
  
  const firstMessage = personaMessages.reduce(( earliest, m) =>
    m.timestamp < earliest.timestamp ? m : earliest
  );
  
  const dayMs = 24 * 60 * 60 * 1000;
  const activeDays = Math.floor((Date.now() - firstMessage.timestamp) / dayMs);
  
  // Get already-created day milestones for this persona
  const created: string[] = JSON.parse(localStorage.getItem(CREATED_KEY(personaId)) || '[]');
  
  // Check 7-day, 30-day, 100-day milestones
  const dayMilestones = [
    { days: 7, tag: 'days-7', label: '7天' },
    { days: 30, tag: 'days-30', label: '30天' },
    { days: 100, tag: 'days-100', label: '100天' },
  ];
  
  for (const milestone of dayMilestones) {
    if (activeDays >= milestone.days && !created.some((id) => id.startsWith(`day-${milestone.days}`))) {
      const content = `与人格相伴${milestone.label}！🌟 活跃天数达到${milestone.days}天`;
      const entry = await createMilestone(personaId, content, [milestone.tag, 'day-milestone']);
      // Tag the entry ID so we can identify it later
      const taggedId = `day-${milestone.days}-${entry.id}`;
      const updatedCreated = created.filter((id) => !id.startsWith(`day-${milestone.days}`));
      updatedCreated.push(taggedId);
      localStorage.setItem(CREATED_KEY(personaId), JSON.stringify(updatedCreated));
    }
  }
}

/**
 * Get all milestone memories for a persona, sorted newest first.
 */
export async function getPersonaMilestones(personaId: string): Promise<MemoryEntry[]> {
  const all = await queryMemories({ personaId, limit: 100 });
  return all
    .filter((m) => m.tags.includes('milestone'))
    .sort((a, b) => b.createdAt - a.createdAt);
}
