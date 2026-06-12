/**
 * ChainStorage — IndexedDB persistence for Skill Chains (V79)
 * Handles saving, loading, and managing chain definitions.
 */

import type { ChainDefinition } from '../skills/types';

const DB_NAME = 'pixelpal-chains';
const DB_VERSION = 1;
const STORE_NAME = 'chains';

/**
 * Open the IndexedDB database for chain storage.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('enabled', 'enabled', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
    };
  });
}

/**
 * Get all chains from storage.
 */
export async function getAllChains(): Promise<ChainDefinition[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as ChainDefinition[];
      resolve(results || []);
    };

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get a single chain by ID.
 */
export async function getChain(id: string): Promise<ChainDefinition | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Save a chain (insert or update).
 */
export async function saveChain(chain: ChainDefinition): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(chain);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Delete a chain by ID.
 */
export async function deleteChain(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Set the enabled state for a chain.
 */
export async function setChainEnabled(id: string, enabled: boolean): Promise<void> {
  const chain = await getChain(id);
  if (chain) {
    chain.enabled = enabled;
    await saveChain(chain);
  }
}

/**
 * Clear all chains (for testing/reset).
 */
export async function clearAllChains(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}
