/**
 * V143: SkillExecutionStorage — wa-sqlite storage for execution logs
 * Implements offline-first storage per thunderbolt-design
 */

import type { ExecutionLog } from '../../types/execution';

const DB_NAME = 'pixel_pal_executions';
const STORE_NAME = 'skill_executions';
const DB_VERSION = 1;

// In-memory store for browser environment (wa-sqlite stub)
let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error('Failed to open execution database'));

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('skillId', 'skillId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('pipelineId', 'pipelineId', { unique: false });
      }
    };
  });
}

/**
 * Save an execution log entry to storage
 */
export async function saveExecutionLog(log: ExecutionLog): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(log);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save execution log'));
  });
}

/**
 * Get execution logs with optional filters
 */
export async function getExecutionLogs(
  filters?: {
    skillId?: string;
    pipelineId?: string;
    limit?: number;
  }
): Promise<ExecutionLog[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const logs: ExecutionLog[] = [];

    let request: IDBRequest;
    if (filters?.skillId) {
      const index = store.index('skillId');
      request = index.getAll(filters.skillId);
    } else if (filters?.pipelineId) {
      const index = store.index('pipelineId');
      request = index.getAll(filters.pipelineId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      logs.push(...(request.result as ExecutionLog[]));
      // Sort by timestamp descending
      logs.sort((a, b) => b.timestamp - a.timestamp);
      // Apply limit
      if (filters?.limit && logs.length > filters.limit) {
        logs.splice(filters.limit);
      }
      resolve(logs);
    };
    request.onerror = () => reject(new Error('Failed to get execution logs'));
  });
}

/**
 * Get a single execution log by ID
 */
export async function getExecutionLogById(id: string): Promise<ExecutionLog | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(new Error('Failed to get execution log'));
  });
}

/**
 * Delete an execution log by ID
 */
export async function deleteExecutionLog(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete execution log'));
  });
}

/**
 * Clear all execution logs
 */
export async function clearExecutionLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear execution logs'));
  });
}

/**
 * Sync stub for DeltaSync (thunderbolt-design offline-first)
 * In a full implementation, this would sync with a remote server
 */
export async function syncExecutionLogs(): Promise<{ synced: number }> {
  // Stub: no-op for offline-first, would integrate with DeltaSync
  return { synced: 0 };
}