/**
 * Message persistence via SQLite (V146)
 * 
 * Provides save/load/clear operations for chat messages.
 * Uses SQLite WASM (wa-sqlite) with change tracking for delta sync.
 */

import type { Message } from '../../types';
import { initDatabase } from '../../db/index';
import { SqliteStorage, getSqliteStorage } from './SqliteStorage';

/**
 * Save a single message to SQLite
 */
export async function saveMessage(msg: Message): Promise<void> {
  const storage = getSqliteStorage();
  storage.set('messages', msg.id, msg);
}

/**
 * Load all messages, optionally filtered by personaId
 */
export async function loadMessages(personaId?: string): Promise<Message[]> {
  const storage = getSqliteStorage();
  
  if (personaId) {
    const messages = storage.query<Message>('messages', { personaId });
    // Also include messages with no personaId (global messages)
    const globalMessages = storage.query<Message>('messages', {});
    // Merge and deduplicate by id
    const map = new Map<string, Message>();
    for (const m of [...globalMessages, ...messages]) {
      if (!personaId || m.personaId === personaId || m.personaId === undefined) {
        map.set(m.id, m);
      }
    }
    const result = Array.from(map.values());
    result.sort((a, b) => a.timestamp - b.timestamp);
    return result;
  } else {
    const messages = storage.query<Message>('messages', {});
    messages.sort((a, b) => a.timestamp - b.timestamp);
    return messages;
  }
}

/**
 * Clear messages, optionally filtered by personaId
 */
export async function clearMessages(personaId?: string): Promise<void> {
  const storage = getSqliteStorage();
  
  if (personaId) {
    const messages = storage.query<Message>('messages', { personaId });
    for (const msg of messages) {
      storage.delete('messages', msg.id);
    }
    // Also clear global messages
    const globalMessages = storage.query<Message>('messages', {});
    for (const msg of globalMessages) {
      if (!msg.personaId) {
        storage.delete('messages', msg.id);
      }
    }
  } else {
    const messages = storage.query<Message>('messages', {});
    for (const msg of messages) {
      storage.delete('messages', msg.id);
    }
  }
}

/**
 * Bulk save messages (e.g., when loading from DB and merging with store)
 */
export async function saveMessages(messages: Message[]): Promise<void> {
  if (messages.length === 0) return;
  const storage = getSqliteStorage();
  storage.beginTransaction();
  try {
    for (const msg of messages) {
      storage.set('messages', msg.id, msg);
    }
    storage.commit();
  } catch {
    storage.rollback();
    throw new Error('Failed to save messages');
  }
}

/**
 * Delete a specific message by id
 */
export async function deleteMessage(id: string): Promise<void> {
  const storage = getSqliteStorage();
  storage.delete('messages', id);
}
