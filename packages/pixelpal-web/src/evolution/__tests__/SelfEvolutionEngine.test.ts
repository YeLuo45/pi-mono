/**
 * SelfEvolutionEngine Tests
 * generic-agent-design Self-Evolution Engine
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SelfEvolutionEngine } from '../SelfEvolutionEngine';

describe('SelfEvolutionEngine', () => {
  let engine: SelfEvolutionEngine;

  beforeEach(() => {
    engine = new SelfEvolutionEngine();
  });

  afterEach(() => {
    engine.clearAll();
  });

  // ============================================================
  // trackMetrics
  // ============================================================
  describe('trackMetrics', () => {
    it('should track metrics', () => {
      engine.trackMetrics({ accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 });
      expect(engine.getPerformanceHistory()).toHaveLength(1);
    });

    it('should track multiple metrics', () => {
      engine.trackMetrics({ accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 });
      engine.trackMetrics({ accuracy: 0.85, speed: 0.75, resourceUsage: 0.3 });
      expect(engine.getPerformanceHistory()).toHaveLength(2);
    });

    it('should not mutate original', () => {
      const metrics = { accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 };
      engine.trackMetrics(metrics);
      metrics.accuracy = 0.5; // modify original
      expect(engine.getPerformanceHistory()[0].accuracy).toBe(0.9);
    });
  });

  // ============================================================
  // addRule
  // ============================================================
  describe('addRule', () => {
    it('should add rule', () => {
      engine.addRule({
        trigger: (m) => m.accuracy < 0.8,
        adjustment: 10,
      });
      engine.trackMetrics({ accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 });
      const adj = engine.trigger();
      expect(adj).toBe(0); // no rule triggered
    });

    it('should allow many rules', () => {
      for (let i = 0; i < 10; i++) {
        engine.addRule({ trigger: () => true, adjustment: i });
      }
      engine.trackMetrics({ accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 });
      expect(engine.trigger()).toBe(45); // sum of 0..9
    });
  });

  // ============================================================
  // trigger
  // ============================================================
  describe('trigger', () => {
    it('should return 0 with no metrics', () => {
      expect(engine.trigger()).toBe(0);
    });

    it('should apply triggered rules', () => {
      engine.addRule({
        trigger: (m) => m.accuracy > 0.5,
        adjustment: 5,
      });
      engine.trackMetrics({ accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 });
      expect(engine.trigger()).toBe(5);
    });

    it('should sum multiple triggered rules', () => {
      engine.addRule({ trigger: (m) => m.accuracy > 0.5, adjustment: 5 });
      engine.addRule({ trigger: (m) => m.speed > 0.5, adjustment: 3 });
      engine.trackMetrics({ accuracy: 0.9, speed: 0.9, resourceUsage: 0.1 });
      expect(engine.trigger()).toBe(8);
    });

    it('should update current adjustment', () => {
      engine.addRule({ trigger: () => true, adjustment: 7 });
      engine.trackMetrics({ accuracy: 0.9, speed: 0.8, resourceUsage: 0.2 });
      engine.trigger();
      expect(engine.getCurrentAdjustment()).toBe(7);
    });
  });

  // ============================================================
  // getActiveStrategy
  // ============================================================
  describe('getActiveStrategy', () => {
    it('should return null initially', () => {
      expect(engine.getActiveStrategy()).toBeNull();
    });

    it('should return active strategy after evolve', () => {
      engine.evolve();
      expect(engine.getActiveStrategy()).not.toBeNull();
    });
  });

  // ============================================================
  // evolve
  // ============================================================
  describe('evolve', () => {
    it('should create new strategy', () => {
      const strategy = engine.evolve();
      expect(strategy.id).toBe('strategy-1');
      expect(strategy.active).toBe(true);
    });

    it('should deactivate previous strategies', () => {
      engine.evolve();
      const s2 = engine.evolve();
      expect(engine.getActiveStrategy()?.id).toBe(s2.id);
      expect(engine.getStrategies()).toHaveLength(2);
    });

    it('should set score based on metrics', () => {
      engine.trackMetrics({ accuracy: 0.8, speed: 0.7, resourceUsage: 0.1 });
      const strategy = engine.evolve();
      expect(strategy.score).toBeGreaterThan(0);
    });

    it('should increment evolution count', () => {
      engine.evolve();
      engine.evolve();
      expect(engine.getEvolutionCount()).toBe(2);
    });
  });

  // ============================================================
  // getStrategies
  // ============================================================
  describe('getStrategies', () => {
    it('should return all strategies', () => {
      engine.evolve();
      engine.evolve();
      expect(engine.getStrategies()).toHaveLength(2);
    });

    it('should not expose internal array', () => {
      engine.evolve();
      engine.getStrategies().push({ id: 'fake', name: 'F', score: 0, active: false });
      expect(engine.getStrategies()).toHaveLength(1);
    });
  });

  // ============================================================
  // activateStrategy
  // ============================================================
  describe('activateStrategy', () => {
    it('should activate strategy', () => {
      engine.evolve();
      const s2 = engine.evolve();
      engine.activateStrategy(s2.id);
      expect(engine.getActiveStrategy()?.id).toBe(s2.id);
    });

    it('should return false for unknown id', () => {
      expect(engine.activateStrategy('unknown')).toBe(false);
    });
  });

  // ============================================================
  // getBestStrategy
  // ============================================================
  describe('getBestStrategy', () => {
    it('should return null for no strategies', () => {
      expect(engine.getBestStrategy()).toBeNull();
    });

    it('should return highest scoring strategy', () => {
      // Create first strategy with low metrics
      engine.trackMetrics({ accuracy: 0.3, speed: 0.3, resourceUsage: 0.3 });
      engine.evolve(); // s1 score will be low
      // Create second strategy with high metrics + rule
      engine.addRule({ trigger: () => true, adjustment: 100 });
      engine.trackMetrics({ accuracy: 0.9, speed: 0.9, resourceUsage: 0.1 });
      engine.evolve(); // s2 score will be high
      // s2 should be best due to adjustment
      expect(engine.getBestStrategy()?.id).toBe('strategy-2');
    });
  });

  // ============================================================
  // getAverageAccuracy / getAverageSpeed / getAverageResourceUsage
  // ============================================================
  describe('average metrics', () => {
    it('should calculate average accuracy', () => {
      engine.trackMetrics({ accuracy: 0.8, speed: 0.5, resourceUsage: 0.2 });
      engine.trackMetrics({ accuracy: 0.6, speed: 0.5, resourceUsage: 0.2 });
      expect(engine.getAverageAccuracy()).toBe(0.7);
    });

    it('should return 0 for no history', () => {
      expect(engine.getAverageAccuracy()).toBe(0);
      expect(engine.getAverageSpeed()).toBe(0);
      expect(engine.getAverageResourceUsage()).toBe(0);
    });

    it('should calculate average speed', () => {
      engine.trackMetrics({ accuracy: 0.5, speed: 0.6, resourceUsage: 0.1 });
      engine.trackMetrics({ accuracy: 0.5, speed: 0.8, resourceUsage: 0.1 });
      expect(engine.getAverageSpeed()).toBe(0.7);
    });

    it('should calculate average resource usage', () => {
      engine.trackMetrics({ accuracy: 0.5, speed: 0.5, resourceUsage: 0.3 });
      engine.trackMetrics({ accuracy: 0.5, speed: 0.5, resourceUsage: 0.5 });
      expect(engine.getAverageResourceUsage()).toBe(0.4);
    });
  });

  // ============================================================
  // pruneMetrics
  // ============================================================
  describe('pruneMetrics', () => {
    it('should keep only last n metrics', () => {
      for (let i = 0; i < 10; i++) {
        engine.trackMetrics({ accuracy: i / 10, speed: 0.5, resourceUsage: 0.1 });
      }
      engine.pruneMetrics(5);
      expect(engine.getPerformanceHistory()).toHaveLength(5);
    });

    it('should not prune if less than keepLast', () => {
      engine.trackMetrics({ accuracy: 0.5, speed: 0.5, resourceUsage: 0.1 });
      engine.pruneMetrics(5);
      expect(engine.getPerformanceHistory()).toHaveLength(1);
    });
  });

  // ============================================================
  // edge cases
  // ============================================================
  describe('edge cases', () => {
    it('should handle empty trigger', () => {
      engine.addRule({ trigger: () => false, adjustment: 10 });
      engine.trackMetrics({ accuracy: 0.5, speed: 0.5, resourceUsage: 0.1 });
      expect(engine.trigger()).toBe(0);
    });

    it('should handle negative adjustment', () => {
      engine.addRule({ trigger: () => true, adjustment: -5 });
      engine.trackMetrics({ accuracy: 0.5, speed: 0.5, resourceUsage: 0.1 });
      expect(engine.trigger()).toBe(-5);
    });

    it('should handle zero metrics', () => {
      engine.trackMetrics({ accuracy: 0, speed: 0, resourceUsage: 0 });
      const strategy = engine.evolve();
      expect(strategy.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle many evolutions', () => {
      for (let i = 0; i < 100; i++) {
        engine.evolve();
      }
      expect(engine.getStrategies()).toHaveLength(100);
    });

    it('should handle extreme metric values', () => {
      engine.trackMetrics({ accuracy: 1.0, speed: 1.0, resourceUsage: 0.0 });
      engine.trackMetrics({ accuracy: 0.0, speed: 0.0, resourceUsage: 1.0 });
      expect(engine.getAverageAccuracy()).toBe(0.5);
    });
  });
});