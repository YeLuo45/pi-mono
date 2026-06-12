// Plugin Storage — wraps IndexedDB with plugin-specific namespace
import { openDB, type IDBPDatabase } from 'idb';
import type { PluginStorage } from './types';

function createPluginDB(pluginId: string): Promise<IDBPDatabase> {
  return openDB(`plugin_${pluginId}_store`, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('data')) {
        db.createObjectStore('data');
      }
    },
  });
}

export function createPluginStorage(pluginId: string): PluginStorage {
  let dbPromise: Promise<IDBPDatabase> | null = null;

  const getDB = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
      dbPromise = createPluginDB(pluginId);
    }
    return dbPromise;
  };

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const db = await getDB();
      return db.get('data', key) as Promise<T | undefined>;
    },

    async set<T>(key: string, value: T): Promise<void> {
      const db = await getDB();
      await db.put('data', value, key);
    },

    async delete(key: string): Promise<void> {
      const db = await getDB();
      await db.delete('data', key);
    },

    async list(): Promise<string[]> {
      const db = await getDB();
      return db.getAllKeys('data') as Promise<string[]>;
    },

    async clear(): Promise<void> {
      const db = await getDB();
      await db.clear('data');
    },
  };
}
