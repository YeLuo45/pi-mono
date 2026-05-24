/**
 * V146: SQLite Database Initialization with wa-sqlite
 * 
 * Initializes wa-sqlite WASM database and creates tables if needed.
 * Includes migration check from localStorage to SQLite.
 */

import type { Database } from 'wa-sqlite';
import { Database as WADatabase } from 'wa-sqlite';
import * as waSqlite from 'wa-sqlite';

let dbInstance: Database | null = null;

// Device ID for sync (generated once per device)
let deviceId: string | null = null;

export function getDeviceId(): string {
  if (!deviceId) {
    deviceId = localStorage.getItem('pixelpal_device_id') || crypto.randomUUID();
    localStorage.setItem('pixelpal_device_id', deviceId);
  }
  return deviceId;
}

export async function initDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await waSqlite.instantiate();
  const path = ':memory:';
  dbInstance = new WADatabase(SQL, path);

  // Create tables
  await createTables(dbInstance);

  // Check for un-migrated localStorage data and run migration if needed
  const { hasUnmigratedData, isMigrationComplete, runMigrations, markMigrationComplete } = await import('./migration');
  if (hasUnmigratedData() && !isMigrationComplete()) {
    await runMigrations();
    markMigrationComplete();
  }

  return dbInstance;
}

async function createTables(db: Database): Promise<void> {
  const SQL = db.getSQL();

  // Messages table
  SQL`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      role TEXT,
      content TEXT,
      persona_id TEXT,
      timestamp INTEGER,
      attachments TEXT,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;

  // Memories table
  SQL`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      type TEXT,
      content TEXT,
      importance INTEGER,
      persona_id TEXT,
      created_at INTEGER,
      expires_at INTEGER,
      tags TEXT,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;

  // Settings table
  SQL`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE,
      value TEXT,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;

  // Personas table
  SQL`
    CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      avatar TEXT,
      personality TEXT,
      skills TEXT,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;

  // Skills table
  SQL`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      code TEXT,
      enabled INTEGER DEFAULT 1,
      config TEXT,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;

  // Sync log table
  SQL`
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      row_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      device_id TEXT NOT NULL,
      change_data TEXT
    )
  `;

  // Create indexes for sync_log
  SQL`CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_sync_log_table ON sync_log(table_name)`;

  // Pipelines table (V147: Role Orchestration)
  SQL`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      stages TEXT NOT NULL,
      current_stage INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;
  SQL`CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status)`;

  // Knowledge Graph entities table (V148)
  SQL`
    CREATE TABLE IF NOT EXISTS kg_entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      properties TEXT,
      persona_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;
  SQL`CREATE INDEX IF NOT EXISTS idx_kg_entities_persona ON kg_entities(persona_id)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(type)`;

  // Knowledge Graph relations table (V148)
  SQL`
    CREATE TABLE IF NOT EXISTS kg_relations (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      properties TEXT,
      persona_id TEXT,
      created_at INTEGER NOT NULL,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT,
      FOREIGN KEY (source_id) REFERENCES kg_entities(id),
      FOREIGN KEY (target_id) REFERENCES kg_entities(id)
    )
  `;
  SQL`CREATE INDEX IF NOT EXISTS idx_kg_relations_source ON kg_relations(source_id)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_kg_relations_target ON kg_relations(target_id)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_kg_relations_persona ON kg_relations(persona_id)`;

  // Hooks table (V149: Hook System)
  SQL`
    CREATE TABLE IF NOT EXISTS hooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      metadata TEXT,
      source TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `;
  SQL`CREATE INDEX IF NOT EXISTS idx_hooks_name ON hooks(name)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_hooks_enabled ON hooks(enabled)`;

  // Agent Council tables (V150)
  SQL`
    CREATE TABLE IF NOT EXISTS council_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      personality TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      council_id TEXT,
      created_at INTEGER NOT NULL,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;
  SQL`CREATE INDEX IF NOT EXISTS idx_council_agents_role ON council_agents(role)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_council_agents_council ON council_agents(council_id)`;

  SQL`
    CREATE TABLE IF NOT EXISTS council_messages (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      references TEXT,
      council_id TEXT,
      change_id TEXT,
      last_modified INTEGER,
      device_id TEXT
    )
  `;
  SQL`CREATE INDEX IF NOT EXISTS idx_council_messages_agent ON council_messages(agent_id)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_council_messages_type ON council_messages(type)`;
  SQL`CREATE INDEX IF NOT EXISTS idx_council_messages_council ON council_messages(council_id)`;
}

export function getDatabase(): Database | null {
  return dbInstance;
}

export function generateChangeId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

// Re-export migration functions for external use
export { hasUnmigratedData, isMigrationComplete, runMigrations, markMigrationComplete } from './migration';