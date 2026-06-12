/**
 * Task persistence via IndexedDB
 */

import type { Task } from '../../types';
import { getDB } from './db';

/**
 * Save a single task to IndexedDB
 */
export async function saveTask(task: Task): Promise<void> {
  const db = await getDB();
  await db.put('tasks', task);
}

/**
 * Load all tasks from IndexedDB
 */
export async function loadTasks(): Promise<Task[]> {
  const db = await getDB();
  return db.getAll('tasks');
}

/**
 * Delete a task by id
 */
export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('tasks', id);
}

/**
 * Bulk save tasks
 */
export async function saveTasks(tasks: Task[]): Promise<void> {
  if (tasks.length === 0) return;
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  await Promise.all([
    ...tasks.map(task => tx.store.put(task)),
    tx.done,
  ]);
}

/**
 * Clear all tasks
 */
export async function clearTasks(): Promise<void> {
  const db = await getDB();
  await db.clear('tasks');
}

// ============================================================================
// Agent Task Queue Persistence
// ============================================================================

import type { Task as AgentTask } from '../agent/types';

/** Queue metadata for persistence */
export interface QueuePersistData {
  tasks: AgentTask[];
  runningTaskId: string | null;
  savedAt: number;
}

/**
 * Save the full agent task queue to IndexedDB
 */
export async function saveTaskQueue(tasks: AgentTask[], runningTaskId: string | null): Promise<void> {
  const db = await getDB();
  const data = {
    id: 'queue',
    tasks,
    runningTaskId,
    savedAt: Date.now(),
  };
  await db.put('agentQueue', data);
}

/**
 * Load the agent task queue from IndexedDB
 */
export async function loadTaskQueue(): Promise<QueuePersistData | null> {
  const db = await getDB();
  const data = await db.get('agentQueue', 'queue');
  return data as QueuePersistData | null;
}

/**
 * Clear the agent task queue from IndexedDB
 */
export async function clearTaskQueue(): Promise<void> {
  const db = await getDB();
  await db.delete('agentQueue', 'queue');
}
