/**
 * Entity Graph - Memory Entity Extraction and Relationship Tracking
 * 
 * Extracts entities from conversations and tracks relationships between them
 * to build a knowledge graph that enables smarter memory retrieval.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { MemoryEntry } from './memoryTypes';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  aliases?: string[];
  memoryIds: string[]; // Memory entries this entity appears in
  firstSeen: number;
  lastSeen: number;
  accessCount: number;
  properties: Record<string, string>; // Extracted properties
  importance: number; // 0-10
}

export type EntityType =
  | 'person'
  | 'place'
  | 'object'
  | 'concept'
  | 'event'
  | 'organization'
  | 'task'
  | 'preference'
  | 'routine'
  | 'custom';

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  strength: number; // 0-1
  memoryIds: string[];
  createdAt: number;
}

export type RelationshipType =
  | 'related_to'
  | 'part_of'
  | 'located_at'
  | 'associated_with'
  | 'prefers'
  | 'created'
  | 'mentioned_in'
  | 'happened_at'
  | 'custom';

export interface EntityGraph {
  entities: Map<string, Entity>;
  relationships: Map<string, Relationship>;
}

// Entity extraction patterns
const ENTITY_PATTERNS: Record<EntityType, RegExp[]> = {
  person: [/(?:my |the |a |an )?(?:friend|brother|sister|mom|dad|mother|father|son|daughter|colleague|teacher|student|coach|boss|coworker|partner|husband|wife)(?:'s)?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi],
  place: [/(?:at|in|to|from|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+(?:city|town|street|office|home|cafe|restaurant|school|university|building|floor|room))?)/gi],
  object: [/(?:the |a |an )?([a-z]+(?:\s+[a-z]+)?)\s+(?:is|was|sitting|lying|placed|located|on|under|behind|near)\b/gi],
  concept: [/(?:the |a |an )?(idea|concept|theory|method|approach|strategy|plan|goal|hobby|interest|passion)(?:\s+of\s+)?([A-Z][a-z]+(?:\s+[a-z]+)?)?/gi],
  event: [/(?:on|in|during|at)\s+(?:the\s+)?(?:last|this|next|past|upcoming)?\s*(birthday|meeting|appointment|conference|trip|vacation|holiday|celebration|party|dinner|lunch|breakfast)/gi],
  organization: [/(?:at|to|from|in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Inc|LLC|Corp|Ltd|Company|Team|Group|University|School|Institute|Organization))?)/gi],
  task: [/(?:need to|must|should|have to|gotta|plan to|going to)\s+(?:finish|complete|do|start|work on|call|email|buy|get|pick up|find|schedule|book|order|check|cancel|postpone)\s+(.+?)(?:\.|,|$)/gi],
  preference: [/(?:like|love|hate|prefer|enjoy|dislike|cant stand|amazing|awesome|great|good|bad|terrible|horrible)\s+(?:to\s+)?(.+?)(?:\.|,|$)/gi],
  routine: [/(?:usually|always|never|sometimes|often|rarely|every day|every week|every month|on weekdays|on weekends|in the morning|in the evening|at night|at noon|at lunch|at dinner)\s+(.+?)(?:\.|,|$)/gi],
  custom: [],
};

const DB_NAME = 'pixelpal-entity-graph';
const DB_VERSION = 1;

interface EntityGraphDB extends DBSchema {
  entities: {
    key: string;
    value: Entity;
    indexes: {
      'by-type': string;
      'by-last-seen': number;
      'by-importance': number;
    };
  };
  relationships: {
    key: string;
    value: Relationship;
    indexes: {
      'by-source': string;
      'by-target': string;
      'by-type': string;
    };
  };
}

let dbInstance: IDBPDatabase<EntityGraphDB> | null = null;

export async function getEntityGraphDB(): Promise<IDBPDatabase<EntityGraphDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<EntityGraphDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('entities')) {
        const entityStore = db.createObjectStore('entities', { keyPath: 'id' });
        entityStore.createIndex('by-type', 'type', { unique: false });
        entityStore.createIndex('by-last-seen', 'lastSeen', { unique: false });
        entityStore.createIndex('by-importance', 'importance', { unique: false });
      }
      if (!db.objectStoreNames.contains('relationships')) {
        const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
        relStore.createIndex('by-source', 'sourceId', { unique: false });
        relStore.createIndex('by-target', 'targetId', { unique: false });
        relStore.createIndex('by-type', 'type', { unique: false });
      }
    },
  });

  return dbInstance;
}

/**
 * Extract entities from text content
 */
