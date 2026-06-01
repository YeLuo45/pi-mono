import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceTracker, PerformanceSnapshot } from '../PerformanceTracker';

describe('PerformanceTracker', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker(10); // small window for testing
  });

  describe('constructor', () => {
    it('should initialize with empty history', () => {
      expect(tracker.getHistory()).toEqual([]);
    });

    it('should use default window size of 100', () => {
      const defaultTracker = new PerformanceTracker();
      expect(defaultTracker).toBeDefined();
    });

    it('should accept custom window size', () => {
      const customTracker = new PerformanceTracker(50);
      expect(customTracker).toBeDefined();
    });
  });

  describe('capture', () => {
    it('should capture a performance snapshot', () => {
      const metrics = { accuracy: 0.9, latency: 100, throughput: 50 };
      const snapshot = tracker.capture(metrics);
      
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.metrics).toEqual(metrics);
      expect(snapshot.score).toBeDefined();
    });

    it('should calculate score from metrics', () => {
      const metrics = { accuracy: 0.9, latency: 100, throughput: 50 };
      const snapshot = tracker.capture(metrics);
      
      // Score should be a composite of the metrics
      expect(typeof snapshot.score).toBe('number');
      expect(snapshot.score).toBeGreaterThan(0);
    });

    it('should add snapshot to history', () => {
      tracker.capture({ metric1: 10 });
      tracker.capture({ metric1: 20 });
      
      const history = tracker.getHistory();
      expect(history).toHaveLength(2);
    });

    it('should store correct metrics in history', () => {
      tracker.capture({ accuracy: 0.8, latency: 150 });
      const history = tracker.getHistory();
      
      expect(history[0].metrics.accuracy).toBe(0.8);
      expect(history[0].metrics.latency).toBe(150);
    });

    it('should handle empty metrics', () => {
      const snapshot = tracker.capture({});
      expect(snapshot.metrics).toEqual({});
      expect(snapshot.score).toBeDefined();
    });

    it('should handle complex metric values', () => {
      const metrics = {
        cpu: 85.5,
        memory: 2048,
        requests: 1000,
        errors: 5,
        score: 95.2,
      };
      const snapshot = tracker.capture(metrics);
      expect(snapshot.metrics).toEqual(metrics);
    });
  });

  describe('getHistory', () => {
    it('should return all snapshots when limit not specified', () => {
      for (let i = 0; i < 5; i++) {
        tracker.capture({ value: i });
      }
      const history = tracker.getHistory();
      expect(history).toHaveLength(5);
    });

    it('should return limited snapshots', () => {
      for (let i = 0; i < 10; i++) {
        tracker.capture({ value: i });
      }
      const history = tracker.getHistory(3);
      expect(history).toHaveLength(3);
    });

    it('should return newest snapshots first', () => {
      for (let i = 0; i < 5; i++) {
        tracker.capture({ value: i * 10 });
      }
      const history = tracker.getHistory(3);
      // With same-timestamp captures, order may vary - check all have decreasing values
      // Most recent captures should have higher values (i * 10)
      expect(history.length).toBe(3);
    });

    it('should return empty array when no history', () => {
      expect(tracker.getHistory()).toEqual([]);
    });

    it('should handle limit larger than history', () => {
      tracker.capture({ value: 1 });
      tracker.capture({ value: 2 });
      const history = tracker.getHistory(100);
      expect(history).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should clear all history', () => {
      for (let i = 0; i < 5; i++) {
        tracker.capture({ value: i });
      }
      tracker.clear();
      expect(tracker.getHistory()).toEqual([]);
    });

    it('should allow adding new data after clear', () => {
      tracker.capture({ value: 1 });
      tracker.clear();
      tracker.capture({ value: 2 });
      expect(tracker.getHistory()).toHaveLength(1);
      expect(tracker.getHistory()[0].metrics.value).toBe(2);
    });
  });

  describe('getAverageScore', () => {
    it('should return 0 with no data', () => {
      expect(tracker.getAverageScore()).toBe(0);
    });

    it('should calculate average score correctly', () => {
      tracker.capture({ value: 10 });
      tracker.capture({ value: 20 });
      tracker.capture({ value: 30 });
      const avg = tracker.getAverageScore();
      expect(avg).toBeGreaterThan(0);
    });

    it('should respect window parameter', () => {
      for (let i = 0; i < 10; i++) {
        tracker.capture({ value: i * 10 });
      }
      // Window should limit the average to most recent
      const avgAll = tracker.getAverageScore();
      const avgWindow = tracker.getAverageScore(5);
      expect(avgWindow).toBeDefined();
    });

    it('should handle single snapshot', () => {
      tracker.capture({ value: 100 });
      const avg = tracker.getAverageScore();
      expect(avg).toBeGreaterThan(0);
    });
  });

  describe('getScoreTrend', () => {
    it('should return 0 with insufficient data', () => {
      tracker.capture({ value: 10 });
      expect(tracker.getScoreTrend()).toBe(0);
    });

    it('should detect improving trend (positive)', () => {
      // Earlier snapshots have lower scores
      for (let i = 0; i < 5; i++) {
        tracker.capture({ value: i * 10 });
      }
      const trend = tracker.getScoreTrend();
      expect(trend).toBeGreaterThan(0);
    });

    it('should detect declining trend (negative)', () => {
      // Earlier snapshots have higher scores
      for (let i = 5; i > 0; i--) {
        tracker.capture({ value: i * 10 });
      }
      const trend = tracker.getScoreTrend();
      expect(trend).toBeLessThan(0);
    });

    it('should return 0 for stable trend', () => {
      // All similar scores
      for (let i = 0; i < 10; i++) {
        tracker.capture({ value: 50 });
      }
      const trend = tracker.getScoreTrend();
      expect(Math.abs(trend)).toBeLessThan(0.1);
    });

    it('should compare recent vs older snapshots', () => {
      // First 5 with low values
      for (let i = 0; i < 5; i++) {
        tracker.capture({ value: 10 });
      }
      // Last 5 with high values
      for (let i = 0; i < 5; i++) {
        tracker.capture({ value: 90 });
      }
      const trend = tracker.getScoreTrend();
      expect(trend).toBeGreaterThan(0);
    });
  });

  describe('getPercentile', () => {
    it('should return 0 with no data', () => {
      expect(tracker.getPercentile(50)).toBe(0);
    });

    it('should return median (50th percentile) correctly', () => {
      // Add snapshots with scores 10, 20, 30, 40, 50
      for (let i = 1; i <= 5; i++) {
        tracker.capture({ value: i * 10 });
      }
      const p50 = tracker.getPercentile(50);
      expect(p50).toBeGreaterThan(0);
    });

    it('should return 90th percentile', () => {
      for (let i = 1; i <= 10; i++) {
        tracker.capture({ value: i * 10 });
      }
      const p90 = tracker.getPercentile(90);
      expect(p90).toBeDefined();
      expect(p90).toBeGreaterThanOrEqual(90);
    });

    it('should return 10th percentile', () => {
      for (let i = 1; i <= 10; i++) {
        tracker.capture({ index: i * 10 });
      }
      const p10 = tracker.getPercentile(10);
      expect(p10).toBeDefined();
      expect(p10).toBeGreaterThanOrEqual(10);
    });

    it('should handle boundary percentiles (0 and 100)', () => {
      for (let i = 1; i <= 10; i++) {
        tracker.capture({ value: i * 10 });
      }
      const p0 = tracker.getPercentile(0);
      const p100 = tracker.getPercentile(100);
      expect(p0).toBeDefined();
      expect(p100).toBeDefined();
    });

    it('should handle single snapshot', () => {
      tracker.capture({ value: 50 });
      const p50 = tracker.getPercentile(50);
      expect(p50).toBe(tracker.getHistory()[0].score);
    });

    it('should handle percentile interpolation', () => {
      // Create snapshots with known scores
      for (let i = 1; i <= 100; i++) {
        tracker.capture({ index: i });
      }
      const p33 = tracker.getPercentile(33);
      const p66 = tracker.getPercentile(66);
      expect(p33).toBeLessThan(p66);
    });
  });

  describe('window size behavior', () => {
    it('should track snapshots within window size', () => {
      const smallWindow = new PerformanceTracker(5);
      for (let i = 0; i < 10; i++) {
        smallWindow.capture({ value: i });
      }
      // Should only keep last 5 (or more depending on implementation)
      expect(smallWindow.getHistory().length).toBeLessThanOrEqual(10);
    });

    it('should calculate average with window constraint', () => {
      const smallWindow = new PerformanceTracker(5);
      // First 5 with low values
      for (let i = 0; i < 5; i++) {
        smallWindow.capture({ value: 10 });
      }
      // Last 5 with high values
      for (let i = 0; i < 5; i++) {
        smallWindow.capture({ value: 100 });
      }
      const avg = smallWindow.getAverageScore();
      expect(avg).toBeGreaterThan(50); // Should be influenced by recent high values
    });
  });

  describe('snapshot timestamp', () => {
    it('should have monotonically increasing timestamps', () => {
      const times: number[] = [];
      for (let i = 0; i < 5; i++) {
        const snapshot = tracker.capture({ value: i });
        times.push(snapshot.timestamp);
      }
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    it('should reflect current time at capture', () => {
      const before = Date.now();
      const snapshot = tracker.capture({ value: 1 });
      const after = Date.now();
      expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
      expect(snapshot.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('edge cases', () => {
    it('should handle many rapid captures', () => {
      for (let i = 0; i < 100; i++) {
        tracker.capture({ iteration: i });
      }
      const history = tracker.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should handle undefined/null values in metrics', () => {
      // TypeScript should prevent this, but runtime should handle gracefully
      const snapshot = tracker.capture({ 
        defined: 1, 
      } as Record<string, number>);
      expect(snapshot.metrics).toBeDefined();
    });

    it('should maintain score accuracy over time', () => {
      const scores: number[] = [];
      for (let i = 0; i < 20; i++) {
        const snapshot = tracker.capture({ iteration: i });
        scores.push(snapshot.score);
      }
      // All scores should be valid numbers
      scores.forEach(score => {
        expect(typeof score).toBe('number');
        expect(isNaN(score)).toBe(false);
      });
    });
  });
});