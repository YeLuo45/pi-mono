/**
 * Summarizer Service — Extractive Document Summarization
 * 
 * Generates document summaries using extractive methods (TF-IDF based
 * sentence extraction). Does not require external AI APIs.
 */

import type { DocumentSummary } from './v87Types';

/**
 * Extract key sentences from text using TF-IDF scoring.
 */
function extractTopSentences(text: string, numSentences: number = 3): string[] {
  // Split into sentences (simple split on . ! ? followed by space)
  const sentences = text.split(/[.!?]+\s*/).filter(s => s.trim().length > 20);
  
  if (sentences.length <= numSentences) {
    return sentences.map(s => s.trim());
  }

  // Tokenize all sentences
  const tokenizedSentences = sentences.map(s => 
    s.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 2)
  );

  // Compute TF for each term across all sentences
  const termFreqs: Map<string, number>[] = [];
  for (const tokens of tokenizedSentences) {
    const freq = new Map<string, number>();
    for (const token of tokens) {
      freq.set(token, (freq.get(token) || 0) + 1);
    }
    termFreqs.push(freq);
  }

  // Compute IDF across all sentences
  const docFreq = new Map<string, number>();
  const allTerms = new Set<string>();
  for (const freq of termFreqs) {
    for (const term of freq.keys()) {
      allTerms.add(term);
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  // Score each sentence based on TF-IDF
  const sentenceScores: Array<{ sentence: string; score: number; index: number }> = [];
  const N = sentences.length;

  for (let i = 0; i < sentences.length; i++) {
    const freq = termFreqs[i];
    let score = 0;
    
    for (const [term, tf] of freq) {
      const df = docFreq.get(term) || 1;
      const idf = Math.log(N / df) + 1;
      score += tf * idf;
    }
    
    // Bonus for sentences at the beginning (often contain key info)
    if (i < 2) score *= 1.2;
    
    // Normalize by sentence length
    const normalizedScore = score / (sentences[i].split(/\s+/).length || 1);
    
    sentenceScores.push({ 
      sentence: sentences[i].trim(), 
      score: normalizedScore, 
      index: i 
    });
  }

  // Sort by score and take top N
  sentenceScores.sort((a, b) => b.score - a.score);
  
  return sentenceScores.slice(0, numSentences)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);
}

/**
 * Extract keywords from text using TF-IDF.
 */
function extractKeywords(text: string, numKeywords: number = 10): string[] {
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3);

  // Stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
    'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
    'we', 'us', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his',
    'what', 'which', 'who', 'whom', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there',
    'then', 'once', 'if', 'about', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'out', 'up', 'down', 'off', 'over', 'under', 'again', 'because',
  ]);

  // Compute term frequencies
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    if (!stopWords.has(token)) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }
  }

  // Sort by frequency and return top keywords
  const sorted = Array.from(termFreq.entries())
    .sort((a, b) => b[1] - a[1]);

  return sorted.slice(0, numKeywords).map(([word]) => word);
}

/**
 * Generate a summary for a document.
 */
export async function summarizeDocument(
  sourceId: string,
  content: string,
  options: {
    summaryLength?: number;
    numKeyPoints?: number;
  } = {}
): Promise<DocumentSummary> {
  const { summaryLength = 3, numKeyPoints = 3 } = options;
  
  // Extract summary sentences
  const summarySentences = extractTopSentences(content, summaryLength);
  
  // Extract key points (slightly different from summary - more factual)
  const keyPoints = extractTopSentences(content, numKeyPoints);
  
  // Extract keywords
  const keywords = extractKeywords(content, 10);

  return {
    sourceId,
    summary: summarySentences.join('. ').trim() + (summarySentences.length > 0 && !summarySentences[summarySentences.length - 1].endsWith('.') ? '.' : ''),
    keyPoints,
    keywords,
    generatedAt: Date.now(),
  };
}

/**
 * Quick summary of a chunk (shorter version for preview).
 */
export function summarizeChunk(chunkText: string, maxLength: number = 150): string {
  const sentences = chunkText.split(/[.!?]+\s*/).filter(s => s.trim().length > 10);
  
  if (sentences.length === 0) {
    return chunkText.slice(0, maxLength) + (chunkText.length > maxLength ? '...' : '');
  }

  // Take first meaningful sentence
  const firstSentence = sentences[0].trim();
  if (firstSentence.length <= maxLength) {
    return firstSentence + (sentences.length > 1 ? '.' : '');
  }

  // Otherwise truncate
  return firstSentence.slice(0, maxLength - 3) + '...';
}
