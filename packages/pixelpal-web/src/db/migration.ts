/**
 * V146: localStorage to SQLite Migration
 * 
 * Migrates data from localStorage keys to SQLite tables.
 * Used during initial setup when upgrading from localStorage-based storage.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase } from './index';

interface MigrationResult {
  success: boolean;
  migrated: number;
  failed: number;
  errors: string[];
}

/**
 * Check if there are un-migrated localStorage entries
 */
export function hasUnmigratedData(): boolean {
  // Check for any localStorage keys that indicate unmigrated data
  const keys = [
    'pixelpal_messages',
    'pixelpal_memories',
    'pixelpal_settings',
    'pixelpal_personas',
    'pixelpal_skills',
  ];

  for (const key of keys) {
    if (localStorage.getItem(key) !== null) {
      return true;
    }
  }

  return false;
}

/**
 * Migrate messages from localStorage to SQLite
 */
export async function migrateMessages(db: Database): Promise<MigrationResult> {
  const result: MigrationResult = { success: true, migrated: 0, failed: 0, errors: [] };
  
  try {
    const raw = localStorage.getItem('pixelpal_messages');
    if (!raw) return result;

    const messages = JSON.parse(raw);
    const SQL = db.getSQL();

    for (const msg of messages) {
      try {
        SQL`
          INSERT INTO messages (id, role, content, persona_id, timestamp, attachments, change_id, last_modified, device_id)
          VALUES ${msg.id, msg.role, msg.content, msg.personaId, msg.timestamp, JSON.stringify(msg.attachments), crypto.randomUUID(), Date.now(), localStorage.getItem('pixelpal_device_id') || ''}
        `;
        result.migrated++;
      } catch (e) {
        result.failed++;
        result.errors.push(`Failed to migrate message ${msg.id}: ${e}`);
      }
    }

    // Clear localStorage after migration
    localStorage.removeItem('pixelpal_messages');
  } catch (e) {
    result.success = false;
    result.errors.push(`Migration failed: ${e}`);
  }

  return result;
}

/**
 * Migrate settings from localStorage to SQLite
 */
export async function migrateSettings(db: Database): Promise<MigrationResult> {
  const result: MigrationResult = { success: true, migrated: 0, failed: 0, errors: [] };
  
  try {
    const raw = localStorage.getItem('pixelpal_settings');
    if (!raw) return result;

    const settings = JSON.parse(raw);
    const SQL = db.getSQL();

    for (const setting of settings) {
      try {
        SQL`
          INSERT INTO settings (id, key, value, change_id, last_modified, device_id)
          VALUES ${setting.id, setting.key, JSON.stringify(setting.value), crypto.randomUUID(), Date.now(), localStorage.getItem('pixelpal_device_id') || ''}
        `;
        result.migrated++;
      } catch (e) {
        result.failed++;
        result.errors.push(`Failed to migrate setting ${setting.id}: ${e}`);
      }
    }

    localStorage.removeItem('pixelpal_settings');
  } catch (e) {
    result.success = false;
    result.errors.push(`Migration failed: ${e}`);
  }

  return result;
}

/**
 * Run all migrations
 */
export async function runMigrations(): Promise<{ success: boolean; results: MigrationResult[] }> {
  const db = getDatabase();
  if (!db) {
    return { success: false, results: [] };
  }

  const results: MigrationResult[] = [];

  // Migrate each data type
  const messageResult = await migrateMessages(db);
  results.push(messageResult);

  const settingsResult = await migrateSettings(db);
  results.push(settingsResult);

  const allSuccess = results.every(r => r.success);
  return { success: allSuccess, results };
}

/**
 * Mark migration as complete
 */
export function markMigrationComplete(): void {
  localStorage.setItem('pixelpal_migration_complete', 'true');
  localStorage.setItem('pixelpal_migration_date', new Date().toISOString());
}

/**
 * Check if migration has been completed
 */
export function isMigrationComplete(): boolean {
  return localStorage.getItem('pixelpal_migration_complete') === 'true';
}