export function extractEntitiesFromText(text: string): Array<{ name: string; type: EntityType }> {
  const entities: Array<{ name: string; type: EntityType }> = [];

  for (const [type, patterns] of Object.entries(ENTITY_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          entities.push({
            name: match[1].trim(),
            type: type as EntityType,
          });
        }
      }
    }
  }

  return entities;
}

/**
 * Add memory to entity graph and extract entities
 */
export async function addMemoryToGraph(memory: MemoryEntry): Promise<void> {
  await getEntityGraphDB(); // Ensure DB is initialized
  const extracted = extractEntitiesFromText(memory.content);

  for (const entity of extracted) {
    await upsertEntity(entity.name, entity.type, memory.id);
  }
}

/**
 * Create or update an entity
 */
export async function upsertEntity(
  name: string,
  type: EntityType,
  memoryId: string,
  properties?: Record<string, string>
): Promise<Entity> {
  const db = await getEntityGraphDB();
  const normalizedName = name.toLowerCase().trim();
  const id = `${type}:${normalizedName}`;

  const existing = await db.get('entities', id);
  const now = Date.now();

  const entity: Entity = existing ? {
    ...existing,
    memoryIds: [...new Set([...existing.memoryIds, memoryId])],
    lastSeen: now,
    accessCount: existing.accessCount + 1,
    properties: properties ? { ...existing.properties, ...properties } : existing.properties,
  } : {
    id,
    name: normalizedName,
    type,
    memoryIds: [memoryId],
    firstSeen: now,
    lastSeen: now,
    accessCount: 1,
    properties: properties || {},
    importance: 5,
  };

  await db.put('entities', entity);
  return entity;
}

/**
 * Add a relationship between entities
 */
export async function addRelationship(
  sourceId: string,
  targetId: string,
  type: RelationshipType,
  memoryId?: string
): Promise<Relationship> {
  const db = await getEntityGraphDB();
  const id = `${sourceId}--${type}--${targetId}`;

  const existing = await db.get('relationships', id);
  const now = Date.now();

  const relationship: Relationship = existing ? {
    ...existing,
    strength: Math.min(1, existing.strength + 0.1),
    memoryIds: memoryId ? [...new Set([...existing.memoryIds, memoryId])] : existing.memoryIds,
  } : {
    id,
    sourceId,
    targetId,
    type,
    strength: 0.5,
    memoryIds: memoryId ? [memoryId] : [],
    createdAt: now,
  };

  await db.put('relationships', relationship);
  return relationship;
}

/**
 * Get entity by ID
 */
export async function getEntity(id: string): Promise<Entity | undefined> {
  const db = await getEntityGraphDB();
  return db.get('entities', id);
}

/**
 * Get all entities of a specific type
 */
export async function getEntitiesByType(type: EntityType): Promise<Entity[]> {
  const db = await getEntityGraphDB();
  return db.getAllFromIndex('entities', 'by-type', type);
}

/**
 * Get related entities
 */
export async function getRelatedEntities(entityId: string, depth = 1): Promise<Entity[]> {
  const db = await getEntityGraphDB();
  const related: Entity[] = [];
  const visited = new Set<string>();

  async function fetchRelated(id: string, currentDepth: number) {
    if (currentDepth > depth || visited.has(id)) return;
    visited.add(id);

    const outgoing = await db.getAllFromIndex('relationships', 'by-source', id);
    const incoming = await db.getAllFromIndex('relationships', 'by-target', id);

    for (const rel of [...outgoing, ...incoming]) {
      const otherId = rel.sourceId === id ? rel.targetId : rel.sourceId;
      const entity = await db.get('entities', otherId);
      if (entity && !visited.has(otherId)) {
        related.push(entity);
        await fetchRelated(otherId, currentDepth + 1);
      }
    }
  }

  await fetchRelated(entityId, 0);
  return related;
}

/**
 * Get all relationships for an entity
 */
