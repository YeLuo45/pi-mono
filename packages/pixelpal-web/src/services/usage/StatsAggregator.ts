/**
 * StatsAggregator Service for PixelPal V88
 * 
 * Aggregates usage statistics and provider performance metrics.
 */

import type { TokenUsage, ProviderStats, DailyCostTrend, UsageSummary } from '../../types/usage';
import { tokenTracker } from './TokenTracker';

class StatsAggregator {
  /**
   * Get comprehensive usage summary
   */
  getUsageSummary(records?: TokenUsage[]): UsageSummary {
    const usageRecords = records || tokenTracker.getRecords();
    
    if (usageRecords.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        totalCalls: 0,
        successRate: 0,
        avgResponseTime: 0,
        byProvider: {},
      };
    }

    const totalCost = usageRecords.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = usageRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCalls = usageRecords.length;
    const successfulCalls = usageRecords.filter(r => r.success).length;
    const totalResponseTime = usageRecords.reduce((sum, r) => sum + r.responseTime, 0);
    
    const byProvider: UsageSummary['byProvider'] = {};
    const providers = new Set(usageRecords.map(r => r.provider));
    
    for (const provider of providers) {
      const providerRecords = usageRecords.filter(r => r.provider === provider);
      byProvider[provider] = {
        cost: providerRecords.reduce((sum, r) => sum + r.cost, 0),
        tokens: providerRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        calls: providerRecords.length,
      };
    }

    return {
      totalCost,
      totalTokens,
      totalCalls,
      successRate: successfulCalls / totalCalls,
      avgResponseTime: totalResponseTime / totalCalls,
      byProvider,
    };
  }

  /**
   * Get provider-specific statistics
   */
  getProviderStats(provider: string): ProviderStats {
    const records = tokenTracker.getRecordsByProvider(provider);
    
    if (records.length === 0) {
      return {
        provider,
        totalCalls: 0,
        successRate: 0,
        avgResponseTime: 0,
        totalCost: 0,
        totalTokens: 0,
      };
    }

    const totalCalls = records.length;
    const successfulCalls = records.filter(r => r.success).length;
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalResponseTime = records.reduce((sum, r) => sum + r.responseTime, 0);

    return {
      provider,
      totalCalls,
      successRate: successfulCalls / totalCalls,
      avgResponseTime: totalResponseTime / totalCalls,
      totalCost,
      totalTokens,
    };
  }

  /**
   * Get statistics for all providers
   */
  getAllProviderStats(): ProviderStats[] {
    const records = tokenTracker.getRecords();
    const providers = new Set(records.map(r => r.provider));
    
    return Array.from(providers).map(provider => this.getProviderStats(provider));
  }

  /**
   * Get daily cost trend
   */
  getDailyCostTrend(days: number = 30): DailyCostTrend[] {
    return tokenTracker.getDailyCostTrend(days);
  }

  /**
   * Get today's usage summary
   */
  getTodaySummary(): UsageSummary {
    return this.getUsageSummary(tokenTracker.getTodayRecords());
  }

  /**
   * Get this week's usage summary
   */
  getWeekSummary(): UsageSummary {
    return this.getUsageSummary(tokenTracker.getWeekRecords());
  }

  /**
   * Get this month's usage summary
   */
  getMonthSummary(): UsageSummary {
    return this.getUsageSummary(tokenTracker.getMonthRecords());
  }

  /**
   * Get response time trend (last N records)
   */
  getResponseTimeTrend(limit: number = 50): Array<{ timestamp: number; responseTime: number; provider: string }> {
    const records = tokenTracker.getRecords();
    return records
      .slice(-limit)
      .map(r => ({
        timestamp: r.timestamp,
        responseTime: r.responseTime,
        provider: r.provider,
      }));
  }

  /**
   * Get success rate trend (by day)
   */
  getSuccessRateTrend(days: number = 7): Array<{ date: string; successRate: number; totalCalls: number }> {
    const trends = tokenTracker.getDailyCostTrend(days);
    
    return trends.map(({ date, calls, ...rest }) => {
      const dayRecords = tokenTracker.getRecordsInRange(
        new Date(date).getTime(),
        new Date(date).getTime() + 24 * 60 * 60 * 1000 - 1
      );
      const successful = dayRecords.filter(r => r.success).length;
      return {
        date,
        successRate: calls > 0 ? successful / calls : 0,
        totalCalls: calls,
      };
    });
  }

  /**
   * Get provider comparison data
   */
  getProviderComparison(): Array<{
    provider: string;
    cost: number;
    tokens: number;
    calls: number;
    successRate: number;
    avgResponseTime: number;
  }> {
    const stats = this.getAllProviderStats();
    return stats.map(s => ({
      provider: s.provider,
      cost: s.totalCost,
      tokens: s.totalTokens,
      calls: s.totalCalls,
      successRate: s.successRate,
      avgResponseTime: s.avgResponseTime,
    }));
  }

  /**
   * Estimate monthly bill based on current spending
   */
  estimateMonthlyBill(): number {
    const monthSummary = this.getMonthSummary();
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    if (dayOfMonth === 0) return monthSummary.totalCost;
    
    const dailyAverage = monthSummary.totalCost / dayOfMonth;
    return dailyAverage * daysInMonth;
  }

  /**
   * Get top providers by cost
   */
  getTopProvidersByCost(limit: number = 5): Array<{ provider: string; cost: number; percentage: number }> {
    const stats = this.getAllProviderStats()
      .filter(s => s.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
    
    const totalCost = stats.reduce((sum, s) => sum + s.totalCost, 0);
    
    return stats.map(s => ({
      provider: s.provider,
      cost: s.totalCost,
      percentage: totalCost > 0 ? (s.totalCost / totalCost) * 100 : 0,
    }));
  }

  /**
   * Get cost breakdown by provider for pie chart
   */
  getCostBreakdown(): Array<{ name: string; value: number; color?: string }> {
    const topProviders = this.getTopProvidersByCost(10);
    const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#818cf8', '#a855f7', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95'];
    
    return topProviders.map((p, i) => ({
      name: p.provider,
      value: p.cost,
      color: colors[i % colors.length],
    }));
  }
}

// Export singleton
export const statsAggregator = new StatsAggregator();
export default statsAggregator;
