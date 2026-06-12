/**
 * KnowledgeStore - Cross-agent shared knowledge storage
 */

import type { KnowledgeEntity, KnowledgeRelation, KnowledgeConflict, KnowledgeVersion, EntityType, RelationType } from './types';

const STORAGE_KEY = 'agent-knowledge';

export class KnowledgeStore {
  private entities: Map<string, KnowledgeEntity> = new Map();
  private relations: Map<string, KnowledgeRelation> = new Map();
  private conflicts: Map<string, KnowledgeConflict> = new Map();
  private versions: Map<string, KnowledgeVersion[]> = new Map();

  constructor() {
    this.load();
  }

  // ===========================================================================
  // Persistence
  // ===========================================================================

  private load(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.entities = new Map(parsed.entities || []);
        this.relations = new Map(parsed.relations || []);
        this.conflicts = new Map(parsed.conflicts || []);
      }
    } catch (e) {
      console.warn('Failed to load knowledge store:', e);
    }
  }

  save(): void {
    try {
      const data = {
        entities: Array.from(this.entities.entries()),
        relations: Array.from(this.relations.entries()),
        conflicts: Array.from(this.conflicts.entries()),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save knowledge store:', e);
    }
  }

  // ===========================================================================
  // Entity Operations
  // ===========================================================================

  createEntity(data: Omit<KnowledgeEntity, 'id' | 'createdAt' | 'updatedAt' | 'version'>): KnowledgeEntity {
    const entity: KnowledgeEntity = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    };
    this.entities.set(entity.id, entity);
    this.save();
    return entity;
  }

  getEntity(id: string): KnowledgeEntity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(type?: EntityType): KnowledgeEntity[] {
    const all = Array.from(this.entities.values());
    if (type) return all.filter(e => e.type === type);
    return all;
  }

  updateEntity(id: string, updates: Partial<KnowledgeEntity>, agentId: string): KnowledgeEntity | undefined {
    const entity = this.entities.get(id);
    if (!entity) return undefined;

    // Record version
    const versionChanges: { field: string; old: unknown; new: unknown }[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key in entity && entity[key as keyof KnowledgeEntity] !== value) {
        versionChanges.push({ field: key, old: entity[key as keyof KnowledgeEntity], new: value });
      }
    }

    const updated: KnowledgeEntity = {
      ...entity,
      ...updates,
      id,
      updatedAt: Date.now(),
      version: entity.version + 1,
    };

    this.entities.set(id, updated);
    this.save();
    return updated;
  }

  deleteEntity(id: string): boolean {
    // Also remove related relations
    for (const [relId, rel] of this.relations) {
      if (rel.sourceId === id || rel.targetId === id) {
        this.relations.delete(relId);
      }
    }
    const result = this.entities.delete(id);
    this.save();
    return result;
  }

  // ===========================================================================
  // Relation Operations
  // ===========================================================================

  createRelation(data: Omit<KnowledgeRelation, 'id' | 'createdAt'>): KnowledgeRelation {
    const relation: KnowledgeRelation = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    this.relations.set(relation.id, relation);
    this.save();
    return relation;
  }

  getRelation(id: string): KnowledgeRelation | undefined {
    return this.relations.get(id);
  }

  getAllRelations(): KnowledgeRelation[] {
    return Array.from(this.relations.values());
  }

  getRelationsByEntity(entityId: string): KnowledgeRelation[] {
    return Array.from(this.relations.values()).filter(
      r => r.sourceId === entityId || r.targetId === entityId
    );
  }

  deleteRelation(id: string): boolean {
    const result = this.relations.delete(id);
    this.save();
    return result;
  }

  // ===========================================================================
  // Graph Queries
  // ===========================================================================

  getKnowledgeGraph(): { entities: KnowledgeEntity[]; relations: KnowledgeRelation[] } {
    return {
      entities: Array.from(this.entities.values()),
      relations: Array.from(this.relations.values()),
    };
  }

  getEntityNeighbors(entityId: string): KnowledgeEntity[] {
    const neighborIds = new Set<string>();
    for (const rel of this.relations.values()) {
      if (rel.sourceId === entityId) neighborIds.add(rel.targetId);
      if (rel.targetId === entityId) neighborIds.add(rel.sourceId);
    }
    return Array.from(neighborIds).map(id => this.entities.get(id)).filter(Boolean) as KnowledgeEntity[];
  }

  getAgentKnowledge(agentId: string): KnowledgeEntity[] {
    return Array.from(this.entities.values()).filter(e => e.ownerAgentId === agentId);
  }

  // ===========================================================================
  // Conflict Detection
  // ===========================================================================

  detectConflicts(): KnowledgeConflict[] {
    const newConflicts: KnowledgeConflict[] = [];

    // Check for duplicate entities
    const nameIndex = new Map<string, KnowledgeEntity[]>();
    for (const entity of this.entities.values()) {
      const existing = nameIndex.get(entity.name) || [];
      existing.push(entity);
      nameIndex.set(entity.name, existing);
    }

    for (const [name, entities] of nameIndex) {
      if (entities.length > 1) {
        for (const entity of entities.slice(1)) {
          const conflict: KnowledgeConflict = {
            id: crypto.randomUUID(),
            entityId: entity.id,
            agentId: entity.ownerAgentId || 'unknown',
            conflictingValue: entity.name,
            existingValue: entities[0].name,
            conflictType: 'duplicate_entity',
            status: 'detected',
            detectedAt: Date.now(),
          };
          this.conflicts.set(conflict.id, conflict);
          newConflicts.push(conflict);
        }
      }
    }

    // Check for circular dependencies
    const adjacency = new Map<string, string[]>();
    for (const rel of this.relations.values()) {
      if (rel.type === 'depends_on') {
        const deps = adjacency.get(rel.sourceId) || [];
        deps.push(rel.targetId);
        adjacency.set(rel.sourceId, deps);
      }
    }

    for (const [entityId] of this.entities) {
      const visited = new Set<string>();
      const stack = [entityId];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) {
          const conflict: KnowledgeConflict = {
            id: crypto.randomUUID(),
            entityId: current,
            agentId: 'system',
            conflictingValue: 'circular',
            existingValue: Array.from(visited),
            conflictType: 'circular_dependency',
            status: 'detected',
            detectedAt: Date.now(),
          };
          this.conflicts.set(conflict.id, conflict);
          newConflicts.push(conflict);
          break;
        }
        visited.add(current);
        const deps = adjacency.get(current) || [];
        stack.push(...deps);
      }
    }

    if (newConflicts.length > 0) this.save();
    return newConflicts;
  }

  resolveConflict(conflictId: string, resolution: string): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.status = 'resolved';
    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    this.save();
    return true;
  }

  getConflicts(status?: KnowledgeConflict['status']): KnowledgeConflict[] {
    const all = Array.from(this.conflicts.values());
    if (status) return all.filter(c => c.status === status);
    return all;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStats(): { totalEntities: number; totalRelations: number; totalConflicts: number } {
    return {
      totalEntities: this.entities.size,
      totalRelations: this.relations.size,
      totalConflicts: this.conflicts.size,
    };
  }
}
