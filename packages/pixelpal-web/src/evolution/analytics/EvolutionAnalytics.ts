/**
 * V157: Evolution Analytics
 * 
 * Provides analytics and reporting on evolution events.
 * Generates trend reports, calculates success rates, and identifies patterns.
 */

import { evolutionEventStore } from '../persistence/EvolutionEventStore';
import type { EvolutionEvent } from '../../db/schema/evolution';

export interface EvolutionReport {
  personalityId: string;
  periodDays: number;
  totalEvents: number;
  successRate: number;
  avgDurationMs: number;
  topPatterns: { id: string; count: number }[];
  topStrategies: { id: string; improvement: number }[];
  skillCrystallizationCount: number;
  ruleTriggerCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

interface PatternPayload {
  patternId?: string;
  strategyId?: string;
  [key: string]: unknown;
}

class EvolutionAnalytics {
  /**
   * Generate a comprehensive evolution report for a personality
   */
  async generateReport(personalityId: string, periodDays = 7): Promise<EvolutionReport> {
    const sinceMs = Date.now() - periodDays * 86400000;
    const events = await evolutionEventStore.getByPersonality(personalityId, 1000);
    const recentEvents = events.filter(e => e.timestamp >= sinceMs);
    
    const totalEvents = recentEvents.length;
    const successfulEvents = recentEvents.filter(e => e.success).length;
    const successRate = totalEvents > 0 ? successfulEvents / totalEvents : 0;
    const avgDuration = await evolutionEventStore.avgDuration(personalityId, sinceMs);
    
    // Pattern detection statistics
    const patternEvents = recentEvents.filter(e => e.eventType === 'pattern_detected');
    const topPatterns = this.aggregateByField(patternEvents, 'patternId');
    
    // Strategy optimization statistics
    const strategyEvents = recentEvents.filter(e => e.eventType === 'strategy_optimized');
    const topStrategies = this.aggregateByField(strategyEvents, 'strategyId');
    
    // Skill crystallization count
    const skillCrystallizationCount = await evolutionEventStore.countByType(
      personalityId, 'skill_crystallized', sinceMs
    );
    
    // Rule trigger count
    const ruleTriggerCount = await evolutionEventStore.countByType(
      personalityId, 'rule_triggered', sinceMs
    );
    
    // Calculate trend
    const trend = this.calculateTrend(events, periodDays);
    
    return {
      personalityId,
      periodDays,
      totalEvents,
      successRate,
      avgDurationMs: avgDuration,
      topPatterns: topPatterns.slice(0, 5),
      topStrategies: topStrategies.slice(0, 5),
      skillCrystallizationCount,
      ruleTriggerCount,
      trend,
    };
  }

  /**
   * Aggregate events by a field path in the payload JSON
   */
  private aggregateByField(events: EvolutionEvent[], fieldPath: string): { id: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const e of events) {
      try {
        const payload: PatternPayload = JSON.parse(e.payload);
        const value = fieldPath.split('.').reduce((obj: unknown, key: string) => {
          if (obj && typeof obj === 'object') {
            return (obj as Record<string, unknown>)[key];
          }
          return undefined;
        }, payload as unknown) as string | undefined;
        if (value) counts.set(value, (counts.get(value) || 0) + 1);
      } catch {
        // Skip events with invalid payload JSON
      }
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate trend by comparing recent half vs older half of period
   */
  private calculateTrend(events: EvolutionEvent[], periodDays: number): 'improving' | 'stable' | 'declining' {
    const now = Date.now();
    const halfPeriod = periodDays * 86400000 / 2;
    const recentEvents = events.filter(e => e.timestamp >= now - halfPeriod);
    const olderEvents = events.filter(e => 
      e.timestamp < now - halfPeriod && e.timestamp >= now - periodDays * 86400000
    );
    
    if (olderEvents.length === 0) return 'stable';
    
    const recentSuccess = recentEvents.filter(e => e.success).length / Math.max(recentEvents.length, 1);
    const olderSuccess = olderEvents.filter(e => e.success).length / olderEvents.length;
    
    if (recentSuccess > olderSuccess + 0.1) return 'improving';
    if (recentSuccess < olderSuccess - 0.1) return 'declining';
    return 'stable';
  }
}

export const evolutionAnalytics = new EvolutionAnalytics();