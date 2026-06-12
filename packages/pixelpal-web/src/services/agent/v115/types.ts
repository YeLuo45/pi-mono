/**
 * V115 Task Decomposition Engine - Type Definitions
 * 
 * Provides types for LLM-driven task decomposition with DAG support,
 * parallel execution optimization, and dynamic replanning.
 */

import type { AgentType, AgentMessage } from '../v114/types';

// ============================================================================
// Task Graph Types
// ============================================================================

export type TaskNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskPriority = 'high' | 'normal' | 'low';

export interface TaskStep {
  id: string;
  description: string;
  status: TaskNodeStatus;
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
}

export interface TaskNode {
  id: string;
  description: string;
  agentType: AgentType;
  subtasks: TaskStep[];
  parallelizable: boolean;
  dependsOn: string[];
  status: TaskNodeStatus;
  result?: unknown;
  error?: string;
  input?: unknown;
  output?: unknown;
  estimatedDuration?: number; // ms
  priority: TaskPriority;
  parallelGroup?: string; // group ID for parallel execution
  isCriticalPath?: boolean;
  startedAt?: number;
  completedAt?: number;
}

export interface DependencyEdge {
  sourceId: string;
  targetId: string;
  type: 'data' | 'control'; // data = output feeds input, control = must complete first
  dataFlowKey?: string; // which output key feeds which input
}

export interface TaskGraph {
  id: string;
  rootGoal: string;
  nodes: TaskNode[];
  edges: DependencyEdge[];
  parallelGroups: string[][]; // array of node ID groups that can run in parallel
  estimatedDuration: number; // total estimated ms
  criticalPath: string[]; // ordered node IDs on critical path
  createdAt: number;
  updatedAt: number;
}

export interface TaskResult {
  nodeId: string;
  status: TaskNodeStatus;
  result?: unknown;
  error?: string;
  executionTime: number;
  outputs: Record<string, unknown>; // collected outputs from this node
}

// ============================================================================
// Agent Context (for decomposition)
// ============================================================================

export interface AgentContext {
  agentId: string;
  taskId: string;
  messages: AgentMessage[];
  memory?: Record<string, unknown>;
  capabilities: string[];
  availableAgents: { type: AgentType; id: string; capabilities: string[] }[];
}

// ============================================================================
// Decomposition Result
// ============================================================================

export interface DecompositionPrompt {
  goal: string;
  context: AgentContext;
  constraints?: {
    maxTasks?: number;      // max number of sub-tasks (default: 7)
    maxDepth?: number;      // max nesting depth (default: 3)
    allowParallel?: boolean; // allow parallel task groups (default: true)
  };
}

export interface DecompositionResult {
  success: boolean;
  graph: TaskGraph;
  reasoning?: string; // LLM explanation of decomposition strategy
  warnings?: string[]; // potential issues detected
}

// ============================================================================
// Replanning Types
// ============================================================================

export interface ReplanTrigger {
  type: 'task_failed' | 'task_skipped' | 'feedback' | 'timeout' | 'manual';
  nodeId?: string;
  message: string;
}

export interface ReplanSuggestion {
  action: 'retry' | 'skip' | 'substitute' | 'reorder' | 'split' | 'merge';
  affectedNodes: string[];
  description: string;
  newGraph?: TaskGraph; // optional new graph if major restructuring needed
}

export interface ReplanResult {
  success: boolean;
  originalGraph: TaskGraph;
  newGraph?: TaskGraph;
  suggestions: ReplanSuggestion[];
  reasoning: string;
}

// ============================================================================
// Execution Types
// ============================================================================

export interface ExecutionGroup {
  groupId: string;
  nodeIds: string[];
  startedAt?: number;
  completedAt?: number;
  results: TaskResult[];
}

export interface ExecutionProgress {
  graphId: string;
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  skippedNodes: number;
  currentGroups: ExecutionGroup[];
  estimatedRemainingTime: number;
  criticalPathProgress: number; // 0-100
}

export interface ExecutionOptions {
  maxConcurrentGroups?: number; // max parallel groups (default: 3)
  continueOnFailure?: boolean;   // continue if a non-critical node fails
  timeout?: number;              // overall timeout in ms
  onProgress?: (progress: ExecutionProgress) => void;
  onNodeComplete?: (result: TaskResult) => void;
  onNodeFail?: (result: TaskResult) => void;
}

export interface ExecutionResult {
  success: boolean;
  graphId: string;
  totalExecutionTime: number;
  nodeResults: TaskResult[];
  aggregatedOutput: Record<string, unknown>;
  finalResult?: unknown;
  errors: string[];
}

// ============================================================================
// LLM Integration Types
// ============================================================================

export interface LLMDecompositionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMOutput {
  success: boolean;
  content: string;
  raw?: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Event Types
// ============================================================================

export type TaskDecompositionEventType =
  | 'decomposition:start'
  | 'decomposition:complete'
  | 'decomposition:error'
  | 'execution:start'
  | 'execution:group_start'
  | 'execution:node_start'
  | 'execution:node_complete'
  | 'execution:node_fail'
  | 'execution:group_complete'
  | 'execution:complete'
  | 'execution:error'
  | 'replan:triggered'
  | 'replan:complete'
  | 'progress:update';

export interface TaskDecompositionEvent {
  type: TaskDecompositionEventType;
  graphId: string;
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// Serialization (for SQLite persistence per V113)
// ============================================================================

export interface PersistedTaskGraph {
  id: string;
  rootGoal: string;
  nodesJson: string;     // serialized TaskNode[]
  edgesJson: string;     // serialized DependencyEdge[]
  parallelGroupsJson: string;
  criticalPathJson: string;
  estimatedDuration: number;
  createdAt: number;
  updatedAt: number;
}

export function serializeTaskGraph(graph: TaskGraph): PersistedTaskGraph {
  return {
    id: graph.id,
    rootGoal: graph.rootGoal,
    nodesJson: JSON.stringify(graph.nodes),
    edgesJson: JSON.stringify(graph.edges),
    parallelGroupsJson: JSON.stringify(graph.parallelGroups),
    criticalPathJson: JSON.stringify(graph.criticalPath),
    estimatedDuration: graph.estimatedDuration,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
  };
}

export function deserializeTaskGraph(persisted: PersistedTaskGraph): TaskGraph {
  return {
    id: persisted.id,
    rootGoal: persisted.rootGoal,
    nodes: JSON.parse(persisted.nodesJson),
    edges: JSON.parse(persisted.edgesJson),
    parallelGroups: JSON.parse(persisted.parallelGroupsJson),
    criticalPath: JSON.parse(persisted.criticalPathJson),
    estimatedDuration: persisted.estimatedDuration,
    createdAt: persisted.createdAt,
    updatedAt: persisted.updatedAt,
  };
}