/**
 * RAG Types for PixelPal Knowledge Base
 *
 * Defines types for the Retrieval-Augmented Generation knowledge base system.
 * Uses BM25 ranking (browser-compatible, no external embedding API needed).
 */

export interface TextChunk {
  id: string;
  content: string;          // The actual text content
  docId: string;           // Reference to source document
  docName: string;         // Human-readable document name
  chunkIndex: number;       // Position within document
  metadata: Record<string, unknown>;  // Additional metadata (page, section, etc.)
  createdAt: number;       // Timestamp when chunk was created
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'txt';
  size: number;
  chunkCount: number;
  indexedAt: number;
  status: 'indexing' | 'ready' | 'error';
  errorMessage?: string;
}

export interface RAGQueryOptions {
  query: string;
  topK?: number;           // Number of chunks to retrieve (default: 5)
  docIds?: string[];       // Filter to specific documents
  minScore?: number;       // Minimum relevance score threshold
  includeMetadata?: boolean; // Include document metadata in results
}

export interface RAGQueryResult {
  chunks: RAGChunkResult[];
  totalChunks: number;
  queryTime: number;       // Query execution time in ms
}

export interface RAGChunkResult {
  chunk: TextChunk;
  score: number;           // BM25 relevance score
  rank: number;            // Rank position (1 = most relevant)
  snippet: string;         // Highlighted snippet (window around match)
}

export interface RAGStats {
  totalDocuments: number;
  totalChunks: number;
  byDocument: Record<string, { chunks: number; size: number; indexedAt: number }>;
  indexSizeBytes: number;  // Rough estimate of index memory usage
}

// BM25 parameters
export const BM25Params = {
  k1: 1.5,      // Term frequency saturation
  b: 0.75,      // Document length normalization
} as const;

// Default chunking settings
export const DEFAULT_CHUNK_SIZE = 500;       // Characters per chunk
export const DEFAULT_CHUNK_OVERLAP = 50;     // Overlap between chunks
export const DEFAULT_TOP_K = 5;              // Default chunks to retrieve
export const DEFAULT_MIN_SCORE = 0.1;        // Minimum relevance threshold
