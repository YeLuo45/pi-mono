/**
 * ContextInheritance - Inherits relevant context from historical sessions
 * 
 * Features:
 * - Auto-inherit relevant historical context for new sessions
 * - Retrieve based on task type similarity
 * - Incremental updates (not full overwrite)
 */

import type { SharedMemoryEntry } from '../types';
import type { InheritanceResult, ContextItem } from '../types';
import { SharedMemoryStore } from './SharedMemoryStore';

export class ContextInheritance {
  private store: SharedMemoryStore;

  constructor(store: SharedMemoryStore) {
    this.store = store;
  }

  /**
   * Inherit context for a new session based on task type
   */
  inheritForNewSession(
    newSessionId: string,
    taskType: string,
    agentId: string,
    limit: number = 20
  ): InheritanceResult {
    // Strategy 1: Most recent session from same agent
    const agentRecent = this.store.getByAgent(agentId, 10);
    const recentSession = agentRecent.find(e => e.sessionId !== newSessionId);

    // Strategy 2: Entries with matching task type tags
    const taskTypeEntries = this.store.getByTag(taskType, limit);

    // Strategy 3: Recent across all sessions
    const recentGlobal = this.store.getRecentAcrossSessions(limit);

    const contextItems: ContextItem[] = [];
    let confidence = 0;
    let source: InheritanceResult['source'] = 'recent_session';

    // Build context items from recent session
    if (recentSession) {
      const items = this.buildContextItems(recentSession, 'current_session', 0.8);
      contextItems.push(...items);
      confidence = Math.max(confidence, 0.7);
      source = 'recent_session';
    }

    // Add task-specific entries
    for (const entry of taskTypeEntries.slice(0, 5)) {
      if (!contextItems.some(c => (c.data as SharedMemoryEntry)?.id === entry.id)) {
        contextItems.push(...this.buildContextItems(entry, 'shared_memory', 0.6));
        confidence = Math.max(confidence, 0.6);
        source = 'similar_task';
      }
    }

    // Add high-relevance global entries
    for (const entry of recentGlobal.slice(0, 3)) {
      if (!contextItems.some(c => (c.data as SharedMemoryEntry)?.id === entry.id)) {
        contextItems.push(...this.buildContextItems(entry, 'shared_memory', 0.3));
        confidence = Math.max(confidence, 0.3);
      }
    }

    // Sort by priority
    contextItems.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return {
      sessionId: newSessionId,
      contextItems: contextItems.slice(0, limit),
      confidence: Math.min(confidence, 0.95),
      source,
    };
  }

  /**
   * Incrementally update context without full overwrite
   */
  mergeIncremental(
    sessionId: string,
    newEntries: SharedMemoryEntry[]
  ): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    for (const entry of newEntries) {
      const existing = this.store.getByKey(sessionId, entry.agentId, entry.key);
      if (existing) {
        // Merge: update only if new version is higher
        if (entry.version > existing.version) {
          this.store.set(entry);
          updated++;
        }
      } else {
        this.store.set(entry);
        added++;
      }
    }

    return { added, updated };
  }

  /**
   * Get context summary for a session
   */
  getSessionContextSummary(sessionId: string): {
    totalEntries: number;
    agents: string[];
    tags: string[];
    latestUpdate: number;
  } {
    const entries = this.store.getBySession(sessionId, 100);

    const agents = [...new Set(entries.map(e => e.agentId))];
    const tags = [...new Set(entries.flatMap(e => e.tags))];
    const latestUpdate = entries.length > 0 
      ? Math.max(...entries.map(e => e.updatedAt))
      : 0;

    return {
      totalEntries: entries.length,
      agents,
      tags,
      latestUpdate,
    };
  }

  private buildContextItems(
    entry: SharedMemoryEntry,
    source: ContextItem['source'],
    basePriority: number
  ): ContextItem[] {
    const relevanceScore = basePriority * (entry.version > 1 ? 1.1 : 1); // Slightly boost updated entries

    return [{
      type: this.inferContextType(entry),
      priority: basePriority,
      source,
      data: entry,
      relevanceScore,
      retrievedAt: Date.now(),
    }];
  }

  private inferContextType(entry: SharedMemoryEntry): ContextItem['type'] {
    const key = entry.key.toLowerCase();
    if (key.includes('task') || key.includes('goal')) return 'task';
    if (key.includes('memory') || key.includes('remember')) return 'memory';
    if (key.includes('preference') || key.includes('setting')) return 'preference';
    if (key.includes('pattern') || key.includes('strategy')) return 'pattern';
    return 'knowledge';
  }
}
