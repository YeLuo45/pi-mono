/**
 * V125 Cross-Agent Knowledge Graph - Type Definitions
 */

export type EntityType = 'agent' | 'task' | 'concept' | 'document' | 'skill';
export type RelationType = 'knows' | 'depends_on' | 'produces' | 'requires' | 'related_to' | 'part_of';
export type ConflictStatus = 'detected' | 'resolved' | 'ignored';

export interface KnowledgeEntity {
  id: string;
  type: EntityType;
  name: string;
  description: string;
  properties: Record<string, unknown>;
  ownerAgentId?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface KnowledgeRelation {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationType;
  weight: number; // 0-1
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface KnowledgeGraph {
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
  totalEntities: number;
  totalRelations: number;
}

export interface KnowledgeConflict {
  id: string;
  entityId: string;
  agentId: string;
  conflictingValue: unknown;
  existingValue: unknown;
  conflictType: 'property_mismatch' | 'duplicate_entity' | 'circular_dependency';
  status: ConflictStatus;
  detectedAt: number;
  resolvedAt?: number;
  resolution?: string;
}

export interface KnowledgeVersion {
  entityId: string;
  version: number;
  changes: { field: string; old: unknown; new: unknown }[];
  agentId: string;
  timestamp: number;
}
