/**
 * V87 RAG Deepening Types
 * 
 * Extended types for incremental indexing, hybrid search, reranking,
 * entity extraction, and knowledge graph features.
 */

import type { KnowledgeSource, TextChunk } from './types';

// ==========================================
// Named Entities
// ==========================================

export type EntityType = 'person' | 'location' | 'concept' | 'organization' | 'date' | 'event';

export interface NamedEntity {
  text: string;
  type: EntityType;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// ==========================================
// Indexed Document (V87)
// ==========================================

export interface IndexedDocument {
  id: string;
  sourceId: string;
  chunks: TextChunk[];
  totalChunks: number;
  indexedAt: number;
  status: 'indexing' | 'ready' | 'error';
  summary?: string;
  entities: NamedEntity[];
  tags: string[];
  errorMessage?: string;
  // For incremental indexing
  contentHash?: string;
  lastModified?: number;
}

// ==========================================
// Search Results (V87)
// ==========================================

export interface SearchResult {
  chunk: TextChunk;
  score: number;
  rerankScore: number;
  source: KnowledgeSource;
  highlights: string[];
  matchedTerms: string[];
}

export interface HybridSearchOptions {
  query: string;
  topK?: number;
  vectorWeight?: number;   // Weight for vector similarity (default: 0.5)
  bm25Weight?: number;     // Weight for BM25 score (default: 0.5)
  minScore?: number;
  sourceIds?: string[];    // Filter by source IDs
}

export interface HybridSearchResult {
  results: SearchResult[];
  totalResults: number;
  queryTime: number;
  vectorTime: number;
  bm25Time: number;
  rerankTime: number;
}

// ==========================================
// Indexing Types
// ==========================================

export interface IndexQueueItem {
  id: string;
  sourceId: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  addedAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  error?: string;
}

export interface IndexDiff {
  sourceId: string;
  hasChanges: boolean;
  addedChunks: TextChunk[];
  removedChunkIds: string[];
  modifiedChunkIds: string[];
  unchangedChunkIds: string[];
}

export interface IndexingProgress {
  sourceId: string;
  stage: 'diff' | 'chunking' | 'embedding' | 'indexing' | 'finalizing';
  progress: number;  // 0-100
  message: string;
}

// ==========================================
// Knowledge Graph Types
// ==========================================

export interface KnowledgeGraphNode {
  id: string;
  text: string;
  type: EntityType;
  occurrences: number;
  sources: string[];
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;  // Node ID
  target: string;  // Node ID
  weight: number;  // Co-occurrence strength
  label?: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  lastUpdated: number;
}

// ==========================================
// Index History
// ==========================================

export interface IndexHistoryEntry {
  id: string;
  sourceId: string;
  action: 'index' | 'update' | 'delete' | 'reindex';
  timestamp: number;
  chunksIndexed: number;
  duration: number;  // ms
  success: boolean;
  error?: string;
}

// ==========================================
// Summarization Types
// ==========================================

export interface DocumentSummary {
  sourceId: string;
  summary: string;
  keyPoints: string[];
  keywords: string[];
  generatedAt: number;
}

// ==========================================
// Query Enhancement Types
// ==========================================

export interface QueryExpansion {
  original: string;
  expanded: string[];
  synonyms: Map<string, string[]>;
}

export interface QueryRewrite {
  original: string;
  rewritten: string;
  technique: 'expansion' | 'refinement' | 'decontextualization';
}

// ==========================================
// Re-Ranking Types
// ==========================================

export interface RerankResult {
  result: SearchResult;
  originalScore: number;
  rerankScore: number;
  relevanceFactors: {
    semantic: number;
    keyword: number;
    position: number;
    recency: number;
  };
}

// ==========================================
// Service Configuration
// ==========================================

export interface RAGV87Config {
  // Hybrid search weights
  vectorWeight: number;
  bm25Weight: number;
  
  // Reranking
  rerankEnabled: boolean;
  rerankTopK: number;
  
  // Entity extraction
  entityExtractionEnabled: boolean;
  
  // Knowledge graph
  knowledgeGraphEnabled: boolean;
  maxGraphNodes: number;
  
  // Summarization
  autoSummarize: boolean;
  summaryLength: number;  // Target words
  
  // Incremental indexing
  incrementalEnabled: boolean;
  hashAlgorithm: 'simple' | 'md5' | 'sha256';
}

export const DEFAULT_RAG_V87_CONFIG: RAGV87Config = {
  vectorWeight: 0.5,
  bm25Weight: 0.5,
  rerankEnabled: true,
  rerankTopK: 10,
  entityExtractionEnabled: true,
  knowledgeGraphEnabled: true,
  maxGraphNodes: 100,
  autoSummarize: true,
  summaryLength: 150,
  incrementalEnabled: true,
  hashAlgorithm: 'simple',
};
