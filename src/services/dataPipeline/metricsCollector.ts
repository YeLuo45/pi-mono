/**
 * Metrics Collector for PixelPal V97
 * 
 * Collects and calculates various usage metrics and trends.
 */

import type { TokenUsage, UsageSummary } from '../../types/usage';
import { tokenTracker } from '../usage/TokenTracker';
import { dataPipelineEngine } from './pipelineEngine';

export interface SessionMetrics {
  sessionStart: number;
  sessionEnd: number;
  totalCalls: number;
  totalTokens: number;
  totalCost: number;
  avgResponseTime: number;
  successRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  percentageChange?: number;
}

export interface AnomalyDetection {
  type: 'spike' | 'drop' | 'unusual_pattern';
  severity: 'low' | 'medium' | 'high';
  message: string;
  details: Record<string, unknown>;
}

const COST_BUDGET_KEY = 'pixelpal_cost_budgets';
const PROVIDER_STATS_KEY = 'pixelpal_provider_stats';

class MetricsCollector {
  private sessionStart: number = Date.now();
  private sessionCalls: number = 0;

  constructor() {
    // Initialize session
    this.sessionStart = Date.now();
    
    // Clean old data on startup
    dataPipelineEngine.cleanOldDataAutomatic();
  }

  /**
   * Start a new session
   */
  startSession(): void {
    this.sessionStart = Date.now();
    this.sessionCalls = 0;
  }

  /**
   * Record a call in current session
   */
  recordSessionCall(): void {
    this.sessionCalls++;
  }

  /**
   * Collect metrics for current session
   */
  collectSessionMetrics(): SessionMetrics {
    const records = tokenTracker.getRecords();
    const sessionRecords = records.filter(r => r.timestamp >= this.sessionStart);
    
    if (sessionRecords.length === 0) {
      return {
        sessionStart: this.sessionStart,
        sessionEnd: Date.now(),
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
        avgResponseTime: 0,
        successRate: 0,
      };
    }

    const totalCost = sessionRecords.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = sessionRecords.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalResponseTime = sessionRecords.reduce((sum, r) => sum + r.responseTime, 0);
    const successfulCalls = sessionRecords.filter(r => r.success).length;

    return {
      sessionStart: this.sessionStart,
      sessionEnd: Date.now(),
      totalCalls: sessionRecords.length,
      totalTokens,
      totalCost,
      avgResponseTime: totalResponseTime / sessionRecords.length,
      successRate: successfulCalls / sessionRecords.length,
    };
  }

  /**
   * Collect metrics for a time range
   */
  collectRangeMetrics(start: number, end: number): UsageSummary {
    const records = tokenTracker.getRecordsInRange(start, end);
    
    if (records.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        totalCalls: 0,
        successRate: 0,
        avgResponseTime: 0,
        byProvider: {},
      };
    }

    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalResponseTime = records.reduce((sum, r) => sum + r.responseTime, 0);
    const successfulCalls = records.filter(r => r.success).length;

    const byProvider: UsageSummary['byProvider'] = {};
    const providers = new Set(records.map(r => r.provider));
    
    for (const provider of providers) {
      const providerRecords = records.filter(r => r.provider === provider);
      byProvider[provider] = {
        cost: providerRecords.reduce((sum, r) => sum + r.cost, 0),
        tokens: providerRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        calls: providerRecords.length,
      };
    }

