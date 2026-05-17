/**
 * DependencyGraph - DAG Builder and Analyzer for Task Decomposition
 * 
 * Features:
 * - Build directed acyclic graph from task nodes
 * - Identify parallel execution groups
 * - Calculate critical path
 * - Detect circular dependencies
 */

import type {
  TaskNode,
  DependencyEdge,
  TaskGraph,
  TaskNodeStatus,
} from './types';

// ============================================================================
// Errors
// ============================================================================

export class CyclicDependencyError extends Error {
  constructor(
    public readonly cyclePath: string[],
    message = `Cyclic dependency detected: ${cyclePath.join(' -> ')}`
  ) {
    super(message);
    this.name = 'CyclicDependencyError';
  }
}

// ============================================================================
// DependencyGraph Class
// ============================================================================

export class DependencyGraph {
  private nodes: Map<string, TaskNode> = new Map();
  private edges: DependencyEdge[] = [];
  private adjacencyList: Map<string, string[]> = new Map(); // node -> its dependents
  private reverseAdjacencyList: Map<string, string[]> = new Map(); // node -> its dependencies

  // -----------------------------------------------------------------------
  // Graph Construction
  // -----------------------------------------------------------------------

  /**
   * Build graph from nodes and dependencies
   */
  buildGraph(
    rootGoal: string,
    nodes: TaskNode[],
    edges: DependencyEdge[]
  ): TaskGraph {
    // Validate and add nodes
    for (const node of nodes) {
      this.addNode(node);
    }

    // Validate and add edges
    for (const edge of edges) {
      this.addEdge(edge);
    }

    // Check for cycles
    this.validateNoCycles();

    // Calculate parallel groups
    const parallelGroups = this.computeParallelGroups();

    // Calculate critical path
    const criticalPath = this.computeCriticalPath();

    // Estimate total duration
    const estimatedDuration = this.estimateTotalDuration();

    const graph: TaskGraph = {
      id: crypto.randomUUID(),
      rootGoal,
      nodes: Array.from(this.nodes.values()),
      edges: [...this.edges],
      parallelGroups,
      estimatedDuration,
      criticalPath,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return graph;
  }

  /**
   * Add a node to the graph
   */
  addNode(node: TaskNode): void {
    if (this.nodes.has(node.id)) {
      throw new Error(`Node already exists: ${node.id}`);
    }
    this.nodes.set(node.id, { ...node, dependsOn: [...node.dependsOn] });
    this.adjacencyList.set(node.id, []);
    this.reverseAdjacencyList.set(node.id, []);
  }

  /**
   * Add an edge (dependency) to the graph
   */
  addEdge(edge: DependencyEdge): void {
    if (!this.nodes.has(edge.sourceId)) {
      throw new Error(`Source node not found: ${edge.sourceId}`);
    }
    if (!this.nodes.has(edge.targetId)) {
      throw new Error(`Target node not found: ${edge.targetId}`);
    }
    this.edges.push({ ...edge });
    this.adjacencyList.get(edge.sourceId)!.push(edge.targetId);
    this.reverseAdjacencyList.get(edge.targetId)!.push(edge.sourceId);
  }

  // -----------------------------------------------------------------------
  // Graph Analysis
  // -----------------------------------------------------------------------

  /**
   * Compute groups of nodes that can execute in parallel
   * Uses topological levels - nodes at the same level without dependencies
   */
  computeParallelGroups(): string[][] {
    const groups: string[][] = [];
    const visited = new Set<string>();
    const inDegree = this.computeInDegrees();

    while (visited.size < this.nodes.size) {
      // Find all nodes with no remaining dependencies
      const currentLevel: string[] = [];
      
      for (const [nodeId] of this.nodes) {
        if (!visited.has(nodeId) && inDegree.get(nodeId) === 0) {
          currentLevel.push(nodeId);
        }
      }

      if (currentLevel.length === 0 && visited.size < this.nodes.size) {
        // Should not happen if graph is valid (no cycles)
        throw new Error('Unable to compute parallel groups: possible cycle');
      }

      groups.push([...currentLevel]);
      
      // Mark these as visited and decrease in-degree of dependents
      for (const nodeId of currentLevel) {
        visited.add(nodeId);
        const dependents = this.adjacencyList.get(nodeId) || [];
        for (const dependent of dependents) {
          inDegree.set(dependent, (inDegree.get(dependent) || 1) - 1);
        }
      }
    }

    return groups;
  }

  /**
   * Compute in-degree for each node (number of dependencies)
   */
  private computeInDegrees(): Map<string, number> {
    const inDegree = new Map<string, number>();
    
    for (const [nodeId] of this.nodes) {
      const deps = this.reverseAdjacencyList.get(nodeId) || [];
      inDegree.set(nodeId, deps.length);
    }
    
    return inDegree;
  }

  /**
   * Compute the critical path (longest path through the graph)
   * Used to highlight the most important sequence of tasks
   */
  computeCriticalPath(): string[] {
    // Build list of nodes sorted by topological order
    const sorted = this.topologicalSort();
    
    // DP: longest path ending at each node (in terms of duration)
    const dist = new Map<string, { distance: number; predecessor: string | null }>();
    
    for (const nodeId of sorted) {
      const node = this.nodes.get(nodeId)!;
      dist.set(nodeId, { distance: node.estimatedDuration || 0, predecessor: null });
    }

    // Forward pass: compute longest distances
    for (const nodeId of sorted) {
      const currentDist = dist.get(nodeId)!;
      const dependents = this.adjacencyList.get(nodeId) || [];
      
      for (const dependent of dependents) {
        const dependentNode = this.nodes.get(dependent)!;
        const dependentDist = dist.get(dependent)!;
        const newDist = currentDist.distance + (dependentNode.estimatedDuration || 0);
        
        if (newDist > dependentDist.distance) {
          dist.set(dependent, { distance: newDist, predecessor: nodeId });
        }
      }
    }

    // Find the end node with maximum distance
    let maxDistance = 0;
    let endNode: string | null = null;
    
    for (const [nodeId, data] of dist) {
      if (data.distance > maxDistance) {
        maxDistance = data.distance;
        endNode = nodeId;
      }
    }

    // Backtrack to find critical path
    const criticalPath: string[] = [];
    let current: string | null = endNode;
    
    while (current) {
      criticalPath.unshift(current);
      current = dist.get(current)!.predecessor;
    }

    return criticalPath;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  topologicalSort(): string[] {
    const inDegree = this.computeInDegrees();
    const queue: string[] = [];
    const result: string[] = [];

    // Start with nodes that have no dependencies
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      const dependents = this.adjacencyList.get(nodeId) || [];
      for (const dependent of dependents) {
        const newDegree = (inDegree.get(dependent) || 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    return result;
  }

  /**
   * Validate that graph has no cycles
   */
  validateNoCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cyclePath: string[] = [];

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      cyclePath.push(nodeId);

      const dependents = this.adjacencyList.get(nodeId) || [];
      for (const dependent of dependents) {
        if (!visited.has(dependent)) {
          if (dfs(dependent)) {
            return true;
          }
        } else if (recursionStack.has(dependent)) {
          // Found cycle
          const cycleStart = cyclePath.indexOf(dependent);
          cyclePath.push(dependent); // complete the cycle
          throw new CyclicDependencyError(cyclePath.slice(cycleStart));
        }
      }

      cyclePath.pop();
      recursionStack.delete(nodeId);
      return false;
    };

    for (const [nodeId] of this.nodes) {
      if (!visited.has(nodeId)) {
        if (dfs(nodeId)) {
          break;
        }
      }
    }
  }

  /**
   * Check if adding an edge would create a cycle
   */
  wouldCreateCycle(sourceId: string, targetId: string): boolean {
    // If target depends on source, adding source->target edge creates cycle
    const targetDeps = this.reverseAdjacencyList.get(targetId) || [];
    const visited = new Set<string>();
    
    const dfs = (nodeId: string): boolean => {
      if (nodeId === sourceId) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      
      const deps = this.reverseAdjacencyList.get(nodeId) || [];
      for (const dep of deps) {
        if (dfs(dep)) return true;
      }
      return false;
    };

    return dfs(sourceId);
  }

  /**
   * Estimate total execution duration
   */
  estimateTotalDuration(): number {
    // Find maximum path length considering parallel execution
    const parallelGroups = this.computeParallelGroups();
    let totalDuration = 0;

    for (const group of parallelGroups) {
      // Duration of a level is the max of any node in that level (they run in parallel)
      let levelDuration = 0;
      for (const nodeId of group) {
        const node = this.nodes.get(nodeId);
        const duration = node?.estimatedDuration || 0;
        levelDuration = Math.max(levelDuration, duration);
      }
      totalDuration += levelDuration;
    }

    return totalDuration;
  }

  /**
   * Get nodes with no dependencies (can start immediately)
   */
  getRootNodes(): TaskNode[] {
    const roots: TaskNode[] = [];
    for (const [nodeId, node] of this.nodes) {
      const deps = this.reverseAdjacencyList.get(nodeId) || [];
      if (deps.length === 0) {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * Get nodes that depend on a given node
   */
  getDependents(nodeId: string): TaskNode[] {
    const dependentIds = this.adjacencyList.get(nodeId) || [];
    return dependentIds
      .map((id) => this.nodes.get(id))
      .filter((n): n is TaskNode => n !== undefined);
  }

  /**
   * Get dependencies of a node
   */
  getDependencies(nodeId: string): TaskNode[] {
    const depIds = this.reverseAdjacencyList.get(nodeId) || [];
    return depIds
      .map((id) => this.nodes.get(id))
      .filter((n): n is TaskNode => n !== undefined);
  }

  /**
   * Get all nodes at a specific parallel group index
   */
  getNodesAtLevel(level: number): TaskNode[] {
    const groups = this.computeParallelGroups();
    if (level < 0 || level >= groups.length) {
      return [];
    }
    return groups[level]
      .map((id) => this.nodes.get(id))
      .filter((n): n is TaskNode => n !== undefined);
  }

  /**
   * Calculate overall progress
   */
  calculateProgress(): { completed: number; running: number; pending: number; failed: number } {
    let completed = 0;
    let running = 0;
    let pending = 0;
    let failed = 0;

    for (const node of this.nodes.values()) {
      switch (node.status) {
        case 'completed':
          completed++;
          break;
        case 'running':
          running++;
          break;
        case 'failed':
          failed++;
          break;
        default:
          pending++;
      }
    }

    return { completed, running, pending, failed };
  }

  /**
   * Reset all node statuses
   */
  resetStatuses(): void {
    for (const node of this.nodes.values()) {
      node.status = 'pending';
      node.result = undefined;
      node.error = undefined;
      node.startedAt = undefined;
      node.completedAt = undefined;
      for (const step of node.subtasks) {
        step.status = 'pending';
        step.result = undefined;
        step.error = undefined;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  getNode(nodeId: string): TaskNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): TaskNode[] {
    return Array.from(this.nodes.values());
  }

  getAllEdges(): DependencyEdge[] {
    return [...this.edges];
  }

  getGraphSummary(): {
    totalNodes: number;
    totalEdges: number;
    parallelGroupCount: number;
    estimatedDuration: number;
    criticalPathLength: number;
  } {
    const parallelGroups = this.computeParallelGroups();
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      parallelGroupCount: parallelGroups.length,
      estimatedDuration: this.estimateTotalDuration(),
      criticalPathLength: this.computeCriticalPath().length,
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a DependencyGraph from a TaskGraph (for re-analysis)
 */
export function createDependencyGraphFromTaskGraph(taskGraph: TaskGraph): DependencyGraph {
  const graph = new DependencyGraph();
  for (const node of taskGraph.nodes) {
    graph.addNode({ ...node });
  }
  for (const edge of taskGraph.edges) {
    graph.addEdge({ ...edge });
  }
  return graph;
}

/**
 * Merge multiple task graphs (for sub-task decomposition)
 */
export function mergeTaskGraphs(
  parent: TaskGraph,
  childGraphs: TaskGraph[],
  parentToChildMapping: Map<string, string> // parent node id -> child root node id
): TaskGraph {
  const allNodes: TaskNode[] = [...parent.nodes];
  const allEdges: DependencyEdge[] = [...parent.edges];

  for (const childGraph of childGraphs) {
    // Add child nodes
    for (const node of childGraph.nodes) {
      if (!allNodes.find((n) => n.id === node.id)) {
        allNodes.push({ ...node });
      }
    }

    // Add child edges
    for (const edge of childGraph.edges) {
      if (!allEdges.find((e) => e.sourceId === edge.sourceId && e.targetId === edge.targetId)) {
        allEdges.push({ ...edge });
      }
    }
  }

  // Create new graph with merged data
  const graph = new DependencyGraph();
  return graph.buildGraph(parent.rootGoal, allNodes, allEdges);
}