/**
 * Knowledge Graph — Entity Relationship Visualization
 * 
 * Builds a simple knowledge graph from extracted entities and their
 * co-occurrence relationships.
 */

import type { KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge, NamedEntity, EntityType } from './v87Types';

const DB_NAME = 'pixelpal-knowledge';
const DB_VERSION = 1;
const GRAPH_STORE = 'pixelpal-knowledge-graph';

/**
 * Open IndexedDB for graph storage.
 */
function openGraphDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(GRAPH_STORE)) {
        db.createObjectStore(GRAPH_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Build a knowledge graph from entities across multiple sources.
 */
export async function buildKnowledgeGraph(
  entitiesBySource: Map<string, NamedEntity[]>,
  maxNodes: number = 100
): Promise<KnowledgeGraph> {
  const nodes: KnowledgeGraphNode[] = [];
  const edges: KnowledgeGraphEdge[] = [];
  const nodeMap: Map<string, KnowledgeGraphNode> = new Map();

  // Aggregate entities by text (deduplicate across sources)
  const entityCounts: Map<string, { entity: NamedEntity; sources: Set<string> }> = new Map();

  for (const [sourceId, entities] of entitiesBySource) {
    for (const entity of entities) {
      const key = `${entity.type}:${entity.text.toLowerCase()}`;
      const existing = entityCounts.get(key);
      if (existing) {
        existing.sources.add(sourceId);
        existing.entity.confidence = Math.max(existing.entity.confidence, entity.confidence);
      } else {
        entityCounts.set(key, { entity, sources: new Set([sourceId]) });
      }
    }
  }

  // Sort by occurrence count and take top N
  const sortedEntities = Array.from(entityCounts.values())
    .sort((a, b) => b.sources.size - a.sources.size)
    .slice(0, maxNodes);

  // Create nodes
  for (const { entity, sources } of sortedEntities) {
    const nodeId = `node-${simpleHash(entity.text + entity.type)}`;
    
    const node: KnowledgeGraphNode = {
      id: nodeId,
      text: entity.text,
      type: entity.type,
      occurrences: sources.size,
      sources: Array.from(sources),
    };
    
    nodes.push(node);
    nodeMap.set(key, nodeId);
  }

  // Create edges based on co-occurrence (entities in same source)
  for (const [sourceId, entities] of entitiesBySource) {
    const entityNodes = entities
      .map(e => ({ entity: e, nodeId: nodeMap.get(`${e.type}:${e.text.toLowerCase()}`) }))
      .filter(e => e.nodeId !== undefined);

    // Create edges between all pairs in same source
    for (let i = 0; i < entityNodes.length; i++) {
      for (let j = i + 1; j < entityNodes.length; j++) {
        const sourceNode = entityNodes[i];
        const targetNode = entityNodes[j];
        
        if (!sourceNode.nodeId || !targetNode.nodeId) continue;
        
        const edgeKey = [sourceNode.nodeId, targetNode.nodeId].sort().join('-');
        
        const existingEdge = edges.find(e => e.id === edgeKey);
        if (existingEdge) {
          existingEdge.weight++;
        } else {
          edges.push({
            id: edgeKey,
            source: sourceNode.nodeId,
            target: targetNode.nodeId,
            weight: 1,
          });
        }
      }
    }
  }

  return {
    nodes,
    edges,
    lastUpdated: Date.now(),
  };
}

/**
 * Save knowledge graph to IndexedDB.
 */
export async function saveKnowledgeGraph(graph: KnowledgeGraph): Promise<void> {
  const db = await openGraphDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, 'readwrite');
    const store = tx.objectStore(GRAPH_STORE);
    
    store.put({ id: 'current-graph', ...graph });
    
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
    tx.onComplete = () => resolve();
  });
}

/**
 * Load knowledge graph from IndexedDB.
 */
export async function loadKnowledgeGraph(): Promise<KnowledgeGraph | null> {
  const db = await openGraphDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, 'readonly');
    const store = tx.objectStore(GRAPH_STORE);
    const request = store.get('current-graph');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        const { id, ...graph } = result;
        resolve(graph as KnowledgeGraph);
      } else {
        resolve(null);
      }
    };
    
    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear the knowledge graph.
 */
export async function clearKnowledgeGraph(): Promise<void> {
  const db = await openGraphDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(GRAPH_STORE, 'readwrite');
    const store = tx.objectStore(GRAPH_STORE);
    store.clear();
    
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
    tx.onComplete = () => resolve();
  });
}

/**
 * Get nodes by type.
 */
export function getNodesByType(graph: KnowledgeGraph, type: EntityType): KnowledgeGraphNode[] {
  return graph.nodes.filter(n => n.type === type);
}

/**
 * Get node neighbors.
 */
export function getNodeNeighbors(graph: KnowledgeGraph, nodeId: string): KnowledgeGraphNode[] {
  const neighborIds = new Set<string>();
  
  for (const edge of graph.edges) {
    if (edge.source === nodeId) neighborIds.add(edge.target);
    if (edge.target === nodeId) neighborIds.add(edge.source);
  }
  
  return graph.nodes.filter(n => neighborIds.has(n.id));
}

/**
 * Format graph for display (simplified structure).
 */
export function formatGraphForDisplay(graph: KnowledgeGraph): {
  nodes: Array<{ id: string; label: string; type: string; size: number }>;
  links: Array<{ source: string; target: string; weight: number }>;
} {
  return {
    nodes: graph.nodes.map(n => ({
      id: n.id,
      label: n.text,
      type: n.type,
      size: Math.min(5, Math.max(1, n.occurrences)),
    })),
    links: graph.edges.map(e => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    })),
  };
}

// Simple hash function
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}
