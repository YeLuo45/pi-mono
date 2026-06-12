/**
 * V122 Multi-Step Role Chain - Type Definitions
 */

export type ChainNodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ChainStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ChainNodeType = 'role' | 'condition' | 'parallel' | 'aggregator';

export interface ChainNodeResult {
  nodeId: string;
  output: unknown;
  error?: string;
  duration: number;
  status: ChainNodeStatus;
}

export interface ChainNode {
  id: string;
  type: ChainNodeType;
  roleId?: string;
  condition?: string;           // JavaScript expression
  inputMapping?: Record<string, string>;  // target: source
  outputMapping?: Record<string, string>;  // source: target
  nextNodeId?: string;          // Default next node
  conditionNodes?: {            // Conditional branches
    trueNodeId?: string;
    falseNodeId?: string;
  };
  parallelNodes?: string[];     // Nodes to run in parallel
  aggregatorNodeId?: string;     // Node to aggregate parallel results
  metadata?: Record<string, unknown>;
}

export interface RoleChain {
  id: string;
  name: string;
  description: string;
  nodes: ChainNode[];
  entryNodeId: string;
  variables: Record<string, unknown>;     // Chain-level variables
  isBuiltIn: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface ChainExecutionContext {
  chainId: string;
  executionId: string;
  status: ChainStatus;
  currentNodeId: string | null;
  variables: Record<string, unknown>;
  nodeResults: Map<string, ChainNodeResult>;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'sequence' | 'conditional' | 'parallel';
  label?: string;
}

export interface DependencyGraph {
  nodes: { id: string; label: string; type: ChainNodeType }[];
  edges: DependencyEdge[];
  cycles: string[][];           // Detected cycles
  criticalPath: string[];       // Longest path
  parallelGroups: string[][];   // Nodes that can run in parallel
}

export interface ChainExecutionEvent {
  executionId: string;
  nodeId: string;
  type: 'start' | 'complete' | 'fail' | 'skip' | 'condition_result';
  data?: unknown;
  timestamp: number;
}
