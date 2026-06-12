/**
 * Smart Retrieval Service - Advanced Memory Search with Time Decay and Frequency Weighting
 * 
 * Provides intelligent memory retrieval using:
 * - Time decay: More recent memories are weighted higher
 * - Access frequency: Frequently accessed memories are boosted
 * - Importance scoring: Higher importance memories rank higher
 * - Entity proximity: Memories sharing entities are related
 * - Semantic search: Text similarity matching
 */

import type { MemoryEntry, MemoryQuery } from './memoryTypes';
import { queryMemories, getAllMemories } from './memoryStorage';
import { searchEntities, getRelatedEntities } from './entityGraph';

export interface RetrievalOptions {
  query?: string;
  types?: MemoryEntry['type'][];
  tags?: string[];
  timeDecay?: boolean;
  frequencyBoost?: boolean;
  importanceWeight?: number;
  entityContext?: string;
  limit?: number;
  offset?: number;
  since?: number; // Unix timestamp filter
  minImportance?: number;
}

export interface ScoredMemory {
  memory: MemoryEntry;
  score: number;
  relevance: number;
  recency: number;
  frequency: number;
  boost: number;
}

const DEFAULT_DECAY_HALF_LIFE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const DEFAULT_FREQUENCY_BOOST_THRESHOLD = 5;

/**
 * Calculate time decay factor (exponential decay)
 * Returns value between 0 and 1, where 1 is most recent
 */
export function calculateTimeDecay(createdAt: number, halfLife = DEFAULT_DECAY_HALF_LIFE): number {
  const age = Date.now() - createdAt;
  if (age <= 0) return 1;
  return Math.exp(-0.693 * age / halfLife); // ln(2) ≈ 0.693
}

/**
 * Calculate frequency boost factor
 * More accesses = higher boost, but diminishing returns
 */
export function calculateFrequencyBoost(accessCount: number, threshold = DEFAULT_FREQUENCY_BOOST_THRESHOLD): number {
  if (accessCount <= threshold) return 1;
  return 1 + Math.log((accessCount - threshold) / threshold + 1) * 0.5;
}

/**
 * Calculate importance score (normalized to 0-1)
 */
export function calculateImportanceScore(importance: number): number {
  return importance / 10; // Assuming importance is 0-10
}

/**
 * Text similarity score using simple word overlap
 */
export function calculateTextSimilarity(query: string, content: string): number {
  if (!query.trim()) return 0;

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contentWords = content.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (queryWords.length === 0) return 0;

  const matches = queryWords.filter(w => contentWords.some(cw => cw.includes(w) || w.includes(cw)));
  return matches.length / queryWords.length;
}

/**
 * Entity proximity score - memories sharing entities get a boost
 */
export async function calculateEntityProximity(memory: MemoryEntry, entityIds: string[]): Promise<number> {
  if (!entityIds || entityIds.length === 0) return 1;

  const related = await getRelatedEntities(memory.id);
  const relatedIds = related.map(e => e.id);
  const shared = entityIds.filter(id => relatedIds.includes(id));

  return 1 + (shared.length * 0.1); // 10% boost per shared entity
}

/**
 * Main smart retrieval function - combines all signals into a relevance score
 */
export async function smartRetrieve(options: RetrievalOptions = {}): Promise<ScoredMemory[]> {
  const {
    query = '',
    types,
    tags,
    timeDecay = true,
    frequencyBoost = true,
    importanceWeight = 0.3,
    entityContext,
    limit = 50,
    offset = 0,
    since,
    minImportance = 0,
  } = options;

  // Get entity IDs if entityContext is provided
  let entityIds: string[] = [];
  if (entityContext) {
    const entities = await searchEntities(entityContext);
    entityIds = entities.map(e => e.id);
  }

  // Build query parameters
  const queryParams: MemoryQuery = {
    type: types ? types[0] : undefined,
    tags,
    since,
    minImportance,
    limit: 500, // Get more, then filter/score
    offset: 0,
  };

  // Fetch memories
  let memories = await queryMemories(queryParams);

  // If query is provided, filter by text similarity first
  if (query.trim()) {
    const queryLower = query.toLowerCase();
    memories = memories.filter(m =>
      m.content.toLowerCase().includes(queryLower) ||
      m.tags.some(t => t.toLowerCase().includes(queryLower)) ||
      (m.metadata && JSON.stringify(m.metadata).toLowerCase().includes(queryLower))
    );
  }

  // Score each memory
  const scored: ScoredMemory[] = await Promise.all(
    memories.map(async (memory) => {
      const recency = timeDecay ? calculateTimeDecay(memory.createdAt) : 1;
      const frequency = frequencyBoost ? calculateFrequencyBoost(memory.accessCount) : 1;
      const importance = calculateImportanceScore(memory.importance);
      const relevance = query.trim() ? calculateTextSimilarity(query, memory.content) : 1;
      const entityBoost = await calculateEntityProximity(memory, entityIds);

      // Combined score formula:
      // score = (relevance * recency * frequency * entityBoost) + (importance * importanceWeight)
      const score = (relevance * recency * frequency * entityBoost) + (importance * importanceWeight);

      return {
        memory,
        score,
        relevance,
        recency,
        frequency,
        boost: entityBoost,
      };
    })
  );

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Apply pagination
  return scored.slice(offset, offset + limit);
}

