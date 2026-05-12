/**
 * Embedding Service — Text vectorization for Knowledge Base RAG
 *
 * Uses provider's embed() method if available, otherwise falls back
 * to local TF-IDF computation.
 */

import { getRegistry } from '../ai/model-registry-adapter';

/**
 * Compute TF-IDF vector for a single text.
 */
export function computeTFIDF(text: string, corpus: string[]): number[] {
  // Tokenize
  const terms = tokenize(text);
  const corpusTerms = corpus.map(doc => tokenize(doc));
  
  // Get all unique terms
  const vocab = Array.from(new Set(terms));
  
  if (vocab.length === 0) {
    return [];
  }

  // Compute term frequency for the query
  const termFreq = new Map<string, number>();
  for (const term of terms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }

  // Compute document frequency (how many docs contain each term)
  const docFreq = new Map<string, number>();
  for (const docTerms of corpusTerms) {
    const uniqueTerms = new Set(docTerms);
    for (const term of uniqueTerms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  // Compute TF-IDF vector
  const N = corpus.length || 1;
  const tfidf: number[] = [];
  
  for (const term of vocab) {
    const tf = termFreq.get(term) || 0;
    const df = docFreq.get(term) || 0;
    const idf = Math.log((N + 1) / (df + 1)) + 1; // Smoothed IDF
    tfidf.push(tf * idf);
  }

  // Normalize
  const magnitude = Math.sqrt(tfidf.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < tfidf.length; i++) {
      tfidf[i] /= magnitude;
    }
  }

  return tfidf;
}

/**
 * Compute TF-IDF vector for a single document against a corpus.
 */
export function computeDocumentTFIDF(docText: string, corpus: string[]): number[] {
  const docTerms = tokenize(docText);
  const corpusTerms = corpus.map(text => tokenize(text));
  
  // Get all unique terms across corpus + doc
  const allTerms = new Set([...docTerms]);
  for (const terms of corpusTerms) {
    for (const term of terms) {
      allTerms.add(term);
    }
  }
  
  const vocab = Array.from(allTerms);
  
  if (vocab.length === 0) {
    return [];
  }

  // Term frequency for the document
  const termFreq = new Map<string, number>();
  for (const term of docTerms) {
    termFreq.set(term, (termFreq.get(term) || 0) + 1);
  }

  // Document frequency
  const docFreq = new Map<string, number>();
  for (const docTerms of corpusTerms) {
    const uniqueTerms = new Set(docTerms);
    for (const term of uniqueTerms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  // TF-IDF
  const N = corpus.length || 1;
  const tfidf: number[] = [];
  
  for (const term of vocab) {
    const tf = termFreq.get(term) || 0;
    const df = docFreq.get(term) || 0;
    const idf = Math.log((N + 1) / (df + 1)) + 1;
    tfidf.push(tf * idf);
  }

  // Normalize
  const magnitude = Math.sqrt(tfidf.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < tfidf.length; i++) {
      tfidf[i] /= magnitude;
    }
  }

  return tfidf;
}

/**
 * Calculate cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
 * Embed text using the provider's embed method if available,
 * otherwise fall back to TF-IDF.
 */
export async function embedText(text: string): Promise<number[]> {
  try {
    const registry = getRegistry();
    
    // Check if provider supports embed
    if (typeof (registry as unknown as { embed?: (text: string) => Promise<number[]> }).embed === 'function') {
      return await (registry as unknown as { embed: (text: string) => Promise<number[]> }).embed(text);
    }
  } catch (e) {
    // Fall back to TF-IDF
    console.log('[EmbeddingService] Provider embed not available, using TF-IDF fallback');
  }

  // TF-IDF fallback
  const allChunks = await getAllChunkTexts();
  return computeTFIDF(text, allChunks);
}

/**
 * Embed multiple texts.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  try {
    const registry = getRegistry();
    
    if (typeof (registry as unknown as { embedBatch?: (texts: string[]) => Promise<number[][]> }).embedBatch === 'function') {
      return await (registry as unknown as { embedBatch: (texts: string[]) => Promise<number[][]> }).embedBatch(texts);
    }
  } catch (e) {
    // Fall back to TF-IDF
  }

  // TF-IDF fallback
  const allChunks = await getAllChunkTexts();
  return texts.map(text => computeTFIDF(text, allChunks));
}

/**
 * Get all chunk texts for TF-IDF corpus.
 */
async function getAllChunkTexts(): Promise<string[]> {
  try {
    const { getAllChunks } = await import('./sourceStorage');
    const chunks = await getAllChunks();
    return chunks.map(chunk => chunk.text);
  } catch {
    return [];
  }
}

/**
 * Tokenize text into terms.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 1);
}
