/**
 * V142: ComposedSkillStore — IndexedDB persistence for composed Skills
 */
import type { Pipeline } from '../orchestration/OrchestrationEngine';

export interface ComposedSkill {
  id: string;
  version: string;
  sourceDSL: string;
  compiledPipeline: Pipeline;
  isComposed: true;
  componentSkills: string[];
  createdAt: string;
}

const DB_NAME = 'pixelpal_composed';
const DB_VERSION = 1;
const STORE = 'composed_skills';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveComposedSkill(skill: ComposedSkill): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(skill);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getComposedSkill(id: string): Promise<ComposedSkill | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as ComposedSkill) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function listComposedSkills(): Promise<ComposedSkill[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as ComposedSkill[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteComposedSkill(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}