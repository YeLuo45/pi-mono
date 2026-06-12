/**
 * Source Storage — IndexedDB persistence for Knowledge Sources and Chunks
 *
 * Provides CRUD operations for KnowledgeSource and TextChunk objects.
 */

import type { KnowledgeSource, TextChunk } from './types';

const DB_NAME = 'pixelpal-knowledge';
const DB_VERSION = 1;
const SOURCES_STORE = 'pixelpal-knowledge-sources';
const CHUNKS_STORE = 'pixelpal-knowledge-chunks';

/**
 * Open the IndexedDB database for knowledge storage.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(SOURCES_STORE)) {
        const sourcesStore = db.createObjectStore(SOURCES_STORE, { keyPath: 'id' });
        sourcesStore.createIndex('type', 'type', { unique: false });
        sourcesStore.createIndex('createdAt', 'metadata.createdAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunksStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        chunksStore.createIndex('sourceId', 'sourceId', { unique: false });
      }
    };
  });
}

// ==========================================
// Source Operations
// ==========================================

/**
 * Add a new knowledge source.
 */
export async function addSource(source: KnowledgeSource): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    const store = tx.objectStore(SOURCES_STORE);
    const request = store.put(source);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get a single knowledge source by ID.
 */
export async function getSource(id: string): Promise<KnowledgeSource | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOURCES_STORE, 'readonly');
    const store = tx.objectStore(SOURCES_STORE);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all knowledge sources.
 */
export async function getAllSources(): Promise<KnowledgeSource[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOURCES_STORE, 'readonly');
    const store = tx.objectStore(SOURCES_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as KnowledgeSource[];
      resolve(results || []);
    };

    tx.oncomplete = () => db.close();
  });
}

/**
 * Update an existing knowledge source.
 */
export async function updateSource(source: KnowledgeSource): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    const store = tx.objectStore(SOURCES_STORE);
    const request = store.put(source);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Delete a knowledge source by ID.
 */
export async function deleteSource(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOURCES_STORE, 'readwrite');
    const store = tx.objectStore(SOURCES_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

// ==========================================
// Chunk Operations
// ==========================================

/**
 * Add a single chunk.
 */
export async function addChunk(chunk: TextChunk): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readwrite');
    const store = tx.objectStore(CHUNKS_STORE);
    const request = store.put(chunk);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Add multiple chunks at once.
 */
export async function addChunks(chunks: TextChunk[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readwrite');
    const store = tx.objectStore(CHUNKS_STORE);

    for (const chunk of chunks) {
      store.put(chunk);
    }

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
    
    // Resolve when transaction completes
    tx.onComplete = () => resolve();
  });
}

/**
 * Get all chunks for a specific source.
 */
export async function getChunksBySource(sourceId: string): Promise<TextChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readonly');
    const store = tx.objectStore(CHUNKS_STORE);
    const index = store.index('sourceId');
    const request = index.getAll(sourceId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as TextChunk[];
      resolve(results || []);
    };

    tx.oncomplete = () => db.close();
  });
}

/**
 * Get all chunks.
 */
export async function getAllChunks(): Promise<TextChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readonly');
    const store = tx.objectStore(CHUNKS_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = request.result as TextChunk[];
      resolve(results || []);
    };

    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear all chunks for a specific source.
 */
export async function clearChunksBySource(sourceId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readwrite');
    const store = tx.objectStore(CHUNKS_STORE);
    const index = store.index('sourceId');
    const request = index.openCursor(sourceId);

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => db.close();
  });
}

/**
 * Delete a single chunk.
 */
export async function deleteChunk(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, 'readwrite');
    const store = tx.objectStore(CHUNKS_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();

    tx.oncomplete = () => db.close();
  });
}

/**
 * Clear all chunks and sources (reset).
 */
export async function clearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SOURCES_STORE, CHUNKS_STORE], 'readwrite');
    
    tx.objectStore(SOURCES_STORE).clear();
    tx.objectStore(CHUNKS_STORE).clear();

    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}
