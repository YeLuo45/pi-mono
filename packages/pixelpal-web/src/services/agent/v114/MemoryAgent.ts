/**
 * MemoryAgent - Long-term memory and context agent
 * 
 * Responsibilities:
 * - Store and retrieve information from long-term memory
 * - Manage conversation context buffer
 * - Provide relevant memories for a given query
 * - Handle memory persistence
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentMemory } from './types';
import { getAllPersonas } from '../../persona/personaStorage';

export class MemoryAgent extends BaseAgent {
  private memoryStore: Map<string, unknown> = new Map();
  private conversationBuffer: AgentMessage[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  constructor(config: AgentConfig) {
    super(config);
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'MemoryAgent initializing');
    await this.loadPersistedMemory();
    this.log('info', `MemoryAgent initialized with ${this.memoryStore.size} stored items`);
  }

  protected async onStart(): Promise<void> {
    this.log('info', 'MemoryAgent started');
  }

  protected async onPause(): Promise<void> {
    this.log('info', 'MemoryAgent paused');
    await this.persistMemory();
  }

  protected async onResume(): Promise<void> {
    this.log('info', 'MemoryAgent resumed');
  }

  protected async onStop(): Promise<void> {
    this.log('info', 'MemoryAgent stopping');
    await this.persistMemory();
  }

  protected async executeTask(task: import('./types').Task): Promise<void> {
    throw new Error('MemoryAgent does not execute tasks directly, use specific methods');
  }

  // --------------------------------------------------------------------------
  // Memory Operations
  // --------------------------------------------------------------------------

  /**
   * Store a key-value pair in long-term memory
   */
  async store(key: string, value: unknown, personaId?: string): Promise<void> {
    const storageKey = personaId ? `${personaId}:${key}` : key;
    this.memoryStore.set(storageKey, value);
    this.log('info', `Stored memory: ${storageKey}`, { valueType: typeof value });
  }

  /**
   * Retrieve a value from long-term memory
   */
  async retrieve(key: string, personaId?: string): Promise<unknown | null> {
    const storageKey = personaId ? `${personaId}:${key}` : key;
    const value = this.memoryStore.get(storageKey) ?? null;
    this.log('debug', `Retrieved memory: ${storageKey}`, { found: value !== null });
    return value;
  }

  /**
   * Search memories by keyword
   */
  async search(query: string, limit = 10): Promise<Array<{ key: string; value: unknown; relevance: number }>> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ key: string; value: unknown; relevance: number }> = [];

    for (const [key, value] of this.memoryStore.entries()) {
      const keyMatch = key.toLowerCase().includes(lowerQuery);
      const valueMatch = String(value).toLowerCase().includes(lowerQuery);
      
      if (keyMatch || valueMatch) {
        results.push({
          key,
          value,
          relevance: keyMatch ? 1.0 : 0.5,
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  /**
   * Delete a memory key
   */
  async forget(key: string, personaId?: string): Promise<boolean> {
    const storageKey = personaId ? `${personaId}:${key}` : key;
    const existed = this.memoryStore.has(storageKey);
    this.memoryStore.delete(storageKey);
    this.log('info', `Forgot memory: ${storageKey}`, { existed });
    return existed;
  }

  /**
   * Get all memories for a specific persona
   */
  async getPersonaMemories(personaId: string): Promise<Map<string, unknown>> {
    const personaMemories = new Map<string, unknown>();
    const prefix = `${personaId}:`;
    
    for (const [key, value] of this.memoryStore.entries()) {
      if (key.startsWith(prefix)) {
        personaMemories.set(key.substring(prefix.length), value);
      }
    }
    
    return personaMemories;
  }

  /**
   * Clear all memories (use with caution)
   */
  async clearAll(personaId?: string): Promise<void> {
    if (personaId) {
      const prefix = `${personaId}:`;
      for (const key of this.memoryStore.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryStore.delete(key);
        }
      }
      this.log('warn', `Cleared all memories for persona: ${personaId}`);
    } else {
      this.memoryStore.clear();
      this.log('warn', 'Cleared all memories');
    }
  }

  // --------------------------------------------------------------------------
  // Conversation Buffer
  // --------------------------------------------------------------------------

  /**
   * Add a message to the conversation buffer
   */
  addToBuffer(message: AgentMessage): void {
    this.conversationBuffer.push(message);
    if (this.conversationBuffer.length > this.MAX_BUFFER_SIZE) {
      this.conversationBuffer.shift();
    }
  }

  /**
   * Get recent conversation context
   */
  getRecentContext(limit = 20): AgentMessage[] {
    return this.conversationBuffer.slice(-limit);
  }

  /**
   * Clear the conversation buffer
   */
  clearBuffer(): void {
    this.conversationBuffer = [];
  }

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  private async loadPersistedMemory(): Promise<void> {
    try {
      // Load from persona storage
      const personas = getAllPersonas();
      for (const persona of personas) {
        if (persona.id) {
          const memKey = `memory:${persona.id}`;
          const stored = localStorage.getItem(memKey);
          if (stored) {
            const data = JSON.parse(stored);
            if (data && typeof data === 'object') {
              for (const [k, v] of Object.entries(data)) {
                this.memoryStore.set(`${persona.id}:${k}`, v);
              }
            }
          }
        }
      }
    } catch (error) {
      this.log('error', 'Failed to load persisted memory', { error });
    }
  }

  private async persistMemory(): Promise<void> {
    try {
      // Persist per-persona memories
      const byPersona = new Map<string, Record<string, unknown>>();
      
      for (const [key, value] of this.memoryStore.entries()) {
        const colonIdx = key.indexOf(':');
        if (colonIdx > 0) {
          const personaId = key.substring(0, colonIdx);
          const memKey = key.substring(colonIdx + 1);
          if (!byPersona.has(personaId)) {
            byPersona.set(personaId, {});
          }
          byPersona.get(personaId)![memKey] = value;
        }
      }

      for (const [personaId, memories] of byPersona.entries()) {
        localStorage.setItem(`memory:${personaId}`, JSON.stringify(memories));
      }
      
      this.log('debug', 'Memory persisted');
    } catch (error) {
      this.log('error', 'Failed to persist memory', { error });
    }
  }

  // --------------------------------------------------------------------------
  // Memory Stats
  // --------------------------------------------------------------------------

  getMemoryStats(): { totalItems: number; personaCount: number } {
    const personaIds = new Set<string>();
    for (const key of this.memoryStore.keys()) {
      const colonIdx = key.indexOf(':');
      if (colonIdx > 0) {
        personaIds.add(key.substring(0, colonIdx));
      }
    }
    return {
      totalItems: this.memoryStore.size,
      personaCount: personaIds.size,
    };
  }
}