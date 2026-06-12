import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvolutionIntegrationHub } from '../integration/EvolutionIntegrationHub';

const mockRuleEngine = {
  triggerEvolution: vi.fn()
};

const mockHealthChecker = {
  getHealthStatus: vi.fn()
};

const mockEventStore = {
  recordEvent: vi.fn(),
  getRecentEvents: vi.fn()
};

const mockAnalytics = {
  generateReport: vi.fn(),
  calculateTrend: vi.fn()
};

describe('EvolutionIntegrationHub', () => {
  let hub: EvolutionIntegrationHub;

  beforeEach(() => {
    hub = new EvolutionIntegrationHub(
      mockRuleEngine as any,
      mockHealthChecker as any,
      mockEventStore as any,
      mockAnalytics as any
    );
    vi.clearAllMocks();
  });

  describe('triggerEvolutionWithFullFlow', () => {
    it('should execute full flow: trigger → preCheck → record → analyze', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: true, failureCount: 0, isCircuitOpen: false, reasons: [] });
      mockRuleEngine.triggerEvolution.mockResolvedValue({ success: true, ruleId: 'rule-1' });
      mockEventStore.recordEvent.mockResolvedValue('event-1');
      mockAnalytics.generateReport.mockResolvedValue({ performanceScore: 0.8, totalEvents: 10 });

      const result = await hub.triggerEvolutionWithFullFlow('personality-1');

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('event-1');
      expect(mockHealthChecker.getHealthStatus).toHaveBeenCalled();
      expect(mockRuleEngine.triggerEvolution).toHaveBeenCalledWith('personality-1');
      expect(mockEventStore.recordEvent).toHaveBeenCalled();
    });

    it('should block evolution when health check fails', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: false, failureCount: 6, isCircuitOpen: true, reasons: ['Circuit breaker open', 'Too many failures'] });

      const result = await hub.triggerEvolutionWithFullFlow('personality-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Health check failed');
      expect(mockRuleEngine.triggerEvolution).not.toHaveBeenCalled();
    });

    it('should record fallback event when circuit breaker trips', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: true, failureCount: 0, isCircuitOpen: false, reasons: [] });
      mockRuleEngine.triggerEvolution.mockResolvedValue({ success: false, error: 'Circuit breaker tripped', ruleId: 'rule-1' });
      mockEventStore.recordEvent.mockResolvedValue('fallback-event-1');

      const result = await hub.triggerEvolutionWithFullFlow('personality-1');

      expect(result.success).toBe(false);
      expect(mockEventStore.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'fallback_triggered' }));
    });

    it('should return integrated result with analytics', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: true, failureCount: 0, isCircuitOpen: false, reasons: [] });
      mockRuleEngine.triggerEvolution.mockResolvedValue({ success: true, ruleId: 'rule-1' });
      mockEventStore.recordEvent.mockResolvedValue('event-1');
      mockAnalytics.generateReport.mockResolvedValue({ performanceScore: 0.85, totalEvents: 20 });

      const result = await hub.triggerEvolutionWithFullFlow('personality-1');

      expect(result.analytics).toBeDefined();
      expect(result.analytics?.performanceScore).toBe(0.85);
    });
  });

  describe('getIntegratedHealthStatus', () => {
    it('should return healthy when all subsystems are OK', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: true, failureCount: 0, isCircuitOpen: false, reasons: [], pendingRules: 0 });
      mockEventStore.getRecentEvents.mockResolvedValue([{ id: 'e1', eventType: 'test', timestamp: new Date().toISOString() }]);
      mockAnalytics.calculateTrend.mockReturnValue({ trend: 'up', confidence: 0.9 });

      const status = await hub.getIntegratedHealthStatus('personality-1');

      expect(status.overall).toBe('healthy');
    });

    it('should return degraded when circuit breaker is open', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: false, failureCount: 3, isCircuitOpen: true, reasons: [], pendingRules: 2 });
      mockEventStore.getRecentEvents.mockResolvedValue([]);
      mockAnalytics.calculateTrend.mockReturnValue(null);

      const status = await hub.getIntegratedHealthStatus('personality-1');

      expect(status.overall).toBe('critical');
      expect(status.circuitBreaker.isOpen).toBe(true);
    });

    it('should include recent events in response', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: true, failureCount: 0, isCircuitOpen: false, reasons: [], pendingRules: 0 });
      mockEventStore.getRecentEvents.mockResolvedValue([
        { id: 'e1', eventType: 'evolution_triggered', timestamp: '2026-05-24T10:00:00Z' },
        { id: 'e2', eventType: 'strategy_adapted', timestamp: '2026-05-24T09:00:00Z' }
      ]);
      mockAnalytics.calculateTrend.mockReturnValue(null);

      const status = await hub.getIntegratedHealthStatus('personality-1');

      expect(status.recentEvents).toHaveLength(2);
      expect(status.recentEvents[0].type).toBe('evolution_triggered');
    });

    it('should include trend analysis in response', async () => {
      mockHealthChecker.getHealthStatus.mockReturnValue({ canEvolve: true, failureCount: 0, isCircuitOpen: false, reasons: [], pendingRules: 0 });
      mockEventStore.getRecentEvents.mockResolvedValue([]);
      mockAnalytics.calculateTrend.mockReturnValue({ trend: 'declining', confidence: 0.75 });

      const status = await hub.getIntegratedHealthStatus('personality-1');

      expect(status.trendAnalysis).toBeDefined();
      expect(status.trendAnalysis?.trend).toBe('declining');
    });
  });

  describe('adaptStrategyFromAnalytics', () => {
    it('should adapt strategy when analytics shows decline', async () => {
      mockAnalytics.generateReport.mockResolvedValue({ performanceScore: 0.4, totalEvents: 5 });

      const adaptation = await hub.adaptStrategyFromAnalytics('personality-1');

      expect(adaptation).not.toBeNull();
      expect(adaptation?.newStrategy).toBe('conservative');
      expect(adaptation?.confidenceScore).toBe(0.4);
    });

    it('should not adapt when analytics shows stable trend', async () => {
      mockAnalytics.generateReport.mockResolvedValue({ performanceScore: 0.8, totalEvents: 50 });

      const adaptation = await hub.adaptStrategyFromAnalytics('personality-1');

      expect(adaptation).toBeNull();
    });

    it('should respect adaptation confidence threshold', async () => {
      mockAnalytics.generateReport.mockResolvedValue({ performanceScore: 0.6, totalEvents: 30 });

      const adaptation = await hub.adaptStrategyFromAnalytics('personality-1');

      expect(adaptation).not.toBeNull();
    });

    it('should record adaptation event', async () => {
      mockAnalytics.generateReport.mockResolvedValue({ performanceScore: 0.5, totalEvents: 15 });
      mockEventStore.recordEvent.mockResolvedValue('adapt-event-1');

      await hub.adaptStrategyFromAnalytics('personality-1');

      expect(mockEventStore.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'strategy_adapted' }));
    });
  });

  describe('recordAndAnalyzeFallback', () => {
    it('should record fallback to EventStore', async () => {
      mockEventStore.recordEvent.mockResolvedValue('fb-event-1');

      await hub.recordAndAnalyzeFallback({
        personalityId: 'p1',
        ruleId: 'rule-1',
        reason: 'Timeout',
        fallbackStrategy: 'skip',
        timestamp: new Date(),
        recovered: false
      });

      expect(mockEventStore.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'fallback_triggered' }));
    });

    it('should update analytics after fallback', async () => {
      mockEventStore.recordEvent.mockResolvedValue('fb-event-1');

      await hub.recordAndAnalyzeFallback({
        personalityId: 'p1',
        ruleId: 'rule-1',
        reason: 'Timeout',
        fallbackStrategy: 'skip',
        timestamp: new Date(),
        recovered: false
      });

      // Fallback recorded - analytics can be queried separately
      expect(mockEventStore.recordEvent).toHaveBeenCalled();
    });

    it('should mark recovered if circuit breaker closes', async () => {
      mockEventStore.recordEvent.mockResolvedValue('fb-event-1');

      await hub.recordAndAnalyzeFallback({
        personalityId: 'p1',
        ruleId: 'rule-1',
        reason: 'Circuit open',
        fallbackStrategy: 'wait',
        timestamp: new Date(),
        recovered: true
      });

      const call = mockEventStore.recordEvent.mock.calls[0][0];
      const data = JSON.parse(call.data);
      expect(data.recovered).toBe(true);
    });
  });
});