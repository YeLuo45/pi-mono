/**
 * Memory Storage - IndexedDB persistence layer for PixelPal Companion
 * 
 * Uses the `idb` library for a clean Promise-based IndexedDB API.
 * Database: pixelpal-memory, Object stores:
 *   - memories: MemoryEntry[] keyed by id
 *   - meta: { key: string, value: unknown } for schema version, etc.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { MemoryEntry, MemoryQuery, MemoryStats, MemorySummary, MemoryEmotion } from './memoryTypes';
import { MAX_MEMORY_ENTRIES, COMPRESS_KEEP_PER_TYPE } from './memoryTypes';
import { calculateInitialScore, recalculateImportance } from './memoryScoring';
import { memoryEvents } from '../webhook/WebhookService';

const DB_NAME = 'pixelpal-memory';
const DB_VERSION = 2;  // V29: Bump version for emotion field

interface PixelPalMemoryDB extends DBSchema {
  memories: {
    key: string;
    value: MemoryEntry;
    indexes: {
      'by-type': string;
      'by-created': number;
      'by-importance': number;
      'by-accessed': number;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbInstance: IDBPDatabase<PixelPalMemoryDB> | null = null;

// Schema version tracking
const SCHEMA_VERSION_KEY = 'schema_version';
const CURRENT_SCHEMA_VERSION = 2;

/**
 * Generate a short summary from memory content (V29)
 * If content is <= 80 chars, returns as-is
 * Otherwise returns first 80 chars + "..."
 */
export function generateMemorySummary(content: string): string {
  if (content.length <= 80) return content;
  return content.slice(0, 80).trim() + '...';
}

/**
 * Extract keywords from content using simple tokenization (V29)
 * Returns meaningful tokens (2-6 chars) excluding stop words
 */
const MEMORY_STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
  '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '什么', '吗', '吧', '呢', '啊', '哦', '嗯', '噢',
  '他', '她', '它', '们', '这个', '那个', '这样', '那样', '怎么', '为什么', '哪', '哪个', '多少', '几',
  '可以', '可能', '应该', '需要', '想', '知道', '觉得', '感觉', '认为', '希望', '愿意', '能够',
  '来', '去', '这里', '那里', '这边', '那边', '现在', '今天', '明天', '昨天', '时候', '时间',
  '做', '作', '让', '使', '把', '被', '给', '跟', '对', '比', '还', '又', '再', '已', '已经', '正在',
  '如果', '因为', '所以', '但是', '虽然', '然后', '接着', '或者', '还是', '而且', '并且',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
]);

export function extractMemoryKeywords(content: string, maxKeywords = 10): string[] {
  const tokens = content.split(/[\s\n，。、！？,.!?]+/).filter(
    t => t.length >= 2 && t.length <= 6 && !MEMORY_STOP_WORDS.has(t) && /[\u4e00-\u9fa5a-zA-Z]/.test(t)
  );
  const freq: Record<string, number> = {};
  for (const t of tokens) {
    freq[t] = (freq[t] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([w]) => w);
}

/**
 * Initialize (or get) the IndexedDB database instance
 */
export async function getMemoryDB(): Promise<IDBPDatabase<PixelPalMemoryDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PixelPalMemoryDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Memories object store
      if (!db.objectStoreNames.contains('memories')) {
        const store = db.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('by-type', 'type', { unique: false });
        store.createIndex('by-created', 'createdAt', { unique: false });
        store.createIndex('by-importance', 'importance', { unique: false });
        store.createIndex('by-accessed', 'lastAccessedAt', { unique: false });
      }

      // Meta object store for schema version, etc.
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

/**
 * Ensure database schema is up to date
 */
async function ensureSchema(db: IDBPDatabase<PixelPalMemoryDB>): Promise<void> {
  const meta = await db.get('meta', SCHEMA_VERSION_KEY);
  const version = (meta?.value as number) ?? 0;

  if (version < CURRENT_SCHEMA_VERSION) {
    // Future migrations go here
    await db.put('meta', { key: SCHEMA_VERSION_KEY, value: CURRENT_SCHEMA_VERSION });
  }
}

/**
 * Add a new memory entry
 */
export async function addMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount' | 'importanceScore'> & { personaId?: string }): Promise<MemoryEntry> {
  const db = await getMemoryDB();
  await ensureSchema(db);

  const now = Date.now();
  const importanceScore = calculateInitialScore(entry.type, entry.importance);
  const fullEntry: MemoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
    importance: importanceScore, // Use initial score as current importance
    importanceScore,
  };

  await db.put('memories', fullEntry);
  memoryEvents.emit('memory:created', fullEntry);
  return fullEntry;
}

