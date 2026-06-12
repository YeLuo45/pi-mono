// Agent DAG Visualization - Types and DAGGraph Component

import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// ============================================================================
// Types
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
// DAGGraph Component
// ============================================================================

interface DAGGraphProps {
  children?: ReactNode;
  className?: string;
}

interface DAGContextValue {
  state: DAGGraphState;
  initWithNodes: (nodes: DAGNode[], rootId?: string) => void;
  addNode: (node: DAGNode) => void;
  removeNode: (nodeId: string) => void;
  updateNodeStatus: (nodeId: string, status: DAGNodeStatus) => void;
  isDAG: () => boolean;
  getExecutionOrder: () => string[];
  getCriticalPath: () => string[];
  serialize: () => string;
  deserialize: (data: string) => void;
  resetGraph: () => void;
  getNode: (nodeId: string) => DAGNode | undefined;
}

const DAGContext = createContext<DAGContextValue | null>(null);

export const useDAGContext = () => {
  const context = useContext(DAGContext);
  if (!context) {
    throw new Error('useDAGContext must be used within DAGGraph provider');
  }
  return context;
};

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

  // Initialize
  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjacency[node.id] = [];
  }

  // Build graph
  for (const node of nodes) {
    for (const depId of node.dependencies) {
      adjacency[depId].push(node.id);
      inDegree[node.id]++;
    }
  }

  // Find nodes with no incoming edges
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

const findLongestPath = (nodes: DAGNode[], execOrder: string[]): string[] => {
  if (nodes.length === 0) return [];

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};

  // Initialize
  for (const node of nodes) {
    dist[node.id] = node.duration || 1;
    prev[node.id] = null;
  }

  // Topological order ensures we process dependencies first
  for (const nodeId of execOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    for (const depId of node.dependencies) {
      const newDist = dist[depId] + (node.duration || 1);
      if (newDist > dist[nodeId]) {
        dist[nodeId] = newDist;
        prev[nodeId] = depId;
      }
    }
  }

  // Find node with maximum distance
  let maxNodeId = execOrder[0];
  for (const nodeId of execOrder) {
    if (dist[nodeId] > dist[maxNodeId]) {
      maxNodeId = nodeId;
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let current: string | null = maxNodeId;
  while (current) {
    path.unshift(current);
    current = prev[current];
  }

  return path;
};

export const DAGGraph: React.FC<DAGGraphProps> = ({ children, className = '' }) => {
  const [state, setState] = useState<DAGGraphState>({
    nodes: [],
    rootId: '',
    maxDepth: 0,
    criticalPath: [],
  });

  const initWithNodes = useCallback((nodes: DAGNode[], rootId?: string) => {
    const actualRootId = rootId || (nodes.length > 0 ? nodes[0].id : '');

    let maxDepth = 0;
    for (const node of nodes) {
      const depth = calculateDepth(node.id, nodes, new Set());
      maxDepth = Math.max(maxDepth, depth);
    }

    const criticalPath = findLongestPath(nodes, topologicalSort(nodes));

    setState({
      nodes: [...nodes],
      rootId: actualRootId,
      maxDepth,
      criticalPath,
    });
  }, []);

  const addNode = useCallback((node: DAGNode) => {
    setState(prev => {
      const newNodes = [...prev.nodes, node];
      const maxDepth = Math.max(prev.maxDepth, calculateDepth(node.id, newNodes, new Set()));

      return {
        ...prev,
        nodes: newNodes,
        maxDepth,
        criticalPath: findLongestPath(newNodes, topologicalSort(newNodes)),
      };
    });
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newNodes = prev.nodes
        .filter(n => n.id !== nodeId)
        .map(n => ({
          ...n,
          dependencies: n.dependencies.filter(d => d !== nodeId),
        }));

      let maxDepth = 0;
      for (const node of newNodes) {
        maxDepth = Math.max(maxDepth, calculateDepth(node.id, newNodes, new Set()));
      }

      return {
        ...prev,
        nodes: newNodes,
        rootId: prev.rootId === nodeId ? '' : prev.rootId,
        maxDepth,
        criticalPath: findLongestPath(newNodes, topologicalSort(newNodes)),
      };
    });
  }, []);

  const updateNodeStatus = useCallback((nodeId: string, status: DAGNodeStatus) => {
    setState(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => {
        if (node.id !== nodeId) return node;

        const now = Date.now();
        const updates: Partial<DAGNode> = { status };

        if (status === 'running' && !node.startTime) {
          updates.startTime = now;
        }

        if (['success', 'failed', 'skipped'].includes(status)) {
          updates.endTime = now;
          if (node.startTime) {
            updates.duration = now - node.startTime;
          }
        }

        return { ...node, ...updates };
      }),
    }));
  }, []);

  const isDAG = useCallback((): boolean => {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    for (const node of state.nodes) {
      if (detectCycle(node.id, state.nodes, visited, recStack)) {
        return false;
      }
    }

    return true;
  }, [state.nodes]);

  const getExecutionOrder = useCallback((): string[] => {
    return topologicalSort(state.nodes);
  }, [state.nodes]);

  const getCriticalPath = useCallback((): string[] => {
    return state.criticalPath;
  }, [state.criticalPath]);

  const getNode = useCallback((nodeId: string): DAGNode | undefined => {
    return state.nodes.find(n => n.id === nodeId);
  }, [state.nodes]);

  const serialize = useCallback((): string => {
    return JSON.stringify({
      nodes: state.nodes,
      rootId: state.rootId,
      maxDepth: state.maxDepth,
      criticalPath: state.criticalPath,
    });
  }, [state]);

  const deserialize = useCallback((data: string) => {
    try {
      const parsed = JSON.parse(data);
      setState({
        nodes: parsed.nodes || [],
        rootId: parsed.rootId || '',
        maxDepth: parsed.maxDepth || 0,
        criticalPath: parsed.criticalPath || [],
      });
    } catch {
      console.error('Failed to deserialize DAG state');
    }
  }, []);

  const resetGraph = useCallback(() => {
    setState({
      nodes: [],
      rootId: '',
      maxDepth: 0,
      criticalPath: [],
    });
  }, []);

  const value: DAGContextValue = {
    state,
    initWithNodes,
    addNode,
    removeNode,
    updateNodeStatus,
    isDAG,
    getExecutionOrder,
    getCriticalPath,
    serialize,
    deserialize,
    resetGraph,
    getNode,
  };

  return (
    <DAGContext.Provider value={value}>
      <div className={`dag-graph ${className}`} data-testid="dag-graph">
        {children}
      </div>
    </DAGContext.Provider>
  );
};

// ============================================================================
// Agent Role Colors
// ============================================================================

export const AGENT_ROLE_COLORS: Record<AgentRole, string> = {
  planner: '#5e6ad2',
  executor: '#7170ff',
  reviewer: '#ff9800',
  summarizer: '#4caf50',
};

export const STATUS_COLORS: Record<DAGNodeStatus, string> = {
  pending: '#9e9e9e',
  running: '#2196f3',
  success: '#4caf50',
  failed: '#ef5350',
  skipped: '#757575',
};

export default DAGGraph;