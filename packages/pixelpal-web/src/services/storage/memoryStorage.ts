// Persistence store initialization
let storeInitialized = false;

export async function initMemoryStore(): Promise<void> {
  if (storeInitialized) return;
  storeInitialized = true;
}

/**
 * IndexedDB storage for agent memory persistence (V146)
 * 
 * Database: pixelpal v1
 * Object store: agentMemory
 * Now uses SQLite WASM with change tracking.
 */

import type { MemoryEntry } from '../agent/memory/MemoryContext';
import { getSqliteStorage } from './SqliteStorage';

/**
 * Save a memory entry to SQLite
 */
export async function saveMemoryEntry(entry: MemoryEntry): Promise<void> {
  const storage = getSqliteStorage();
  storage.set('memories', entry.id, entry);
}

/**
 * Load memory entries from SQLite
 */
export async function loadMemoryEntries(limit = 100): Promise<MemoryEntry[]> {
  const storage = getSqliteStorage();
  const entries = storage.query<MemoryEntry>('memories', {});
  // Return up to limit entries
  return entries.slice(0, limit);
}

/**
 * Clear all memory entries from SQLite
 */
export async function clearMemoryEntries(): Promise<void> {
  const storage = getSqliteStorage();
  const entries = storage.query<MemoryEntry>('memories', {});
  for (const entry of entries) {
    storage.delete('memories', entry.id);
  }
}

/**
 * Clean expired entries from SQLite
 */
export async function cleanExpiredEntries(): Promise<void> {
  const storage = getSqliteStorage();
  const entries = storage.query<MemoryEntry>('memories', {});
  const now = Date.now();
  for (const entry of entries) {
    if (entry.expiresAt && entry.expiresAt < now) {
      storage.delete('memories', entry.id);
    }
  }
}
