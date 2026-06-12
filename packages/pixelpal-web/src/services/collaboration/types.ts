/**
 * Collaboration Types - V33 Multi-Agent Collaboration System
 * 
 * Core type definitions for the collaboration framework:
 * - Task decomposition types
 * - Shared context types
 * - Persona role types
 * - Result aggregation types
 */

// ============================================================================
// Task Types
// ============================================================================

export type TaskType =
  | 'memory_retrieval'
  | 'emotion_analysis'
  | 'advice_generation'
  | 'web_search'
  | 'code_execution';

export type PersonaRole =
  | 'MemoryExpert'
  | 'EmotionAnalyst'
  | 'Advisor'
  | 'Researcher'
  | 'Coder';

export type SubtaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface Subtask {
  id: string;
  type: TaskType;
  description: string;
  params: Record<string, unknown>;
  responsible: PersonaRole;
  status: SubtaskStatus;
  result?: unknown;
  error?: string;
  dependencies: string[];  // IDs of subtasks this depends on
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface SubtaskResult {
  subtaskId: string;
  role: PersonaRole;
  output: string;
  confidence: number;  // 0-1
  entities?: Entity[];
  facts?: Fact[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Shared Context Types
// ============================================================================

export interface Entity {
  id: string;
  name: string;
  type: string;
  traits: string[];
  importance: number;  // 0-1
  lastUpdated: number;
}

export interface Fact {
  id: string;
  content: string;
  source: string;      // subtask id that produced this
  confidence: number;  // 0-1
  tags: string[];
}

export interface Decision {
  id: string;
  content: string;
  rationale: string;
  votedBy: PersonaRole[];
  timestamp: number;
}

export interface SharedMemory {
  entities: Entity[];
  facts: Fact[];
  decisions: Decision[];
}

export interface SharedContext {
  taskId: string;
  userRequest: string;
  subtasks: Subtask[];
  results: Map<string, SubtaskResult>;
  conversationHistory: CollaborationMessage[];
  sharedMemory: SharedMemory;
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// Collaboration Session Types
// ============================================================================

export type SessionStatus = 
  | 'decomposing'    // Breaking down user request into subtasks
  | 'executing'      // Running subtasks
  | 'aggregating'    // Gathering results
  | 'done'           // Completed successfully
  | 'failed';        // Failed with errors

export interface CollaborationSession {
  id: string;
  userRequest: string;
  subtasks: Subtask[];
  results: Map<string, SubtaskResult>;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageType = 
  | 'contribution'   // Persona contributed a result
  | 'question'       // Persona asked a question
  | 'agreement'       // Persona agreed with another
  | 'disagreement'   // Persona disagreed
  | 'summary'        // Summary of progress
  | 'synthesis';     // Final synthesized response

export interface CollaborationMessage {
  id: string;
  sessionId: string;
  role: PersonaRole;
  personaId: string;
  content: string;
  timestamp: number;
  type: MessageType;
  replyTo?: string;          // ID of message being responded to
  confidence?: number;       // Confidence level 0-1
  subtaskId?: string;        // Associated subtask if any
}

// ============================================================================
// Persona Role Types
// ============================================================================

export interface PersonaRoleConfig {
  role: PersonaRole;
  capabilities: string[];           // List of capabilities
  systemPrompt: string;             // Role system prompt
  maxConcurrentTasks: number;       // Max parallel tasks for this role
  defaultModel?: string;            // Preferred model for this role
  temperature?: number;              // Response temperature
}

export interface PersonaContribution {
  personaId: string;
  role: PersonaRole;
  perspective: string;        // The perspective this persona adds
  keyPoints: string[];        // Key points made
  emotion: string;            // Detected emotion in contribution
  confidence: number;          // Confidence in contribution
}

// ============================================================================
// Conflict Resolution Types
// ============================================================================

export type ConflictStrategy = 'vote' | 'arbitration' | 'confidence_weighted';

export interface ConflictReport {
  subtaskIdA: string;
  subtaskIdB: string;
  conclusionA: string;
  conclusionB: string;
  resolution?: string;
  strategy: ConflictStrategy;
  resolvedAt?: number;
}

// ============================================================================
// Orchestrator Types
// ============================================================================

export interface OrchestratorConfig {
  maxConcurrentSubtasks: number;    // Max parallel subtasks
  taskTimeout: number;              // Timeout per subtask in ms
  maxRetries: number;              // Max retries on failure
  enableConflictResolution: boolean;
  conflictStrategy: ConflictStrategy;
}

export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  maxConcurrentSubtasks: 3,
  taskTimeout: 30000,  // 30 seconds
  maxRetries: 2,
  enableConflictResolution: true,
  conflictStrategy: 'confidence_weighted',
};

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface ProgressUpdate {
  sessionId: string;
  status: SessionStatus;
  progress: number;          // 0-100
  activeSubtasks: string[];   // IDs of currently running subtasks
  completedSubtasks: string[];
  failedSubtasks: string[];
  message?: string;           // Human-readable status message
  timestamp: number;
}

// ============================================================================
// Event Types (for UI updates)
// ============================================================================

export type CollaborationEventType =
  | 'session_started'
  | 'task_decomposed'
  | 'subtask_started'
  | 'subtask_completed'
  | 'subtask_failed'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'aggregation_started'
  | 'session_completed'
  | 'session_failed'
  | 'progress_update';

export interface CollaborationEvent {
  type: CollaborationEventType;
  sessionId: string;
  data?: unknown;
  timestamp: number;
}