export async function getEntityRelationships(entityId: string): Promise<Relationship[]> {
  const db = await getEntityGraphDB();
  const outgoing = await db.getAllFromIndex('relationships', 'by-source', entityId);
  const incoming = await db.getAllFromIndex('relationships', 'by-target', entityId);
  return [...outgoing, ...incoming];
}

/**
 * Search entities by name
 */
export async function searchEntities(query: string, limit = 20): Promise<Entity[]> {
  const db = await getEntityGraphDB();
  const all = await db.getAll('entities');
  const normalizedQuery = query.toLowerCase();

  return all
    .filter(e => e.name.includes(normalizedQuery) || e.aliases?.some(a => a.toLowerCase().includes(normalizedQuery)))
    .sort((a, b) => b.importance - a.importance || b.accessCount - a.accessCount)
    .slice(0, limit);
}

/**
 * Get entity statistics
 */
export async function getEntityStats(): Promise<{
  totalEntities: number;
  byType: Record<EntityType, number>;
  totalRelationships: number;
  mostConnected: Entity[];
}> {
  const db = await getEntityGraphDB();
  const entities = await db.getAll('entities');
  const relationships = await db.getAll('relationships');

  const byType: Record<EntityType, number> = {} as Record<EntityType, number>;
  for (const entity of entities) {
    byType[entity.type] = (byType[entity.type] || 0) + 1;
  }

  // Calculate connection count
  const connectionCount = new Map<string, number>();
  for (const rel of relationships) {
    connectionCount.set(rel.sourceId, (connectionCount.get(rel.sourceId) || 0) + 1);
    connectionCount.set(rel.targetId, (connectionCount.get(rel.targetId) || 0) + 1);
  }

  const mostConnected = entities
    .map(e => ({ ...e, connections: connectionCount.get(e.id) || 0 }))
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  return {
    totalEntities: entities.length,
    byType,
    totalRelationships: relationships.length,
    mostConnected,
  };
}

/**
 * Clear entity graph
 */
export async function clearEntityGraph(): Promise<void> {
  const db = await getEntityGraphDB();
  await db.clear('entities');
  await db.clear('relationships');
}

/**
 * Merge entity (when two entities are found to be the same)
 */
export async function mergeEntities(sourceId: string, targetId: string): Promise<void> {
  const db = await getEntityGraphDB();

  const source = await db.get('entities', sourceId);
  const target = await db.get('entities', targetId);

  if (!source || !target) return;

  // Update target with merged data
  const merged: Entity = {
    ...target,
    memoryIds: [...new Set([...target.memoryIds, ...source.memoryIds])],
    accessCount: target.accessCount + source.accessCount,
    properties: { ...source.properties, ...target.properties },
    importance: Math.max(target.importance, source.importance),
  };

  // Update relationships
  const relationships = await db.getAll('relationships');
  for (const rel of relationships) {
    if (rel.sourceId === sourceId) {
      await db.put('relationships', { ...rel, sourceId: targetId });
    }
    if (rel.targetId === sourceId) {
      await db.put('relationships', { ...rel, targetId: targetId });
    }
  }

  await db.put('entities', merged);
  await db.delete('entities', sourceId);
}

// Graph traversal for context building
export async function buildEntityContext(entityId: string, maxDepth = 2): Promise<string> {
  const db = await getEntityGraphDB();
  const contextParts: string[] = [];

  async function traverse(id: string, depth: number, path: string[] = []) {
    if (depth > maxDepth || path.includes(id)) return;
    path.push(id);

    const entity = await db.get('entities', id);
    if (!entity) return;

    contextParts.push(`[${entity.type}] ${entity.name}${depth > 0 ? ` (connected via ${path[path.length - 2]})` : ''}`);

    const relationships = await getEntityRelationships(id);
    for (const rel of relationships) {
      const otherId = rel.sourceId === id ? rel.targetId : rel.sourceId;
      const otherEntity = await db.get('entities', otherId);
      if (otherEntity) {
        contextParts.push(`  - ${rel.type} -> ${otherEntity.name} (strength: ${rel.strength})`);
      }
      await traverse(otherId, depth + 1, [...path]);
    }
  }

  await traverse(entityId, 0);
  return contextParts.join('\n');
}
