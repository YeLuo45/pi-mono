/**
 * Shared Context - V33 Multi-Agent Collaboration System
 * 
 * Provides a shared state container that all personas can access
 * during a collaboration session. Supports read/write operations
 * with trajectory-style primitives.
 */

import type {
  SharedContext as ISharedContext,
  SharedMemory,
  Entity,
  Fact,
  Decision,
  Subtask,
  SubtaskResult,
  CollaborationMessage,
} from './types';

// ============================================================================
// SharedContext Implementation
// ============================================================================

export class SharedContext implements ISharedContext {
  taskId: string;
  userRequest: string;
  subtasks: Subtask[];
  results: Map<string, SubtaskResult>;
  conversationHistory: CollaborationMessage[];
  sharedMemory: SharedMemory;
  createdAt: number;
  updatedAt: number;

  constructor(taskId: string, userRequest: string) {
    this.taskId = taskId;
    this.userRequest = userRequest;
    this.results = new Map();
    this.conversationHistory = [];
    this.sharedMemory = {
      entities: [],
      facts: [],
      decisions: [],
    };
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
    this.subtasks = [];
  }

  // ---- Read Operations ----

  /**
   * Read a value from the shared context by key
   * Supports dotted paths for nested access (e.g., 'emotion_data.trend')
   */
  read(key: string): unknown {
    this.updatedAt = Date.now();

    // Check results first
    if (this.results.has(key)) {
      return this.results.get(key)?.output;
    }

    // Check shared memory entities
    const entity = this.sharedMemory.entities.find(e => e.name === key);
    if (entity) return entity;

    // Check shared memory facts
    const fact = this.sharedMemory.facts.find(f => f.tags.includes(key));
    if (fact) return fact.content;

    // Check decisions
    const decision = this.sharedMemory.decisions.find(d => d.content.includes(key));
    if (decision) return decision;

    return undefined;
  }

  /**
   * Read all results from a specific role
   */
  readByRole(role: string): SubtaskResult[] {
    const results: SubtaskResult[] = [];
    this.results.forEach((result) => {
      if (result.role === role) {
        results.push(result);
      }
    });
    return results;
  }

  /**
   * Read all entities from shared memory
   */
  readEntities(): Entity[] {
    return [...this.sharedMemory.entities];
  }

  /**
   * Read all facts from shared memory
   */
  readFacts(): Fact[] {
    return [...this.sharedMemory.facts];
  }

  /**
   * Check if a subtask result exists
   */
  hasResult(subtaskId: string): boolean {
    return this.results.has(subtaskId);
  }

  /**
   * Get result by subtask ID
   */
  getResult(subtaskId: string): SubtaskResult | undefined {
    return this.results.get(subtaskId);
  }

  /**
   * Get all completed subtask results
   */
  getCompletedResults(): SubtaskResult[] {
    const results: SubtaskResult[] = [];
    this.results.forEach((result) => {
      results.push(result);
    });
    return results;
  }

  // ---- Write Operations ----

  /**
   * Write a key-value pair to the shared context
   */
  write(key: string, value: unknown): void {
    this.updatedAt = Date.now();
    
    // Store as a result with 'system' role
    const result: SubtaskResult = {
      subtaskId: key,
      role: 'MemoryExpert', // Default, can be changed
      output: String(value),
      confidence: 1.0,
    };
    this.results.set(key, result);
  }

  /**
   * Add an entity to shared memory
   */
  addEntity(entity: Omit<Entity, 'id' | 'lastUpdated'>): Entity {
    this.updatedAt = Date.now();
    
    const newEntity: Entity = {
      ...entity,
      id: `entity_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      lastUpdated: Date.now(),
    };
    
    this.sharedMemory.entities.push(newEntity);
    return newEntity;
  }

  /**
   * Update an existing entity
   */
  updateEntity(entityId: string, updates: Partial<Entity>): Entity | null {
    this.updatedAt = Date.now();
    
    const index = this.sharedMemory.entities.findIndex(e => e.id === entityId);
    if (index === -1) return null;
    
    this.sharedMemory.entities[index] = {
      ...this.sharedMemory.entities[index],
      ...updates,
      lastUpdated: Date.now(),
    };
    
    return this.sharedMemory.entities[index];
  }

  /**
   * Add a fact to shared memory
   */
  addFact(fact: Omit<Fact, 'id'>): Fact {
    this.updatedAt = Date.now();
    
    const newFact: Fact = {
      ...fact,
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };
    
    this.sharedMemory.facts.push(newFact);
    return newFact;
  }

  /**
   * Add a decision to shared memory
   */
  addDecision(decision: Omit<Decision, 'id' | 'timestamp'>): Decision {
    this.updatedAt = Date.now();
    
    const newDecision: Decision = {
      ...decision,
      id: `decision_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    };
    
    this.sharedMemory.decisions.push(newDecision);
    return newDecision;
  }

  /**
   * Store a subtask result
   */
  setResult(result: SubtaskResult): void {
    this.updatedAt = Date.now();
    this.results.set(result.subtaskId, result);
  }

  /**
   * Add a message to conversation history
   */
  addMessage(message: Omit<CollaborationMessage, 'id' | 'timestamp' | 'sessionId'>): CollaborationMessage {
    this.updatedAt = Date.now();
    
    const newMessage: CollaborationMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sessionId: this.taskId,
      timestamp: Date.now(),
    };
    
    this.conversationHistory.push(newMessage);
    return newMessage;
  }

  // ---- Utility Operations ----

  /**
   * Clear all results (but keep shared memory)
   */
  clearResults(): void {
    this.updatedAt = Date.now();
    this.results.clear();
  }

  /**
   * Clear entire context
   */
  clear(): void {
    this.updatedAt = Date.now();
    this.results.clear();
    this.conversationHistory = [];
    this.sharedMemory = {
      entities: [],
      facts: [],
      decisions: [],
    };
  }

  /**
   * Export context as plain object (for serialization)
   */
  toJSON(): object {
    return {
      taskId: this.taskId,
      userRequest: this.userRequest,
      results: Array.from(this.results.entries()),
      conversationHistory: this.conversationHistory,
      sharedMemory: this.sharedMemory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get context summary for debugging
   */
  getSummary(): {
    taskId: string;
    resultCount: number;
    entityCount: number;
    factCount: number;
    decisionCount: number;
    messageCount: number;
  } {
    return {
      taskId: this.taskId,
      resultCount: this.results.size,
      entityCount: this.sharedMemory.entities.length,
      factCount: this.sharedMemory.facts.length,
      decisionCount: this.sharedMemory.decisions.length,
      messageCount: this.conversationHistory.length,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new SharedContext instance
 */
export function createSharedContext(taskId: string, userRequest: string): SharedContext {
  return new SharedContext(taskId, userRequest);
}
