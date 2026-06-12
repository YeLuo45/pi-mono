/**
 * ParallelExecutor - Parallel task execution engine for task graphs
 * 
 * Features:
 * - Execute DAGs with parallel group optimization
 * - Progress tracking and callback notifications
 * - Timeout and error handling
 * - Result aggregation from parallel branches
 */

import type {
  TaskGraph,
  TaskNode,
  TaskResult,
  ExecutionGroup,
  ExecutionProgress,
  ExecutionOptions,
  ExecutionResult,
  TaskNodeStatus,
} from './types';
import { DependencyGraph } from './DependencyGraph';
import { AgentRegistry } from '../v114/AgentRegistry';
import { BaseAgent } from '../v114/BaseAgent';

// ============================================================================
// Errors
// ============================================================================

export class ExecutionTimeoutError extends Error {
  constructor(
    public readonly graphId: string,
    public readonly elapsedTime: number,
    message = `Execution timeout for graph ${graphId} after ${elapsedTime}ms`
  ) {
    super(message);
    this.name = 'ExecutionTimeoutError';
  }
}

export class ExecutionCancelledError extends Error {
  constructor(message = 'Execution was cancelled') {
    super(message);
    this.name = 'ExecutionCancelledError';
  }
}

// ============================================================================
// ParallelExecutor Class
// ============================================================================

export class ParallelExecutor {
  private graph: TaskGraph | null = null;
  private dependencyGraph: DependencyGraph | null = null;
  private executionGroups: ExecutionGroup[] = [];
  private nodeResults: Map<string, TaskResult> = new Map();
  private startTime: number = 0;
  private cancelled: boolean = false;
  private paused: boolean = false;
  private pausedGroups: Set<string> = new Set();

  // -----------------------------------------------------------------------
  // Public Methods
  // -----------------------------------------------------------------------

  /**
   * Execute a complete task graph
   */
  async executeDAG(
    graph: TaskGraph,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    this.initializeExecution(graph);

    const maxConcurrentGroups = options.maxConcurrentGroups || 3;
    const timeout = options.timeout || 300000; // 5 minutes default
    const continueOnFailure = options.continueOnFailure ?? true;

    const errors: string[] = [];
    let overallSuccess = true;

    try {
      this.emitProgress(options);

      for (let i = 0; i < this.executionGroups.length; i++) {
        if (this.cancelled) {
          throw new ExecutionCancelledError();
        }

        // Wait if paused
        while (this.paused && !this.cancelled) {
          await this.sleep(100);
        }

        const group = this.executionGroups[i];
        group.startedAt = Date.now();

        // Execute group with concurrency limit
        const groupResults = await this.executeGroup(group, options);

        group.completedAt = Date.now();
        group.results = groupResults;

        // Check for failures
        for (const result of groupResults) {
          if (result.status === 'failed') {
            errors.push(`Node ${result.nodeId}: ${result.error}`);
            if (!this.isNodeCritical(result.nodeId)) {
              // Non-critical failure, mark as skipped and continue
              this.updateNodeStatus(result.nodeId, 'skipped');
            } else {
              // Critical failure
              overallSuccess = false;
              if (!continueOnFailure) {
                throw new Error(`Critical node ${result.nodeId} failed: ${result.error}`);
              }
            }
          }
        }

        this.emitProgress(options);

        // Check timeout
        const elapsed = Date.now() - this.startTime;
        if (elapsed > timeout) {
          throw new ExecutionTimeoutError(graph.id, elapsed);
        }
      }

      // Collect aggregated outputs
      const aggregatedOutput = this.aggregateOutputs();

      return {
        success: overallSuccess && !this.cancelled,
        graphId: graph.id,
        totalExecutionTime: Date.now() - this.startTime,
        nodeResults: Array.from(this.nodeResults.values()),
        aggregatedOutput,
        finalResult: aggregatedOutput['final'],
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        graphId: graph.id,
        totalExecutionTime: Date.now() - this.startTime,
        nodeResults: Array.from(this.nodeResults.values()),
        aggregatedOutput: this.aggregateOutputs(),
        errors: [...errors, errorMessage],
      };
    }
  }

  /**
   * Execute a single group of parallel tasks
   */
  async executeGroup(
    group: ExecutionGroup,
    options: ExecutionOptions
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];

    // Execute all nodes in group concurrently
    const promises = group.nodeIds.map((nodeId) =>
      this.executeNode(nodeId, options)
    );

    const groupResults = await Promise.allSettled(promises);

