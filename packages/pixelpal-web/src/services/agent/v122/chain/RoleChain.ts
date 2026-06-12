/**
 * RoleChain - Role chain definition and utilities
 */

import type { RoleChain, ChainNode, ChainNodeType } from '../types';

export function createRoleChain(
  data: Omit<RoleChain, 'id' | 'version' | 'createdAt' | 'updatedAt'>
): RoleChain {
  return {
    ...data,
    id: crypto.randomUUID(),
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createChainNode(
  type: ChainNodeType,
  data: Partial<ChainNode> = {}
): ChainNode {
  return {
    id: crypto.randomUUID(),
    type,
    ...data,
  };
}

export function addNodeToChain(chain: RoleChain, node: ChainNode, afterNodeId?: string): RoleChain {
  const nodes = [...chain.nodes];
  if (afterNodeId) {
    const index = nodes.findIndex(n => n.id === afterNodeId);
    if (index >= 0) {
      nodes.splice(index + 1, 0, node);
    } else {
      nodes.push(node);
    }
  } else {
    nodes.push(node);
  }
  return { ...chain, nodes, updatedAt: Date.now() };
}

export function removeNodeFromChain(chain: RoleChain, nodeId: string): RoleChain {
  // Also remove any references to this node
  const nodes = chain.nodes
    .filter(n => n.id !== nodeId)
    .map(n => {
      if (n.nextNodeId === nodeId) return { ...n, nextNodeId: undefined };
      if (n.conditionNodes?.trueNodeId === nodeId) return { ...n, conditionNodes: { ...n.conditionNodes, trueNodeId: undefined } };
      if (n.conditionNodes?.falseNodeId === nodeId) return { ...n, conditionNodes: { ...n.conditionNodes, falseNodeId: undefined } };
      if (n.parallelNodes?.includes(nodeId)) return { ...n, parallelNodes: n.parallelNodes.filter(id => id !== nodeId) };
      return n;
    });
  return { ...chain, nodes, updatedAt: Date.now() };
}

export function getNextNode(chain: RoleChain, currentNodeId: string, result?: unknown): string | null {
  const currentNode = chain.nodes.find(n => n.id === currentNodeId);
  if (!currentNode) return null;

  // Handle conditional nodes
  if (currentNode.type === 'condition' && currentNode.condition && result !== undefined) {
    try {
      const conditionFn = new Function('result', `return ${currentNode.condition}`);
      const shouldContinue = conditionFn(result);
      return shouldContinue 
        ? currentNode.conditionNodes?.trueNodeId || null
        : currentNode.conditionNodes?.falseNodeId || null;
    } catch {
      return currentNode.nextNodeId || null;
    }
  }

  return currentNode.nextNodeId || null;
}

export function getEntryNode(chain: RoleChain): ChainNode | undefined {
  return chain.nodes.find(n => n.id === chain.entryNodeId);
}

export function findNode(chain: RoleChain, nodeId: string): ChainNode | undefined {
  return chain.nodes.find(n => n.id === nodeId);
}

export function getChainDuration(chain: RoleChain): number {
  let count = chain.nodes.filter(n => n.type === 'role').length;
  return count * 5000; // Estimate 5s per role
}
