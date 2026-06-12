/**
 * McpToolCache Tests - V164
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolCache, getToolCache } from '../McpToolCache';

describe('ToolCache', () => {
  let cache: ToolCache;

  beforeEach(() => {
    cache = new ToolCache();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set', () => {
    it('should return null for empty cache', () => {
      expect(cache.get('agent1')).toBeNull();
    });

    it('should return cached tools', () => {
      const tools = [{ name: 'tool1', description: 'A tool' }];
      cache.set('agent1', tools, 60000);
      expect(cache.get('agent1')).toEqual(tools);
    });

    it('should return null after TTL expires', async () => {
      const tools = [{ name: 'tool1', description: 'A tool' }];
      cache.set('agent1', tools, 50); // 50ms TTL
      vi.advanceTimersByTime(100); // advance past expiry
      expect(cache.get('agent1')).toBeNull();
    });
  });

  describe('invalidate', () => {
    it('should remove cached entry for agent', () => {
      cache.set('agent1', [{ name: 'tool1' }], 60000);
      cache.invalidate('agent1');
      expect(cache.get('agent1')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all cached entries', () => {
      cache.set('agent1', [{ name: 'tool1' }], 60000);
      cache.set('agent2', [{ name: 'tool2' }], 60000);
      cache.clear();
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('stats', () => {
    it('should return correct cache size and entries', () => {
      cache.set('agent1', [{ name: 'tool1' }], 60000);
      cache.set('agent2', [{ name: 'tool2' }], 60000);
      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const cache1 = getToolCache();
      const cache2 = getToolCache();
      expect(cache1).toBe(cache2);
    });
  });
});