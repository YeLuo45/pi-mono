/**
 * KnowledgeGraph - Entity-Relationship knowledge storage and query
 */

import type { KnowledgeNode, KnowledgeEdge, KnowledgeGraph } from '../types';

const NODE_PREFIX = 'kg_node:';
const EDGE_PREFIX = 'kg_edge:';
const OUT_INDEX = 'kg_out:';
const IN_INDEX = 'kg_in:';

export class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: Map<string, KnowledgeEdge> = new Map();

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  addNode(node: Omit<KnowledgeNode, 'createdAt' | 'updatedAt'>): string {
    const now = Date.now();
    const id = node.id || crypto.randomUUID();
    const fullNode: KnowledgeNode = { ...node, id, createdAt: now, updatedAt: now };
    this.nodes.set(id, fullNode);
    return id;
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  getNodesByType(type: KnowledgeNode['type']): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(n => n.type === type);
  }

  updateNode(id: string, updates: Partial<KnowledgeNode>): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    this.nodes.set(id, { ...node, ...updates, updatedAt: Date.now() });
    return true;
  }

  deleteNode(id: string): number {
    // Delete all connected edges first
    const connectedEdges = this.getConnectedEdges(id);
    let edgeCount = 0;
    for (const edge of connectedEdges) {
      this.edges.delete(edge.id);
      edgeCount++;
    }
    this.nodes.delete(id);
    return edgeCount;
  }

  // ===========================================================================
  // Edge Operations
  // ===========================================================================

  addEdge(edge: Omit<KnowledgeEdge, 'id' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const fullEdge: KnowledgeEdge = { ...edge, id, createdAt: Date.now() };
    this.edges.set(id, fullEdge);
    // Update indices
    this.indexEdge(fullEdge);
    return id;
  }

  getEdge(id: string): KnowledgeEdge | undefined {
    return this.edges.get(id);
  }

  getEdgesByRelation(relation: KnowledgeEdge['relation']): KnowledgeEdge[] {
    return Array.from(this.edges.values()).filter(e => e.relation === relation);
  }

  deleteEdge(id: string): boolean {
    const edge = this.edges.get(id);
    if (!edge) return false;
    this.edges.delete(id);
    this.unindexEdge(edge);
    return true;
  }

  // ===========================================================================
  // Graph Queries
  // ===========================================================================

  getConnectedEdges(nodeId: string): KnowledgeEdge[] {
    const outEdges = this.nodes.get(`${OUT_INDEX}${nodeId}`) as unknown as Set<string> || new Set();
    const inEdges = this.nodes.get(`${IN_INDEX}${nodeId}`) as unknown as Set<string> || new Set();
    const edgeIds = new Set([...outEdges, ...inEdges]);
    return Array.from(edgeIds).map(id => this.edges.get(id)!).filter(Boolean);
  }

  getNeighbors(nodeId: string, maxDepth: number = 1): Map<string, KnowledgeNode> {
    const neighbors = new Map<string, KnowledgeNode>();
    const visited = new Set<string>([nodeId]);
    const queue: { id: string; depth: number }[] = [{ id: nodeId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const connected = this.getConnectedEdges(id);
      for (const edge of connected) {
        const neighborId = edge.sourceId === id ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          const neighbor = this.nodes.get(neighborId);
          if (neighbor) neighbors.set(neighborId, neighbor);
          queue.push({ id: neighborId, depth: depth + 1 });
        }
      }
    }

    return neighbors;
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(startId: string, endId: string, maxDepth: number = 5): string[] | null {
    const visited = new Set<string>([startId]);
    const queue: { id: string; path: string[] }[] = [{ id: startId, path: [startId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === endId) return path;

      if (path.length >= maxDepth) continue;

      const connected = this.getConnectedEdges(id);
      for (const edge of connected) {
        const neighborId = edge.sourceId === id ? edge.targetId : edge.sourceId;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return null; // No path found
  }

  // ===========================================================================
  // Full Graph Export
  // ===========================================================================

  exportGraph(): KnowledgeGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  getStats(): { nodeCount: number; edgeCount: number; byType: Map<string, number>; byRelation: Map<string, number> } {
    const byType = new Map<string, number>();
    const byRelation = new Map<string, number>();

    for (const node of this.nodes.values()) {
      byType.set(node.type, (byType.get(node.type) || 0) + 1);
    }
    for (const edge of this.edges.values()) {
      byRelation.set(edge.relation, (byRelation.get(edge.relation) || 0) + 1);
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      byType,
      byRelation,
    };
  }

  // ===========================================================================
  // Index Management
  // ===========================================================================

  private indexEdge(edge: KnowledgeEdge): void {
    // Store edge ID in source's out-index
    const outKey = `${OUT_INDEX}${edge.sourceId}`;
    const outSet = (this.nodes.get(outKey) as unknown as Set<string>) || new Set<string>();
    outSet.add(edge.id);
    this.nodes.set(outKey, outSet as unknown as KnowledgeNode);

    // Store edge ID in target's in-index
    const inKey = `${IN_INDEX}${edge.targetId}`;
    const inSet = (this.nodes.get(inKey) as unknown as Set<string>) || new Set<string>();
    inSet.add(edge.id);
    this.nodes.set(inKey, inSet as unknown as KnowledgeNode);
  }

  private unindexEdge(edge: KnowledgeEdge): void {
    const outKey = `${OUT_INDEX}${edge.sourceId}`;
    const outSet = this.nodes.get(outKey) as unknown as Set<string>;
    outSet?.delete(edge.id);

    const inKey = `${IN_INDEX}${edge.targetId}`;
    const inSet = this.nodes.get(inKey) as unknown as Set<string>;
    inSet?.delete(edge.id);
  }
}
