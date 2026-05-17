/**
 * V114 Multi-Agent System - Core Agent Type Definitions
 * 
 * Architecture:
 * - BaseAgent: Abstract base with common agent functionality
 * - MainAgent: Orchestrates sub-agents, handles high-level planning
 * - MemoryAgent: Long-term memory storage and retrieval
 * - SearchAgent: Web/file/search tool execution
 * - ToolAgent: Tool registration and execution
 * - PersonaAgent: Persona/personality-bound agent
 * - AgentRegistry: Global agent registration and lifecycle
 * - AgentLog: Per-agent execution logging
 */

import type { Task, TaskStep, AgentMessage } from '../types';

// ============================================================================
// Agent Type Definitions
// ============================================================================

export type AgentType = 'main' | 'memory' | 'search' | 'tool' | 'persona';
export type AgentStatus = 'idle' | 'initializing' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  personaId?: string;
  enabled: boolean;
  maxConcurrentTasks?: number;
  timeout?: number; // ms, 0 = no timeout
  capabilities?: string[]; // list of capability names this agent supports
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  totalExecutionTime: number; // ms
  lastActiveAt: number | null;
  averageResponseTime: number; // ms per task
}

// ============================================================================
// Agent Log Entry (for debugging/auditing)
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AgentLogEntry {
  id: string;
  agentId: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  taskId?: string;
  stepId?: string;
  data?: unknown;
}

// ============================================================================
// Agent Memory (per-agent working memory)
// ============================================================================

export interface AgentMemory {
  agentId: string;
  shortTerm: Map<string, unknown>;     // session-scoped key-value
  longTerm: Map<string, unknown>;     // persistent across sessions
  conversationBuffer: AgentMessage[];   // recent messages for context
  scratchpad: Record<string, unknown>;  // agent-specific working data
}

// ============================================================================
// Tool Definition (for ToolAgent)
// ============================================================================

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, context: AgentExecutionContext) => Promise<unknown>;
  retryable?: boolean;
  timeout?: number;
}

export interface AgentExecutionContext {
  agentId: string;
  taskId: string;
  stepId: string;
  personaId?: string;
  messages: AgentMessage[];
  memory?: AgentMemory;
}

// ============================================================================
// Re-export from existing types
// ============================================================================

export type { Task, TaskStep, AgentMessage };