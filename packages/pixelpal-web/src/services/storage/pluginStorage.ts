/**
 * Plugin persistence via IndexedDB
 *
 * Stores user-installed plugins (not preset plugins which are loaded from code).
 * Object store: 'plugins' — keyed by plugin id.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Plugin, StoredPlugin } from '../../types/plugin';

const DB_NAME = 'pixel-pal-plugin-db';
const DB_VERSION = 1;
const STORE_NAME = 'plugins';

interface PluginDB {
  plugins: {
    key: string;
    value: StoredPlugin;
  };
}

let dbInstance: IDBPDatabase<PluginDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PluginDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PluginDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'manifest.id' });
      }
    },
  });

  return dbInstance;
}

/** Load all stored plugins */
export async function getPlugins(): Promise<Plugin[]> {
  const db = await getDB();
  const stored: StoredPlugin[] = await db.getAll(STORE_NAME);

  return stored.map((s) => ({
    ...s.manifest,
    actions: s.actions.map((a) => ({
      ...a,
      // Rehydrate handler — user plugin actions won't have real handlers stored,
      // so actions with stored plugins are display-only until we add a proper
      // action-loading mechanism. Preset plugins carry live handlers.
      handler: async () => `Action ${a.name} not implemented`,
    })),
  }));
}

/** Save a plugin to IndexedDB */
export async function savePlugin(plugin: Plugin): Promise<void> {
  const db = await getDB();
  const stored: StoredPlugin = {
    manifest: {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      author: plugin.author,
      description: plugin.description,
      icon: plugin.icon,
      enabled: plugin.enabled,
      permissions: plugin.permissions,
    },
    actions: plugin.actions.map((a) => ({
      id: a.id,
      name: a.name,
      params: a.params,
    })),
    config: {},
  };
  await db.put(STORE_NAME, stored);
}

/** Delete a plugin from IndexedDB */
export async function deletePlugin(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/** Update the enabled state of a plugin */
export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  const db = await getDB();
  const stored = await db.get(STORE_NAME, id);
  if (stored) {
    stored.manifest.enabled = enabled;
    await db.put(STORE_NAME, stored);
  }
}

/** Load only enabled plugins */
export async function getEnabledPlugins(): Promise<Plugin[]> {
  const plugins = await getPlugins();
  return plugins.filter((p) => p.enabled);
}
