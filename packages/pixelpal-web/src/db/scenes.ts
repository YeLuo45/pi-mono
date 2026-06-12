import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Scene } from '../types/scene';

interface PixelPalDB extends DBSchema {
  scenes: {
    key: string;
    value: Scene;
    indexes: { 'by-enabled': number };
  };
}

let dbPromise: Promise<IDBPDatabase<PixelPalDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PixelPalDB>('pixelpal-scenes', 1, {
      upgrade(db) {
        const store = db.createObjectStore('scenes', { keyPath: 'id' });
        store.createIndex('by-enabled', 'enabled');
      },
    });
  }
  return dbPromise;
}

export async function getAllScenes(): Promise<Scene[]> {
  const db = await getDB();
  return db.getAll('scenes');
}

export async function getScene(id: string): Promise<Scene | undefined> {
  const db = await getDB();
  return db.get('scenes', id);
}

export async function saveScene(scene: Scene): Promise<void> {
  const db = await getDB();
  await db.put('scenes', scene);
}

export async function deleteScene(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('scenes', id);
}

export async function getEnabledScenes(): Promise<Scene[]> {
  const db = await getDB();
  return db.getAllFromIndex('scenes', 'by-enabled', 1);
}
