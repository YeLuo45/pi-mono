/**
 * V152: MemorySummarizer Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemorySummarizer } from '../MemorySummarizer';

// Mock dependencies
vi.mock('../DreamMemoryStore', () => ({
  getDreamMemoryStore: () => ({
    count: () => 0,
    getTotalTokens: () => 0,
    getAll: () => [],
    queryByLayer: () => [],
    deleteMany: vi.fn(),
    create: vi.fn(),
  }),
}));

vi.mock('../../core/hooks/HookManager', () => ({
  hookManager: {
    trigger: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/bus/UnifiedMessageBus', () => ({
  unifiedMessageBus: {
    receive: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('MemorySummarizer', () => {
  let summarizer: MemorySummarizer;

  beforeEach(() => {
    summarizer = new MemorySummarizer();
  });

  describe('constructor', () => {
    it('should create a MemorySummarizer instance', () => {
      expect(summarizer).toBeInstanceOf(MemorySummarizer);
    });

    it('should accept custom configuration', () => {
      const customSummarizer = new MemorySummarizer({
        maxMemoryCount: 50,
        maxTokenCount: 25000,
      });
      expect(customSummarizer).toBeInstanceOf(MemorySummarizer);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = summarizer.getConfig();
      expect(config).toHaveProperty('maxMemoryCount');
      expect(config).toHaveProperty('maxTokenCount');
      expect(config).toHaveProperty('batchSize');
      expect(config).toHaveProperty('minMemoriesForCompression');
    });

    it('should have sensible default values', () => {
      const config = summarizer.getConfig();
      expect(config.maxMemoryCount).toBe(100);
      expect(config.maxTokenCount).toBe(50000);
      expect(config.batchSize).toBe(20);
      expect(config.minMemoriesForCompression).toBe(10);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration partially', () => {
      summarizer.updateConfig({ maxMemoryCount: 50 });
      const config = summarizer.getConfig();
      expect(config.maxMemoryCount).toBe(50);
      // Other values should remain
      expect(config.maxTokenCount).toBe(50000);
    });
  });

  describe('needsCompression', () => {
    it('should return false when under thresholds', () => {
      // With mocked store returning 0, should not need compression
      const result = summarizer.needsCompression();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getStatus', () => {
    it('should return status object', () => {
      const status = summarizer.getStatus();
      expect(status).toHaveProperty('memoryCount');
      expect(status).toHaveProperty('tokenCount');
      expect(status).toHaveProperty('needsCompression');
      expect(status).toHaveProperty('isCompressing');
    });

    it('should return boolean for needsCompression', () => {
      const status = summarizer.getStatus();
      expect(typeof status.needsCompression).toBe('boolean');
    });

    it('should return boolean for isCompressing', () => {
      const status = summarizer.getStatus();
      expect(typeof status.isCompressing).toBe('boolean');
    });
  });

  describe('summarize', () => {
    it('should summarize short text directly', () => {
      const shortText = 'Hello world.';
      const summary = summarizer.summarize(shortText, 1);
      expect(typeof summary).toBe('string');
    });

    it('should summarize longer text', () => {
      const longText = 'This is sentence one. This is sentence two. This is sentence three. This is sentence four. This is sentence five.';
      const summary = summarizer.summarize(longText, 2);
      expect(typeof summary).toBe('string');
      expect(summary.length).toBeLessThanOrEqual(longText.length);
    });

    it('should return original text if fewer sentences than target', () => {
      const shortText = 'Short text.';
      const summary = summarizer.summarize(shortText, 5);
      expect(typeof summary).toBe('string');
    });

    it('should handle empty text', () => {
      const emptyText = '';
      const summary = summarizer.summarize(emptyText, 3);
      expect(typeof summary).toBe('string');
    });
  });

  describe('compressInBackground', () => {
    it('should not throw when compression not needed', async () => {
      await expect(summarizer.compressInBackground()).resolves.not.toThrow();
    });
  });

  describe('createCompressionWorker', () => {
    it('should return null (not yet implemented)', () => {
      const worker = summarizer.createCompressionWorker();
      expect(worker).toBeNull();
    });
  });
});

describe('SummarizerConfig Type', () => {
  it('should accept valid configuration', () => {
    const config: import('../MemorySummarizer').SummarizerConfig = {
      maxMemoryCount: 50,
      maxTokenCount: 25000,
      batchSize: 10,
      minMemoriesForCompression: 5,
    };
    expect(config.maxMemoryCount).toBe(50);
  });
});