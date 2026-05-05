/**
 * Memory Store - Zustand store with FlexSearch full-text indexing
 * 
 * Features:
 * - FlexSearch-based full-text search (incremental indexing)
 * - IndexedDB persistence via idb library
 * - Search API: memoryStore.search(query, options)
 * - Tag filtering and time sorting
 * - Result highlighting
 */

import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';
import FlexSearch from 'flexsearch';
import type { MemoryEntry, MemoryType, MemoryQuery } from '../services/memory/memoryTypes';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  id: string;
  memory: MemoryEntry;
  highlights: string[];
  score: number;
}

export interface SearchOptions {
  query: string;
  tags?: string[];
  types?: MemoryType[];
  personaId?: string;  // Filter by personaId for memory isolation
  sortBy?: 'recent' | 'relevance';
  limit?: number;
}

export interface MemoryStoreState {
  // Index state
  isIndexReady: boolean;
  isIndexing: boolean;
  lastIndexedAt: number | null;
  
  // Search state
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  
  // Available tags (for filtering)
  availableTags: string[];
  
  // Actions
  initializeIndex: () => Promise<void>;
  addToIndex: (entry: MemoryEntry) => Promise<void>;
  removeFromIndex: (id: string) => Promise<void>;
  updateIndex: (entry: MemoryEntry) => Promise<void>;
  
  // Search actions
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  search: (query: string, options?: Partial<SearchOptions>) => Promise<SearchResult[]>;
  
  // Tag management
  refreshAvailableTags: () => Promise<void>;
}

// ============================================================================
// FlexSearch Index Setup
// ============================================================================

interface MemorySearchDocument {
  id: string;
  type: string;
  content: string;
  tags: string;
  createdAt: string;
}

let searchIndex: FlexSearch.Index | null = null;
let idbStore: IDBPDatabase<{ memories: { key: string; value: MemoryEntry } }> | null = null;

// Initialize FlexSearch index
function createSearchIndex(): FlexSearch.Index {
  return new FlexSearch.Index({
    tokenize: 'forward',
    resolution: 9,
    cache: 100,
  });
}

// ============================================================================
// IndexedDB helpers
// ============================================================================

async function getDB(): Promise<IDBPDatabase<{ memories: { key: string; value: MemoryEntry } }>> {
  if (idbStore) return idbStore;
  
  idbStore = await openDB<{ memories: { key: string; value: MemoryEntry } }>('pixelpal-memory-search', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' });
      }
    },
  });
  
  return idbStore;
}

// ============================================================================
// Store
// ============================================================================

