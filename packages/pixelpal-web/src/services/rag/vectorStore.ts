/**
 * Vector Store with BM25 Ranking for RAG Knowledge Base
 *
 * Browser-compatible implementation using BM25 (Best Matching 25) ranking algorithm.
 * No external embedding API required - uses word frequency-based relevance scoring.
 *
 * BM25 is a probabilistic relevance ranking algorithm that improves upon TF-IDF by:
 * - Adding term frequency saturation (diminishing returns for repeated terms)
 * - Document length normalization
 * - Term saturation with parameter k1
 */

import type { TextChunk, RAGQueryResult, RAGChunkResult, RAGStats, KnowledgeDocument } from './ragTypes';
import { BM25Params } from './ragTypes';

interface IndexEntry {
  chunk: TextChunk;
  // Precomputed inverted index for BM25
  termFreqs: Map<string, number>;  // term -> frequency in this chunk
  docLength: number;               // Number of terms in chunk
}

interface BM25InvertedIndex {
  [term: string]: {
    postings: Array<{ entryId: string; tf: number }>;  // chunk id -> term frequency
    df: number;                                        // document frequency (how many chunks contain this term)
  };
}

class VectorStore {
  private chunks: Map<string, IndexEntry> = new Map();
  private invertedIndex: BM25InvertedIndex = {};
  private documents: Map<string, KnowledgeDocument> = new Map();
  private avgDocLength: number = 0;
  private totalTerms: number = 0;

  // ==========================================
  // Document Management
  // ==========================================

  /**
   * Add a document and its chunks to the store
   */
  addDocument(doc: KnowledgeDocument, chunks: TextChunk[]): void {
    // Store document metadata
    this.documents.set(doc.id, doc);

    // Add each chunk to the index
    for (const chunk of chunks) {
      this.addChunk(chunk);
    }

    // Recalculate average document length
    this.recalculateStats();
  }

  /**
   * Add a single chunk to the index
   */
  private addChunk(chunk: TextChunk): void {
    // Tokenize the chunk content
    const terms = this.tokenize(chunk.content);
    const termFreqs = new Map<string, number>();
    const docLength = terms.length;

    // Count term frequencies
    for (const term of terms) {
      termFreqs.set(term, (termFreqs.get(term) || 0) + 1);
    }

    // Create index entry
    const entry: IndexEntry = {
      chunk,
      termFreqs,
      docLength,
    };

    this.chunks.set(chunk.id, entry);
    this.totalTerms += docLength;

    // Update inverted index
    for (const [term, tf] of termFreqs) {
      if (!this.invertedIndex[term]) {
        this.invertedIndex[term] = { postings: [], df: 0 };
      }

      // Check if this term was already in another chunk (for DF)
      const existingPostings = this.invertedIndex[term].postings;
      const alreadyIndexed = existingPostings.some(p => p.entryId === chunk.id);

      if (!alreadyIndexed) {
        this.invertedIndex[term].df++;
        this.invertedIndex[term].postings.push({ entryId: chunk.id, tf });
      }
    }
  }

  /**
   * Remove a document and all its chunks
   */
  removeDocument(docId: string): { removedChunks: number } {
    const doc = this.documents.get(docId);
    if (!doc) return { removedChunks: 0 };

    // Find and remove all chunks for this document
    const chunksToRemove = Array.from(this.chunks.values())
      .filter(entry => entry.chunk.docId === docId)
      .map(entry => entry.chunk.id);

    let removedChunks = 0;
    for (const chunkId of chunksToRemove) {
      const entry = this.chunks.get(chunkId);
      if (entry) {
        // Remove from inverted index
        for (const term of entry.termFreqs.keys()) {
          if (this.invertedIndex[term]) {
            this.invertedIndex[term].postings = this.invertedIndex[term].postings
              .filter(p => p.entryId !== chunkId);
            // Update document frequency
            if (this.invertedIndex[term].postings.length === 0) {
              this.invertedIndex[term].df = 0;
            } else {
              this.invertedIndex[term].df = this.invertedIndex[term].postings.length;
            }
          }
        }

        this.chunks.delete(chunkId);
        removedChunks++;
      }
    }

    // Remove document metadata
    this.documents.delete(docId);

    // Recalculate stats
    this.recalculateStats();

    return { removedChunks };
  }

  /**
   * Get all chunks for a document
   */
  getDocumentChunks(docId: string): TextChunk[] {
    return Array.from(this.chunks.values())
      .filter(entry => entry.chunk.docId === docId)
      .map(entry => entry.chunk);
  }

  /**
   * Get a specific document
   */
  getDocument(docId: string): KnowledgeDocument | undefined {
    return this.documents.get(docId);
  }

  /**
   * Get all documents
   */
  getAllDocuments(): KnowledgeDocument[] {
    return Array.from(this.documents.values());
  }

  // ==========================================
  // Tokenization
  // ==========================================

  /**
   * Tokenize text into terms
   * Lowercases, removes punctuation, splits on whitespace
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 1);  // Filter out single characters
  }

  /**
   * Recalculate average document length after changes
   */
  private recalculateStats(): void {
    if (this.chunks.size === 0) {
      this.avgDocLength = 0;
      return;
    }

    let totalLength = 0;
    for (const entry of this.chunks.values()) {
      totalLength += entry.docLength;
    }
    this.avgDocLength = totalLength / this.chunks.size;
  }

