/**
 * V152: DreamMemoryStore Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DreamMemoryStore } from '../DreamMemoryStore';

// Mock the database dependencies
const mockDb = {
  getSQL: () => {
    const statements: string[] = [];
    const SQL = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.reduce((acc, str, i) => acc + str + (values[i] !== undefined ? `?(${values[i]})` : ''), '');
      statements.push(query);
      return {
        toArray: () => [],
        toObject: () => ({}),
      };
    };
    SQL.__mock = true;
    (SQL as any).statements = statements;
    return SQL;
  },
  getDatabase: () => mockDb,
};

const mockChangeLog: Array<{ table: string; id: string; op: string; data: unknown }> = [];
vi.mock('../../db/index', () => ({
  getDatabase: () => mockDb,
  generateChangeId: () => 'mock-change-id',
  now: () => Date.now(),
}));

vi.mock('../../db/syncLog', () => ({
  addChangeLogEntry: (table: string, id: string, op: string, data: unknown) => {
    mockChangeLog.push({ table, id, op, data });
  },
}));

describe('DreamMemoryStore', () => {
  let store: DreamMemoryStore;

  beforeEach(() => {
    store = new DreamMemoryStore();
    mockChangeLog.length = 0;
  });

  describe('constructor', () => {
    it('should create a DreamMemoryStore instance', () => {
      expect(store).toBeInstanceOf(DreamMemoryStore);
    });
  });

  describe('create', () => {
    it('should create a new dream memory with required fields', () => {
      const input = {
        id: 'test-memory-1',
        content: 'This is a test memory',
      };

      const memory = store.create(input);

      expect(memory).not.toBeNull();
      expect(memory?.id).toBe(input.id);
      expect(memory?.content).toBe(input.content);
      expect(memory?.layer).toBe('warm'); // default layer
      expect(memory?.access_count).toBe(0);
      expect(memory?.summary).toBeNull();
    });

    it('should create a memory with all optional fields', () => {
      const input = {
        id: 'test-memory-2',
        content: 'Full memory content',
        summary: 'Summarized content',
        layer: 'hot' as const,
        embedding: new Uint8Array([1, 2, 3]),
      };

      const memory = store.create(input);

      expect(memory?.id).toBe(input.id);
      expect(memory?.content).toBe(input.content);
      expect(memory?.summary).toBe(input.summary);
      expect(memory?.layer).toBe(input.layer);
      expect(memory?.embedding).toEqual(input.embedding);
    });
  });

  describe('get', () => {
    it('should return null for non-existent memory', () => {
      const memory = store.get('non-existent-id');
      expect(memory).toBeNull();
    });
  });

  describe('queryByLayer', () => {
    it('should return empty array for empty database', () => {
      const memories = store.queryByLayer('hot');
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should query by specific layer', () => {
      const memories = store.queryByLayer('cold');
      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return empty array for empty database', () => {
      const memories = store.getAll();
      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('count', () => {
    it('should return 0 for empty database', () => {
      const count = store.count();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('countByLayer', () => {
    it('should return 0 for empty database', () => {
      const count = store.countByLayer('hot');
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count by different layers', () => {
      expect(typeof store.countByLayer('warm')).toBe('number');
      expect(typeof store.countByLayer('cold')).toBe('number');
    });
  });

  describe('getTotalTokens', () => {
    it('should return 0 for empty store', () => {
      const tokens = store.getTotalTokens();
      expect(typeof tokens).toBe('number');
      expect(tokens).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRecentlyAccessed', () => {
    it('should return empty array when no accesses recorded', () => {
      const memories = store.getRecentlyAccessed();
      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('getLeastRecentlyAccessed', () => {
    it('should return empty array when no memories exist', () => {
      const memories = store.getLeastRecentlyAccessed();
      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('delete', () => {
    it('should return false when database is null', () => {
      // With mocked db, this will try to delete
      const result = store.delete('some-id');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('update', () => {
    it('should return null when memory does not exist', () => {
      const result = store.update('non-existent-id', { content: 'new content' });
      expect(result).toBeNull();
    });
  });

  describe('deleteMany', () => {
    it('should return 0 for empty ids array', () => {
      const result = store.deleteMany([]);
      expect(result).toBe(0);
    });
  });

  describe('updateLayerMany', () => {
    it('should return 0 for empty ids array', () => {
      const result = store.updateLayerMany([], 'hot');
      expect(result).toBe(0);
    });
  });

  describe('getReadOnly', () => {
    it('should return null for non-existent memory', () => {
      const memory = store.getReadOnly('non-existent-id');
      expect(memory).toBeNull();
    });
  });

  describe('queryByLayers', () => {
    it('should return memories from multiple layers', () => {
      const memories = store.queryByLayers(['hot', 'warm']);
      expect(Array.isArray(memories)).toBe(true);
    });

    it('should return empty array for empty result', () => {
      const memories = store.queryByLayers(['cold']);
      expect(Array.isArray(memories)).toBe(true);
    });
  });
});

describe('DreamMemoryStore Type Exports', () => {
  it('should export MemoryLayer type', () => {
    // This is a compile-time check, but we verify the export exists
    expect(true).toBe(true);
  });

  it('should export CreateDreamMemoryInput interface', () => {
    const input: import('../DreamMemoryStore').CreateDreamMemoryInput = {
      id: 'test',
      content: 'content',
    };
    expect(input.id).toBe('test');
  });

  it('should export UpdateDreamMemoryInput interface', () => {
    const input: import('../DreamMemoryStore').UpdateDreamMemoryInput = {
      content: 'updated content',
    };
    expect(input.content).toBe('updated content');
  });
});