/**
 * Retrieve memories for a specific topic
 */
export async function retrieveByTopic(topic: string, limit = 20): Promise<ScoredMemory[]> {
  return smartRetrieve({
    query: topic,
    tags: [topic],
    timeDecay: true,
    frequencyBoost: true,
    limit,
  });
}

/**
 * Retrieve recent important memories
 */
export async function retrieveRecentImportant(minImportance = 7, limit = 20): Promise<ScoredMemory[]> {
  return smartRetrieve({
    minImportance,
    timeDecay: true,
    frequencyBoost: false,
    limit,
  });
}

/**
 * Retrieve frequently accessed memories
 */
export async function retrieveFrequent(limit = 20): Promise<ScoredMemory[]> {
  const all = await getAllMemories();

  const scored: ScoredMemory[] = all.map(memory => ({
    memory,
    score: memory.accessCount,
    relevance: 1,
    recency: calculateTimeDecay(memory.createdAt),
    frequency: calculateFrequencyBoost(memory.accessCount),
    boost: 1,
  }));

  scored.sort((a, b) => b.frequency - a.frequency);
  return scored.slice(0, limit);
}

/**
 * Contextual retrieval - given current conversation context, retrieve relevant memories
 */
export async function retrieveWithContext(
  contextText: string,
  options: Partial<RetrievalOptions> = {}
): Promise<ScoredMemory[]> {
  return smartRetrieve({
    query: contextText,
    entityContext: contextText,
    timeDecay: true,
    frequencyBoost: true,
    importanceWeight: 0.3,
    limit: options.limit || 20,
    ...options,
  });
}

/**
 * Build a retrieval context string for AI injection
 */
export async function buildRetrievalContext(
  query: string,
  maxLength = 1500
): Promise<string> {
  const results = await smartRetrieve({
    query,
    timeDecay: true,
    frequencyBoost: true,
    importanceWeight: 0.3,
    limit: 10,
  });

  if (results.length === 0) return '';

  const parts: string[] = ['[RETRIEVED MEMORIES]'];

  for (const { memory, score } of results) {
    const age = Math.round((Date.now() - memory.createdAt) / (24 * 60 * 60 * 1000));
    const lines = memory.content.split('\n').slice(0, 3).join(' ');
    parts.push(`[Score: ${score.toFixed(2)} | ${age}d ago | ${memory.type}] ${lines}`);
  }

  const context = parts.join('\n');
  if (context.length <= maxLength) return context;
  return context.slice(0, maxLength - 3) + '...';
}

/**
 * Suggest related topics based on retrieval results
 */
export async function suggestRelatedTopics(query: string, limit = 5): Promise<string[]> {
  const results = await smartRetrieve({
    query,
    timeDecay: false,
    limit: 10,
  });

  const tagCounts = new Map<string, number>();

  for (const { memory } of results) {
    for (const tag of memory.tags) {
      if (!query.toLowerCase().includes(tag.toLowerCase())) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
  }

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Get memory clusters - groups of related memories
 */
export async function getMemoryClusters(): Promise<Array<{
  id: string;
  memories: MemoryEntry[];
  commonTags: string[];
  description: string;
}>> {
  const all = await getAllMemories();
  const clusters: Map<string, MemoryEntry[]> = new Map();
  const clusterDescriptions = new Map<string, string>();

  // Simple clustering by shared tags
  for (const memory of all) {
    if (memory.tags.length === 0) continue;

    const primaryTag = memory.tags[0];
    if (!clusters.has(primaryTag)) {
      clusters.set(primaryTag, []);
      clusterDescriptions.set(primaryTag, `Memories tagged with "${primaryTag}"`);
    }
    clusters.get(primaryTag)!.push(memory);
  }

  return Array.from(clusters.entries())
    .filter(([, memories]) => memories.length >= 2) // Only clusters with 2+ memories
    .map(([tag, memories]) => ({
      id: tag,
      memories: memories.sort((a, b) => b.createdAt - a.createdAt),
      commonTags: [tag],
      description: clusterDescriptions.get(tag) || '',
    }))
    .sort((a, b) => b.memories.length - a.memories.length);
}
