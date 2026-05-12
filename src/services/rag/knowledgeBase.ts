/**
 * Knowledge Base Service — Core RAG logic for V82 Knowledge Base
 *
 * Handles document chunking, indexing, retrieval, and context building
 * for the new Knowledge Base system with support for multiple source types.
 */

import type { KnowledgeSource, TextChunk, RetrievalResult } from './types';
import { DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP, DEFAULT_TOP_K } from './types';
import * as sourceStorage from './sourceStorage';

/**
 * Chunk a document into smaller pieces.
 */
export function chunkDocument(
  source: KnowledgeSource,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): TextChunk[] {
  const { content, id } = source;
  const chunks: TextChunk[] = [];
  
  // Split by paragraph boundaries first (double newlines or single newlines for shorter texts)
  const paragraphs = content.split(/\n\n+|\n+/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + paragraph.length + 1 > chunkSize && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: `${id}-chunk-${chunkIndex}`,
        sourceId: id,
        index: chunkIndex,
        text: currentChunk.trim(),
      });
      
      chunkIndex++;
      
      // Start new chunk with overlap
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + ' ' + paragraph;
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += ' ';
      }
      currentChunk += paragraph;
    }
  }
  
  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${id}-chunk-${chunkIndex}`,
      sourceId: id,
      index: chunkIndex,
      text: currentChunk.trim(),
    });
  }
  
  return chunks;
}

/**
 * Embed a single chunk's text using TF-IDF fallback.
 */
async function embedTextForChunk(text: string, corpus: string[]): Promise<number[]> {
  try {
    const registry = (await import('../ai/model-registry-adapter')).getRegistry();
    
    if (typeof (registry as unknown as { embed?: (text: string) => Promise<number[]> }).embed === 'function') {
      return await (registry as unknown as { embed: (text: string) => Promise<number[]> }).embed(text);
    }
  } catch {
    // Fall through to TF-IDF
  }
  
  // Simple TF-IDF fallback
  return computeSimpleTFIDF(text, corpus);
}

/**
 * Simple TF-IDF computation for a single document.
 */
function computeSimpleTFIDF(text: string, corpus: string[]): number[] {
  const terms = tokenize(text);
  const corpusTerms = corpus.map(doc => tokenize(doc));
  
  const vocab = Array.from(new Set(terms));
  if (vocab.length === 0) return [];
  
  // Term frequency
  const termFreq = new Map<string, number>();
  for (const term of terms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }
  
  // Document frequency
  const docFreq = new Map<string, number>();
  for (const docTerms of corpusTerms) {
    const unique = new Set(docTerms);
    for (const term of unique) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }
  
  const N = corpus.length || 1;
  const tfidf: number[] = [];
  
  for (const term of vocab) {
    const tf = termFreq.get(term) || 0;
    const df = docFreq.get(term) || 0;
    const idf = Math.log((N + 1) / (df + 1)) + 1;
    tfidf.push(tf * idf);
  }
  
  // Normalize
  const magnitude = Math.sqrt(tfidf.reduce((s, v) => s + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < tfidf.length; i++) {
      tfidf[i] /= magnitude;
    }
  }
  
  return tfidf;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
}

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Index a knowledge source (chunk + embed).
 */
export async function indexSource(source: KnowledgeSource): Promise<TextChunk[]> {
  // Clear any existing chunks for this source
  await sourceStorage.clearChunksBySource(source.id);
  
  // Chunk the document
  const chunks = chunkDocument(source);
  
  if (chunks.length === 0) {
    return [];
  }
  
  // Compute embeddings for each chunk
  const textsToEmbed = chunks.map(c => c.text);
  const allChunks = await sourceStorage.getAllChunks();
  const existingTexts = allChunks.map(c => c.text);
  const corpus = [...existingTexts, ...textsToEmbed];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await embedTextForChunk(chunk.text, corpus);
    chunk.embedding = embedding;
  }
  
  // Save chunks to storage
  await sourceStorage.addChunks(chunks);
  
  return chunks;
}

/**
 * Retrieve relevant chunks for a query.
 */
export async function retrieve(query: string, topK: number = DEFAULT_TOP_K): Promise<RetrievalResult[]> {
  const sources = await sourceStorage.getAllSources();
  const chunks = await sourceStorage.getAllChunks();
  
  if (chunks.length === 0) {
    return [];
  }
  
  // Compute query embedding
  const corpus = chunks.map(c => c.text);
  const queryEmbedding = await embedTextForChunk(query, corpus);
  
  // Score each chunk
  const scoredChunks: Array<{ chunk: TextChunk; score: number }> = [];
  
  for (const chunk of chunks) {
    if (!chunk.embedding || chunk.embedding.length === 0) {
      // Compute embedding if missing
      chunk.embedding = await embedTextForChunk(chunk.text, corpus);
    }
    
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    scoredChunks.push({ chunk, score });
  }
  
  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Take top K and build results
  const results: RetrievalResult[] = [];
  const sourceMap = new Map(sources.map(s => [s.id, s]));
  
  for (let i = 0; i < Math.min(topK, scoredChunks.length); i++) {
    const { chunk, score } = scoredChunks[i];
    const source = sourceMap.get(chunk.sourceId);
    
    if (source) {
      results.push({ chunk, source, score });
    }
  }
  
  return results;
}

/**
 * Build a formatted RAG context string for chat.
 */
export async function buildRAGContext(
  query: string,
  messages: Array<{ role: string; content: string }> = []
): Promise<string> {
  const results = await retrieve(query, 5);
  
  if (results.length === 0) {
    return '';
  }
  
  const parts: string[] = [];
  parts.push('=== Knowledge Base Context ===');
  
  for (let i = 0; i < results.length; i++) {
    const { chunk, source, score } = results[i];
    const truncatedText = chunk.text.length > 300 ? chunk.text.slice(0, 300) + '...' : chunk.text;
    
    parts.push(`\n[Source ${i + 1}] ${source.title} (relevance: ${(score * 100).toFixed(1)}%)\n${truncatedText}`);
  }
  
  parts.push('\n=== End Knowledge Base Context ===');
  
  return parts.join('\n');
}

/**
 * Search sources by query (simple text search).
 */
export async function searchSources(query: string): Promise<KnowledgeSource[]> {
  const sources = await sourceStorage.getAllSources();
  const lowerQuery = query.toLowerCase();
  
  return sources.filter(source => {
    return source.title.toLowerCase().includes(lowerQuery) ||
           source.content.toLowerCase().includes(lowerQuery) ||
           source.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
  });
}

/**
 * Get all sources sorted by date.
 */
export async function getSourcesSortedByDate(): Promise<KnowledgeSource[]> {
  const sources = await sourceStorage.getAllSources();
  return sources.sort((a, b) => 
    new Date(b.metadata.createdAt).getTime() - new Date(a.metadata.createdAt).getTime()
  );
}

/**
 * Get statistics about the knowledge base.
 */
export async function getKnowledgeStats(): Promise<{
  totalSources: number;
  totalChunks: number;
  byType: Record<string, number>;
}> {
  const sources = await sourceStorage.getAllSources();
  const chunks = await sourceStorage.getAllChunks();
  
  const byType: Record<string, number> = {};
  for (const source of sources) {
    byType[source.type] = (byType[source.type] || 0) + 1;
  }
  
  return {
    totalSources: sources.length,
    totalChunks: chunks.length,
    byType,
  };
}
