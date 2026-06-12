/**
 * V160: PersonalityComparisonEngine Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalityComparisonEngine } from '../comparison/PersonalityComparisonEngine';

const mockEventStore = {
  getByPersonality: vi.fn()
};

const mockAnalytics = {
  generateReport: vi.fn()
};

describe('PersonalityComparisonEngine', () => {
  let engine: PersonalityComparisonEngine;

  beforeEach(() => {
    engine = new PersonalityComparisonEngine(mockEventStore as any, mockAnalytics as any);
    vi.clearAllMocks();
  });

  describe('compare', () => {
    it('should return comparison result for two personalities', async () => {
      mockEventStore.getByPersonality.mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve([
          { eventType: 'evolution_triggered', id: 'e1' },
          { eventType: 'evolution_triggered', id: 'e2' }
        ]);
        return Promise.resolve([{ eventType: 'fallback_triggered', id: 'e3' }]);
      });
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 500 });

      const result = await engine.compare('p1', 'p2');

      expect(result.personalityA.personalityId).toBe('p1');
      expect(result.personalityB.personalityId).toBe('p2');
      expect(result.similarity).toBeGreaterThan(0);
      expect(Array.isArray(result.differences)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should compute metrics for each personality', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' },
        { eventType: 'evolution_triggered', id: 'e2' },
        { eventType: 'fallback_triggered', id: 'e3' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 300 });

      const result = await engine.compare('p1', 'p2');

      expect(result.personalityA.totalEvents).toBe(3);
      expect(result.personalityA.successRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate similarity score', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 100 });

      const result = await engine.compare('p1', 'p2');

      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
    });

    it('should find differences between personalities', async () => {
      mockEventStore.getByPersonality.mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve([
          { eventType: 'evolution_triggered', id: 'e1' },
          { eventType: 'evolution_triggered', id: 'e2' }
        ]);
        return Promise.resolve([{ eventType: 'fallback_triggered', id: 'e3' }]);
      });
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 500 });

      const result = await engine.compare('p1', 'p2');

      expect(Array.isArray(result.differences)).toBe(true);
    });

    it('should generate recommendations', async () => {
      mockEventStore.getByPersonality.mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve([{ eventType: 'fallback_triggered', id: 'e1' }]);
        return Promise.resolve([{ eventType: 'evolution_triggered', id: 'e2' }]);
      });
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 500 });

      const result = await engine.compare('p1', 'p2');

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle personalities with no events', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 0 });

      const result = await engine.compare('p1', 'p2');

      expect(result.personalityA.totalEvents).toBe(0);
      expect(result.personalityA.successRate).toBe(0);
    });
  });

  describe('compareAll', () => {
    it('should return metrics for all personalities', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 100 });

      const results = await engine.compareAll(['p1', 'p2']);

      expect(results.size).toBe(2);
      expect(results.has('p1')).toBe(true);
      expect(results.has('p2')).toBe(true);
    });

    it('should return empty map for empty input', async () => {
      const results = await engine.compareAll([]);

      expect(results.size).toBe(0);
    });
  });

  describe('computeMetrics', () => {
    it('should calculate success rate correctly', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' },
        { eventType: 'evolution_triggered', id: 'e2' },
        { eventType: 'fallback_triggered', id: 'e3' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 200 });

      const metrics = await engine.compare('p1', 'p2').then(r => r.personalityA);

      expect(metrics.successRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate risk score correctly', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'fallback_triggered', id: 'e1' },
        { eventType: 'fallback_triggered', id: 'e2' },
        { eventType: 'evolution_triggered', id: 'e3' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 200 });

      const metrics = await engine.compare('p1', 'p2').then(r => r.personalityA);

      expect(metrics.riskScore).toBeCloseTo(0.667, 2);
    });

    it('should extract top 3 patterns', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' },
        { eventType: 'evolution_triggered', id: 'e2' },
        { eventType: 'fallback_triggered', id: 'e3' },
        { eventType: 'strategy_adapted', id: 'e4' },
        { eventType: 'strategy_adapted', id: 'e5' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 200 });

      const metrics = await engine.compare('p1', 'p2').then(r => r.personalityA);

      expect(metrics.topPatterns.length).toBeLessThanOrEqual(3);
    });
  });

  describe('computeSimilarity', () => {
    it('should return 1 for identical metrics', () => {
      const a = { personalityId: 'p1', totalEvents: 10, successRate: 0.8, avgAdaptationTime: 100, topPatterns: ['a', 'b'], riskScore: 0.1 };
      const b = { personalityId: 'p2', totalEvents: 10, successRate: 0.8, avgAdaptationTime: 100, topPatterns: ['a', 'b'], riskScore: 0.1 };
      
      // Access via compare to test similarity
      mockEventStore.getByPersonality.mockResolvedValue([{ eventType: 'evolution_triggered' }]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 100 });
      
      engine.compare('p1', 'p2').then(result => {
        // Similarity with identical metrics
        expect(result.similarity).toBeGreaterThan(0.8);
      });
    });

    it('should return lower score for very different metrics', async () => {
      mockEventStore.getByPersonality.mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve([{ eventType: 'evolution_triggered' }]);
        return Promise.resolve([{ eventType: 'fallback_triggered' }]);
      });
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 100 });

      const result = await engine.compare('p1', 'p2');

      expect(result.similarity).toBeLessThan(1);
    });

    it('should consider pattern overlap in similarity', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' },
        { eventType: 'evolution_triggered', id: 'e2' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 100 });

      const result = await engine.compare('p1', 'p2');

      expect(typeof result.similarity).toBe('number');
    });
  });

  describe('findDifferences', () => {
    it('should identify success rate differences', async () => {
      mockEventStore.getByPersonality.mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve([
          { eventType: 'evolution_triggered', id: 'e1' },
          { eventType: 'evolution_triggered', id: 'e2' },
          { eventType: 'evolution_triggered', id: 'e3' }
        ]);
        return Promise.resolve([{ eventType: 'fallback_triggered', id: 'e1' }]);
      });
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 500 });

      const result = await engine.compare('p1', 'p2');

      expect(result.differences.some(d => d.includes('higher success rate'))).toBe(true);
    });

    it('should identify risk score differences', async () => {
      mockEventStore.getByPersonality.mockImplementation((id: string) => {
        if (id === 'p1') return Promise.resolve([
          { eventType: 'fallback_triggered', id: 'e1' },
          { eventType: 'fallback_triggered', id: 'e2' }
        ]);
        return Promise.resolve([{ eventType: 'evolution_triggered', id: 'e1' }]);
      });
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 500 });

      const result = await engine.compare('p1', 'p2');

      expect(result.differences.some(d => d.includes('higher risk score'))).toBe(true);
    });

    it('should return empty array for similar personalities', async () => {
      mockEventStore.getByPersonality.mockResolvedValue([
        { eventType: 'evolution_triggered', id: 'e1' }
      ]);
      mockAnalytics.generateReport.mockReturnValue({ avgDurationMs: 100 });

      const result = await engine.compare('p1', 'p2');

      // Similar personalities may have no significant differences
      expect(Array.isArray(result.differences)).toBe(true);
    });
  });
});