export const useMemoryStore = create<MemoryStoreState>((set, get) => ({
  // Initial state
  isIndexReady: false,
  isIndexing: false,
  lastIndexedAt: null,
  isSearchOpen: false,
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  availableTags: [],

  // ----------------------------------------------------------------
  // Initialize Index - loads all memories from IndexedDB into FlexSearch
  // ----------------------------------------------------------------
  initializeIndex: async () => {
    const state = get();
    if (state.isIndexReady || state.isIndexing) return;
    
    set({ isIndexing: true });
    
    try {
      searchIndex = createSearchIndex();
      const db = await getDB();
      const allMemories = await db.getAll('memories');
      
      // Build tag set
      const tagSet = new Set<string>();
      
      // Index each memory
      for (const memory of allMemories) {
        const doc: MemorySearchDocument = {
          id: memory.id,
          type: memory.type,
          content: memory.content,
          tags: memory.tags.join(' '),
          createdAt: String(memory.createdAt),
        };
        
        searchIndex.add(memory.id, `${doc.content} ${doc.tags} ${doc.type}`);
        
        for (const tag of memory.tags) {
          tagSet.add(tag);
        }
      }
      
      set({
        isIndexReady: true,
        isIndexing: false,
        lastIndexedAt: Date.now(),
        availableTags: Array.from(tagSet).sort(),
      });
      
      console.log('[MemoryStore] Index initialized with', allMemories.length, 'memories');
    } catch (error) {
      console.error('[MemoryStore] Failed to initialize index:', error);
      set({ isIndexing: false });
    }
  },

  // ----------------------------------------------------------------
  // Add to Index (incremental - not full rebuild)
  // ----------------------------------------------------------------
  addToIndex: async (entry: MemoryEntry) => {
    if (!searchIndex) {
      // Index not ready yet, initialize first
      await get().initializeIndex();
    }
    
    if (!searchIndex) return;
    
    try {
      const doc: MemorySearchDocument = {
        id: entry.id,
        type: entry.type,
        content: entry.content,
        tags: entry.tags.join(' '),
        createdAt: String(entry.createdAt),
      };
      
      searchIndex.add(entry.id, `${doc.content} ${doc.tags} ${doc.type}`);
      
      // Also persist to IndexedDB for our own storage
      const db = await getDB();
      await db.put('memories', entry);
      
      // Refresh tags
      get().refreshAvailableTags();
    } catch (error) {
      console.error('[MemoryStore] Failed to add to index:', error);
    }
  },

  // ----------------------------------------------------------------
  // Remove from Index (incremental)
  // ----------------------------------------------------------------
  removeFromIndex: async (id: string) => {
    if (!searchIndex) return;
    
    try {
      searchIndex.remove(id);
      
      // Also remove from our IndexedDB
      const db = await getDB();
      await db.delete('memories', id);
      
      // Refresh tags
      get().refreshAvailableTags();
    } catch (error) {
      console.error('[MemoryStore] Failed to remove from index:', error);
    }
  },

  // ----------------------------------------------------------------
  // Update Index (remove + add)
  // ----------------------------------------------------------------
  updateIndex: async (entry: MemoryEntry) => {
    await get().removeFromIndex(entry.id);
    await get().addToIndex(entry);
  },

  // ----------------------------------------------------------------
  // Open/Close Search
  // ----------------------------------------------------------------
  openSearch: () => {
    set({ isSearchOpen: true });
    // Ensure index is ready
    if (!get().isIndexReady) {
      get().initializeIndex();
    }
  },
  
  closeSearch: () => {
    set({ isSearchOpen: false, searchQuery: '', searchResults: [] });
  },
  
  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  // ----------------------------------------------------------------
  // Search API
  // ----------------------------------------------------------------
  search: async (query: string, options?: Partial<SearchOptions>): Promise<SearchResult[]> => {
    if (!searchIndex || !query.trim()) {
      return [];
    }
    
    set({ isSearching: true });
    
    try {
      const { tags, types, personaId, sortBy = 'recent', limit = 30 } = options || {};
      
      // Perform FlexSearch search
      const searchResults = searchIndex.search(query, { limit: limit * 2 });
      
      // Get full memory entries for search results
      const db = await getDB();
      const results: SearchResult[] = [];
      
      for (const id of searchResults) {
        const memory = await db.get('memories', id as string);
        if (!memory) continue;
        
        // Filter by tags if specified
        if (tags && tags.length > 0) {
          const hasAllTags = tags.every(tag => memory.tags.includes(tag));
          if (!hasAllTags) continue;
        }
        
        // Filter by types if specified
        if (types && types.length > 0) {
          if (!types.includes(memory.type)) continue;
        }

        // Filter by personaId if specified (for memory isolation)
        if (personaId && memory.personaId !== personaId) {
          continue;
        }
        
        // Generate highlights
        const highlights = generateHighlights(query, memory.content);
        
        // Calculate simple relevance score
        const score = calculateRelevance(query, memory);
        
        results.push({
          id: memory.id,
          memory,
          highlights,
          score,
        });
      }
      
      // Sort results
      if (sortBy === 'recent') {
        results.sort((a, b) => b.memory.createdAt - a.memory.createdAt);
      } else {
        results.sort((a, b) => b.score - a.score);
      }
      
      set({ isSearching: false, searchResults: results.slice(0, limit) });
      return results.slice(0, limit);
    } catch (error) {
      console.error('[MemoryStore] Search failed:', error);
      set({ isSearching: false });
      return [];
    }
  },

  // ----------------------------------------------------------------
  // Refresh available tags
  // ----------------------------------------------------------------
  refreshAvailableTags: async () => {
    try {
      const db = await getDB();
      const allMemories = await db.getAll('memories');
      const tagSet = new Set<string>();
      
      for (const memory of allMemories) {
        for (const tag of memory.tags) {
          tagSet.add(tag);
        }
      }
      
      set({ availableTags: Array.from(tagSet).sort() });
    } catch (error) {
      console.error('[MemoryStore] Failed to refresh tags:', error);
    }
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate highlight snippets around matched keywords
 */
function generateHighlights(query: string, content: string, contextLength = 60): string[] {
  const highlights: string[] = [];
  const lowerContent = content.toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  for (const word of queryWords) {
    let startIndex = lowerContent.indexOf(word);
    
    while (startIndex !== -1 && highlights.length < 3) {
      const contextStart = Math.max(0, startIndex - contextLength);
      const contextEnd = Math.min(content.length, startIndex + word.length + contextLength);
      
      let snippet = content.slice(contextStart, contextEnd);
      
      if (contextStart > 0) {
        snippet = '...' + snippet;
      }
      if (contextEnd < content.length) {
        snippet = snippet + '...';
      }
      
      // Add bold markers around the matched word
      const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
      snippet = snippet.replace(regex, '**$1**');
      
      highlights.push(snippet);
      
      startIndex = lowerContent.indexOf(word, startIndex + 1);
    }
  }
  
  // If no word matches, return beginning of content
  if (highlights.length === 0) {
    highlights.push(content.slice(0, contextLength * 2) + (content.length > contextLength * 2 ? '...' : ''));
  }
  
  return [...new Set(highlights)]; // Remove duplicates
}

/**
 * Calculate simple relevance score
 */
function calculateRelevance(query: string, memory: MemoryEntry): number {
  const lowerQuery = query.toLowerCase();
  const lowerContent = memory.content.toLowerCase();
  
  let score = 0;
  
  // Exact match in content
  if (lowerContent.includes(lowerQuery)) {
    score += 10;
  }
  
  // Match in tags
  for (const tag of memory.tags) {
    if (tag.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
  }
  
  // Recency bonus (newer = slightly higher)
  const daysSinceCreation = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 5 - daysSinceCreation * 0.01);
  
  // Importance bonus
  score += memory.importance * 0.1;
  
  return score;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Sync with existing memoryStorage events
// ============================================================================

// Listen for memory events from memoryStorage (if available)
export function setupMemoryEventListeners(): () => void {
  const memoryStorageEvents = {
    emit: (_event: string, _data: unknown) => {},
    on: (_event: string, _handler: (...args: unknown[]) => void) => {},
  };
  
  // If memoryEvents is available from WebhookService, use it
  try {
    const { memoryEvents } = require('../services/webhook/WebhookService');
    memoryEvents.on('memory:created', (entry: MemoryEntry) => {
      useMemoryStore.getState().addToIndex(entry);
    });
    
    memoryEvents.on('memory:updated', (entry: MemoryEntry) => {
      useMemoryStore.getState().updateIndex(entry);
    });
    
    memoryEvents.on('memory:accessed', (_entry: MemoryEntry) => {
      // Optionally re-index on access for frequency boost
    });
    
    return () => {
      memoryEvents.emit = () => {}; // Cleanup
    };
  } catch {
    // WebhookService not available, skip event listeners
    return () => {};
  }
}