    for (const result of groupResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // This shouldn't happen as executeNode handles its own errors
        results.push({
          nodeId: 'unknown',
          status: 'failed' as TaskNodeStatus,
          error: result.reason?.message || 'Unknown error',
          executionTime: 0,
          outputs: {},
        });
      }
    }

    return results;
  }

  /**
   * Execute a single node
   */
  async executeNode(
    nodeId: string,
    options: ExecutionOptions
  ): Promise<TaskResult> {
    const node = this.dependencyGraph?.getNode(nodeId);
    if (!node) {
      return {
        nodeId,
        status: 'failed',
        error: `Node not found: ${nodeId}`,
        executionTime: 0,
        outputs: {},
      };
    }

    const startTime = Date.now();

    try {
      // Update status to running
      this.updateNodeStatus(nodeId, 'running');
      node.startedAt = startTime;

      options.onNodeStart?.(node);

      // Execute based on agent type
      const result = await this.delegateToAgent(node);

      const executionTime = Date.now() - startTime;
      const taskResult: TaskResult = {
        nodeId,
        status: 'completed',
        result: result.output,
        executionTime,
        outputs: { [nodeId]: result.output },
      };

      this.nodeResults.set(nodeId, taskResult);
      node.result = result.output;
      node.status = 'completed';
      node.completedAt = Date.now();

      options.onNodeComplete?.(taskResult);

      return taskResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const taskResult: TaskResult = {
        nodeId,
        status: 'failed',
        error: errorMessage,
        executionTime,
        outputs: {},
      };

      this.nodeResults.set(nodeId, taskResult);
      node.error = errorMessage;
      node.status = 'failed';
      node.completedAt = Date.now();

      options.onNodeFail?.(taskResult);

      return taskResult;
    }
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Pause execution
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume execution
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Get current progress
   */
  getProgress(): ExecutionProgress | null {
    if (!this.graph || !this.dependencyGraph) {
      return null;
    }

    const progress = this.dependencyGraph.calculateProgress();
    const criticalPathProgress = this.calculateCriticalPathProgress();

    return {
      graphId: this.graph.id,
      totalNodes: this.graph.nodes.length,
      completedNodes: progress.completed,
      failedNodes: progress.failed,
      skippedNodes: progress.skipped,
      currentGroups: this.executionGroups.filter((g) => g.startedAt && !g.completedAt),
      estimatedRemainingTime: this.estimateRemainingTime(),
      criticalPathProgress,
    };
  }

  // -----------------------------------------------------------------------
  // Private Methods
  // -----------------------------------------------------------------------

  private initializeExecution(graph: TaskGraph): void {
    this.graph = graph;
    this.dependencyGraph = new DependencyGraph();
    
    // Rebuild graph for execution
    for (const node of graph.nodes) {
      // Reset node status
      node.status = 'pending';
      node.result = undefined;
      node.error = undefined;
      node.startedAt = undefined;
      node.completedAt = undefined;
    }

    // Build parallel execution groups
    this.executionGroups = graph.parallelGroups.map((groupIds, index) => ({
      groupId: `group-${index}`,
      nodeIds: groupIds,
      results: [],
    }));

    this.nodeResults.clear();
    this.startTime = Date.now();
    this.cancelled = false;
    this.paused = false;
  }

  private async delegateToAgent(node: TaskNode): Promise<{ output: unknown }> {
    const registry = AgentRegistry.getInstance();
    const agent = registry.getAgentByType(node.agentType);

    if (!agent) {
      // Fall back to main agent if specific type not found
      const mainAgent = registry.getMainAgent();
      if (!mainAgent) {
        throw new Error(`No agent available for type: ${node.agentType}`);
      }
      return this.executeWithAgent(mainAgent, node);
    }

    return this.executeWithAgent(agent, node);
  }

  private async executeWithAgent(
    agent: BaseAgent,
    node: TaskNode
  ): Promise<{ output: unknown }> {
    // Create a task-like structure for the agent
    const taskContext = {
      id: node.id,
      description: node.description,
      input: node.input,
      agentType: node.agentType,
    };

    // Execute via agent - this is simplified; real implementation
    // would use agent's specific execution method
    if (agent.isRunning()) {
      // Agent is running, delegate task
      // In a real implementation, this would call agent.executeTask() or similar
      return { output: { status: 'executed', nodeId: node.id } };
    } else {
      // Start agent if not running
      await agent.initialize();
      await agent.start();
      return { output: { status: 'executed', nodeId: node.id } };
    }
  }

  private updateNodeStatus(nodeId: string, status: TaskNodeStatus): void {
    const node = this.graph?.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = status;
    }
  }

  private isNodeCritical(nodeId: string): boolean {
    return this.graph?.criticalPath.includes(nodeId) ?? false;
  }

  private calculateCriticalPathProgress(): number {
    if (!this.graph) return 0;

    const criticalPath = this.graph.criticalPath;
    if (criticalPath.length === 0) return 100;

    let completedOnPath = 0;
    for (const nodeId of criticalPath) {
      const node = this.graph.nodes.find((n) => n.id === nodeId);
      if (node?.status === 'completed') {
        completedOnPath++;
      }
    }

    return Math.round((completedOnPath / criticalPath.length) * 100);
  }

  private estimateRemainingTime(): number {
    if (!this.graph) return 0;

    const progress = this.getProgress();
    if (!progress) return 0;

    const totalDuration = this.graph.estimatedDuration;
    const elapsed = Date.now() - this.startTime;
    const completedRatio = progress.completedNodes / this.graph.nodes.length;

    const projectedTotal = elapsed / (completedRatio || 0.001);
    return Math.max(0, projectedTotal - elapsed);
  }

  private aggregateOutputs(): Record<string, unknown> {
    const aggregated: Record<string, unknown> = {};

    for (const result of this.nodeResults.values()) {
      if (result.outputs) {
        Object.assign(aggregated, result.outputs);
      }
    }

    // Mark final output
    aggregated['final'] = aggregated;

    return aggregated;
  }

  private emitProgress(options: ExecutionOptions): void {
    const progress = this.getProgress();
    if (progress && options.onProgress) {
      options.onProgress(progress);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Callback Types Extension
// ============================================================================

declare module './types' {
  interface ExecutionOptions {
    onNodeStart?: (node: TaskNode) => void;
  }
}

// ============================================================================
// Default Instance
// ============================================================================

let defaultExecutor: ParallelExecutor | null = null;

export function getParallelExecutor(): ParallelExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new ParallelExecutor();
  }
  return defaultExecutor;
}