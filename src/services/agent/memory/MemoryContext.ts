/**
 * MemoryContext - Core memory interface and implementation
 * 
 * Provides in-memory storage for agent context including facts, preferences,
 * contextual information, and task results.
 */

import type { Message } from '../../../types';

// ============================================================================
// Types
// ============================================================================

export type MemoryEntryType = 'fact' | 'preference' | 'context' | 'task_result';
export type MemoryImportance = 'high' | 'medium' | 'low';

export interface MemoryEntry {
  id: string;
  type: MemoryEntryType;
  content: string;
  importance: MemoryImportance;
  createdAt: number;
  expiresAt?: number;
}

export interface MemoryContext {
  entries: MemoryEntry[];
  sessionId: string;
  getRelevant(query: string, limit?: number): MemoryEntry[];
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): void;
  clear(): void;
}

// ============================================================================
// Implementation
// ============================================================================

class MemoryContextImpl implements MemoryContext {
  public entries: MemoryEntry[] = [];
  public sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Get entries relevant to a query using simple keyword matching
   */
  getRelevant(query: string, limit = 5): MemoryEntry[] {
    const now = Date.now();
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const scored = this.entries
      .filter(entry => !entry.expiresAt || entry.expiresAt > now)
      .map(entry => {
        let score = 0;
        const contentLower = entry.content.toLowerCase();
        
        // Exact keyword match
        for (const word of queryWords) {
          if (contentLower.includes(word)) {
            score += 1;
          }
        }
        
        // Importance boost
        if (entry.importance === 'high') score += 3;
        else if (entry.importance === 'medium') score += 1;
        
        // Recency boost (within 1 hour = high, 24 hours = medium)
        const age = now - entry.createdAt;
        if (age < 3600000) score += 2;
        else if (age < 86400000) score += 1;
        
        return { entry, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ entry }) => entry);
    
    return scored;
  }

  /**
   * Add a new memory entry
   */
  add(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): void {
    const newEntry: MemoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    this.entries.push(newEntry);
    
    // Keep max 100 entries to prevent memory bloat
    if (this.entries.length > 100) {
      this.entries = this.entries
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 100);
    }
  }

  /**
   * Clear all memory entries
   */
  clear(): void {
    this.entries = [];
  }
}

/**
 * Create a new MemoryContext instance
 */
export function createMemoryContext(sessionId: string): MemoryContext {
  return new MemoryContextImpl(sessionId);
}

export type { Message };
