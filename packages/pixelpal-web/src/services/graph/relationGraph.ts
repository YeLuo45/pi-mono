/**
 * Relation Graph Service — computes persona relationship graph data
 * 
 * Produces nodes and edges for the force-directed relationship visualization.
 * Nodes = personas with message counts and intimacy values
 * Edges = potential connections between persona pairs (collab mode)
 */

import { getAllPersonas, type Persona } from '../persona/personaStorage';
import { useStore } from '../../store';

// Graph node representing a persona
export interface GraphNode {
  id: string;
  name: string;
  avatar: string;       // emoji
  messageCount: number;
  intimacy: number;     // 0-100
  color: string;
}

// Graph edge representing potential connection between personas
export interface GraphEdge {
  source: string;       // personaId
  target: string;       // personaId
  weight: number;       // average message count (normalized)
  intimacy: number;    // average intimacy
}

export interface RelationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Compute the relation graph from current store state.
 * 
 * Nodes: one per persona from getAllPersonas()
 *   - messageCount: count of messages in store filtered by this personaId
 *   - intimacy: personaIntimacy[personaId] || 0
 *   - color: persona.theme?.primaryColor || '#6366f1'
 * 
 * Edges: all pairs of personas (potential collab connections)
 *   - weight: average of two personas' message counts (normalized)
 *   - intimacy: average of two personas' intimacy values
 * 
 * Nodes sorted by messageCount descending.
 */
export function computeRelationGraph(): RelationGraph {
  const personas = getAllPersonas();
  const { messages, personaIntimacy } = useStore.getState();

  // Build message count map per persona
  const messageCountMap: Record<string, number> = {};
  for (const msg of messages) {
    if (msg.personaId) {
      messageCountMap[msg.personaId] = (messageCountMap[msg.personaId] || 0) + 1;
    }
  }

  // Build nodes
  const nodes: GraphNode[] = personas.map((persona: Persona) => ({
    id: persona.id,
    name: persona.name,
    avatar: persona.avatar,
    messageCount: messageCountMap[persona.id] || 0,
    intimacy: personaIntimacy[persona.id] || 0,
    color: persona.theme?.primaryColor || '#6366f1',
  }));

  // Sort nodes by messageCount descending
  nodes.sort((a, b) => b.messageCount - a.messageCount);

  // Build edges — only pairs with meaningful intimacy (> 0)
  // Edge weight = average intimacy of the two personas
  // (no cross-persona message history is stored, so intimacy is the relationship signal)
  const edges: GraphEdge[] = [];
  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const pA = personas[i];
      const pB = personas[j];
      const intimacyA = personaIntimacy[pA.id] || 0;
      const intimacyB = personaIntimacy[pB.id] || 0;

      // Only create edge if at least one persona has non-zero intimacy
      if (intimacyA > 0 || intimacyB > 0) {
        const avgIntimacy = (intimacyA + intimacyB) / 2;
        edges.push({
          source: pA.id,
          target: pB.id,
          weight: avgIntimacy,
          intimacy: avgIntimacy,
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Get intimacy level label from intimacy value (0-100)
 */
export function getIntimacyLevel(intimacy: number): string {
  if (intimacy >= 80) return '灵魂伴侣';
  if (intimacy >= 60) return '挚友';
  if (intimacy >= 40) return '好友';
  if (intimacy >= 20) return '认识';
  return '陌生';
}

/**
 * Normalize edge weight to edge width (1-5)
 */
export function normalizeEdgeWidth(weight: number, minMsg: number, maxMsg: number): number {
  if (maxMsg === minMsg) return 2.5;
  const normalized = (weight - minMsg) / (maxMsg - minMsg);
  return 1 + normalized * 4; // 1 to 5
}

/**
 * Normalize message count to node radius (20-60)
 */
export function normalizeNodeRadius(messageCount: number, minMsg: number, maxMsg: number): number {
  if (maxMsg === minMsg) return 40;
  const normalized = (messageCount - minMsg) / (maxMsg - minMsg);
  return 20 + normalized * 40; // 20 to 60
}
