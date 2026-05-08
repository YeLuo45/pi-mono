/**
 * Message persistence via IndexedDB
 * 
 * Provides save/load/clear operations for chat messages.
 * Used to persist messages across page refreshes.
 */

import type { Message } from '../../types';
import { getDB } from './db';

/**
 * Save a single message to IndexedDB
 */
export async function saveMessage(msg: Message): Promise<void> {
  const db = await getDB();
  await db.put('messages', msg);
}

/**
 * Load all messages, optionally filtered by personaId
 */
export async function loadMessages(personaId?: string): Promise<Message[]> {
  const db = await getDB();
  let messages: Message[];

  if (personaId) {
    // Use index for personaId filtering
    messages = await db.getAllFromIndex('messages', 'by-personaId', personaId);
    // Also include messages with no personaId (global messages)
    const globalMessages = await db.getAllFromIndex('messages', 'by-personaId', undefined);
    // Merge and deduplicate by id
    const map = new Map<string, Message>();
    for (const m of [...globalMessages, ...messages]) {
      map.set(m.id, m);
    }
    messages = Array.from(map.values());
  } else {
    messages = await db.getAll('messages');
  }

  // Sort by timestamp ascending
  messages.sort((a, b) => a.timestamp - b.timestamp);
  return messages;
}

/**
 * Clear messages, optionally filtered by personaId
 */
export async function clearMessages(personaId?: string): Promise<void> {
  const db = await getDB();
  if (personaId) {
    const messages = await db.getAllFromIndex('messages', 'by-personaId', personaId);
    const globalMessages = await db.getAllFromIndex('messages', 'by-personaId', undefined);
    const toDelete = [...messages, ...globalMessages];
    const uniqueById = new Map<string, Message>();
    for (const m of toDelete) {
      uniqueById.set(m.id, m);
    }
    const tx = db.transaction('messages', 'readwrite');
    await Promise.all([
      ...Array.from(uniqueById.keys()).map(id => tx.store.delete(id)),
      tx.done,
    ]);
  } else {
    await db.clear('messages');
  }
}

/**
 * Bulk save messages (e.g., when loading from DB and merging with store)
 */
export async function saveMessages(messages: Message[]): Promise<void> {
  if (messages.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('messages', 'readwrite');
  await Promise.all([
    ...messages.map(msg => tx.store.put(msg)),
    tx.done,
  ]);
}

/**
 * Delete a specific message by id
 */
export async function deleteMessage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('messages', id);
}
