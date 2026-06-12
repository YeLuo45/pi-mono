// WebhookStore — IndexedDB-backed webhook persistence
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Webhook, WebhookExecutionLog } from './types';

const DB_NAME = 'pixelpal_webhooks';
const DB_VERSION = 1;
const STORE_WEBHOOKS = 'webhooks';
const STORE_LOGS = 'logs';
const STORE_PENDING = 'pending'; // missed execution records for backfill

interface WebhookDBSchema extends DBSchema {
  webhooks: {
    key: string;
    value: Webhook;
  };
  logs: {
    key: string;
    value: WebhookExecutionLog;
    indexes: {
      'by_webhook': string;
      'by_timestamp': number;
    };
  };
  pending: {
    key: string;
    value: {
      id: string;
      webhookId: string;
      scheduledFor: number; // timestamp that was missed
      createdAt: number;
    };
    indexes: {
      'by_webhook': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<WebhookDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<WebhookDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<WebhookDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_WEBHOOKS)) {
          db.createObjectStore(STORE_WEBHOOKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_LOGS)) {
          const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
          logStore.createIndex('by_webhook', 'webhookId');
          logStore.createIndex('by_timestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(STORE_PENDING)) {
          const pStore = db.createObjectStore(STORE_PENDING, { keyPath: 'id' });
          pStore.createIndex('by_webhook', 'webhookId');
        }
      },
    });
  }
  return dbPromise;
}

export const WebhookStore = {
  // --- Webhook CRUD ---
  async getAll(): Promise<Webhook[]> {
    const db = await getDB();
    return db.getAll(STORE_WEBHOOKS);
  },

  async get(id: string): Promise<Webhook | undefined> {
    const db = await getDB();
    return db.get(STORE_WEBHOOKS, id);
  },

  async save(webhook: Webhook): Promise<void> {
    const db = await getDB();
    await db.put(STORE_WEBHOOKS, webhook);
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_WEBHOOKS, id);
    // Also delete associated logs
    const logs = await db.getAllFromIndex(STORE_LOGS, 'by_webhook', id);
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    for (const log of logs) {
      await tx.store.delete(log.id);
    }
    await tx.done;
    // Delete pending records
    const pending = await db.getAllFromIndex(STORE_PENDING, 'by_webhook', id);
    const pTx = db.transaction(STORE_PENDING, 'readwrite');
    for (const p of pending) {
      await pTx.store.delete(p.id);
    }
    await pTx.done;
  },

  // --- Execution Logs ---
  async getLogs(webhookId: string, limit = 50): Promise<WebhookExecutionLog[]> {
    const db = await getDB();
    const logs = await db.getAllFromIndex(STORE_LOGS, 'by_webhook', webhookId);
    return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  },

  async addLog(log: WebhookExecutionLog): Promise<void> {
    const db = await getDB();
    await db.put(STORE_LOGS, log);
    // Keep only last 200 logs per webhook
    const logs = await db.getAllFromIndex(STORE_LOGS, 'by_webhook', log.webhookId);
    if (logs.length > 200) {
      const sorted = logs.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = sorted.slice(200);
      const tx = db.transaction(STORE_LOGS, 'readwrite');
      for (const l of toDelete) {
        await tx.store.delete(l.id);
      }
      await tx.done;
    }
  },

  async clearLogs(webhookId: string): Promise<void> {
    const db = await getDB();
    const logs = await db.getAllFromIndex(STORE_LOGS, 'by_webhook', webhookId);
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    for (const log of logs) {
      await tx.store.delete(log.id);
    }
    await tx.done;
  },

  // --- Pending missed executions (backfill) ---
  async addPending(webhookId: string, scheduledFor: number): Promise<void> {
    const db = await getDB();
    await db.put(STORE_PENDING, {
      id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      webhookId,
      scheduledFor,
      createdAt: Date.now(),
    });
  },

  async getPending(limit = 10): Promise<Array<{ id: string; webhookId: string; scheduledFor: number }>> {
    const db = await getDB();
    const all = await db.getAll(STORE_PENDING);
    return all
      .sort((a, b) => a.scheduledFor - b.scheduledFor)
      .slice(0, limit);
  },

  async deletePending(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_PENDING, id);
  },

  async clearPending(webhookId: string): Promise<void> {
    const db = await getDB();
    const all = await db.getAllFromIndex(STORE_PENDING, 'by_webhook', webhookId);
    const tx = db.transaction(STORE_PENDING, 'readwrite');
    for (const p of all) {
      await tx.store.delete(p.id);
    }
    await tx.done;
  },
};
