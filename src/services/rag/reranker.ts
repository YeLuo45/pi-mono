/**
 * Reranker Service — Relevance Reranking for Search Results
 * 
 * Reranks initial search results based on multiple relevance factors
 * including semantic similarity, keyword overlap, position, and recency.
 */

import type { SearchResult, RerankResult } from './v87Types';
import type { TextChunk } from './types';

/**
 * Reranking configuration.
 */
export interface RerankConfig {
  semanticWeight: number;
  keywordWeight: number;
  positionWeight: number;
  recencyWeight: number;
}

/**
 * Default reranking weights.
 */
const DEFAULT_CONFIG: RerankConfig = {
  semanticWeight: 0.4,
  keywordWeight: 0.3,
  positionWeight: 0.15,
  recencyWeight: 0.15,
};

/**
 * Tokenize text for matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Calculate keyword overlap score between query and chunk.
 */
function calculateKeywordOverlap(query: string, chunk: TextChunk): number {
  const queryTokens = new Set(tokenize(query));
  const chunkTokens = new Set(tokenize(chunk.text));

  if (queryTokens.size === 0) return 0;

  let overlap = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) {
      overlap++;
    }
  }

  return overlap / queryTokens.size;
}

/**
 * Calculate position score (earlier is better).
 */
function calculatePositionScore(chunk: TextChunk, index: number): number {
  // First result gets highest score
  return 1 - (index * 0.1);
}

/**
 * Extract date from chunk metadata if available.
 */
function getChunkDate(chunk: TextChunk): number | null {
  // Check for date in metadata
  const metaDate = (chunk as unknown as { metadata?: { createdAt?: string; date?: string } }).metadata?.createdAt;
  if (metaDate) {
    return new Date(metaDate).getTime();
  }

  // Check if chunk has sourceId with timestamp
  // Format: sourceId-chunk-index, where sourceId might contain timestamp
  return null;
}

/**
 * Calculate recency score based on indexedAt timestamp.
 */
function calculateRecencyScore(chunk: TextChunk, now: number = Date.now()): number {
  const date = getChunkDate(chunk);
  if (!date) return 0.5; // Neutral score if no date

  const age = now - date;
  const dayMs = 24 * 60 * 60 * 1000;
  const weekMs = 7 * dayMs;

  // Decay over time (max 1 week = full score, then decay)
  if (age < dayMs) return 1;
  if (age < weekMs) return 0.8;
  if (age < 30 * dayMs) return 0.6;
  if (age < 90 * dayMs) return 0.4;
  return 0.2;
}

/**
 * Rerank search results based on multiple factors.
 */
export function rerankResults(
  results: SearchResult[],
  query: string,
  config: Partial<RerankConfig> = {}
): RerankResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  // Calculate original score range for normalization
  const maxOriginalScore = Math.max(...results.map(r => r.score), 0.001);

  return results.map((result, index) => {
    // Calculate individual factor scores
    const keywordScore = calculateKeywordOverlap(query, result.chunk);
    const positionScore = calculatePositionScore(result.chunk, index);
    const recencyScore = calculateRecencyScore(result.chunk, now);
    
    // Semantic score (normalized from original)
    const semanticScore = result.score / maxOriginalScore;

    // Weighted combination
    const rerankScore = 
      (cfg.semanticWeight * semanticScore) +
      (cfg.keywordWeight * keywordScore) +
      (cfg.positionWeight * positionScore) +
      (cfg.recencyWeight * recencyScore);

    return {
      result: {
        ...result,
        rerankScore,
      },
      originalScore: result.score,
      rerankScore,
      relevanceFactors: {
        semantic: semanticScore,
        keyword: keywordScore,
        position: positionScore,
        recency: recencyScore,
      },
    };
  })
  .sort((a, b) => b.rerankScore - a.rerankScore)
  .map((reranked, newIndex) => ({
    ...reranked,
    result: {
      ...reranked.result,
      rerankScore: reranked.rerankScore,
    },
  }));
}

/**
 * Create highlight snippets from matched terms.
 */
export function createHighlights(
  text: string,
  query: string,
  contextWords: number = 15
): string[] {
  const queryTokens = tokenize(query);
  const words = text.split(/\s+/);
  const highlights: string[] = [];

  // Find matching positions
  for (const token of queryTokens) {
    for (let i = 0; i < words.length; i++) {
      const lowerWord = words[i].toLowerCase().replace(/[^\w]/g, '');
      if (lowerWord.includes(token) || token.includes(lowerWord)) {
        const start = Math.max(0, i - contextWords);
        const end = Math.min(words.length, i + contextWords + 1);
        highlights.push(words.slice(start, end).join(' ') + (end < words.length ? '...' : ''));
      }
    }
  }

  // Deduplicate and limit
  return [...new Set(highlights)].slice(0, 3);
}

/**
 * Get matched terms between query and text.
 */
export function getMatchedTerms(query: string, text: string): string[] {
  const queryTokens = new Set(tokenize(query));
  const textTokens = new Set(tokenize(text));

  const matched: string[] = [];
  for (const token of queryTokens) {
    if (textTokens.has(token)) {
      matched.push(token);
    }
  }

  return matched;
}
