/**
 * V146: Generic SQLite Storage Wrapper
 * 
 * Replaces localStorage calls with SQLite WASM operations.
 * Provides get/set/delete/query operations with change tracking.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, getDeviceId, generateChangeId, now } from '../../db/index';
import { addChangeLogEntry } from '../../db/syncLog';

export class SqliteStorage {
  private db: Database | null;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Get a single row by table and id
   */
  get<T>(table: string, id: string): T | null {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM ${table} WHERE id = ${id}`;
      const rows = stmt.toArray() as T[];
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Set a row (insert or update) with change tracking
   */
  set<T extends { id: string }>(table: string, id: string, data: T): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    const existing = this.get<T>(table, id);
    const operation = existing ? 'UPDATE' : 'INSERT';

    // Serialize data to JSON strings for columns that need it
    const serialized = this.serializeRow(data);

    // Insert/update the row
    const columns = Object.keys(serialized);
    const values = Object.values(serialized);

    if (existing) {
      // UPDATE
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      SQL`UPDATE ${table} SET ${setClause} WHERE id = ${id}`;
    } else {
      // INSERT
      const placeholders = columns.map(() => '?').join(', ');
      SQL`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    }

    // Add change log entry
    addChangeLogEntry(table, id, operation, data);
  }

  /**
   * Delete a row with change tracking
   */
  delete(table: string, id: string): void {
    const db = this.db;
    if (!db) return;

    // Get the data before deleting for the change log
    const data = this.get(table, id);

    const SQL = db.getSQL();
    SQL`DELETE FROM ${table} WHERE id = ${id}`;

    // Add change log entry
    addChangeLogEntry(table, id, 'DELETE', data);
  }

  /**
   * Query rows by filter (simple equality filters)
   */
  query<T>(table: string, filter: Record<string, unknown>): T[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    const filterKeys = Object.keys(filter);
    
    if (filterKeys.length === 0) {
      const stmt = SQL`SELECT * FROM ${table}`;
      return stmt.toArray() as T[];
    }

    try {
      const whereClause = filterKeys.map(key => `${key} = ?`).join(' AND ');
      const stmt = SQL`SELECT * FROM ${table} WHERE ${whereClause}`;
      const rows = stmt.toArray() as T[];
      return rows;
    } catch {
      return [];
    }
  }

  /**
   * Begin a transaction
   */
  beginTransaction(): void {
    const db = this.db;
    if (!db) return;
    const SQL = db.getSQL();
    SQL`BEGIN TRANSACTION`;
  }

  /**
   * Commit the current transaction
   */
  commit(): void {
    const db = this.db;
    if (!db) return;
    const SQL = db.getSQL();
    SQL`COMMIT`;
  }

  /**
   * Rollback the current transaction
   */
  rollback(): void {
    const db = this.db;
    if (!db) return;
    const SQL = db.getSQL();
    SQL`ROLLBACK`;
  }

  /**
   * Serialize row data - convert complex values to JSON strings
   */
  private serializeRow<T>(data: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined && value !== null && typeof value === 'object') {
        result[key] = JSON.stringify(value);
      } else {
        result[key] = value;
      }
    }
    
    // Always ensure sync columns are set
    result['change_id'] = generateChangeId();
    result['last_modified'] = now();
    result['device_id'] = getDeviceId();
    
    return result;
  }
}

// Singleton instance
let storageInstance: SqliteStorage | null = null;

export function getSqliteStorage(): SqliteStorage {
  if (!storageInstance) {
    storageInstance = new SqliteStorage();
  }
  return storageInstance;
}