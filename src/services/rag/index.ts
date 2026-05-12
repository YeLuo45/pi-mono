/**
 * RAG Service - Barrel Export
 * 
 * V82: Knowledge Base RAG system with support for multiple source types.
 */

// ==========================================
// Legacy RAG exports (backward compatibility)
// ==========================================

// Types from ragTypes
export type {
  TextChunk,
  KnowledgeDocument,
  RAGQueryOptions,
  RAGQueryResult,
  RAGChunkResult,
  RAGStats,
} from './ragTypes';

// From chunker
export { smartChunkDocument } from './chunker';

// From vectorStore
export { getVectorStore, resetVectorStore } from './vectorStore';
export type { VectorStore } from './vectorStore';

// From ragService (legacy - these functions exist there)
export {
  indexDocument,
  indexDocumentFromContent,
  removeDocumentFromIndex,
  queryKnowledgeBase,
  getKnowledgeBaseStats,
  getIndexedDocuments,
  getDocumentChunks,
  isDocumentIndexed,
  clearKnowledgeBase,
  reindexAllDocuments,
} from './ragService';

// ==========================================
// New V82 Knowledge Base RAG exports
// ==========================================

// Types
export type {
  KnowledgeSource,
  TextChunk as KBTextChunk,
  RetrievalResult,
  ChunkOptions,
} from './types';

export {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_TOP_K,
} from './types';

// Storage operations
export {
  addSource,
  getSource,
  getAllSources,
  updateSource,
  deleteSource,
  addChunk,
  addChunks,
  getChunksBySource,
  getAllChunks,
  clearChunksBySource,
  deleteChunk,
  clearAll,
} from './sourceStorage';

// Core Knowledge Base RAG operations
export {
  chunkDocument,
  indexSource,
  retrieve,
  buildRAGContext,
  searchSources,
  getSourcesSortedByDate,
  getKnowledgeStats,
} from './knowledgeBase';
