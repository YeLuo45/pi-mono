/**
 * Hybrid Search Service — Vector + BM25 Combined Retrieval
 * 
 * Combines vector similarity search with BM25 keyword search for
 * improved retrieval accuracy.
 */

import type { HybridSearchOptions, HybridSearchResult, SearchResult } from './v87types';
import type { KnowledgeSource, TextChunk } from './types';
import { cosineSimilarity } from './embeddingService';

// ==========================================
// BM25 Implementation
// ==========================================

interface BM25Doc {
  id: string;
  terms: Map<string, number>;
  termCount: number;
}

interface BM25Index {
  docs: Map<string, BM25Doc>;
  avgDocLength: number;
  idf: Map<string, number>;
  k1: number;
  b: number;
}

const DEFAULT_BM25_K1 = 1.5;
const DEFAULT_BM25_B = 0.75;

/**
 * Tokenize text into terms.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Build a BM25 index from chunks.
 */
function buildBM25Index(chunks: TextChunk[]): BM25Index {
  const docs = new Map<string, BM25Doc>();
  let totalTerms = 0;

  for (const chunk of chunks) {
    const terms = tokenize(chunk.text);
    const termFreq = new Map<string, number>();
    
    for (const term of terms) {
      termFreq.set(term, (termFreq.get(term) || 0) + 1);
    }

    docs.set(chunk.id, {
      id: chunk.id,
      terms: termFreq,
      termCount: terms.length,
    });
    totalTerms += terms.length;
  }

  // Calculate IDF for each term
  const N = docs.size;
  const idf = new Map<string, number>();
  const allTerms = new Set<string>();

  for (const doc of docs.values()) {
    for (const term of doc.terms.keys()) {
      allTerms.add(term);
    }
  }

  for (const term of allTerms) {
    let df = 0;
    for (const doc of docs.values()) {
      if (doc.terms.has(term)) df++;
    }
    // Smoothed IDF
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  const avgDocLength = totalTerms / Math.max(1, N);

  return { docs, avgDocLength, idf, k1: DEFAULT_BM25_K1, b: DEFAULT_BM25_B };
}

/**
 * Score a document against a query using BM25.
 */
function bm25Score(index: BM25Index, doc: BM25Doc, queryTerms: string[]): number {
  let score = 0;
  const { k1, b } = index;

  for (const term of queryTerms) {
    const tf = doc.terms.get(term) || 0;
    if (tf === 0) continue;

    const idf = index.idf.get(term) || 0;
    const tfComponent = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (doc.termCount / index.avgDocLength)));
    score += idf * tfComponent;
  }

  return score;
}

// ==========================================
// Hybrid Search
// ==========================================

// Simple in-memory storage for embeddings (in production, use proper vector DB)
const embeddingCache = new Map<string, number[]>();

/**
 * Compute or retrieve cached embedding for a chunk.
 */
async function getChunkEmbedding(chunk: TextChunk, corpus: string[]): Promise<number[]> {
  const cacheKey = chunk.id;
  
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  // Use TF-IDF fallback from embeddingService
  const { computeTFIDF } = await import('./embeddingService');
  const embedding = computeTFIDF(chunk.text, corpus);
  
  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

/**
 * Search using hybrid BM25 + vector similarity.
 */
export async function hybridSearch(
  chunks: TextChunk[],
  sources: KnowledgeSource[],
  options: HybridSearchOptions
): Promise<HybridSearchResult> {
  const startTime = performance.now();
  const {
    query,
    topK = 10,
    vectorWeight = 0.5,
    bm25Weight = 0.5,
    minScore = 0.1,
    sourceIds,
  } = options;

  // Filter chunks by source if specified
  const filteredChunks = sourceIds
    ? chunks.filter(c => sourceIds.includes(c.sourceId))
    : chunks;

  if (filteredChunks.length === 0) {
    return {
      results: [],
      totalResults: 0,
      queryTime: performance.now() - startTime,
      vectorTime: 0,
      bm25Time: 0,
      rerankTime: 0,
    };
  }

  const sourceMap = new Map(sources.map(s => [s.id, s]));
  const vectorStartTime = performance.now();

  // Build corpus for TF-IDF
  const corpus = filteredChunks.map(c => c.text);
  
  // Compute query embedding
  const { computeTFIDF } = await import('./embeddingService');
  const queryEmbedding = computeTFIDF(query, corpus);

  // Compute vector similarities
  const vectorScores: Map<string, number> = new Map();
  
  for (const chunk of filteredChunks) {
    const embedding = await getChunkEmbedding(chunk, corpus);
    if (embedding.length > 0 && queryEmbedding.length === embedding.length) {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      vectorScores.set(chunk.id, similarity);
    }
  }

  const vectorTime = performance.now() - vectorStartTime;
  const bm25StartTime = performance.now();

  // Build BM25 index and search
  const bm25Index = buildBM25Index(filteredChunks);
  const queryTerms = tokenize(query);
  const bm25Scores: Map<string, number> = new Map();

  for (const chunk of filteredChunks) {
    const doc = bm25Index.docs.get(chunk.id);
    if (doc) {
      const score = bm25Score(bm25Index, doc, queryTerms);
      bm25Scores.set(chunk.id, score);
    }
  }

  const bm25Time = performance.now() - bm25StartTime;

  // Normalize BM25 scores to 0-1 range
  const maxBM25 = Math.max(...Array.from(bm25Scores.values()), 0.001);
  for (const [id, score] of bm25Scores) {
    bm25Scores.set(id, score / maxBM25);
  }

  // Combine scores
  const combinedScores: Map<string, { vector: number; bm25: number; combined: number }> = new Map();

  for (const chunk of filteredChunks) {
    const vectorScore = vectorScores.get(chunk.id) || 0;
    const bm25Score = bm25Scores.get(chunk.id) || 0;
    const combined = (vectorWeight * vectorScore) + (bm25Weight * bm25Score);

    combinedScores.set(chunk.id, { vector: vectorScore, bm25: bm25Score, combined });
  }

  // Sort by combined score
  const sorted = Array.from(combinedScores.entries())
    .filter(([_, scores]) => scores.combined >= minScore)
    .sort((a, b) => b[1].combined - a[1].combined)
    .slice(0, topK);

  // Build results
  const results: SearchResult[] = [];
  for (const [chunkId, scores] of sorted) {
    const chunk = filteredChunks.find(c => c.id === chunkId);
    const source = chunk ? sourceMap.get(chunk.sourceId) : undefined;

    if (chunk && source) {
      results.push({
        chunk,
        score: scores.combined,
        rerankScore: 0, // Will be set by reranker
        source,
        highlights: [],
        matchedTerms: queryTerms.filter(t => chunk.text.toLowerCase().includes(t)),
      });
    }
  }

  return {
    results,
    totalResults: results.length,
    queryTime: performance.now() - startTime,
    vectorTime,
    bm25Time,
    rerankTime: 0,
  };
}

/**
 * Clear embedding cache (call when index changes).
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
