/**
 * Embedding Storage via IndexedDB
 * 
 * Stores message embeddings for semantic search.
 * Store name: message_embeddings
 * Structure: { messageId: string, embedding: number[], timestamp: number }
 */

import { getDB } from './db';

interface EmbeddingRecord {
  messageId: string;
  embedding: number[];
  timestamp: number;
}

/**
 * Ensure the message_embeddings object store exists.
 * Called automatically by each operation.
 */
async function ensureStore(db: Awaited<ReturnType<typeof getDB>>): Promise<void> {
  if (!db.objectStoreNames.contains('message_embeddings')) {
    db.createObjectStore('message_embeddings', { keyPath: 'messageId' });
  }
}

/**
 * Save an embedding for a message.
 */
export async function saveEmbedding(messageId: string, embedding: number[]): Promise<void> {
  if (!embedding || embedding.length === 0) return;

  const db = await getDB();
  await ensureStore(db);

  const record: EmbeddingRecord = {
    messageId,
    embedding,
    timestamp: Date.now(),
  };

  await db.put('message_embeddings', record);
}

/**
 * Get embedding for a specific message.
 */
export async function getEmbedding(messageId: string): Promise<number[] | null> {
  const db = await getDB();
  await ensureStore(db);

  const record = await db.get('message_embeddings', messageId) as EmbeddingRecord | undefined;
  return record?.embedding ?? null;
}

/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Search for the most similar messages to the given embedding.
 * Returns topK results with cosine similarity scores.
 */
export async function searchSimilar(
  embedding: number[],
  topK: number = 10
): Promise<Array<{ messageId: string; score: number }>> {
  if (!embedding || embedding.length === 0) return [];

  const db = await getDB();
  await ensureStore(db);

  const allRecords = await db.getAll('message_embeddings') as EmbeddingRecord[];

  // Compute similarity scores
  const scored = allRecords.map(record => ({
    messageId: record.messageId,
    score: cosineSimilarity(embedding, record.embedding),
  }));

  // Sort by score descending and take topK
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/**
 * Delete an embedding for a message.
 */
export async function deleteEmbedding(messageId: string): Promise<void> {
  const db = await getDB();
  await ensureStore(db);
  await db.delete('message_embeddings', messageId);
}

/**
 * Clear all embeddings.
 */
export async function clearEmbeddings(): Promise<void> {
  const db = await getDB();
  await ensureStore(db);
  await db.clear('message_embeddings');
}
