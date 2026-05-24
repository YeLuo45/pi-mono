/**
 * V149: HookRegistry - wa-sqlite persistence for hooks
 * 
 * Persists hook definitions to SQLite for:
 * - Recovery across page reloads
 * - Plugin hook registration persistence
 * - Hook configuration storage
 */

import type { Database } from 'wa-sqlite';
import type { HookDefinition } from './types';

export interface StoredHook {
  id: string;
  name: string;
  priority: number;
  enabled: number; // SQLite stores as 0/1
  metadata: string | null; // JSON string
  created_at: number;
  updated_at: number;
}

export class HookRegistry {
  private db: Database;
  private initialized = false;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Initialize the hooks table
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const SQL = this.db.getSQL();

    SQL`
      CREATE TABLE IF NOT EXISTS hooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 0,
        enabled INTEGER NOT NULL DEFAULT 1,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    SQL`CREATE INDEX IF NOT EXISTS idx_hooks_name ON hooks(name)`;
    SQL`CREATE INDEX IF NOT EXISTS idx_hooks_enabled ON hooks(enabled)`;

    this.initialized = true;
  }

  /**
   * Ensure database is ready
   */
  private async ensureInit(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * Store a hook definition
   */
  async store(hook: HookDefinition): Promise<void> {
    await this.ensureInit();

    const now = Date.now();
    const metadata = hook.metadata ? JSON.stringify(hook.metadata) : null;

    const SQL = this.db.getSQL();
    SQL`
      INSERT OR REPLACE INTO hooks (id, name, priority, enabled, metadata, created_at, updated_at)
      VALUES (${hook.id}, ${hook.name}, ${hook.priority}, ${hook.enabled ? 1 : 0}, ${metadata}, ${now}, ${now})
    `;
  }

  /**
   * Remove a hook by ID
   */
  async remove(hookId: string): Promise<void> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    SQL`DELETE FROM hooks WHERE id = ${hookId}`;
  }

  /**
   * Get a hook by ID
   */
  async get(hookId: string): Promise<HookDefinition | undefined> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    const rows = SQL`SELECT * FROM hooks WHERE id = ${hookId}`;

    if (rows.length === 0) return undefined;

    return this.rowToHook(rows[0] as StoredHook);
  }

  /**
   * Get all hooks for a specific hook name
   */
  async getByName(hookName: string): Promise<HookDefinition[]> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    const rows = SQL`SELECT * FROM hooks WHERE name = ${hookName} ORDER BY priority DESC`;

    return (rows as StoredHook[]).map(row => this.rowToHook(row));
  }

  /**
   * Get all stored hooks
   */
  async getAll(): Promise<HookDefinition[]> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    const rows = SQL`SELECT * FROM hooks ORDER BY priority DESC`;

    return (rows as StoredHook[]).map(row => this.rowToHook(row));
  }

  /**
   * Get only enabled hooks
   */
  async getEnabled(): Promise<HookDefinition[]> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    const rows = SQL`SELECT * FROM hooks WHERE enabled = 1 ORDER BY priority DESC`;

    return (rows as StoredHook[]).map(row => this.rowToHook(row));
  }

  /**
   * Update hook enabled state
   */
  async setEnabled(hookId: string, enabled: boolean): Promise<void> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    SQL`UPDATE hooks SET enabled = ${enabled ? 1 : 0}, updated_at = ${Date.now()} WHERE id = ${hookId}`;
  }

  /**
   * Update hook priority
   */
  async setPriority(hookId: string, priority: number): Promise<void> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    SQL`UPDATE hooks SET priority = ${priority}, updated_at = ${Date.now()} WHERE id = ${hookId}`;
  }

  /**
   * Clear all stored hooks
   */
  async clear(): Promise<void> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    SQL`DELETE FROM hooks`;
  }

  /**
   * Get count of stored hooks
   */
  async count(): Promise<number> {
    await this.ensureInit();

    const SQL = this.db.getSQL();
    const rows = SQL`SELECT COUNT(*) as count FROM hooks`;
    return (rows[0] as { count: number }).count;
  }

  private rowToHook(row: StoredHook): HookDefinition {
    return {
      id: row.id,
      name: row.name,
      priority: row.priority,
      enabled: row.enabled === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      fn: () => { /* Function must be provided at runtime */ },
    };
  }
}

export default HookRegistry;