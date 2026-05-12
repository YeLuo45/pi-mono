/**
 * V90: Memory Store - IndexedDB persistence for Persona memories
 * Handles long-term memory storage and retrieval for the Persona Deepening system
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  PersonaMemory,
  PersonaEvolution,
  EmotionalMoment,
  RelationshipLevel,
  RelationshipMilestone,
  MemoryTypeV90,
  MemoryDecayConfig,
  DEFAULT_MEMORY_DECAY_CONFIG,
} from './v90Types';

const DB_NAME = 'pixelpal-persona-v90';
const DB_VERSION = 1;

interface PersonaV90DB extends DBSchema {
  memories: {
    key: string;
    value: PersonaMemory;
    indexes: {
      'by-persona': string;
      'by-type': string;
      'by-created': number;
      'by-importance': number;
    };
  };
  evolutions: {
    key: string;
    value: PersonaEvolution;
    indexes: {
      'by-persona': string;
      'by-timestamp': number;
    };
  };
  emotions: {
    key: string;
    value: EmotionalMoment;
    indexes: {
      'by-persona': string;
      'by-timestamp': number;
    };
  };
  relationships: {
    key: string;
    value: RelationshipLevel & { personaId: string };
  };
  milestones: {
    key: string;
    value: RelationshipMilestone;
    indexes: {
      'by-persona': string;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

let dbInstance: IDBPDatabase<PersonaV90DB> | null = null;

async function getDB(): Promise<IDBPDatabase<PersonaV90DB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PersonaV90DB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Memories store
      if (!db.objectStoreNames.contains('memories')) {
        const memStore = db.createObjectStore('memories', { keyPath: 'id' });
        memStore.createIndex('by-persona', 'personaId', { unique: false });
        memStore.createIndex('by-type', 'type', { unique: false });
        memStore.createIndex('by-created', 'createdAt', { unique: false });
        memStore.createIndex('by-importance', 'importance', { unique: false });
      }

      // Evolutions store
      if (!db.objectStoreNames.contains('evolutions')) {
        const evoStore = db.createObjectStore('evolutions', { keyPath: 'id' });
        evoStore.createIndex('by-persona', 'personaId', { unique: false });
        evoStore.createIndex('by-timestamp', 'timestamp', { unique: false });
      }

      // Emotions store
      if (!db.objectStoreNames.contains('emotions')) {
        const emoStore = db.createObjectStore('emotions', { keyPath: 'id' });
        emoStore.createIndex('by-persona', 'personaId', { unique: false });
        emoStore.createIndex('by-timestamp', 'timestamp', { unique: false });
      }

      // Relationships store
      if (!db.objectStoreNames.contains('relationships')) {
        db.createObjectStore('relationships', { keyPath: 'personaId' });
      }

      // Milestones store
      if (!db.objectStoreNames.contains('milestones')) {
        const msStore = db.createObjectStore('milestones', { keyPath: 'id' });
        msStore.createIndex('by-persona', 'personaId', { unique: false });
      }

      // Meta store
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// =============================================================================
// Memory Store Operations
// =============================================================================

export async function addPersonaMemory(
  memory: Omit<PersonaMemory, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>
): Promise<PersonaMemory> {
  const db = await getDB();
  const now = Date.now();
  const record: PersonaMemory = {
    ...memory,
    id: crypto.randomUUID(),
    createdAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  };
  await db.put('memories', record);
  return record;
}

export async function updatePersonaMemory(id: string, updates: Partial<PersonaMemory>): Promise<PersonaMemory | null> {
  const db = await getDB();
  const existing = await db.get('memories', id);
  if (!existing) return null;

  const updated: PersonaMemory = {
    ...existing,
    ...updates,
    id,
    lastAccessedAt: Date.now(),
  };
  await db.put('memories', updated);
  return updated;
}

export async function deletePersonaMemory(id: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.get('memories', id);
  if (!existing) return false;
  await db.delete('memories', id);
  return true;
}

export async function getPersonaMemory(id: string): Promise<PersonaMemory | null> {
  const db = await getDB();
  const record = await db.get('memories', id);
  if (!record) return null;

  // Update access stats
  const updated: PersonaMemory = {
    ...record,
    accessCount: record.accessCount + 1,
    lastAccessedAt: Date.now(),
  };
  await db.put('memories', updated);
  return updated;
}

export async function queryPersonaMemories(query: {
  personaId?: string;
  type?: MemoryTypeV90;
  tags?: string[];
  minImportance?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}): Promise<PersonaMemory[]> {
  const db = await getDB();
  let results = await db.getAll('memories');

  if (query.personaId) {
    results = results.filter((m) => m.personaId === query.personaId);
  }
  if (query.type) {
    results = results.filter((m) => m.type === query.type);
  }
  if (query.tags && query.tags.length > 0) {
    results = results.filter((m) => query.tags!.every((t) => m.tags.includes(t)));
  }
  if (query.minImportance !== undefined) {
    results = results.filter((m) => m.importance >= query.minImportance!);
  }
  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    results = results.filter(
      (m) => m.content.toLowerCase().includes(kw) || m.tags.some((t) => t.toLowerCase().includes(kw))
    );
  }

  // Sort by lastAccessedAt desc
  results.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

  const offset = query.offset ?? 0;
  const limit = query.limit ?? 100;
  return results.slice(offset, offset + limit);
}

export async function getAllPersonaMemories(personaId: string): Promise<PersonaMemory[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('memories', 'by-persona', personaId);
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteAllPersonaMemories(personaId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAllFromIndex('memories', 'by-persona', personaId);
  for (const m of all) {
    await db.delete('memories', m.id);
  }
}

// =============================================================================
// Evolution Store Operations
// =============================================================================

export async function addEvolution(evolution: Omit<PersonaEvolution, 'id'>): Promise<PersonaEvolution> {
  const db = await getDB();
  const record: PersonaEvolution = {
    ...evolution,
    id: crypto.randomUUID(),
  };
  await db.put('evolutions', record);
  return record;
}

export async function getEvolutionsForPersona(personaId: string): Promise<PersonaEvolution[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('evolutions', 'by-persona', personaId);
  return all.sort((a, b) => a.timestamp - b.timestamp); // Chronological
}

export async function getLatestEvolution(personaId: string): Promise<PersonaEvolution | null> {
  const evolutions = await getEvolutionsForPersona(personaId);
  return evolutions[evolutions.length - 1] ?? null;
}

export async function confirmEvolution(id: string, confirmed: boolean): Promise<void> {
  const db = await getDB();
  const existing = await db.get('evolutions', id);
  if (existing) {
    existing.userConfirmed = confirmed;
    await db.put('evolutions', existing);
  }
}

export async function deleteEvolution(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('evolutions', id);
}

// =============================================================================
// Emotional Moments Store Operations
// =============================================================================

export async function addEmotionalMoment(moment: Omit<EmotionalMoment, 'id'>): Promise<EmotionalMoment> {
  const db = await getDB();
  const record: EmotionalMoment = {
    ...moment,
    id: crypto.randomUUID(),
  };
  await db.put('emotions', record);
  return record;
}

export async function getEmotionalMoments(personaId: string, limit = 50): Promise<EmotionalMoment[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('emotions', 'by-persona', personaId);
  return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function getUpcomingAnniversaries(personaId: string, daysAhead = 30): Promise<EmotionalMoment[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('emotions', 'by-persona', personaId);
  const now = Date.now();
  const future = now + daysAhead * 24 * 60 * 60 * 1000;

  return all
    .filter((e) => e.anniversary && e.anniversaryDate && e.anniversaryDate >= now && e.anniversaryDate <= future)
    .sort((a, b) => a.anniversaryDate! - b.anniversaryDate!);
}

export async function toggleAnniversary(id: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('emotions', id);
  if (existing) {
    existing.anniversary = !existing.anniversary;
    await db.put('emotions', existing);
  }
}

export async function deleteEmotionalMoment(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('emotions', id);
}

// =============================================================================
// Relationship Store Operations
// =============================================================================

export async function getRelationship(personaId: string): Promise<RelationshipLevel | null> {
  const db = await getDB();
  const record = await db.get('relationships', personaId);
  if (!record) return null;
  const { personaId: _pid, ...level } = record as RelationshipLevel & { personaId: string };
  return level;
}

export async function saveRelationship(personaId: string, relationship: RelationshipLevel): Promise<void> {
  const db = await getDB();
  await db.put('relationships', { ...relationship, personaId });
}

export async function getAllRelationships(): Promise<Array<RelationshipLevel & { personaId: string }>> {
  const db = await getDB();
  return db.getAll('relationships');
}

// =============================================================================
// Milestone Store Operations
// =============================================================================

export async function addMilestone(milestone: Omit<RelationshipMilestone, 'id'>): Promise<RelationshipMilestone> {
  const db = await getDB();
  const record: RelationshipMilestone = {
    ...milestone,
    id: crypto.randomUUID(),
  };
  await db.put('milestones', record);
  return record;
}

export async function getMilestonesForPersona(personaId: string): Promise<RelationshipMilestone[]> {
  const db = await getDB();
  return db.getAllFromIndex('milestones', 'by-persona', personaId);
}

export async function unlockMilestone(id: string): Promise<void> {
  const db = await getDB();
  const existing = await db.get('milestones', id);
  if (existing) {
    existing.unlocked = true;
    await db.put('milestones', existing);
  }
}

// =============================================================================
// Clear All Data for Persona
// =============================================================================

export async function clearAllPersonaData(personaId: string): Promise<void> {
  await deleteAllPersonaMemories(personaId);
  const db = await getDB();

  // Clear evolutions
  const evolutions = await db.getAllFromIndex('evolutions', 'by-persona', personaId);
  for (const e of evolutions) {
    await db.delete('evolutions', e.id);
  }

  // Clear emotions
  const emotions = await db.getAllFromIndex('emotions', 'by-persona', personaId);
  for (const e of emotions) {
    await db.delete('emotions', e.id);
  }

  // Clear relationship
  await db.delete('relationships', personaId);

  // Clear milestones
  const milestones = await db.getAllFromIndex('milestones', 'by-persona', personaId);
  for (const m of milestones) {
    await db.delete('milestones', m.id);
  }
}
