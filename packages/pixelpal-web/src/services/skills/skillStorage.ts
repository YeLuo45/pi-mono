/**
 * SkillStorage — IndexedDB persistence for custom skills
 * Handles saving, loading, and managing custom skill definitions.
 */

import type { SkillDefinition } from './types';

const DB_NAME = 'pixelpal-skills';
const DB_VERSION = 1;
const STORE_NAME = 'custom-skills';

/**
 * Open the IndexedDB database for skill storage.
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
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('enabled', 'enabled', { unique: false });
      }
    };
  });
}

/**
 * Get all custom skills from storage.
 */
export async function getCustomSkills(): Promise<SkillDefinition[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as SkillDefinition[];
      resolve(results || []);
    };

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get a single custom skill by ID.
 */
export async function getCustomSkill(id: string): Promise<SkillDefinition | null> {
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
 * Save a custom skill (insert or update).
 */
export async function saveCustomSkill(skill: SkillDefinition): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(skill);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Delete a custom skill by ID.
 */
export async function deleteCustomSkill(id: string): Promise<void> {
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
 * Set the enabled state for a custom skill.
 */
export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  const skill = await getCustomSkill(id);
  if (skill) {
    skill.enabled = enabled;
    await saveCustomSkill(skill);
  }
}

/**
 * Clear all custom skills (for testing/reset).
 */
export async function clearCustomSkills(): Promise<void> {
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