/**
 * Update an existing memory entry
 */
export async function updateMemory(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry | null> {
  const db = await getMemoryDB();
  const existing = await db.get('memories', id);
  if (!existing) return null;

  const updated: MemoryEntry = {
    ...existing,
    ...updates,
    id, // prevent id change
    updatedAt: Date.now(),
  };

  await db.put('memories', updated);
  memoryEvents.emit('memory:updated', updated);
  return updated;
}

/**
 * Delete a memory entry
 */
export async function deleteMemory(id: string): Promise<boolean> {
  const db = await getMemoryDB();
  const existing = await db.get('memories', id);
  if (!existing) return false;
  await db.delete('memories', id);
  return true;
}

/**
 * Get a single memory entry by id (increments accessCount and recalculates score)
 */
export async function getMemory(id: string): Promise<MemoryEntry | null> {
  const db = await getMemoryDB();
  const entry = await db.get('memories', id);
  if (!entry) return null;

  // Recalculate dynamic score and increment access count
  const newImportance = recalculateImportance(entry);
  const updated = {
    ...entry,
    accessCount: entry.accessCount + 1,
    lastAccessedAt: Date.now(),
    importance: newImportance,
  };
  await db.put('memories', updated);
  memoryEvents.emit('memory:accessed', updated);
  return updated;
}

/**
 * Query memories with filters
 */
export async function queryMemories(query: MemoryQuery = {}): Promise<MemoryEntry[]> {
  const db = await getMemoryDB();
  const {
    type,
    tags,
    emotion,
    emotions,
    minImportance,
    maxImportance,
    since,
    startDate,
    endDate,
    keyword,
    personaId,
    limit = 100,
    offset = 0,
  } = query;

  let results = await db.getAllFromIndex('memories', 'by-created');

  // Filter by type
  if (type) {
    results = results.filter((e) => e.type === type);
  }

  // Filter by emotion (V29)
  if (emotion) {
    results = results.filter((e) => e.emotion === emotion);
  }

  // Filter by multiple emotions (V29)
  if (emotions && emotions.length > 0) {
    results = results.filter((e) => e.emotion && emotions.includes(e.emotion));
  }

  // Filter by tags (all tags must match)
  if (tags && tags.length > 0) {
    results = results.filter((e) => tags.every((t) => e.tags.includes(t)));
  }

  // Filter by minimum importance
  if (minImportance !== undefined) {
    results = results.filter((e) => e.importance >= minImportance);
  }

  // Filter by maximum importance
  if (maxImportance !== undefined) {
    results = results.filter((e) => e.importance <= maxImportance);
  }

  // Filter by creation time (since)
  if (since !== undefined) {
    results = results.filter((e) => e.createdAt >= since);
  }

  // Filter by date range
  if (startDate !== undefined) {
    results = results.filter((e) => e.createdAt >= startDate);
  }
  if (endDate !== undefined) {
    results = results.filter((e) => e.createdAt <= endDate);
  }

  // Filter by keyword search
  if (keyword && keyword.trim()) {
    const lowerKeyword = keyword.toLowerCase().trim();
    results = results.filter((e) =>
      e.content.toLowerCase().includes(lowerKeyword) ||
      e.tags.some((t) => t.toLowerCase().includes(lowerKeyword))
    );
  }

  // Filter by personaId
  if (personaId) {
    results = results.filter((e) => e.personaId === personaId);
  }

  // Sort by lastAccessedAt descending (most recently accessed first)
  results.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

  // Apply pagination
  return results.slice(offset, offset + limit);
}

/**
 * Get all memories (full list)
 */
export async function getAllMemories(): Promise<MemoryEntry[]> {
  const db = await getMemoryDB();
  return db.getAll('memories');
}

/**
 * Get memory statistics
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  const db = await getMemoryDB();
  const all = await db.getAll('memories');

  if (all.length === 0) {
    return {
      totalEntries: 0,
      byType: {} as Record<MemoryEntry['type'], number>,
      oldestEntry: null,
      newestEntry: null,
      averageImportance: 0,
    };
  }

  const byType: Record<string, number> = {};
  let totalImportance = 0;
  let oldest: number | null = null;
  let newest: number | null = null;

  for (const entry of all) {
    byType[entry.type] = (byType[entry.type] ?? 0) + 1;
    totalImportance += entry.importance;
    if (oldest === null || entry.createdAt < oldest) oldest = entry.createdAt;
    if (newest === null || entry.createdAt > newest) newest = entry.createdAt;
  }

  return {
    totalEntries: all.length,
    byType: byType as Record<MemoryEntry['type'], number>,
    oldestEntry: oldest,
    newestEntry: newest,
    averageImportance: totalImportance / all.length,
  };
}

/**
 * Get a memory summary for context injection
 */
export async function getMemorySummary(): Promise<MemorySummary> {
  const db = await getMemoryDB();
  const all = await db.getAll('memories');

  // Sort by createdAt descending for recent topics
  const byCreated = [...all].sort((a, b) => b.createdAt - a.createdAt);

  const recentTopics = byCreated
    .filter((e) => e.type === 'conversation_summary')
    .slice(0, 5)
    .map((e) => e.content);

  const userPreferences = byCreated
    .filter((e) => e.type === 'user_preference' || e.type === 'preference')
    .slice(0, 10)
    .map((e) => e.content);

  const petMilestones = byCreated
    .filter((e) => e.type === 'pet_milestone')
    .map((e) => e.content);

  const keyFacts = byCreated
    .filter((e) => e.type === 'fact' && e.importance >= 5)
    .slice(0, 10)
    .map((e) => e.content);

  return {
    recentTopics,
    userPreferences,
    petMilestones,
    keyFacts,
    lastUpdated: Date.now(),
  };
}

/**
 * Build a compact memory context string for system prompt injection
 */
export async function buildMemoryContext(maxLength = 2000): Promise<string> {
  const summary = await getMemorySummary();
  const parts: string[] = [];

  if (summary.keyFacts.length > 0) {
    parts.push(`[USER FACTS]\n${summary.keyFacts.join('\n')}`);
  }

  if (summary.userPreferences.length > 0) {
    parts.push(`[PREFERENCES]\n${summary.userPreferences.join('\n')}`);
  }

  if (summary.recentTopics.length > 0) {
    parts.push(`[RECENT TOPICS]\n${summary.recentTopics.join('\n')}`);
  }

  if (summary.petMilestones.length > 0) {
    parts.push(`[PET MILESTONES]\n${summary.petMilestones.join('\n')}`);
  }

  const context = parts.join('\n\n');
  if (context.length <= maxLength) return context;

  // Truncate if too long
  return context.slice(0, maxLength - 3) + '...';
}

/**
 * Compact memory storage when it exceeds MAX_MEMORY_ENTRIES
 * Keeps high-importance and frequently accessed entries
 */
export async function compactMemory(): Promise<{ removed: number; kept: number }> {
  const db = await getMemoryDB();
  const all = await db.getAll('memories');

  if (all.length <= MAX_MEMORY_ENTRIES) {
    return { removed: 0, kept: all.length };
  }

  // Score each entry: importance * log(accessCount + 1)
  const scored = all.map((e) => ({
    entry: e,
    score: e.importance * Math.log(e.accessCount + 1),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Keep top entries per type (COMPRESS_KEEP_PER_TYPE)
  const typeCount: Record<string, number> = {};
  const toKeep: Set<string> = new Set();

  for (const { entry } of scored) {
    const count = typeCount[entry.type] ?? 0;
    if (count < COMPRESS_KEEP_PER_TYPE) {
      toKeep.add(entry.id);
      typeCount[entry.type] = count + 1;
    }
  }

  // Also always keep entries with importance >= 7
  for (const { entry } of scored) {
    if (entry.importance >= 7) {
      toKeep.add(entry.id);
    }
  }

  // Delete entries not in toKeep
  let removed = 0;
  for (const { entry } of scored) {
    if (!toKeep.has(entry.id)) {
      await db.delete('memories', entry.id);
      removed++;
    }
  }

  return { removed, kept: toKeep.size };
}

/**
 * Clear all memories (use with caution)
 */
export async function clearAllMemories(): Promise<void> {
  const db = await getMemoryDB();
  await db.clear('memories');
}

/**
 * Get memories by type
 */
export async function getMemoriesByType(type: MemoryEntry['type']): Promise<MemoryEntry[]> {
  return queryMemories({ type, limit: 200 });
}
