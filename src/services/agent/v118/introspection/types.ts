/**
 * V118 Agent Introspection - Type Definitions
 */

export interface ExecutionRecord {
  id: string;
  taskId: string;
  taskType: string;
  taskInput: unknown;
  taskOutput: unknown;
  status: 'success' | 'failed' | 'partial';
  errorMessage?: string;
  startTime: number;
  endTime: number;
  duration: number;
  parallelGroup: number;
  agentAssignments: string[];
  subTaskCount: number;
  retryCount: number;
  metadata?: Record<string, unknown>;
}

export interface TaskPattern {
  taskType: string;
  avgDuration: number;
  successRate: number;
  avgSubTasks: number;
  bestAgentCombination: string[];
  executionCount: number;
  lastExecutedAt: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface AgentMetrics {
  agentId: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  currentLoad: number;
  peakLoad: number;
  lastExecutionAt: number;
  consecutiveFailures: number;
}

export interface StrategyRecommendation {
  taskType: string;
  recommendedAgents: string[];
  estimatedDuration: number;
  confidence: number;
  basedOnExecutions: number;
  parallelGroupSize: number;
  reasoning: string;
}

export interface ExecutionStats {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  mostCommonFailure: string;
}

export interface TimeSeriesPoint {
  timestamp: number;
  successRate: number;
  avgDuration: number;
  executionCount: number;
}
