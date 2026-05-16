/**
 * Session Store - V107: Memory Persistence V2
 * 
 * Zustand store with persist middleware for session state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AgentContext {
  // Placeholder for agent context structure
  [key: string]: unknown;
}

interface SessionState {
  currentSessionId: string | null;
  lastSaved: number | null;
  agentContext: AgentContext | null;
}

interface SessionActions {
  setSessionId: (sessionId: string) => void;
  updateAgentContext: (context: AgentContext) => void;
  clearSession: () => void;
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      // Initial state
      currentSessionId: null,
      lastSaved: null,
      agentContext: null,

      // Actions
      setSessionId: (sessionId) => set({ currentSessionId: sessionId }),
      updateAgentContext: (context) => set({ agentContext: context, lastSaved: Date.now() }),
      clearSession: () => set({ currentSessionId: null, agentContext: null, lastSaved: null }),
    }),
    {
      name: 'pixel-pal-session',
    }
  )
);