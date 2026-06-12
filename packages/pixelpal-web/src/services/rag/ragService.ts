/**
 * RAG Service for PixelPal Knowledge Base
 *
 * High-level service for indexing documents and querying the knowledge base.
 * Integrates with the existing document parsing and chat completion systems.
 */

import type { KnowledgeDocument, TextChunk, RAGQueryResult, RAGQueryOptions, RAGStats } from './ragTypes';
import { DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP, DEFAULT_TOP_K, DEFAULT_MIN_SCORE } from './ragTypes';
import { getVectorStore } from './vectorStore';
import { smartChunkDocument } from './chunker';
import { parseDocument } from '../../utils/documentParser';
import type { DocumentFile } from '../../types';

/**
 * Index a document from a File object
 */
export async function indexDocument(
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<KnowledgeDocument> {
  const vectorStore = getVectorStore();

  const docId = crypto.randomUUID();
  onProgress?.('parsing', 0);

  // Parse the document
  const { content, type } = await parseDocument(file);
  onProgress?.('parsing', 100);

  // Create knowledge document metadata
  const knowledgeDoc: KnowledgeDocument = {
    id: docId,
    name: file.name,
    type,
    size: file.size,
    chunkCount: 0,
    indexedAt: Date.now(),
    status: 'indexing',
  };

  // Chunk the content
  onProgress?.('chunking', 0);
  const chunks = smartChunkDocument(content, {
    chunkSize: DEFAULT_CHUNK_SIZE,
    overlap: DEFAULT_CHUNK_OVERLAP,
    docId,
    docName: file.name,
    docType: type,
  });
  onProgress?.('chunking', 100);

  if (chunks.length === 0) {
    knowledgeDoc.status = 'error';
    knowledgeDoc.errorMessage = 'No content could be extracted from the document';
    return knowledgeDoc;
  }

  knowledgeDoc.chunkCount = chunks.length;

  // Add to vector store
  onProgress?.('indexing', 0);
  vectorStore.addDocument(knowledgeDoc, chunks);
  onProgress?.('indexing', 100);

  knowledgeDoc.status = 'ready';

  return knowledgeDoc;
}

/**
 * Index a document from an existing DocumentFile (already parsed)
 */
export function indexDocumentFromContent(
  doc: DocumentFile,
  options: {
    chunkSize?: number;
    overlap?: number;
  } = {}
): KnowledgeDocument {
  const vectorStore = getVectorStore();

  const docId = doc.id;
  const { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP } = options;

  // Create knowledge document metadata
  const knowledgeDoc: KnowledgeDocument = {
    id: docId,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    chunkCount: 0,
    indexedAt: Date.now(),
    status: 'indexing',
  };

  // Chunk the content
  const chunks = smartChunkDocument(doc.content, {
    chunkSize,
    overlap,
    docId,
    docName: doc.name,
    docType: doc.type,
  });

  if (chunks.length === 0) {
    knowledgeDoc.status = 'error';
    knowledgeDoc.errorMessage = 'No content could be extracted from the document';
    return knowledgeDoc;
  }

  knowledgeDoc.chunkCount = chunks.length;

  // Add to vector store
  vectorStore.addDocument(knowledgeDoc, chunks);

  knowledgeDoc.status = 'ready';

  return knowledgeDoc;
}

/**
 * Remove a document from the knowledge base
 */
export function removeDocumentFromIndex(docId: string): { removedChunks: number } {
  const vectorStore = getVectorStore();
  return vectorStore.removeDocument(docId);
}

/**
 * Query the knowledge base
 */
export function queryKnowledgeBase(options: RAGQueryOptions): RAGQueryResult {
  const vectorStore = getVectorStore();

  const {
    query,
    topK = DEFAULT_TOP_K,
    docIds,
    minScore = DEFAULT_MIN_SCORE,
  } = options;

  return vectorStore.query(query, {
    topK,
    docIds,
    minScore,
  });
}

/**
 * Build a RAG-enhanced context string from query results
 */
export function buildLegacyRAGContext(queryResults: RAGQueryResult, maxContextLength = 3000): string {
  const { chunks } = queryResults;

  if (chunks.length === 0) {
    return '';
  }

  const parts: string[] = [];
  let totalLength = 0;

  for (const { chunk, score, rank } of chunks) {
    // Calculate how much of the budget this chunk uses
    // Include rank and source info for attribution
    const headerLength = `[Source ${rank}]: ${chunk.docName} (relevance: ${score.toFixed(2)})\n`.length;
    const availableLength = maxContextLength - totalLength - headerLength - 10; // 10 for separator

    if (availableLength <= 0) break;

    let content = chunk.content;
    if (content.length > availableLength) {
      content = content.slice(0, availableLength - 3) + '...';
    }

    parts.push(`[Source ${rank}]: ${chunk.docName} (relevance: ${score.toFixed(2)})\n${content}`);
    totalLength += headerLength + content.length + 2;
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Get knowledge base statistics
 */
export function getKnowledgeBaseStats(): RAGStats {
  const vectorStore = getVectorStore();
  return vectorStore.getStats();
}

/**
 * Get all indexed documents
 */
export function getIndexedDocuments(): KnowledgeDocument[] {
  const vectorStore = getVectorStore();
  return vectorStore.getAllDocuments();
}

/**
 * Get chunks for a specific document
 */
export function getDocumentChunks(docId: string): TextChunk[] {
  const vectorStore = getVectorStore();
  return vectorStore.getDocumentChunks(docId);
}

/**
 * Check if a document is indexed
 */
export function isDocumentIndexed(docId: string): boolean {
  const vectorStore = getVectorStore();
  return vectorStore.getDocument(docId) !== undefined;
}

/**
 * Clear the entire knowledge base
 */
export function clearKnowledgeBase(): void {
  const vectorStore = getVectorStore();
  vectorStore.clear();
}

/**
 * Re-index all documents from a list of DocumentFiles
 * Useful after page reload to restore the index
 */
export function reindexAllDocuments(docs: DocumentFile[]): {
  successful: number;
  failed: number;
  errors: string[];
} {
  const vectorStore = getVectorStore();
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Clear existing index
  vectorStore.clear();

  for (const doc of docs) {
    try {
      indexDocumentFromContent(doc);
      results.successful++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${doc.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return results;
}
