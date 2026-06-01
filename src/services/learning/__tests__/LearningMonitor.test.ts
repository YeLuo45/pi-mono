import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LearningMonitor, LearningMetrics, FeedbackLoop } from '../LearningMonitor';

describe('LearningMonitor', () => {
  let monitor: LearningMonitor;

  beforeEach(() => {
    monitor = new LearningMonitor();
  });

  describe('constructor', () => {
    it('should initialize with empty metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(0);
      expect(metrics.successfulInteractions).toBe(0);
      expect(metrics.failedInteractions).toBe(0);
      expect(metrics.averageOutcome).toBe(0);
      expect(metrics.lastUpdated).toBeDefined();
    });

    it('should initialize with empty feedback loops', () => {
      expect(monitor.getAllLoops()).toEqual([]);
    });
  });

  describe('recordInteraction', () => {
    it('should record successful interaction (outcome > 0.5)', () => {
      monitor.recordInteraction(0.8);
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(1);
      expect(metrics.successfulInteractions).toBe(1);
      expect(metrics.failedInteractions).toBe(0);
      expect(metrics.averageOutcome).toBe(0.8);
    });

    it('should record failed interaction (outcome <= 0.5)', () => {
      monitor.recordInteraction(0.3);
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(1);
      expect(metrics.successfulInteractions).toBe(0);
      expect(metrics.failedInteractions).toBe(1);
      expect(metrics.averageOutcome).toBe(0.3);
    });

    it('should track boundary outcome (exactly 0.5)', () => {
      monitor.recordInteraction(0.5);
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(1);
      expect(metrics.successfulInteractions).toBe(0);
      expect(metrics.failedInteractions).toBe(1);
    });

    it('should accumulate multiple interactions', () => {
      monitor.recordInteraction(0.9);
      monitor.recordInteraction(0.6);
      monitor.recordInteraction(0.3);
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(3);
      expect(metrics.successfulInteractions).toBe(2);
      expect(metrics.failedInteractions).toBe(1);
      expect(metrics.averageOutcome).toBeCloseTo(0.6, 5);
    });

    it('should update lastUpdated timestamp', () => {
      const before = Date.now();
      monitor.recordInteraction(0.7);
      const after = Date.now();
      const metrics = monitor.getMetrics();
      expect(metrics.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(metrics.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics', () => {
      monitor.recordInteraction(0.8);
      const metrics = monitor.getMetrics();
      expect(metrics).toEqual(expect.objectContaining({
        totalInteractions: 1,
        successfulInteractions: 1,
        failedInteractions: 0,
        averageOutcome: 0.8,
      }));
    });

    it('should return reference that reflects current state', () => {
      const metrics1 = monitor.getMetrics();
      monitor.recordInteraction(0.9);
      const metrics2 = monitor.getMetrics();
      expect(metrics2.totalInteractions).toBe(1);
      expect(metrics1.totalInteractions).not.toBe(metrics2.totalInteractions);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', () => {
      monitor.recordInteraction(0.9);
      monitor.recordInteraction(0.3);
      monitor.resetMetrics();
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(0);
      expect(metrics.successfulInteractions).toBe(0);
      expect(metrics.failedInteractions).toBe(0);
      expect(metrics.averageOutcome).toBe(0);
    });

    it('should not affect feedback loops', () => {
      const loop: FeedbackLoop = {
        id: 'loop1',
        type: 'retry',
        triggerCondition: 'failure',
        action: 'retry',
        successRate: 0.5,
        lastTriggered: Date.now(),
      };
      monitor.registerLoop(loop);
      monitor.resetMetrics();
      expect(monitor.getAllLoops()).toHaveLength(1);
    });
  });

  describe('feedback loop management', () => {
    const createTestLoop = (overrides?: Partial<FeedbackLoop>): FeedbackLoop => ({
      id: 'test-loop',
      type: 'retry',
      triggerCondition: 'failure',
      action: 'retry',
      successRate: 0.5,
      lastTriggered: Date.now(),
      ...overrides,
    });

    describe('registerLoop', () => {
      it('should register a new feedback loop', () => {
        const loop = createTestLoop({ id: 'loop1' });
        monitor.registerLoop(loop);
        const result = monitor.getLoop('loop1');
        expect(result).toEqual(loop);
      });

      it('should allow registering multiple loops', () => {
        monitor.registerLoop(createTestLoop({ id: 'loop1' }));
        monitor.registerLoop(createTestLoop({ id: 'loop2' }));
        expect(monitor.getAllLoops()).toHaveLength(2);
      });

      it('should update existing loop', () => {
        monitor.registerLoop(createTestLoop({ id: 'loop1', successRate: 0.5 }));
        monitor.registerLoop(createTestLoop({ id: 'loop1', successRate: 0.8 }));
        const loop = monitor.getLoop('loop1');
        expect(loop?.successRate).toBe(0.8);
      });
    });

    describe('triggerLoop', () => {
      it('should return true for existing loop', () => {
        const loop = createTestLoop({ id: 'loop1' });
        monitor.registerLoop(loop);
        expect(monitor.triggerLoop('loop1')).toBe(true);
      });

      it('should return false for non-existing loop', () => {
        expect(monitor.triggerLoop('non-existent')).toBe(false);
      });

      it('should update lastTriggered timestamp', () => {
        const loop = createTestLoop({ id: 'loop1', lastTriggered: 0 });
        monitor.registerLoop(loop);
        const before = Date.now();
        monitor.triggerLoop('loop1');
        const after = Date.now();
        const updated = monitor.getLoop('loop1');
        expect(updated?.lastTriggered).toBeGreaterThanOrEqual(before);
        expect(updated?.lastTriggered).toBeLessThanOrEqual(after);
      });
    });

    describe('getLoop', () => {
      it('should return loop by id', () => {
        const loop = createTestLoop({ id: 'loop1', type: 'adaptive' });
        monitor.registerLoop(loop);
        const result = monitor.getLoop('loop1');
        expect(result?.type).toBe('adaptive');
      });

      it('should return null for non-existent id', () => {
        expect(monitor.getLoop('non-existent')).toBeNull();
      });
    });

    describe('getAllLoops', () => {
      it('should return all registered loops', () => {
        monitor.registerLoop(createTestLoop({ id: 'loop1' }));
        monitor.registerLoop(createTestLoop({ id: 'loop2' }));
        const loops = monitor.getAllLoops();
        expect(loops).toHaveLength(2);
        expect(loops.map(l => l.id)).toContain('loop1');
        expect(loops.map(l => l.id)).toContain('loop2');
      });

      it('should return empty array when no loops registered', () => {
        expect(monitor.getAllLoops()).toEqual([]);
      });
    });
  });

  describe('getSuccessRate', () => {
    it('should return 0 when no interactions', () => {
      expect(monitor.getSuccessRate()).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      monitor.recordInteraction(0.9);
      monitor.recordInteraction(0.8);
      monitor.recordInteraction(0.3);
      monitor.recordInteraction(0.4);
      expect(monitor.getSuccessRate()).toBe(0.5);
    });

    it('should return 1 when all successful', () => {
      monitor.recordInteraction(0.9);
      monitor.recordInteraction(0.6);
      monitor.recordInteraction(0.8);
      expect(monitor.getSuccessRate()).toBe(1);
    });

    it('should return 0 when all failed', () => {
      monitor.recordInteraction(0.4);
      monitor.recordInteraction(0.3);
      monitor.recordInteraction(0.2);
      expect(monitor.getSuccessRate()).toBe(0);
    });
  });

  describe('getTrend', () => {
    it('should return "stable" with no data', () => {
      expect(monitor.getTrend()).toBe('stable');
    });

    it('should return "stable" with insufficient data', () => {
      monitor.recordInteraction(0.5);
      expect(monitor.getTrend()).toBe('stable');
    });

    it('should detect "improving" trend', () => {
      // Recent interactions are better than older ones
      monitor.recordInteraction(0.3); // old
      monitor.recordInteraction(0.4); // old
      monitor.recordInteraction(0.9); // new
      monitor.recordInteraction(0.8); // new
      expect(monitor.getTrend()).toBe('improving');
    });

    it('should detect "declining" trend', () => {
      // Recent interactions are worse
      monitor.recordInteraction(0.9); // old
      monitor.recordInteraction(0.8); // old
      monitor.recordInteraction(0.3); // new
      monitor.recordInteraction(0.4); // new
      expect(monitor.getTrend()).toBe('declining');
    });

    it('should return "stable" when no clear trend', () => {
      monitor.recordInteraction(0.5);
      monitor.recordInteraction(0.5);
      monitor.recordInteraction(0.5);
      monitor.recordInteraction(0.5);
      expect(monitor.getTrend()).toBe('stable');
    });
  });

  describe('shouldTriggerAlert', () => {
    it('should return false with no data', () => {
      expect(monitor.shouldTriggerAlert()).toBe(false);
    });

    it('should return false when success rate is high', () => {
      monitor.recordInteraction(0.9);
      monitor.recordInteraction(0.8);
      expect(monitor.shouldTriggerAlert()).toBe(false);
    });

    it('should return true when success rate is low', () => {
      monitor.recordInteraction(0.3);
      monitor.recordInteraction(0.2);
      monitor.recordInteraction(0.3);
      expect(monitor.shouldTriggerAlert()).toBe(true);
    });

    it('should return false after recovery', () => {
      monitor.recordInteraction(0.3);
      monitor.recordInteraction(0.2);
      monitor.recordInteraction(0.3);
      expect(monitor.shouldTriggerAlert()).toBe(true);
      monitor.recordInteraction(0.9);
      monitor.recordInteraction(0.8);
      expect(monitor.shouldTriggerAlert()).toBe(false);
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize to JSON', () => {
      monitor.recordInteraction(0.8);
      monitor.recordInteraction(0.3);
      monitor.registerLoop({
        id: 'loop1',
        type: 'retry',
        triggerCondition: 'failure',
        action: 'retry',
        successRate: 0.7,
        lastTriggered: 12345,
      });
      const json = monitor.toJSON();
      expect(json).toHaveProperty('metrics');
      expect(json).toHaveProperty('feedbackLoops');
      expect((json as any).metrics.totalInteractions).toBe(2);
      expect((json as any).feedbackLoops).toHaveLength(1);
    });

    it('should deserialize from JSON', () => {
      const json = {
        metrics: {
          totalInteractions: 3,
          successfulInteractions: 2,
          failedInteractions: 1,
          averageOutcome: 0.7,
          lastUpdated: 12345,
        },
        feedbackLoops: [
          {
            id: 'loop1',
            type: 'adaptive',
            triggerCondition: 'low-success',
            action: 'adjust',
            successRate: 0.6,
            lastTriggered: 12346,
          },
        ],
      };
      const restored = LearningMonitor.fromJSON(json);
      expect(restored.getMetrics().totalInteractions).toBe(3);
      expect(restored.getAllLoops()).toHaveLength(1);
      expect(restored.getLoop('loop1')?.type).toBe('adaptive');
    });

    it('should handle empty state serialization', () => {
      const json = monitor.toJSON();
      const restored = LearningMonitor.fromJSON(json);
      expect(restored.getMetrics().totalInteractions).toBe(0);
      expect(restored.getAllLoops()).toEqual([]);
    });

    it('should handle malformed JSON gracefully', () => {
      const restored = LearningMonitor.fromJSON({ invalid: 'data' });
      expect(restored.getMetrics().totalInteractions).toBe(0);
      expect(restored.getAllLoops()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle very small outcome values', () => {
      monitor.recordInteraction(0.001);
      const metrics = monitor.getMetrics();
      expect(metrics.successfulInteractions).toBe(0);
      expect(metrics.averageOutcome).toBeCloseTo(0.001, 5);
    });

    it('should handle very large outcome values', () => {
      monitor.recordInteraction(0.999);
      const metrics = monitor.getMetrics();
      expect(metrics.successfulInteractions).toBe(1);
      expect(metrics.averageOutcome).toBeCloseTo(0.999, 5);
    });

    it('should handle many rapid interactions', () => {
      for (let i = 0; i < 1000; i++) {
        monitor.recordInteraction(Math.random());
      }
      const metrics = monitor.getMetrics();
      expect(metrics.totalInteractions).toBe(1000);
    });

    it('should maintain accuracy with many interactions', () => {
      // All successful
      for (let i = 0; i < 100; i++) {
        monitor.recordInteraction(0.6 + Math.random() * 0.4);
      }
      expect(monitor.getSuccessRate()).toBe(1);

      // All failed
      monitor.resetMetrics();
      for (let i = 0; i < 100; i++) {
        monitor.recordInteraction(Math.random() * 0.5);
      }
      expect(monitor.getSuccessRate()).toBe(0);
    });
  });
});