    return {
      totalCost,
      totalTokens,
      totalCalls: records.length,
      successRate: successfulCalls / records.length,
      avgResponseTime: totalResponseTime / records.length,
      byProvider,
    };
  }

  /**
   * Calculate trend for a specific metric
   */
  calculateTrend(metric: 'cost' | 'tokens' | 'calls', days: number): TrendData[] {
    const data = tokenTracker.getRecords();
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    // Initialize days
    const trends: Map<string, { value: number; date: string }> = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * msPerDay);
      const dateStr = date.toISOString().split('T')[0];
      trends.set(dateStr, { value: 0, date: dateStr });
    }

    // Aggregate
    for (const record of data) {
      if (now - record.timestamp > days * msPerDay) continue;
      const dateStr = new Date(record.timestamp).toISOString().split('T')[0];
      const existing = trends.get(dateStr);
      if (existing) {
        switch (metric) {
          case 'cost':
            existing.value += record.cost;
            break;
          case 'tokens':
            existing.value += record.totalTokens;
            break;
          case 'calls':
            existing.value += 1;
            break;
        }
      }
    }

    // Calculate percentage changes
    const result: TrendData[] = [];
    let prevValue = 0;
    
    for (const [date, { value }] of trends) {
      const percentageChange = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : undefined;
      result.push({ date, value, percentageChange });
      prevValue = value;
    }

    return result;
  }

  /**
   * Get response time distribution
   */
  getResponseTimeDistribution(records?: TokenUsage[]): {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  } {
    const data = records || tokenTracker.getRecords();
    if (data.length === 0) {
      return { p50: 0, p95: 0, p99: 0, avg: 0 };
    }

    const sorted = [...data].sort((a, b) => a.responseTime - b.responseTime);
    const avg = sorted.reduce((sum, r) => sum + r.responseTime, 0) / sorted.length;
    
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)]?.responseTime || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)]?.responseTime || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)]?.responseTime || 0,
      avg,
    };
  }

  /**
   * Detect anomalies in usage patterns
   */
  detectAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const records = tokenTracker.getRecords();
    
    if (records.length < 10) return anomalies;

    // Check for cost spikes
    const costTrend = this.calculateTrend('cost', 7);
    if (costTrend.length >= 2) {
      const recent = costTrend[costTrend.length - 1];
      const prevAvg = costTrend.slice(0, -1).reduce((sum, t) => sum + t.value, 0) / (costTrend.length - 1);
      
      if (prevAvg > 0 && recent.percentageChange && recent.percentageChange > 100) {
        anomalies.push({
          type: 'spike',
          severity: 'high',
          message: `Cost spike detected: ${recent.percentageChange.toFixed(1)}% increase compared to previous average`,
          details: { recentCost: recent.value, previousAvg: prevAvg, changePercent: recent.percentageChange },
        });
      }
    }

    // Check for success rate drops
    const todayRecords = tokenTracker.getTodayRecords();
    if (todayRecords.length > 0) {
      const successfulToday = todayRecords.filter(r => r.success).length;
      const successRate = successfulToday / todayRecords.length;
      
      if (successRate < 0.8) {
        anomalies.push({
          type: 'drop',
          severity: successRate < 0.5 ? 'high' : 'medium',
          message: `Low success rate today: ${(successRate * 100).toFixed(1)}%`,
          details: { successRate, failedCalls: todayRecords.length - successfulToday },
        });
      }
    }

    // Check for response time anomalies
    const responseDist = this.getResponseTimeDistribution();
    if (responseDist.p95 > 30000) { // > 30 seconds
      anomalies.push({
        type: 'unusual_pattern',
        severity: responseDist.p95 > 60000 ? 'high' : 'medium',
        message: `High response times detected: P95 = ${(responseDist.p95 / 1000).toFixed(1)}s`,
        details: { p50: responseDist.p50, p95: responseDist.p95, p99: responseDist.p99 },
      });
    }

    return anomalies;
  }

  /**
   * Get cost budgets from storage
   */
  getCostBudgets(): Array<{
    id: string;
    type: 'daily' | 'weekly' | 'monthly';
    limit: number;
    current: number;
    resetAt: number;
    enabled: boolean;
    providerId?: string;
  }> {
    try {
      const stored = localStorage.getItem(COST_BUDGET_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save cost budgets to storage
   */
  saveCostBudgets(budgets: Array<{
    id: string;
    type: 'daily' | 'weekly' | 'monthly';
    limit: number;
    current: number;
    resetAt: number;
    enabled: boolean;
    providerId?: string;
  }>): void {
    localStorage.setItem(COST_BUDGET_KEY, JSON.stringify(budgets));
  }

  /**
   * Get provider statistics from storage
   */
  getProviderStats(): Array<{
    provider: string;
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    totalTokens: number;
    lastUpdated: number;
  }> {
    try {
      const stored = localStorage.getItem(PROVIDER_STATS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save provider statistics to storage
   */
  saveProviderStats(stats: Array<{
    provider: string;
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    totalTokens: number;
    lastUpdated: number;
  }>): void {
    localStorage.setItem(PROVIDER_STATS_KEY, JSON.stringify(stats));
  }

  /**
   * Update provider statistics
   */
  updateProviderStats(): void {
    const records = tokenTracker.getRecords();
    const providers = new Set(records.map(r => r.provider));
    const stats: Array<{
      provider: string;
      totalCalls: number;
      successRate: number;
      avgResponseTime: number;
      totalCost: number;
      totalTokens: number;
      lastUpdated: number;
    }> = [];

    for (const provider of providers) {
      const providerRecords = records.filter(r => r.provider === provider);
      const successful = providerRecords.filter(r => r.success).length;
      const totalResponseTime = providerRecords.reduce((sum, r) => sum + r.responseTime, 0);
      
      stats.push({
        provider,
        totalCalls: providerRecords.length,
        successRate: successful / providerRecords.length,
        avgResponseTime: totalResponseTime / providerRecords.length,
        totalCost: providerRecords.reduce((sum, r) => sum + r.cost, 0),
        totalTokens: providerRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        lastUpdated: Date.now(),
      });
    }

    this.saveProviderStats(stats);
  }

  /**
   * Get efficiency score (tokens per dollar)
   */
  getEfficiencyScore(): number {
    const records = tokenTracker.getRecords();
    if (records.length === 0) return 0;

    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalCost = records.reduce((sum, r) => sum + r.cost, 0);

    if (totalCost === 0) return 0;
    return totalTokens / totalCost;
  }

  /**
   * Get cost forecast based on current usage
   */
  getCostForecast(): {
    daily: number;
    weekly: number;
    monthly: number;
    projectedMonthly: number;
  } {
    const now = new Date();
    const todayRecords = tokenTracker.getTodayRecords();
    const todayCost = todayRecords.reduce((sum, r) => sum + r.cost, 0);
    
    // Get start of week
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekRecords = tokenTracker.getRecordsInRange(startOfWeek.getTime(), now.getTime());
    const weeklyCost = weekRecords.reduce((sum, r) => sum + r.cost, 0);

    // Get start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthRecords = tokenTracker.getRecordsInRange(startOfMonth.getTime(), now.getTime());
    const monthlyCost = monthRecords.reduce((sum, r) => sum + r.cost, 0);

    // Project monthly cost based on current rate
    const dayOfMonth = now.getDate();
    const projectedMonthly = dayOfMonth > 0 ? (monthlyCost / dayOfMonth) * 30 : monthlyCost;

    return {
      daily: todayCost,
      weekly: weeklyCost,
      monthly: monthlyCost,
      projectedMonthly,
    };
  }
}

// Export singleton
export const metricsCollector = new MetricsCollector();
export default metricsCollector;
