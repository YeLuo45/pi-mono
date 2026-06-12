import { openDB, type IDBPDatabase } from 'idb';
import type { ToolCallLog } from './types';

const DB_NAME = 'pixelpal-tools';
const DB_VERSION = 1;
const STORE_NAME = 'tool_call_logs';

interface ToolDB {
  tool_call_logs: {
    key: string;
    value: {
      id: string;
      name: string;
      args: string;
      result: string;
      duration_ms: number;
      timestamp: number;
      success: number;
      error: string | null;
      task_id: string | null;
    };
    indexes: { 'by-timestamp': number; 'by-task_id': string };
  };
}

let dbPromise: Promise<IDBPDatabase<ToolDB>> | null = null;

async function getDB(): Promise<IDBPDatabase<ToolDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ToolDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-task_id', 'task_id');
        }
      },
    });
  }
  return dbPromise;
}

export class ToolExecutionLogger {
  static async log(log: ToolCallLog): Promise<void> {
    const db = await getDB();
    await db.put(STORE_NAME, {
      id: log.id,
      name: log.name,
      args: JSON.stringify(log.args),
      result: JSON.stringify(log.result),
      duration_ms: log.duration_ms,
      timestamp: log.timestamp,
      success: log.success ? 1 : 0,
      error: log.error,
      task_id: log.task_id ?? null,
    });
  }

  static async getHistory(taskId?: string, limit: number = 20): Promise<ToolCallLog[]> {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = taskId ? tx.store.index('by-task_id') : tx.store.index('by-timestamp');

    const entries: ToolCallLog[] = [];
    let cursor: IDBPDatabase<ToolDB>[typeof STORE_NAME]['cursor'] | undefined;

    if (taskId) {
      cursor = await index.openCursor(IDBKeyRange.only(taskId), 'prev');
    } else {
      cursor = await index.openCursor(null, 'prev');
    }

    let count = 0;
    while (cursor && count < limit) {
      const val = cursor.value;
      entries.push({
        id: val.id,
        name: val.name,
        args: JSON.parse(val.args || '{}'),
        result: JSON.parse(val.result || 'null'),
        duration_ms: val.duration_ms,
        timestamp: val.timestamp,
        success: val.success === 1,
        error: val.error,
        task_id: val.task_id ?? undefined,
      });
      count++;
      cursor = await cursor.continue();
    }

    return entries;
  }
}
