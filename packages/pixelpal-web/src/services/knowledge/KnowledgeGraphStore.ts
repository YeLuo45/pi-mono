/**
 * V148: Knowledge Graph Store
 * 
 * wa-sqlite entity/relation CRUD + adjacency queries for the knowledge graph.
 * Supports persona-scoped data with shared cross-persona facts.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, generateChangeId, now } from '../../db/index';
import { addChangeLogEntry } from '../../db/syncLog';

// ============================================================================
// Types
// ============================================================================

export interface KGEntity {
  id: string;
  type: string;
  name: string;
  properties: string | null; // JSON string
  persona_id: string | null;
  created_at: number;
  updated_at: number;
  change_id: string | null;
  last_modified: number | null;
  device_id: string | null;
}

export interface KGRelation {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  properties: string | null; // JSON string
  persona_id: string | null;
  created_at: number;
  change_id: string | null;
  last_modified: number | null;
  device_id: string | null;
}

export interface CreateEntityInput {
  id: string;
  type: string;
  name: string;
  properties?: Record<string, unknown>;
  persona_id?: string | null;
}

export interface CreateRelationInput {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  properties?: Record<string, unknown>;
  persona_id?: string | null;
}

export interface AdjacencyResult {
  entity: KGEntity;
  relations: KGRelation[];
}

// ============================================================================
// KnowledgeGraphStore
// ============================================================================

export class KnowledgeGraphStore {
  private db: Database | null;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new entity
   */
  createEntity(input: CreateEntityInput): KGEntity | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    const ts = now();
    const cid = generateChangeId();

    const entity: KGEntity = {
      id: input.id,
      type: input.type,
      name: input.name,
      properties: input.properties ? JSON.stringify(input.properties) : null,
      persona_id: input.persona_id ?? null,
      created_at: ts,
      updated_at: ts,
      change_id: cid,
      last_modified: ts,
      device_id: null,
    };

    SQL`
      INSERT INTO kg_entities (id, type, name, properties, persona_id, created_at, updated_at, change_id, last_modified, device_id)
      VALUES (${entity.id}, ${entity.type}, ${entity.name}, ${entity.properties}, ${entity.persona_id}, ${entity.created_at}, ${entity.updated_at}, ${entity.change_id}, ${entity.last_modified}, ${entity.device_id})
    `;

    addChangeLogEntry('kg_entities', entity.id, 'INSERT', entity);
    return entity;
  }

  /**
   * Get an entity by id
   */
  getEntity(id: string): KGEntity | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM kg_entities WHERE id = ${id}`;
      const rows = stmt.toArray() as KGEntity[];
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Update an entity
   */
  updateEntity(id: string, updates: Partial<Pick<KGEntity, 'type' | 'name' | 'properties' | 'persona_id'>>): KGEntity | null {
    const db = this.db;
    if (!db) return null;

    const existing = this.getEntity(id);
    if (!existing) return null;

    const SQL = db.getSQL();
    const ts = now();
    const cid = generateChangeId();

    const newData = {
      type: updates.type ?? existing.type,
      name: updates.name ?? existing.name,
      properties: updates.properties !== undefined 
        ? (typeof updates.properties === 'string' ? updates.properties : JSON.stringify(updates.properties))
        : existing.properties,
      persona_id: updates.persona_id ?? existing.persona_id,
    };

    SQL`
      UPDATE kg_entities 
      SET type = ${newData.type}, name = ${newData.name}, properties = ${newData.properties}, 
          persona_id = ${newData.persona_id}, updated_at = ${ts}, change_id = ${cid}, last_modified = ${ts}
      WHERE id = ${id}
    `;

    addChangeLogEntry('kg_entities', id, 'UPDATE', newData);
    return this.getEntity(id);
  }

  /**
   * Delete an entity and all its relations
   */
  deleteEntity(id: string): boolean {
    const db = this.db;
    if (!db) return false;

    const SQL = db.getSQL();
    
    // Delete all relations where this entity is source or target
    SQL`DELETE FROM kg_relations WHERE source_id = ${id} OR target_id = ${id}`;
    SQL`DELETE FROM kg_entities WHERE id = ${id}`;

    addChangeLogEntry('kg_entities', id, 'DELETE', { id });
    return true;
  }

  /**
   * Query entities by filter
   */
  queryEntities(filter: { type?: string; persona_id?: string | null; name?: string }): KGEntity[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.type !== undefined) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter.persona_id !== undefined) {
      conditions.push('persona_id = ?');
      params.push(filter.persona_id);
    }
    if (filter.name !== undefined) {
      conditions.push('name LIKE ?');
      params.push(`%${filter.name}%`);
    }

    if (conditions.length === 0) {
      const stmt = SQL`SELECT * FROM kg_entities ORDER BY created_at DESC`;
      return stmt.toArray() as KGEntity[];
    }

    const whereClause = conditions.join(' AND ');
    try {
      const stmt = SQL`SELECT * FROM kg_entities WHERE ${whereClause} ORDER BY created_at DESC`;
      return stmt.toArray() as KGEntity[];
    } catch {
      return [];
    }
  }

  /**
   * Create a new relation
   */
  createRelation(input: CreateRelationInput): KGRelation | null {
    const db = this.db;
    if (!db) return null;

    // Verify source and target entities exist
    const source = this.getEntity(input.source_id);
    const target = this.getEntity(input.target_id);
    if (!source || !target) return null;

    const SQL = db.getSQL();
    const ts = now();
    const cid = generateChangeId();

    const relation: KGRelation = {
      id: input.id,
      source_id: input.source_id,
      target_id: input.target_id,
      relation_type: input.relation_type,
      properties: input.properties ? JSON.stringify(input.properties) : null,
      persona_id: input.persona_id ?? null,
      created_at: ts,
      change_id: cid,
      last_modified: ts,
      device_id: null,
    };

    SQL`
      INSERT INTO kg_relations (id, source_id, target_id, relation_type, properties, persona_id, created_at, change_id, last_modified, device_id)
      VALUES (${relation.id}, ${relation.source_id}, ${relation.target_id}, ${relation.relation_type}, ${relation.properties}, ${relation.persona_id}, ${relation.created_at}, ${relation.change_id}, ${relation.last_modified}, ${relation.device_id})
    `;

    addChangeLogEntry('kg_relations', relation.id, 'INSERT', relation);
    return relation;
  }

  /**
   * Get a relation by id
   */
  getRelation(id: string): KGRelation | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM kg_relations WHERE id = ${id}`;
      const rows = stmt.toArray() as KGRelation[];
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Delete a relation
   */
  deleteRelation(id: string): boolean {
    const db = this.db;
    if (!db) return false;

    const SQL = db.getSQL();
    SQL`DELETE FROM kg_relations WHERE id = ${id}`;

    addChangeLogEntry('kg_relations', id, 'DELETE', { id });
    return true;
  }

  /**
   * Query relations by filter
   */
  queryRelations(filter: { source_id?: string; target_id?: string; relation_type?: string; persona_id?: string | null }): KGRelation[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    const conditions: string[] = [];

    if (filter.source_id !== undefined) {
      conditions.push('source_id = ?');
    }
    if (filter.target_id !== undefined) {
      conditions.push('target_id = ?');
    }
    if (filter.relation_type !== undefined) {
      conditions.push('relation_type = ?');
    }
    if (filter.persona_id !== undefined) {
      conditions.push('persona_id = ?');
    }

    if (conditions.length === 0) {
      const stmt = SQL`SELECT * FROM kg_relations ORDER BY created_at DESC`;
      return stmt.toArray() as KGRelation[];
    }

    const whereClause = conditions.join(' AND ');
    try {
      const stmt = SQL`SELECT * FROM kg_relations WHERE ${whereClause} ORDER BY created_at DESC`;
      return stmt.toArray() as KGRelation[];
    } catch {
      return [];
    }
  }

  /**
   * Get adjacency list for an entity (entity + its relations)
   */
  getAdjacency(entityId: string): AdjacencyResult | null {
    const db = this.db;
    if (!db) return null;

    const entity = this.getEntity(entityId);
    if (!entity) return null;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`
        SELECT * FROM kg_relations 
        WHERE source_id = ${entityId} OR target_id = ${entityId}
        ORDER BY created_at DESC
      `;
      const relations = stmt.toArray() as KGRelation[];
      return { entity, relations };
    } catch {
      return { entity, relations: [] };
    }
  }

  /**
   * Get all entities and relations for a persona (including shared)
   */
  getGraphForPersona(personaId: string | null): { entities: KGEntity[]; relations: KGRelation[] } {
    const db = this.db;
    if (!db) return { entities: [], relations: [] };

    const SQL = db.getSQL();
    try {
      // Get persona-specific entities plus shared (null persona_id) entities
      const entityStmt = SQL`
        SELECT * FROM kg_entities 
        WHERE persona_id = ${personaId} OR persona_id IS NULL
        ORDER BY created_at DESC
      `;
      const entities = entityStmt.toArray() as KGEntity[];

      // Get relations for those entities
      const entityIds = entities.map(e => e.id);
      const relationStmt = SQL`
        SELECT * FROM kg_relations 
        WHERE source_id IN (${entityIds.join(',')}) OR target_id IN (${entityIds.join(',')})
        ORDER BY created_at DESC
      `;
      const relations = relationStmt.toArray() as KGRelation[];

      return { entities, relations };
    } catch {
      return { entities: [], relations: [] };
    }
  }

  /**
   * Get all shared entities (cross-persona facts)
   */
  getSharedEntities(): KGEntity[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM kg_entities WHERE persona_id IS NULL ORDER BY created_at DESC`;
      return stmt.toArray() as KGEntity[];
    } catch {
      return [];
    }
  }

  /**
   * Get all shared relations
   */
  getSharedRelations(): KGRelation[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM kg_relations WHERE persona_id IS NULL ORDER BY created_at DESC`;
      return stmt.toArray() as KGRelation[];
    } catch {
      return [];
    }
  }
}

// Singleton instance
let kgStoreInstance: KnowledgeGraphStore | null = null;

export function getKnowledgeGraphStore(): KnowledgeGraphStore {
  if (!kgStoreInstance) {
    kgStoreInstance = new KnowledgeGraphStore();
  }
  return kgStoreInstance;
}