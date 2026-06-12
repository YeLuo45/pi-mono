/**
 * IndexedDB database initialization using idb library
 * 
 * Database: pixel-pal-db v1
 * Object stores:
 *   - messages: Message records (indexed by timestamp, personaId)
 *   - tasks: Task records (indexed by status, dueDate)
 *   - events: Event records (indexed by startTime)
 *   - memories: MemoryEntry records (indexed by createdAt, type, personaId)
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Message, Task, Event } from '../../types';
import type { MemoryEntry } from '../memory/memoryTypes';

const DB_NAME = 'pixel-pal-db';
const DB_VERSION = 1;

export interface PixelPalDB {
  messages: {
    key: string;
    value: Message;
    indexes: {
      'by-timestamp': number;
      'by-personaId': string;
    };
  };
  tasks: {
    key: string;
    value: Task;
    indexes: {
      'by-status': string;
      'by-dueDate': string;
    };
  };
  events: {
    key: string;
    value: Event;
    indexes: {
      'by-startTime': string;
    };
  };
  memories: {
    key: string;
    value: MemoryEntry;
    indexes: {
      'by-createdAt': number;
      'by-type': string;
      'by-personaId': string;
    };
  };
  agentQueue: {
    key: string;
    value: {
      tasks: unknown[];
      runningTaskId: string | null;
      savedAt: number;
    };
  };
}

let dbInstance: IDBPDatabase<PixelPalDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<PixelPalDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PixelPalDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
        messagesStore.createIndex('by-timestamp', 'timestamp');
        messagesStore.createIndex('by-personaId', 'personaId');
      }

      // Tasks store
      if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id' });
        tasksStore.createIndex('by-status', 'status');
        tasksStore.createIndex('by-dueDate', 'dueDate');
      }

      // Events store
      if (!db.objectStoreNames.contains('events')) {
        const eventsStore = db.createObjectStore('events', { keyPath: 'id' });
        eventsStore.createIndex('by-startTime', 'startTime');
      }

      // Memories store
      if (!db.objectStoreNames.contains('memories')) {
        const memoriesStore = db.createObjectStore('memories', { keyPath: 'id' });
        memoriesStore.createIndex('by-createdAt', 'createdAt');
        memoriesStore.createIndex('by-type', 'type');
        memoriesStore.createIndex('by-personaId', 'personaId');
      }

      // Agent queue store
      if (!db.objectStoreNames.contains('agentQueue')) {
        db.createObjectStore('agentQueue', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
