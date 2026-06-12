/**
 * V152: Dream Memory Store
 * 
 * Cross-session persistent memory storage using wa-sqlite.
 * Supports CRUD operations with automatic tracking of access patterns.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, generateChangeId, now } from '../db/index';
import { addChangeLogEntry } from '../db/syncLog';

// ============================================================================
// Types
// ============================================================================

export type MemoryLayer = 'hot' | 'warm' | 'cold';

export interface DreamMemory {
  id: string;
  content: string;
  summary: string | null;
  layer: MemoryLayer;
  access_count: number;
  last_access: number | null;
  created_at: number;
  embedding: Uint8Array | null;
}

export interface CreateDreamMemoryInput {
  id: string;
  content: string;
  summary?: string | null;
  layer?: MemoryLayer;
  embedding?: Uint8Array | null;
}

export interface UpdateDreamMemoryInput {
  content?: string;
  summary?: string | null;
  layer?: MemoryLayer;
  embedding?: Uint8Array | null;
}

// ============================================================================
// DreamMemoryStore
// ============================================================================

export class DreamMemoryStore {
  private db: Database | null;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new dream memory
   */
  create(input: CreateDreamMemoryInput): DreamMemory | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    const ts = now();

    const memory: DreamMemory = {
      id: input.id,
      content: input.content,
      summary: input.summary ?? null,
      layer: input.layer ?? 'warm',
      access_count: 0,
      last_access: null,
      created_at: ts,
      embedding: input.embedding ?? null,
    };

    SQL`
      INSERT INTO dream_memory (id, content, summary, layer, access_count, last_access, created_at, embedding)
      VALUES (${memory.id}, ${memory.content}, ${memory.summary}, ${memory.layer}, ${memory.access_count}, ${memory.last_access}, ${memory.created_at}, ${memory.embedding})
    `;

    addChangeLogEntry('dream_memory', memory.id, 'INSERT', memory);
    return memory;
  }

  /**
   * Get a dream memory by id
   */
  get(id: string): DreamMemory | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM dream_memory WHERE id = ${id}`;
      const rows = stmt.toArray() as DreamMemory[];
      if (rows[0]) {
        // Update access tracking
        this.recordAccess(id);
        return rows[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get a dream memory by id without updating access (read-only)
   */
  getReadOnly(id: string): DreamMemory | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM dream_memory WHERE id = ${id}`;
      const rows = stmt.toArray() as DreamMemory[];
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Update a dream memory
   */
  update(id: string, updates: UpdateDreamMemoryInput): DreamMemory | null {
    const db = this.db;
    if (!db) return null;

    const existing = this.getReadOnly(id);
    if (!existing) return null;

    const SQL = db.getSQL();
    const ts = now();
    const cid = generateChangeId();

    const newData = {
      content: updates.content ?? existing.content,
      summary: updates.summary !== undefined ? updates.summary : existing.summary,
      layer: updates.layer ?? existing.layer,
      embedding: updates.embedding !== undefined ? updates.embedding : existing.embedding,
    };

    SQL`
      UPDATE dream_memory 
      SET content = ${newData.content}, summary = ${newData.summary}, layer = ${newData.layer}, 
          embedding = ${newData.embedding}, last_modified = ${ts}, change_id = ${cid}
      WHERE id = ${id}
    `;

    addChangeLogEntry('dream_memory', id, 'UPDATE', newData);
    return this.getReadOnly(id);
  }

  /**
   * Delete a dream memory
   */
  delete(id: string): boolean {
    const db = this.db;
    if (!db) return false;

    const SQL = db.getSQL();
    SQL`DELETE FROM dream_memory WHERE id = ${id}`;
    addChangeLogEntry('dream_memory', id, 'DELETE', { id });
    return true;
  }

  /**
   * Record an access to a memory (increment count, update last_access)
   */
  private recordAccess(id: string): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    const ts = now();
    SQL`
      UPDATE dream_memory 
      SET access_count = access_count + 1, last_access = ${ts}
      WHERE id = ${id}
    `;
  }

  /**
   * Query memories by layer
   */
  queryByLayer(layer: MemoryLayer): DreamMemory[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM dream_memory WHERE layer = ${layer} ORDER BY last_access DESC, created_at DESC`;
      return stmt.toArray() as DreamMemory[];
    } catch {
      return [];
    }
  }

  /**
   * Query memories by multiple layers
   */
  queryByLayers(layers: MemoryLayer[]): DreamMemory[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const layerList = layers.map(l => `'${l}'`).join(',');
      const stmt = SQL`SELECT * FROM dream_memory WHERE layer IN (${layerList}) ORDER BY last_access DESC, created_at DESC`;
      return stmt.toArray() as DreamMemory[];
    } catch {
      return [];
    }
  }

  /**
   * Get all memories
   */
  getAll(): DreamMemory[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM dream_memory ORDER BY created_at DESC`;
      return stmt.toArray() as DreamMemory[];
    } catch {
      return [];
    }
  }

  /**
   * Get memories count
   */
  count(): number {
    const db = this.db;
    if (!db) return 0;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT COUNT(*) as count FROM dream_memory`;
      const rows = stmt.toArray() as { count: number }[];
      return rows[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get memories count by layer
   */
  countByLayer(layer: MemoryLayer): number {
    const db = this.db;
    if (!db) return 0;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT COUNT(*) as count FROM dream_memory WHERE layer = ${layer}`;
      const rows = stmt.toArray() as { count: number }[];
      return rows[0]?.count ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get total token count (estimated)
   */
  getTotalTokens(): number {
    const memories = this.getAll();
    return memories.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
  }

  /**
   * Estimate token count (rough estimate: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get recently accessed memories (for hot layer)
   */
  getRecentlyAccessed(limit = 20): DreamMemory[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM dream_memory WHERE last_access IS NOT NULL ORDER BY last_access DESC LIMIT ${limit}`;
      return stmt.toArray() as DreamMemory[];
    } catch {
      return [];
    }
  }

  /**
   * Get least recently accessed memories (candidates for cold layer)
   */
  getLeastRecentlyAccessed(limit = 50): DreamMemory[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM dream_memory ORDER BY last_access ASC, created_at ASC LIMIT ${limit}`;
      return stmt.toArray() as DreamMemory[];
    } catch {
      return [];
    }
  }

  /**
   * Delete multiple memories by ids
   */
  deleteMany(ids: string[]): number {
    const db = this.db;
    if (!db || ids.length === 0) return 0;

    const SQL = db.getSQL();
    const placeholders = ids.map(() => '?').join(',');
    try {
      SQL`DELETE FROM dream_memory WHERE id IN (${placeholders})`;
      return ids.length;
    } catch {
      return 0;
    }
  }

  /**
   * Bulk update layer for ids
   */
  updateLayerMany(ids: string[], layer: MemoryLayer): number {
    const db = this.db;
    if (!db || ids.length === 0) return 0;

    const SQL = db.getSQL();
    const ts = now();
    const placeholders = ids.map(() => '?').join(',');
    try {
      SQL`UPDATE dream_memory SET layer = ${layer}, last_modified = ${ts} WHERE id IN (${placeholders})`;
      return ids.length;
    } catch {
      return 0;
    }
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let dreamMemoryStoreInstance: DreamMemoryStore | null = null;

export function getDreamMemoryStore(): DreamMemoryStore {
  if (!dreamMemoryStoreInstance) {
    dreamMemoryStoreInstance = new DreamMemoryStore();
  }
  return dreamMemoryStoreInstance;
}

export default DreamMemoryStore;