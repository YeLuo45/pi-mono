/**
 * Event persistence via IndexedDB
 */

import type { Event } from '../../types';
import { getDB } from './db';

/**
 * Save a single event to IndexedDB
 */
export async function saveEvent(event: Event): Promise<void> {
  const db = await getDB();
  await db.put('events', event);
}

/**
 * Load all events from IndexedDB
 */
export async function loadEvents(): Promise<Event[]> {
  const db = await getDB();
  return db.getAll('events');
}

/**
 * Delete an event by id
 */
export async function deleteEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('events', id);
}

/**
 * Bulk save events
 */
export async function saveEvents(events: Event[]): Promise<void> {
  if (events.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('events', 'readwrite');
  await Promise.all([
    ...events.map(event => tx.store.put(event)),
    tx.done,
  ]);
}

/**
 * Clear all events
 */
export async function clearEvents(): Promise<void> {
  const db = await getDB();
  await db.clear('events');
}
