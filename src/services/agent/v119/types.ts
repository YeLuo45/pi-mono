/**
 * V119 Cross-Session Agent Collaboration Memory - Type Definitions
 */

export interface SharedMemoryEntry {
  id: string;
  sessionId: string;
  agentId: string;
  key: string;
  value: unknown;
  version: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface KnowledgeNode {
  id: string;
  type: 'user' | 'task' | 'topic' | 'concept' | 'agent' | 'session';
  name: string;
  properties: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: 'created_by' | 'related_to' | 'depends_on' | 'part_of' | 'executed_by' | 'contributed_to';
  weight: number;  // 0-1 confidence
  createdAt: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface ContextItem {
  type: 'task' | 'memory' | 'preference' | 'pattern' | 'knowledge';
  priority: number;  // 0-1
  source: 'current_session' | 'shared_memory' | 'knowledge_graph';
  data: unknown;
  relevanceScore?: number;
  retrievedAt: number;
}

export interface InheritanceResult {
  sessionId: string;
  contextItems: ContextItem[];
  confidence: number;  // 0-1
  source: 'recent_session' | 'similar_task' | 'knowledge_graph';
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  data: unknown;
  timestamp: number;
  status: 'pending' | 'synced' | 'conflict' | 'failed';
  conflictData?: unknown;
}

export interface SyncConflict {
  operationId: string;
  localVersion: SharedMemoryEntry;
  remoteVersion: SharedMemoryEntry;
  resolution?: 'local' | 'remote' | 'manual';
  resolvedAt?: number;
}