  // ==========================================
  // BM25 Scoring
  // ==========================================

  /**
   * Calculate BM25 score for a single term against a document
   */
  private bm25Score(term: string, entry: IndexEntry): number {
    const { k1, b } = BM25Params;

    // Get term frequency in this document
    const tf = entry.termFreqs.get(term) || 0;

    if (tf === 0) return 0;

    // Get document frequency (how many documents contain this term)
    const indexEntry = this.invertedIndex[term];
    if (!indexEntry || indexEntry.df === 0) return 0;

    const N = this.chunks.size;           // Total number of documents
    const df = indexEntry.df;              // Document frequency

    // BM25 formula components
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);  // Smoothed IDF
    const tfComponent = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (entry.docLength / this.avgDocLength)));

    return idf * tfComponent;
  }

  /**
   * Calculate the total BM25 score for a query against a document
   */
  private calculateBM25Score(queryTerms: string[], entry: IndexEntry): number {
    let score = 0;

    for (const term of queryTerms) {
      score += this.bm25Score(term, entry);
    }

    return score;
  }

  // ==========================================
  // Query
  // ==========================================

  /**
   * Query the knowledge base with a natural language question
   */
  query(
    queryText: string,
    options: {
      topK?: number;
      docIds?: string[];
      minScore?: number;
    } = {}
  ): RAGQueryResult {
    const startTime = performance.now();
    const { topK = 5, docIds, minScore = 0.1 } = options;

    // Tokenize query
    const queryTerms = this.tokenize(queryText);

    if (queryTerms.length === 0) {
      return {
        chunks: [],
        totalChunks: this.chunks.size,
        queryTime: performance.now() - startTime,
      };
    }

    // Score all chunks
    const scores: Array<{ chunkId: string; score: number }> = [];

    for (const [chunkId, entry] of this.chunks) {
      // Filter by document IDs if specified
      if (docIds && !docIds.includes(entry.chunk.docId)) {
        continue;
      }

      const score = this.calculateBM25Score(queryTerms, entry);

      if (score > minScore) {
        scores.push({ chunkId, score });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Take top K
    const topScores = scores.slice(0, topK);

    // Build results with snippets
    const results: RAGChunkResult[] = topScores.map(({ chunkId, score }, index) => {
      const entry = this.chunks.get(chunkId)!;
      const snippet = this.createSnippet(entry.chunk.content, queryTerms);

      return {
        chunk: entry.chunk,
        score,
        rank: index + 1,
        snippet,
      };
    });

    return {
      chunks: results,
      totalChunks: this.chunks.size,
      queryTime: performance.now() - startTime,
    };
  }

  /**
   * Create a highlighted snippet around the query match
   */
  private createSnippet(content: string, queryTerms: string[], contextWords = 20): string {
    const words = content.split(/\s+/);
    const lowerContent = content.toLowerCase();

    // Find the first occurrence of any query term
    let firstMatchIndex = -1;
    for (const term of queryTerms) {
      const idx = lowerContent.indexOf(term);
      if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
        firstMatchIndex = idx;
      }
    }

    if (firstMatchIndex === -1) {
      // No exact match - just return the beginning
      return words.slice(0, contextWords * 2).join(' ') + (words.length > contextWords * 2 ? '...' : '');
    }

    // Calculate word index from character position
    const beforeMatch = content.substring(0, firstMatchIndex);
    const matchWordIndex = beforeMatch.split(/\s+/).length - 1;

    // Extract window around the match
    const startIdx = Math.max(0, matchWordIndex - contextWords);
    const endIdx = Math.min(words.length, matchWordIndex + contextWords);

    const snippetWords = words.slice(startIdx, endIdx);
    const prefix = startIdx > 0 ? '...' : '';
    const suffix = endIdx < words.length ? '...' : '';

    return prefix + snippetWords.join(' ') + suffix;
  }

  // ==========================================
  // Statistics
  // ==========================================

  /**
   * Get statistics about the knowledge base
   */
  getStats(): RAGStats {
    const byDocument: RAGStats['byDocument'] = {};

    for (const doc of this.documents.values()) {
      const chunks = this.getDocumentChunks(doc.id);
      byDocument[doc.id] = {
        chunks: chunks.length,
        size: doc.size,
        indexedAt: doc.indexedAt,
      };
    }

    // Estimate index size (rough)
    let indexSizeBytes = 0;
    for (const entry of this.chunks.values()) {
      indexSizeBytes += entry.chunk.content.length * 2;  // UTF-16 estimate
      indexSizeBytes += entry.termFreqs.size * 50;        // Term data overhead
    }

    return {
      totalDocuments: this.documents.size,
      totalChunks: this.chunks.size,
      byDocument,
      indexSizeBytes,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.chunks.clear();
    this.invertedIndex = {};
    this.documents.clear();
    this.avgDocLength = 0;
    this.totalTerms = 0;
  }
}

// Singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}

export function resetVectorStore(): void {
  if (vectorStoreInstance) {
    vectorStoreInstance.clear();
  }
  vectorStoreInstance = null;
}

export type { VectorStore };
