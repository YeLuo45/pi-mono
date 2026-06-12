/**
 * V148: Knowledge Services
 * 
 * Knowledge Graph Store and Shared Facts Engine
 */

export {
  KnowledgeGraphStore,
  getKnowledgeGraphStore,
  type KGEntity,
  type KGRelation,
  type CreateEntityInput,
  type CreateRelationInput,
  type AdjacencyResult,
} from './KnowledgeGraphStore';

export {
  SharedFactsEngine,
  getSharedFactsEngine,
  type SharedFact,
  type SharedFactsOptions,
} from './SharedFactsEngine';