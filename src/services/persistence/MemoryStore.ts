/**
 * MemoryStore - V107: Memory Persistence V2
 * 
 * Stub implementation for session persistence.
 * All methods log their actions and return stub values.
 */

export interface AgentSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  agentContext: Record<string, unknown>;
  checkpointData?: {
    planText: string;
    stepIndex: number;
    totalSteps: number;
  };
}

export class MemoryStore {
  /**
   * Save a session to storage
   */
  async saveSession(session: AgentSession): Promise<void> {
    console.log('[MemoryStore] saveSession called with session:', session.id);
  }

  /**
   * Load a session by ID
   */
  async loadSession(id: string): Promise<AgentSession | null> {
    console.log('[MemoryStore] loadSession called with id:', id);
    return null;
  }

  /**
   * List all stored sessions
   */
  async listSessions(): Promise<AgentSession[]> {
    console.log('[MemoryStore] listSessions called');
    return [];
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(id: string): Promise<void> {
    console.log('[MemoryStore] deleteSession called with id:', id);
  }

  /**
   * Prune sessions older than maxAge (in ms)
   */
  async pruneOldSessions(maxAge: number): Promise<void> {
    console.log('[MemoryStore] pruneOldSessions called with maxAge:', maxAge);
  }
}

// Singleton instance
export const memoryStore = new MemoryStore();