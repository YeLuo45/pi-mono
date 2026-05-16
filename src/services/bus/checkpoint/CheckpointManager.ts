/**
 * CheckpointManager
 * V105: Checkpoint + Progress Tracker
 * 
 * Manages checkpoint persistence to localStorage for session recovery.
 */

import type { CheckpointData } from './types';

const CHECKPOINT_PREFIX = 'checkpoint:';

export class CheckpointManager {
  /**
   * Save checkpoint data to localStorage
   * V107: Also stub call to MemoryStore.saveSession for future persistence
   */
  save(sessionId: string, data: CheckpointData): void {
    try {
      const key = `${CHECKPOINT_PREFIX}${sessionId}`;
      localStorage.setItem(key, JSON.stringify(data));
      // TODO: V107 - MemoryStore.saveSession({ id: sessionId, checkpointData: data, ... })
    } catch (error) {
      console.error(`[CheckpointManager] Failed to save checkpoint for session ${sessionId}:`, error);
    }
  }

  /**
   * Load checkpoint data from localStorage
   */
  load(sessionId: string): CheckpointData | null {
    try {
      const key = `${CHECKPOINT_PREFIX}${sessionId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored) as CheckpointData;
    } catch (error) {
      console.error(`[CheckpointManager] Failed to load checkpoint for session ${sessionId}:`, error);
      return null;
    }
  }

  /**
   * Clear checkpoint data from localStorage
   */
  clear(sessionId: string): void {
    try {
      const key = `${CHECKPOINT_PREFIX}${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[CheckpointManager] Failed to clear checkpoint for session ${sessionId}:`, error);
    }
  }

  /**
   * List all checkpoint sessionIds stored in localStorage
   */
  list(): string[] {
    const sessionIds: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CHECKPOINT_PREFIX)) {
          sessionIds.push(key.replace(CHECKPOINT_PREFIX, ''));
        }
      }
    } catch (error) {
      console.error('[CheckpointManager] Failed to list checkpoints:', error);
    }
    return sessionIds;
  }
}

// Singleton instance
export const checkpointManager = new CheckpointManager();