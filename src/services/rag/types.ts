/**
 * Knowledge Base RAG Types
 *
 * Types for the Knowledge Base RAG system (V82).
 * Supports multiple source types: text, file, url, note.
 */

export interface KnowledgeSource {
  id: string;
  type: 'text' | 'file' | 'url' | 'note';
  title: string;
  content: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    source?: string;      // URL or filename
    tags: string[];
    size: number;         // char count
  };
}

export interface TextChunk {
  id: string;
  sourceId: string;
  index: number;
  text: string;
  embedding?: number[];
}

export interface RetrievalResult {
  chunk: TextChunk;
  source: KnowledgeSource;
  score: number;
}

export interface ChunkOptions {
  chunkSize: number;
  overlap: number;
}

export const DEFAULT_CHUNK_SIZE = 500;
export const DEFAULT_CHUNK_OVERLAP = 50;
export const DEFAULT_TOP_K = 5;
