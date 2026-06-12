/**
 * V160: Personality Comparison Engine
 * 
 * Provides cross-personality analysis for comparing evolution metrics
 * across different personalities. Generates similarity scores, identifies
 * differences, and provides recommendations.
 */

import type { EvolutionEventStore } from '../persistence/EvolutionEventStore';
import type { EvolutionAnalytics } from '../analytics/EvolutionAnalytics';

export interface PersonalityMetrics {
  personalityId: string;
  totalEvents: number;
  successRate: number;
  avgAdaptationTime: number;
  topPatterns: string[];
  riskScore: number;
}

export interface ComparisonResult {
  personalityA: PersonalityMetrics;
  personalityB: PersonalityMetrics;
  similarity: number;
  differences: string[];
  recommendations: string[];
}

export class PersonalityComparisonEngine {
  constructor(
    private eventStore: EvolutionEventStore,
    private analytics: EvolutionAnalytics
  ) {}

  async compare(personalityA: string, personalityB: string): Promise<ComparisonResult> {
    const metricsA = await this.computeMetrics(personalityA);
    const metricsB = await this.computeMetrics(personalityB);
    
    return {
      personalityA: metricsA,
      personalityB: metricsB,
      similarity: this.computeSimilarity(metricsA, metricsB),
      differences: this.findDifferences(metricsA, metricsB),
      recommendations: this.generateRecommendations(metricsA, metricsB)
    };
  }

  async compareAll(personalityIds: string[]): Promise<Map<string, PersonalityMetrics>> {
    const results = new Map<string, PersonalityMetrics>();
    for (const id of personalityIds) {
      results.set(id, await this.computeMetrics(id));
    }
    return results;
  }

  private async computeMetrics(personalityId: string): Promise<PersonalityMetrics> {
    const events = await this.eventStore.getByPersonality(personalityId);
    const report = this.analytics.generateReport(personalityId);
    
    const successEvents = events.filter(e => e.eventType === 'evolution_triggered');
    const failedEvents = events.filter(e => e.eventType === 'fallback_triggered');
    
    return {
      personalityId,
      totalEvents: events.length,
      successRate: events.length > 0 ? successEvents.length / events.length : 0,
      avgAdaptationTime: (await report)?.avgDurationMs || 0,
      topPatterns: this.extractTopPatterns(events),
      riskScore: failedEvents.length / Math.max(events.length, 1)
    };
  }

  private computeSimilarity(a: PersonalityMetrics, b: PersonalityMetrics): number {
    let score = 0;
    if (Math.abs(a.successRate - b.successRate) < 0.1) score += 0.3;
    if (Math.abs(a.riskScore - b.riskScore) < 0.1) score += 0.3;
    if (a.topPatterns.some(p => b.topPatterns.includes(p))) score += 0.2;
    score += (1 - Math.abs(a.totalEvents - b.totalEvents) / Math.max(a.totalEvents, b.totalEvents, 1)) * 0.2;
    return Math.min(score, 1);
  }

  private findDifferences(a: PersonalityMetrics, b: PersonalityMetrics): string[] {
    const diffs: string[] = [];
    if (a.successRate > b.successRate + 0.2) diffs.push(`${a.personalityId} has higher success rate`);
    if (b.successRate > a.successRate + 0.2) diffs.push(`${b.personalityId} has higher success rate`);
    if (a.riskScore > b.riskScore + 0.2) diffs.push(`${a.personalityId} has higher risk score`);
    if (b.riskScore > a.riskScore + 0.2) diffs.push(`${b.personalityId} has higher risk score`);
    return diffs;
  }

  private generateRecommendations(a: PersonalityMetrics, b: PersonalityMetrics): string[] {
    const recs: string[] = [];
    if (a.successRate < b.successRate) {
      recs.push(`Consider adopting ${b.personalityId}'s strategy for ${a.personalityId}`);
    }
    if (a.riskScore > b.riskScore + 0.2) {
      recs.push(`${a.personalityId} should adopt ${b.personalityId}'s risk management approach`);
    }
    return recs;
  }

  private extractTopPatterns(events: any[]): string[] {
    const counts = new Map<string, number>();
    for (const e of events) {
      const type = e.eventType;
      counts.set(type, (counts.get(type) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }
}