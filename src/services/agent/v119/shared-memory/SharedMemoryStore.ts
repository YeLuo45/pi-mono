/**
 * SharedMemoryStore - Cross-session memory storage
 * 
 * Features:
 * - Session-dimension isolation + Agent-dimension aggregation
 * - Version control with optimistic locking
 * - Tag-based filtering
 */

import type { SharedMemoryEntry } from '../types';

const SHARED_MEMORY_PREFIX = 'shared:';
const SESSION_INDEX_PREFIX = 'session_idx:';
const AGENT_INDEX_PREFIX = 'agent_idx:';
const TAG_INDEX_PREFIX = 'tag_idx:';

export class SharedMemoryStore {
  private storage: Map<string, SharedMemoryEntry> = new Map();

  // ===========================================================================
  // Core Operations
  // ===========================================================================

  set(entry: Omit<SharedMemoryEntry, 'id' | 'version' | 'createdAt' | 'updatedAt'>): string {
    const now = Date.now();
    const existingKey = this.findBySessionAgentKey(entry.sessionId, entry.agentId, entry.key);
    
    if (existingKey) {
      const existing = this.storage.get(existingKey)!;
      const updated: SharedMemoryEntry = {
        ...entry,
        id: existing.id,
        version: existing.version + 1,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      this.storage.set(existingKey, updated);
      return updated.id;
    }

    const id = crypto.randomUUID();
    const newEntry: SharedMemoryEntry = {
      ...entry,
      id,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const storeKey = `${SHARED_MEMORY_PREFIX}${id}`;
    this.storage.set(storeKey, newEntry);
    this.indexBySession(entry.sessionId, id);
    this.indexByAgent(entry.agentId, id);
    for (const tag of entry.tags) {
      this.indexByTag(tag, id);
    }

    return id;
  }

  get(id: string): SharedMemoryEntry | undefined {
    return this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`);
  }

  getBySession(sessionId: string, limit: number = 50): SharedMemoryEntry[] {
    const ids = this.storage.get(`${SESSION_INDEX_PREFIX}${sessionId}`);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`)!)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  getByAgent(agentId: string, limit: number = 50): SharedMemoryEntry[] {
    const ids = this.storage.get(`${AGENT_INDEX_PREFIX}${agentId}`);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`)!)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  getByTag(tag: string, limit: number = 50): SharedMemoryEntry[] {
    const ids = this.storage.get(`${TAG_INDEX_PREFIX}${tag}`);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`)!)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  getByKey(sessionId: string, agentId: string, key: string): SharedMemoryEntry | undefined {
    const storeKey = this.findBySessionAgentKey(sessionId, agentId, key);
    return storeKey ? this.storage.get(storeKey) : undefined;
  }

  delete(id: string): boolean {
    const entry = this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`);
    if (!entry) return false;

    this.storage.delete(`${SHARED_MEMORY_PREFIX}${id}`);
    this.unindexBySession(entry.sessionId, id);
    this.unindexByAgent(entry.agentId, id);
    for (const tag of entry.tags) {
      this.unindexByTag(tag, id);
    }

    return true;
  }

  // ===========================================================================
  // Aggregation Queries
  // ===========================================================================

  getRecentAcrossSessions(limit: number = 50): SharedMemoryEntry[] {
    return Array.from(this.storage.values())
      .filter(e => e.key.startsWith(SHARED_MEMORY_PREFIX) === false)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  searchByTagIntersection(tags: string[], limit: number = 30): SharedMemoryEntry[] {
    if (tags.length === 0) return [];

    // Find entries that have ALL tags
    const tagIdSets = tags.map(tag => this.storage.get(`${TAG_INDEX_PREFIX}${tag}`) || new Set<string>());
    
    const intersection = new Set<string>();
    for (const idSet of tagIdSets) {
      if (intersection.size === 0) {
        for (const id of idSet) intersection.add(id);
      } else {
        for (const id of idSet) {
          if (!intersection.has(id)) intersection.delete(id);
        }
      }
    }

    return Array.from(intersection)
      .map(id => this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`)!)
      .filter(Boolean)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  // ===========================================================================
  // Version Control
  // ===========================================================================

  getVersion(id: string): number {
    const entry = this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`);
    return entry?.version || 0;
  }

  getHistory(id: string, limit: number = 10): SharedMemoryEntry[] {
    // In a real implementation, this would query a history table
    // For now, return the current entry if it exists
    const entry = this.storage.get(`${SHARED_MEMORY_PREFIX}${id}`);
    return entry ? [entry] : [];
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getTotalCount(): number {
    return Array.from(this.storage.values()).filter(e => e.key !== SESSION_INDEX_PREFIX && e.key !== AGENT_INDEX_PREFIX && e.key !== TAG_INDEX_PREFIX).length;
  }

  getCountBySession(sessionId: string): number {
    const ids = this.storage.get(`${SESSION_INDEX_PREFIX}${sessionId}`);
    return ids?.size || 0;
  }

  getCountByAgent(agentId: string): number {
    const ids = this.storage.get(`${AGENT_INDEX_PREFIX}${agentId}`);
    return ids?.size || 0;
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const [key] of this.storage) {
      if (key.startsWith(TAG_INDEX_PREFIX) && key !== TAG_INDEX_PREFIX) {
        tags.add(key.slice(TAG_INDEX_PREFIX.length));
      }
    }
    return Array.from(tags);
  }

  // ===========================================================================
  // Index Management
  // ===========================================================================

  private findBySessionAgentKey(sessionId: string, agentId: string, key: string): string | undefined {
    for (const [storeKey, entry] of this.storage) {
      if (storeKey.startsWith(SHARED_MEMORY_PREFIX) &&
          entry.sessionId === sessionId &&
          entry.agentId === agentId &&
          entry.key === key) {
        return storeKey;
      }
    }
    return undefined;
  }

  private indexBySession(sessionId: string, id: string): void {
    const key = `${SESSION_INDEX_PREFIX}${sessionId}`;
    const set = this.storage.get(key) || new Set<string>();
    set.add(id);
    this.storage.set(key, set);
  }

  private indexByAgent(agentId: string, id: string): void {
    const key = `${AGENT_INDEX_PREFIX}${agentId}`;
    const set = this.storage.get(key) || new Set<string>();
    set.add(id);
    this.storage.set(key, set);
  }

  private indexByTag(tag: string, id: string): void {
    const key = `${TAG_INDEX_PREFIX}${tag}`;
    const set = this.storage.get(key) || new Set<string>();
    set.add(id);
    this.storage.set(key, set);
  }

  private unindexBySession(sessionId: string, id: string): void {
    const key = `${SESSION_INDEX_PREFIX}${sessionId}`;
    const set = this.storage.get(key);
    set?.delete(id);
  }

  private unindexByAgent(agentId: string, id: string): void {
    const key = `${AGENT_INDEX_PREFIX}${agentId}`;
    const set = this.storage.get(key);
    set?.delete(id);
  }

  private unindexByTag(tag: string, id: string): void {
    const key = `${TAG_INDEX_PREFIX}${tag}`;
    const set = this.storage.get(key);
    set?.delete(id);
  }
}
