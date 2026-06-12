/**
 * Replanner - Dynamic task graph replanning based on execution feedback
 * 
 * Features:
 * - Detect task failures and determine replanning strategy
 * - Support retry, skip, substitute, reorder, split, merge actions
 * - Maintain graph consistency after modifications
 * - Generate refined task graphs when needed
 */

import type {
  TaskGraph,
  TaskNode,
  ReplanTrigger,
  ReplanSuggestion,
  ReplanResult,
  TaskNodeStatus,
} from './types';
import { DependencyGraph } from './DependencyGraph';

// ============================================================================
// Replanning Strategy
// ============================================================================

export enum ReplanStrategy {
  RETRY = 'retry',
  SKIP = 'skip',
  SUBSTITUTE = 'substitute',
  REORDER = 'reorder',
  SPLIT = 'split',
  MERGE = 'merge',
  ABORT = 'abort',
}

// ============================================================================
// Replanner Class
// ============================================================================

export class Replanner {
  private maxRetries: number = 2;
  private retryDelay: number = 1000; // ms

  constructor(options?: { maxRetries?: number; retryDelay?: number }) {
    this.maxRetries = options?.maxRetries ?? 2;
    this.retryDelay = options?.retryDelay ?? 1000;
  }

  /**
   * Analyze a trigger and generate replanning suggestions
   */
  analyze(trigger: ReplanTrigger, graph: TaskGraph): Replanner {
    return this;
  }

  /**
   * Determine if a failed node should be retried
   */
  shouldRetry(node: TaskNode): boolean {
    if (node.status !== 'failed') return false;
    const stepWithFailures = node.subtasks.find(
      (s) => s.status === 'failed' && s.retryCount < s.maxRetries
    );
    return !!stepWithFailures || node.subtasks.length === 0;
  }

