/**
 * RoleDependencyGraph - Analyzes role chain dependencies
 */

import type { RoleChain, DependencyGraph, DependencyEdge, ChainNode } from '../types';

export class RoleDependencyGraph {
  /**
   * Build a dependency graph from a role chain
   */
  buildGraph(chain: RoleChain): DependencyGraph {
    const nodes = chain.nodes.map(n => ({
      id: n.id,
      label: this.getNodeLabel(n),
      type: n.type,
    }));

    const edges: DependencyEdge[] = [];
    const cycles: string[][] = [];

    // Build edges based on node connections
    for (const node of chain.nodes) {
      // Sequence edge
      if (node.nextNodeId) {
        edges.push({
          from: node.id,
          to: node.nextNodeId,
          type: 'sequence',
          label: 'then',
        });
      }

      // Conditional edges
      if (node.conditionNodes) {
        if (node.conditionNodes.trueNodeId) {
          edges.push({
            from: node.id,
            to: node.conditionNodes.trueNodeId,
            type: 'conditional',
            label: 'true',
          });
        }
        if (node.conditionNodes.falseNodeId) {
          edges.push({
            from: node.id,
            to: node.conditionNodes.falseNodeId,
            type: 'conditional',
            label: 'false',
          });
        }
      }

      // Parallel edges
      if (node.parallelNodes) {
        for (const parallelId of node.parallelNodes) {
          edges.push({
            from: node.id,
            to: parallelId,
            type: 'parallel',
          });
        }
      }
    }

    // Detect cycles
    const detectedCycles = this.detectCycles(chain);
    cycles.push(...detectedCycles);

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(chain, edges);

    // Identify parallel groups
    const parallelGroups = this.identifyParallelGroups(chain, edges);

    return {
      nodes,
      edges,
      cycles,
      criticalPath,
      parallelGroups,
    };
  }

  /**
   * Check if adding an edge would create a cycle
   */
  wouldCreateCycle(chain: RoleChain, fromId: string, toId: string): boolean {
    // Check if there's already a path from toId to fromId
    const visited = new Set<string>();
    const stack = [toId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === fromId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const node = chain.nodes.find(n => n.id === current);
      if (!node) continue;

      if (node.nextNodeId) stack.push(node.nextNodeId);
      if (node.conditionNodes?.trueNodeId) stack.push(node.conditionNodes.trueNodeId);
      if (node.conditionNodes?.falseNodeId) stack.push(node.conditionNodes.falseNodeId);
      if (node.parallelNodes) stack.push(...node.parallelNodes);
    }

    return false;
  }

  /**
   * Detect all cycles in the chain
   */
  private detectCycles(chain: RoleChain): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      if (recStack.has(nodeId)) {
        // Found cycle
        const cycleStart = path.indexOf(nodeId);
        if (cycleStart >= 0) {
          cycles.push([...path.slice(cycleStart), nodeId]);
        }
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);

      const node = chain.nodes.find(n => n.id === nodeId);
      if (!node) {
        path.pop();
        recStack.delete(nodeId);
        return;
      }

      if (node.nextNodeId) dfs(node.nextNodeId);
      if (node.conditionNodes?.trueNodeId) dfs(node.conditionNodes.trueNodeId);
      if (node.conditionNodes?.falseNodeId) dfs(node.conditionNodes.falseNodeId);
      if (node.parallelNodes) {
        for (const id of node.parallelNodes) dfs(id);
      }

      path.pop();
      recStack.delete(nodeId);
    };

    for (const node of chain.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * Calculate critical path (longest path through the chain)
   */
  private calculateCriticalPath(chain: RoleChain, edges: DependencyEdge[]): string[] {
    // Build adjacency list
    const adj = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adj.has(edge.from)) adj.set(edge.from, []);
      adj.get(edge.from)!.push(edge.to);
    }

    // Calculate longest path using DP
    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();

    for (const node of chain.nodes) {
      dist.set(node.id, node.type === 'role' ? 1 : 0.5);
      prev.set(node.id, null);
    }

    const topological = this.topologicalSort(chain, edges);
    for (const nodeId of topological) {
      const nodeDist = dist.get(nodeId) || 0;
      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDist = nodeDist + (dist.get(neighbor) || 0);
        if (newDist > (dist.get(neighbor) || 0)) {
          dist.set(neighbor, newDist);
          prev.set(neighbor, nodeId);
        }
      }
    }

    // Reconstruct path
    let current = topological.reduce((a, b) => (dist.get(a)! > dist.get(b)! ? a : b));
    const path: string[] = [];
    while (current !== null) {
      path.unshift(current);
      current = prev.get(current) || null;
    }

    return path;
  }

  /**
   * Topological sort of chain nodes
   */
  private topologicalSort(chain: RoleChain, edges: DependencyEdge[]): string[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const node of chain.nodes) {
      inDegree.set(node.id, 0);
      adj.set(node.id, []);
    }

    for (const edge of edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
      adj.get(edge.from)!.push(edge.to);
    }

    const queue = chain.nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
    const result: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeId);

      for (const neighbor of adj.get(nodeId) || []) {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    return result;
  }

  /**
   * Identify groups of nodes that can run in parallel
   */
  private identifyParallelGroups(chain: RoleChain, edges: DependencyEdge[]): string[][] {
    const parallelEdges = edges.filter(e => e.type === 'parallel');
    if (parallelEdges.length === 0) return [];

    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const edge of parallelEdges) {
      const group = [edge.from, edge.to];
      processed.add(edge.from);
      processed.add(edge.to);

      // Find all nodes connected by parallel edges
      for (const otherEdge of parallelEdges) {
        if (!processed.has(otherEdge.to)) {
          if (group.includes(otherEdge.from)) {
            group.push(otherEdge.to);
            processed.add(otherEdge.to);
          }
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  private getNodeLabel(node: ChainNode): string {
    switch (node.type) {
      case 'role': return node.roleId || 'Role';
      case 'condition': return node.condition ? `If ${node.condition.slice(0, 20)}` : 'Condition';
      case 'parallel': return 'Parallel';
      case 'aggregator': return 'Aggregate';
      default: return node.type;
    }
  }
}
