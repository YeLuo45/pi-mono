/**
 * Text Chunker for RAG Knowledge Base
 *
 * Splits documents into overlapping text chunks for embedding and retrieval.
 * Supports sentence-aware chunking to preserve semantic boundaries.
 */

import type { TextChunk } from './ragTypes';
import { DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP } from './ragTypes';

/**
 * Split text into overlapping chunks
 */
export function chunkText(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
    docId?: string;
    docName?: string;
    docType?: 'pdf' | 'docx' | 'xlsx' | 'txt';
    metadata?: Record<string, unknown>;
  } = {}
): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    overlap = DEFAULT_CHUNK_OVERLAP,
    docId = crypto.randomUUID(),
    docName = 'Unknown Document',
    docType = 'txt',
    metadata = {},
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const paragraphs = splitIntoParagraphs(text);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();
    if (!trimmedPara) continue;

    // If single paragraph exceeds chunk size, split by sentences
    if (trimmedPara.length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(createChunk(currentChunk, docId, docName, docType, chunkIndex, metadata));
        chunkIndex++;
      }

      const sentenceChunks = splitBySentences(trimmedPara, chunkSize, overlap);
      for (const sentenceChunk of sentenceChunks) {
        chunks.push(createChunk(sentenceChunk, docId, docName, docType, chunkIndex, metadata));
        chunkIndex++;
      }
      currentChunk = '';
      continue;
    }

    // Check if adding this paragraph exceeds chunk size
    if (currentChunk.length + trimmedPara.length + 1 > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(createChunk(currentChunk, docId, docName, docType, chunkIndex, metadata));
        chunkIndex++;
      }

      // Start new chunk with overlap from previous
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + trimmedPara;
    } else {
      if (currentChunk) {
        currentChunk += '\n' + trimmedPara;
      } else {
        currentChunk = trimmedPara;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(createChunk(currentChunk, docId, docName, docType, chunkIndex, metadata));
  }

  return chunks;
}

/**
 * Split text into paragraphs (preserving structure)
 */
function splitIntoParagraphs(text: string): string[] {
  // Split on double newlines or single newlines with surrounding whitespace
  const paragraphs = text
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs;
}

/**
 * Split a long text by sentences
 */
function splitBySentences(text: string, maxLength: number, overlap: number): string[] {
  const sentences = tokenizeSentences(text);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // Use overlap from previous chunk
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Simple sentence tokenization
 */
function tokenizeSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space and uppercase
  const sentences: string[] = [];
  let current = '';

  // Normalize whitespace
  const normalized = text.replace(/\s+/g, ' ');
  
  // Simple regex-based sentence splitting
  const parts = normalized.split(/(?<=[.!?])\s+(?=[A-Z])/);
  
  for (const part of parts) {
    current += (current ? ' ' : '') + part;
    // Check if it looks like a sentence end
    if (/[.!?]$/.test(part)) {
      sentences.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) {
    sentences.push(current.trim());
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Get overlapping text from the end of a chunk
 */
function getOverlapText(text: string, overlap: number): string {
  if (!text || overlap <= 0) return '';

  const words = text.split(/\s+/);
  if (words.length <= 3) return '';

  // Take the last N words up to the overlap character limit
  let charCount = 0;
  const overlapWords: string[] = [];

  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i];
    if (charCount + word.length + 1 > overlap) break;
    overlapWords.unshift(word);
    charCount += word.length + 1;
  }

  return overlapWords.join(' ') + (overlapWords.length > 0 ? ' ' : '');
}

/**
 * Create a TextChunk object
 */
function createChunk(
  content: string,
  docId: string,
  docName: string,
  docType: 'pdf' | 'docx' | 'xlsx' | 'txt',
  chunkIndex: number,
  metadata: Record<string, unknown>
): TextChunk {
  return {
    id: crypto.randomUUID(),
    content: content.trim(),
    docId,
    docName,
    chunkIndex,
    metadata: {
      ...metadata,
      docType,
    },
    createdAt: Date.now(),
  };
}

/**
 * Calculate estimated token count (rough approximation)
 * Assumes ~4 characters per token on average
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Smart chunking that respects document structure
 */
export function smartChunkDocument(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
    docId?: string;
    docName?: string;
    docType?: 'pdf' | 'docx' | 'xlsx' | 'txt';
  } = {}
): TextChunk[] {
  const { docId = crypto.randomUUID(), docName, docType } = options;

  // For PDF, try to use page markers
  const pageMarkerRegex = /--- Page (\d+) ---/i;
  const hasPageMarkers = pageMarkerRegex.test(text);

  if (hasPageMarkers) {
    // Split by pages first, then chunk each page
    const pages = text.split(/--- Page \d+ ---/i).filter(p => p.trim());
    const allChunks: TextChunk[] = [];
    let globalChunkIndex = 0;

    for (let i = 0; i < pages.length; i++) {
      const pageText = pages[i].trim();
      const pageChunks = chunkText(pageText, {
        ...options,
        docId,
        docName,
        docType,
        metadata: { page: i + 1 },
      });

      // Adjust chunk indices to be global
      for (const chunk of pageChunks) {
        chunk.chunkIndex = globalChunkIndex++;
      }

      allChunks.push(...pageChunks);
    }

    return allChunks;
  }

  // For other document types, use standard chunking
  return chunkText(text, {
    ...options,
    docId,
    docName,
    docType,
  });
}