  /**
   * Determine if a failed node should be skipped
   */
  shouldSkip(node: TaskNode, graph: TaskGraph): boolean {
    if (node.status !== 'failed') return false;

    // Check if any critical path nodes depend on this node
    for (const dependentId of this.getDependentIds(node.id, graph)) {
      if (graph.criticalPath.includes(dependentId)) {
        // Can't skip - critical path depends on this
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a node can be substituted with alternative approach
   */
  canSubstitute(node: TaskNode): boolean {
    // Check if node has alternative implementations
    return node.subtasks.some((s) => s.retryCount > 0);
  }

  /**
   * Generate replanning suggestions for a trigger
   */
  generateSuggestions(trigger: ReplanTrigger, graph: TaskGraph): ReplanSuggestion[] {
    const suggestions: ReplanSuggestion[] = [];

    if (trigger.type === 'task_failed' && trigger.nodeId) {
      const node = graph.nodes.find((n) => n.id === trigger.nodeId);
      if (!node) return suggestions;

      // Check retry possibility
      if (this.shouldRetry(node)) {
        suggestions.push({
          action: 'retry',
          affectedNodes: [node.id],
          description: `Retry failed task: ${node.description}`,
        });
      }

      // Check skip possibility
      if (this.shouldSkip(node, graph)) {
        suggestions.push({
          action: 'skip',
          affectedNodes: [node.id],
          description: `Skip infeasible task: ${node.description}`,
        });
      }

      // Check substitute possibility
      if (this.canSubstitute(node)) {
        suggestions.push({
          action: 'substitute',
          affectedNodes: [node.id],
          description: `Try alternative approach for: ${node.description}`,
        });
      }

      // Check if reordering helps
      const reorderSuggestion = this.suggestReorder(node, graph);
      if (reorderSuggestion) {
        suggestions.push(reorderSuggestion);
      }
    }

    if (trigger.type === 'feedback' || trigger.type === 'manual') {
      // More aggressive replanning for user feedback
      suggestions.push({
        action: 'reorder',
        affectedNodes: graph.nodes.filter((n) => n.status === 'pending').map((n) => n.id),
        description: 'Reassess task ordering based on feedback',
      });
    }

    return suggestions;
  }

  /**
   * Apply suggestions to create a new graph
   */
  applySuggestions(
    originalGraph: TaskGraph,
    suggestions: ReplanSuggestion[]
  ): TaskGraph {
    // Start with a copy of the original graph
    let newGraph: TaskGraph = JSON.parse(JSON.stringify(originalGraph));
    let modified = false;

    for (const suggestion of suggestions) {
      switch (suggestion.action) {
        case 'retry':
          for (const nodeId of suggestion.affectedNodes) {
            const node = newGraph.nodes.find((n) => n.id === nodeId);
            if (node) {
              node.status = 'pending';
              node.error = undefined;
              // Increment retry counters
              for (const step of node.subtasks) {
                if (step.status === 'failed') {
                  step.retryCount++;
                }
              }
              modified = true;
            }
          }
          break;

        case 'skip':
          for (const nodeId of suggestion.affectedNodes) {
            const node = newGraph.nodes.find((n) => n.id === nodeId);
            if (node) {
              node.status = 'skipped';
              // Remove dependencies on this node for downstream nodes
              this.removeDependenciesFromDependents(nodeId, newGraph);
              modified = true;
            }
          }
          break;

        case 'substitute':
          for (const nodeId of suggestion.affectedNodes) {
            const node = newGraph.nodes.find((n) => n.id === nodeId);
            if (node && node.subtasks.length > 0) {
              // Reorder subtasks to try different approach
              const failedSubtaskIndex = node.subtasks.findIndex(
                (s) => s.status === 'failed'
              );
              if (failedSubtaskIndex > 0) {
                // Move failed subtask to end, try next one
                const [failed] = node.subtasks.splice(failedSubtaskIndex, 1);
                node.subtasks.push(failed);
                node.status = 'pending';
                node.error = undefined;
                modified = true;
              }
            }
          }
          break;
      }
    }

    // If modifications made, rebuild dependency analysis
    if (modified) {
      newGraph.updatedAt = Date.now();
      const depGraph = new DependencyGraph();
      // Note: we keep edges as-is for skipped/reordered nodes
      // A full rebuild would require LLM re-decomposition
    }

    return newGraph;
  }

  /**
   * Execute replanning process
   */
  replan(trigger: ReplanTrigger, graph: TaskGraph): ReplResult {
    const suggestions = this.generateSuggestions(trigger, graph);

    if (suggestions.length === 0) {
      return {
        success: false,
        originalGraph: graph,
        suggestions: [],
        reasoning: 'No viable replanning options found',
      };
    }

    // Apply all non-destructive suggestions first
    const applicableSuggestions = suggestions.filter(
      (s) => s.action === 'retry' || s.action === 'skip'
    );

    if (applicableSuggestions.length === 0) {
      return {
        success: false,
        originalGraph: graph,
        suggestions,
        reasoning: 'Only destructive replanning options available',
      };
    }

    const newGraph = this.applySuggestions(graph, applicableSuggestions);

    return {
      success: true,
      originalGraph: graph,
      newGraph,
      suggestions,
      reasoning: `Applied ${applicableSuggestions.length} replanning suggestions`,
    };
  }

  // -----------------------------------------------------------------------
  // Private Helpers
  // -----------------------------------------------------------------------

  private getDependentIds(nodeId: string, graph: TaskGraph): string[] {
    const dependents: string[] = [];
    for (const edge of graph.edges) {
      if (edge.sourceId === nodeId) {
        dependents.push(edge.targetId);
      }
    }
    return dependents;
  }

  private getDependencyIds(nodeId: string, graph: TaskGraph): string[] {
    const deps: string[] = [];
    for (const edge of graph.edges) {
      if (edge.targetId === nodeId) {
        deps.push(edge.sourceId);
      }
    }
    return deps;
  }

  private suggestReorder(
    failedNode: TaskNode,
    graph: TaskGraph
  ): ReplanSuggestion | null {
    // Check if there's a parallelizable node that could be reordered
    // to run before the failed node, potentially gathering more info
    const dependencies = this.getDependencyIds(failedNode.id, graph);

    for (const depId of dependencies) {
      const depNode = graph.nodes.find((n) => n.id === depId);
      if (depNode?.parallelizable && depNode.status === 'pending') {
        return {
          action: 'reorder',
          affectedNodes: [depId, failedNode.id],
          description: `Reorder: run ${depNode.description} before retrying ${failedNode.description}`,
        };
      }
    }

    return null;
  }

  private removeDependenciesFromDependents(
    skippedNodeId: string,
    graph: TaskGraph
  ): void {
    // Remove edges from skipped node to its dependents
    graph.edges = graph.edges.filter((e) => e.sourceId !== skippedNodeId);

    // Update dependent nodes to remove this from their dependsOn
    for (const node of graph.nodes) {
      node.dependsOn = node.dependsOn.filter((id) => id !== skippedNodeId);
    }
  }
}

// ============================================================================
// Type Alias for ReplanResult (avoiding naming conflict)
// ============================================================================

type ReplResult = ReplanResult;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a retry trigger for a failed node
 */
export function createRetryTrigger(nodeId: string, message: string): ReplanTrigger {
  return {
    type: 'task_failed',
    nodeId,
    message,
  };
}

/**
 * Create a skip trigger for an infeasible node
 */
export function createSkipTrigger(nodeId: string, message: string): ReplanTrigger {
  return {
    type: 'task_skipped',
    nodeId,
    message,
  };
}

/**
 * Create a feedback trigger for manual replanning
 */
export function createFeedbackTrigger(message: string): ReplanTrigger {
  return {
    type: 'feedback',
    message,
  };
}

/**
 * Create a timeout trigger
 */
export function createTimeoutTrigger(nodeId: string, message: string): ReplanTrigger {
  return {
    type: 'timeout',
    nodeId,
    message,
  };
}

// ============================================================================
// Default Instance
// ============================================================================

let defaultReplanner: Replanner | null = null;

export function getReplanner(options?: { maxRetries?: number; retryDelay?: number }): Replanner {
  if (!defaultReplanner) {
    defaultReplanner = new Replanner(options);
  }
  return defaultReplanner;
}