/**
 * V152: MemoryLayer Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryLayerManager } from '../MemoryLayer';

// Mock dependencies
vi.mock('../DreamMemoryStore', () => ({
  getDreamMemoryStore: () => ({
    queryByLayer: () => [],
    countByLayer: () => 0,
    count: () => 0,
    getAll: () => [],
    update: vi.fn(),
    getReadOnly: vi.fn(),
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

describe('MemoryLayerManager', () => {
  let manager: MemoryLayerManager;

  beforeEach(() => {
    manager = new MemoryLayerManager();
  });

  describe('constructor', () => {
    it('should create a MemoryLayerManager instance', () => {
      expect(manager).toBeInstanceOf(MemoryLayerManager);
    });

    it('should accept custom configuration', () => {
      const customManager = new MemoryLayerManager({
        hotMaxSize: 50,
        warmMaxSize: 100,
      });
      expect(customManager).toBeInstanceOf(MemoryLayerManager);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = manager.getConfig();
      expect(config).toHaveProperty('hotMaxSize');
      expect(config).toHaveProperty('warmMaxSize');
      expect(config).toHaveProperty('hotPromotionThreshold');
      expect(config).toHaveProperty('hotDemotionDays');
      expect(config).toHaveProperty('warmDemotionDays');
      expect(config).toHaveProperty('hotMinAccessCount');
    });

    it('should have sensible default values', () => {
      const config = manager.getConfig();
      expect(config.hotMaxSize).toBe(30);
      expect(config.warmMaxSize).toBe(200);
      expect(config.hotPromotionThreshold).toBe(5);
      expect(config.hotDemotionDays).toBe(7);
      expect(config.warmDemotionDays).toBe(30);
      expect(config.hotMinAccessCount).toBe(3);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration partially', () => {
      manager.updateConfig({ hotMaxSize: 50 });
      const config = manager.getConfig();
      expect(config.hotMaxSize).toBe(50);
      // Other values should remain
      expect(config.warmMaxSize).toBe(200);
    });
  });

  describe('getStats', () => {
    it('should return layer statistics', () => {
      const stats = manager.getStats();
      expect(stats).toHaveProperty('hot');
      expect(stats).toHaveProperty('warm');
      expect(stats).toHaveProperty('cold');
      expect(stats).toHaveProperty('total');
    });

    it('should return numbers for all stats', () => {
      const stats = manager.getStats();
      expect(typeof stats.hot).toBe('number');
      expect(typeof stats.warm).toBe('number');
      expect(typeof stats.cold).toBe('number');
      expect(typeof stats.total).toBe('number');
    });
  });

  describe('getByLayer', () => {
    it('should get hot memories', () => {
      const hotMemories = manager.getHot();
      expect(Array.isArray(hotMemories)).toBe(true);
    });

    it('should get warm memories', () => {
      const warmMemories = manager.getWarm();
      expect(Array.isArray(warmMemories)).toBe(true);
    });

    it('should get cold memories', () => {
      const coldMemories = manager.getCold();
      expect(Array.isArray(coldMemories)).toBe(true);
    });
  });

  describe('startMaintenance', () => {
    it('should not start twice', () => {
      manager.startMaintenance(1000);
      manager.startMaintenance(1000); // Should not throw
      manager.stopMaintenance();
    });
  });

  describe('stopMaintenance', () => {
    it('should stop without starting first', () => {
      manager.stopMaintenance(); // Should not throw
    });
  });

  describe('setLayer', () => {
    it('should return false for non-existent memory', () => {
      const result = manager.setLayer('non-existent-id', 'hot');
      expect(result).toBe(false);
    });
  });
});

describe('MemoryLayer Type Aliases', () => {
  it('should accept hot layer value', () => {
    const layer: 'hot' = 'hot';
    expect(layer).toBe('hot');
  });

  it('should accept warm layer value', () => {
    const layer: 'warm' = 'warm';
    expect(layer).toBe('warm');
  });

  it('should accept cold layer value', () => {
    const layer: 'cold' = 'cold';
    expect(layer).toBe('cold');
  });
});

describe('MemoryLayerConfig', () => {
  it('should accept valid configuration', () => {
    const config: import('../MemoryLayer').MemoryLayerConfig = {
      hotMaxSize: 50,
      warmMaxSize: 200,
      hotPromotionThreshold: 10,
      hotDemotionDays: 14,
      warmDemotionDays: 60,
      hotMinAccessCount: 5,
    };
    expect(config.hotMaxSize).toBe(50);
  });
});