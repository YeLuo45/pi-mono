/**
 * V158: Evolution Integration Hub
 * 
 * Central integration point connecting RuleEngine + HealthChecker + EventStore + Analytics.
 * Orchestrates the full evolution flow with health checks, fallback handling, and analytics.
 */

import type { RuleEngine } from '../rules/RuleEngine';
import type { SkillHealthChecker } from '../SkillHealthChecker';
import type { EvolutionEventStore } from '../persistence/EvolutionEventStore';
import type { EvolutionAnalytics } from '../analytics/EvolutionAnalytics';
import type { EvolutionEvent } from '../../db/schema/evolution';

export interface EvolutionResult {
  success: boolean;
  eventId?: string;
  error?: string;
  analytics?: ReturnType<EvolutionAnalytics['generateReport']>;
}

export interface IntegratedHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  circuitBreaker: { isOpen: boolean; failureCount: number };
  recentEvents: Array<{ id: string; type: string; timestamp: string }>;
  trendAnalysis?: { trend: string; confidence: number };
  pendingRules: number;
}

export interface StrategyAdaptation {
  personalityId: string;
  previousStrategy: string;
  newStrategy: string;
  adaptationReason: string;
  confidenceScore: number;
}

export interface FallbackEvent {
  personalityId: string;
  ruleId: string;
  reason: string;
  fallbackStrategy: string;
  timestamp: Date;
  recovered: boolean;
}

export class EvolutionIntegrationHub {
  constructor(
    private ruleEngine: RuleEngine,
    private healthChecker: SkillHealthChecker,
    private eventStore: EvolutionEventStore,
    private analytics: EvolutionAnalytics
  ) {}

  async triggerEvolutionWithFullFlow(personalityId: string): Promise<EvolutionResult> {
    // 1. Pre-check via HealthChecker
    const healthStatus = this.healthChecker.getHealthStatus();
    if (!healthStatus.canEvolve) {
      return { success: false, error: `Health check failed: ${healthStatus.reasons.join(', ')}` };
    }

    // 2. Trigger via RuleEngine
    const result = await this.ruleEngine.triggerEvolution(personalityId);
    if (!result.success) {
      // Record fallback event
      await this.recordAndAnalyzeFallback({
        personalityId,
        ruleId: result.ruleId || 'unknown',
        reason: result.error || 'RuleEngine trigger failed',
        fallbackStrategy: 'fallback',
        timestamp: new Date(),
        recovered: false
      });
      return { success: false, error: result.error };
    }

    // 3. Record event
    const eventId = await this.eventStore.recordEvent({
      personalityId,
      eventType: 'evolution_triggered',
      data: JSON.stringify(result),
      timestamp: new Date()
    });

    // 4. Analytics
    const report = await this.analytics.generateReport(personalityId);

    return { success: true, eventId, analytics: report };
  }

  async getIntegratedHealthStatus(personalityId?: string): Promise<IntegratedHealthStatus> {
    const health = this.healthChecker.getHealthStatus();
    const recentEvents = await this.eventStore.getRecentEvents(10);
    const trend = this.analytics.calculateTrend(personalityId || '');

    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (health.failureCount > 5 || health.isCircuitOpen) overall = 'critical';
    else if (health.failureCount > 2) overall = 'degraded';

    return {
      overall,
      circuitBreaker: { isOpen: health.isCircuitOpen, failureCount: health.failureCount },
      recentEvents: recentEvents.map(e => ({ id: e.id!, type: e.eventType, timestamp: e.timestamp })),
      trendAnalysis: trend ? { trend: trend.trend, confidence: trend.confidence } : undefined,
      pendingRules: health.pendingRules || 0
    };
  }

  async adaptStrategyFromAnalytics(personalityId: string): Promise<StrategyAdaptation | null> {
    const report = await this.analytics.generateReport(personalityId);
    if (!report || report.performanceScore > 0.7) return null;

    const adaptation: StrategyAdaptation = {
      personalityId,
      previousStrategy: 'default',
      newStrategy: 'conservative',
      adaptationReason: `Performance below threshold: ${report.performanceScore}`,
      confidenceScore: report.performanceScore
    };

    await this.eventStore.recordEvent({
      personalityId,
      eventType: 'strategy_adapted',
      data: JSON.stringify(adaptation),
      timestamp: new Date()
    });

    return adaptation;
  }

  async recordAndAnalyzeFallback(fallback: FallbackEvent): Promise<void> {
    await this.eventStore.recordEvent({
      personalityId: fallback.personalityId,
      eventType: 'fallback_triggered',
      data: JSON.stringify(fallback),
      timestamp: fallback.timestamp
    });
  }
}