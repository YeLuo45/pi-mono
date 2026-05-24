/**
 * V148: Shared Facts Engine
 * 
 * Cross-persona fact propagation engine.
 * Manages shared knowledge that multiple personas can access and contribute to.
 */

import { KnowledgeGraphStore, KGEntity, KGRelation, CreateEntityInput, CreateRelationInput } from './KnowledgeGraphStore';

export interface SharedFact {
  entity: KGEntity;
  relations: KGRelation[];
}

export interface SharedFactsOptions {
  /** If true, writes go to shared (null persona_id) storage */
  writeToShared?: boolean;
}

/**
 * SharedFactsEngine handles cross-persona knowledge sharing.
 * 
 * Key concepts:
 * - Shared entities have persona_id = null
 * - Shared relations link shared entities or connect shared to persona-specific
 * - When a persona reads, they see shared knowledge + their own
 * - When a persona writes with writeToShared=true, the fact goes to shared storage
 */
export class SharedFactsEngine {
  private store: KnowledgeGraphStore;

  constructor() {
    this.store = new KnowledgeGraphStore();
  }

  /**
   * Add a shared fact (entity with optional relations)
   * Writes to shared storage (persona_id = null)
   */
  addSharedFact(input: CreateEntityInput, relations?: CreateRelationInput[]): KGEntity | null {
    // Override persona_id to null for shared
    const sharedInput: CreateEntityInput = {
      ...input,
      persona_id: null,
    };

    const entity = this.store.createEntity(sharedInput);
    if (!entity || !relations) return entity;

    for (const rel of relations) {
      this.store.createRelation({
        ...rel,
        persona_id: null, // Force shared
      });
    }

    return entity;
  }

  /**
   * Add a fact for a specific persona
   * This fact is only visible to that persona
   */
  addPersonaFact(personaId: string, input: CreateEntityInput, relations?: CreateRelationInput[]): KGEntity | null {
    const personaInput: CreateEntityInput = {
      ...input,
      persona_id: personaId,
    };

    const entity = this.store.createEntity(personaInput);
    if (!entity || !relations) return entity;

    for (const rel of relations) {
      this.store.createRelation({
        ...rel,
        persona_id: personaId,
      });
    }

    return entity;
  }

  /**
   * Get all facts visible to a persona (shared + persona-specific)
   */
  getFactsForPersona(personaId: string): { entities: KGEntity[]; relations: KGRelation[] } {
    return this.store.getGraphForPersona(personaId);
  }

  /**
   * Get all shared facts
   */
  getAllSharedFacts(): SharedFact[] {
    const sharedEntities = this.store.getSharedEntities();
    const sharedRelations = this.store.getSharedRelations();

    // Group relations by entity
    return sharedEntities.map(entity => ({
      entity,
      relations: sharedRelations.filter(
        r => r.source_id === entity.id || r.target_id === entity.id
      ),
    }));
  }

  /**
   * Propagate a fact from one persona to another.
   * Copies persona-specific fact to target persona's storage.
   */
  propagateFact(sourcePersonaId: string, targetPersonaId: string, entityId: string): KGEntity | null {
    // Get the source entity
    const sourceEntity = this.store.getEntity(entityId);
    if (!sourceEntity) return null;

    // Create a copy for target persona
    return this.store.createEntity({
      id: crypto.randomUUID(),
      type: sourceEntity.type,
      name: sourceEntity.name,
      properties: sourceEntity.properties ? JSON.parse(sourceEntity.properties) : undefined,
      persona_id: targetPersonaId,
    });
  }

  /**
   * Link a persona-specific entity to a shared entity
   */
  linkToShared(personaId: string, personaEntityId: string, sharedEntityId: string, relationType: string): KGRelation | null {
    // Verify both entities exist
    const personaEntity = this.store.getEntity(personaEntityId);
    const sharedEntity = this.store.getEntity(sharedEntityId);
    if (!personaEntity || !sharedEntity) return null;

    return this.store.createRelation({
      id: crypto.randomUUID(),
      source_id: personaEntityId,
      target_id: sharedEntityId,
      relation_type: relationType,
      persona_id: personaId, // Relation belongs to persona but connects to shared
    });
  }

  /**
   * Get adjacency for an entity within a persona's context
   */
  getAdjacencyForPersona(personaId: string, entityId: string): { entity: KGEntity; relations: KGRelation[] } | null {
    const adjacency = this.store.getAdjacency(entityId);
    if (!adjacency) return null;

    // Filter relations to only those relevant to this persona
    // (persona's own relations + relations on shared entities)
    const filteredRelations = adjacency.relations.filter(
      r => r.persona_id === personaId || r.persona_id === null
    );

    return {
      entity: adjacency.entity,
      relations: filteredRelations,
    };
  }

  /**
   * Search shared facts by type or name
   */
  searchSharedFacts(query: { type?: string; name?: string }): KGEntity[] {
    return this.store.queryEntities({
      type: query.type,
      persona_id: null, // Only shared
      name: query.name,
    });
  }

  /**
   * Search facts for a persona (shared + persona-specific)
   */
  searchFactsForPersona(personaId: string, query: { type?: string; name?: string }): KGEntity[] {
    // Get both shared and persona-specific
    const sharedResults = this.store.queryEntities({
      type: query.type,
      persona_id: null,
      name: query.name,
    });

    const personaResults = this.store.queryEntities({
      type: query.type,
      persona_id: personaId,
      name: query.name,
    });

    // Combine and dedupe by id
    const map = new Map<string, KGEntity>();
    [...sharedResults, ...personaResults].forEach(e => map.set(e.id, e));
    return Array.from(map.values());
  }
}

// Singleton instance
let sharedFactsInstance: SharedFactsEngine | null = null;

export function getSharedFactsEngine(): SharedFactsEngine {
  if (!sharedFactsInstance) {
    sharedFactsInstance = new SharedFactsEngine();
  }
  return sharedFactsInstance;
}