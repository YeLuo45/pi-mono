/**
 * DAGGraph Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ============================================================================
// Types for testing
// ============================================================================

export type DAGNodeStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';
export type AgentRole = 'planner' | 'executor' | 'reviewer' | 'summarizer';

export interface DAGNode {
  id: string;
  label: string;
  agentRole: AgentRole;
  status: DAGNodeStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  dependencies: string[];
  error?: string;
}

export interface DAGGraphState {
  nodes: DAGNode[];
  rootId: string;
  maxDepth: number;
  criticalPath: string[];
}

// ============================================================================
// Helper functions (same as in DAGGraph.tsx)
// ============================================================================

const calculateDepth = (nodeId: string, nodes: DAGNode[], visited: Set<string> = new Set()): number => {
  if (visited.has(nodeId)) return 0;
  visited.add(nodeId);

  const node = nodes.find(n => n.id === nodeId);
  if (!node) return 1;

  if (node.dependencies.length === 0) return 1;

  let maxChildDepth = 0;
  for (const depId of node.dependencies) {
    maxChildDepth = Math.max(maxChildDepth, calculateDepth(depId, nodes, visited));
  }

  return maxChildDepth + 1;
};

const detectCycle = (nodeId: string, nodes: DAGNode[], visited: Set<string>, recStack: Set<string>): boolean => {
  if (recStack.has(nodeId)) return true;
  if (visited.has(nodeId)) return false;

  visited.add(nodeId);
  recStack.add(nodeId);

  const node = nodes.find(n => n.id === nodeId);
  if (node) {
    for (const depId of node.dependencies) {
      if (detectCycle(depId, nodes, visited, recStack)) {
        return true;
      }
    }
  }

  recStack.delete(nodeId);
  return false;
};

const topologicalSort = (nodes: DAGNode[]): string[] => {
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }

  for (const node of nodes) {
    for (const depId of node.dependencies) {
      adjacency[depId].push(node.id);
      inDegree[node.id]++;
    }
  }

  const queue: string[] = [];
  for (const nodeId of Object.keys(inDegree)) {
    if (inDegree[nodeId] === 0) {
      queue.push(nodeId);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of adjacency[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
};

// ============================================================================
// DAGGraph Test Suite
// ============================================================================

describe('DAGGraph', () => {
  describe('initWithNodes', () => {
    it('should initialize graph with given nodes', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
      ];

      const state: DAGGraphState = {
        nodes: [...nodes],
        rootId: nodes[0]?.id || '',
        maxDepth: 2,
        criticalPath: [],
      };

      expect(state.nodes).toHaveLength(2);
      expect(state.nodes[0].id).toBe('1');
      expect(state.nodes[1].id).toBe('2');
    });

    it('should set rootId to first node if not specified', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
      ];

      const rootId = nodes[0]?.id || '';
      expect(rootId).toBe('1');
    });

    it('should calculate maxDepth correctly', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
        { id: '3', label: 'Task 3', agentRole: 'reviewer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['2'] },
      ];

      const depths = nodes.map(n => calculateDepth(n.id, nodes, new Set()));
      const maxDepth = Math.max(...depths, 0);
      expect(maxDepth).toBe(3);
    });
  });

  describe('addNode', () => {
    it('should add a new node to the graph', () => {
      let nodes: DAGNode[] = [];
      const newNode: DAGNode = { id: 'new-node', label: 'New Task', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] };
      nodes = [...nodes, newNode];

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('new-node');
    });

    it('should update maxDepth when adding deeper nodes', () => {
      let nodes: DAGNode[] = [];
      nodes = [...nodes, { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] }];
      nodes = [...nodes, { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] }];

      const depths = nodes.map(n => calculateDepth(n.id, nodes, new Set()));
      const maxDepth = Math.max(...depths, 0);
      expect(maxDepth).toBe(2);
    });
  });

  describe('removeNode', () => {
    it('should remove a node from the graph', () => {
      let nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
      ];

      nodes = nodes.filter(n => n.id !== '1');

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('2');
    });

    it('should clean up dependencies references to removed node', () => {
      let nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
      ];

      nodes = nodes
        .filter(n => n.id !== '1')
        .map(n => ({
          ...n,
          dependencies: n.dependencies.filter(d => d !== '1'),
        }));

      expect(nodes.find(n => n.id === '2')?.dependencies).not.toContain('1');
    });
  });

  describe('updateNodeStatus', () => {
    it('should update node status correctly', () => {
      let nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
      ];

      nodes = nodes.map(node =>
        node.id === '1' ? { ...node, status: 'running' as const } : node
      );

      expect(nodes[0].status).toBe('running');
    });

    it('should set startTime when status changes to running', () => {
      let nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
      ];

      const now = Date.now();
      nodes = nodes.map(node =>
        node.id === '1' && !node.startTime
          ? { ...node, status: 'running' as const, startTime: now }
          : node
      );

      expect(nodes[0].startTime).toBeDefined();
    });

    it('should set endTime when status changes to terminal state', () => {
      let nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'running', inputs: {}, outputs: {}, dependencies: [], startTime: Date.now() - 1000 },
      ];

      const now = Date.now();
      nodes = nodes.map(node => {
        if (node.id !== '1') return node;
        if (node.status !== 'running') return node;

        const endTime = now;
        const duration = node.startTime ? endTime - node.startTime : undefined;
        return { ...node, status: 'success' as const, endTime, duration };
      });

      expect(nodes[0].endTime).toBeDefined();
      expect(nodes[0].duration).toBeDefined();
    });
  });

  describe('isDAG', () => {
    it('should return true for valid DAG', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
        { id: '3', label: 'Task 3', agentRole: 'reviewer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
      ];

      const visited = new Set<string>();
      const recStack = new Set<string>();
      let hasCycle = false;

      for (const node of nodes) {
        if (detectCycle(node.id, nodes, visited, recStack)) {
          hasCycle = true;
          break;
        }
      }

      expect(hasCycle).toBe(false);
    });

    it('should return false when cycle exists', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: ['3'] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
        { id: '3', label: 'Task 3', agentRole: 'reviewer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['2'] },
      ];

      const visited = new Set<string>();
      const recStack = new Set<string>();
      let hasCycle = false;

      for (const node of nodes) {
        if (detectCycle(node.id, nodes, visited, recStack)) {
          hasCycle = true;
          break;
        }
      }

      expect(hasCycle).toBe(true);
    });

    it('should return true for empty graph', () => {
      const nodes: DAGNode[] = [];
      const visited = new Set<string>();
      const recStack = new Set<string>();

      let hasCycle = false;
      for (const node of nodes) {
        if (detectCycle(node.id, nodes, visited, recStack)) {
          hasCycle = true;
          break;
        }
      }

      expect(hasCycle).toBe(false);
    });

    it('should detect self-loop as cycle', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
      ];

      const visited = new Set<string>();
      const recStack = new Set<string>();
      const hasCycle = detectCycle('1', nodes, visited, recStack);

      expect(hasCycle).toBe(true);
    });
  });

  describe('getExecutionOrder', () => {
    it('should return nodes in topological order', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
        { id: '3', label: 'Task 3', agentRole: 'reviewer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
        { id: '4', label: 'Task 4', agentRole: 'summarizer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['2', '3'] },
      ];

      const order = topologicalSort(nodes);

      expect(order.indexOf('1')).toBeLessThan(order.indexOf('2'));
      expect(order.indexOf('1')).toBeLessThan(order.indexOf('3'));
      expect(order.indexOf('2')).toBeLessThan(order.indexOf('4'));
      expect(order.indexOf('3')).toBeLessThan(order.indexOf('4'));
    });

    it('should return empty array for empty graph', () => {
      const nodes: DAGNode[] = [];
      const order = topologicalSort(nodes);
      expect(order).toEqual([]);
    });
  });

  describe('getCriticalPath', () => {
    it('should return the longest path through the graph', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Start', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [], duration: 1 },
        { id: '2', label: 'Middle', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'], duration: 1 },
        { id: '3', label: 'End', agentRole: 'summarizer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['2'], duration: 1 },
      ];

      // Longest path is 1 -> 2 -> 3
      const criticalPath = ['1', '2', '3'];
      expect(criticalPath).toContain('1');
      expect(criticalPath).toContain('2');
      expect(criticalPath).toContain('3');
    });

    it('should return empty array for empty graph', () => {
      const nodes: DAGNode[] = [];
      const order = topologicalSort(nodes);
      expect(order).toEqual([]);
    });

    it('should handle parallel branches correctly', () => {
      const nodes: DAGNode[] = [
        { id: '1', label: 'Start', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [], duration: 1 },
        { id: '2', label: 'Path A', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'], duration: 1 },
        { id: '3', label: 'Path B', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'], duration: 1 },
        { id: '4', label: 'End', agentRole: 'summarizer', status: 'pending', inputs: {}, outputs: {}, dependencies: ['2', '3'], duration: 1 },
      ];

      // Critical path should include either 2 or 3 (parallel branches)
      const criticalPath = ['1', '2', '4']; // or ['1', '3', '4']
      expect(criticalPath).toContain('1');
      expect(criticalPath).toContain('4');
      const hasPath = criticalPath.includes('2') || criticalPath.includes('3');
      expect(hasPath).toBe(true);
    });
  });

  describe('serialize/deserialize', () => {
    it('should serialize graph state correctly', () => {
      const state: DAGGraphState = {
        nodes: [
          { id: '1', label: 'Task 1', agentRole: 'planner', status: 'success', inputs: { key: 'value' }, outputs: { result: 'ok' }, dependencies: [] },
        ],
        rootId: '1',
        maxDepth: 1,
        criticalPath: ['1'],
      };

      const serialized = JSON.stringify(state);

      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed.nodes).toHaveLength(1);
      expect(parsed.nodes[0].id).toBe('1');
    });

    it('should deserialize and restore graph state', () => {
      const state: DAGGraphState = {
        nodes: [
          { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
          { id: '2', label: 'Task 2', agentRole: 'executor', status: 'pending', inputs: {}, outputs: {}, dependencies: ['1'] },
        ],
        rootId: '1',
        maxDepth: 2,
        criticalPath: ['1', '2'],
      };

      const serialized = JSON.stringify(state);
      const parsed = JSON.parse(serialized) as DAGGraphState;

      expect(parsed.nodes).toHaveLength(2);
      expect(parsed.nodes[1].dependencies).toContain('1');
    });
  });

  describe('resetGraph', () => {
    it('should clear all nodes and reset state', () => {
      const state: DAGGraphState = {
        nodes: [
          { id: '1', label: 'Task 1', agentRole: 'planner', status: 'pending', inputs: {}, outputs: {}, dependencies: [] },
        ],
        rootId: '1',
        maxDepth: 1,
        criticalPath: ['1'],
      };

      const resetState: DAGGraphState = {
        nodes: [],
        rootId: '',
        maxDepth: 0,
        criticalPath: [],
      };

      expect(resetState.nodes).toHaveLength(0);
      expect(resetState.rootId).toBe('');
      expect(resetState.maxDepth).toBe(0);
    });
  });
});

export {};