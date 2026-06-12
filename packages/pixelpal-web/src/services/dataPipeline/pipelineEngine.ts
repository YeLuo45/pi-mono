/**
 * Data Pipeline Engine for PixelPal V97
 * 
 * Handles data collection, aggregation, cleaning, and export.
 */

import type { TokenUsage, DailyCostTrend } from '../../types/usage';
import { tokenTracker } from '../usage/TokenTracker';

export interface WeeklyTrend {
  week: string; // YYYY-WW (ISO week)
  totalCost: number;
  totalTokens: number;
  callCount: number;
  startDate: number;
  endDate: number;
}

export interface MonthlyTrend {
  month: string; // YYYY-MM
  totalCost: number;
  totalTokens: number;
  callCount: number;
}

const HISTORICAL_USAGE_KEY = 'pixelpal_historical_usage';
const DATA_RETENTION_DAYS = 90;

class DataPipelineEngine {
  private historicalUsage: TokenUsage[] = [];

  constructor() {
    this.loadHistoricalData();
  }

  private loadHistoricalData(): void {
    try {
      const stored = localStorage.getItem(HISTORICAL_USAGE_KEY);
      if (stored) {
        this.historicalUsage = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load historical usage data:', e);
      this.historicalUsage = [];
    }
  }

  private saveHistoricalData(): void {
    try {
      // Keep only last 90 days
      const cutoff = Date.now() - DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      this.historicalUsage = this.historicalUsage.filter(r => r.timestamp >= cutoff);
      localStorage.setItem(HISTORICAL_USAGE_KEY, JSON.stringify(this.historicalUsage));
    } catch (e) {
      console.warn('Failed to save historical usage data:', e);
    }
  }

  /**
   * Collect all usage data from various sources
   */
  async collect(): Promise<TokenUsage[]> {
    // Get records from TokenTracker
    const trackerRecords = tokenTracker.getRecords();
    
    // Merge with historical data
    const allRecords = [...this.historicalUsage];
    
    // Add any new tracker records not in historical
    for (const record of trackerRecords) {
      const exists = allRecords.some(
        r => r.timestamp === record.timestamp && 
             r.provider === record.provider && 
             r.totalTokens === record.totalTokens
      );
      if (!exists) {
        allRecords.push(record);
      }
    }

    // Update historical data
    this.historicalUsage = allRecords;
    this.saveHistoricalData();

    // Sort by timestamp
    return allRecords.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Aggregate data by day
   */
  aggregateByDay(data: TokenUsage[]): DailyCostTrend[] {
    const trends: Map<string, DailyCostTrend> = new Map();

    for (const record of data) {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      
      if (!trends.has(date)) {
        trends.set(date, {
          date,
          totalCost: 0,
          totalTokens: 0,
          callCount: 0,
        });
      }

      const existing = trends.get(date)!;
      existing.totalCost += record.cost;
      existing.totalTokens += record.totalTokens;
      existing.callCount += 1;
    }

    return Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Aggregate data by week
   */
  aggregateByWeek(data: TokenUsage[]): WeeklyTrend[] {
    const trends: Map<string, WeeklyTrend> = new Map();

    for (const record of data) {
      const date = new Date(record.timestamp);
      const weekNum = this.getISOWeek(date);
      const year = date.getUTCFullYear();
      const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      
      // Calculate week start (Monday)
      const dayOfWeek = date.getUTCDay() || 7;
      const weekStart = new Date(date);
      weekStart.setUTCDate(date.getUTCDate() - dayOfWeek + 1);
      weekStart.setUTCHours(0, 0, 0, 0);
      
      // Calculate week end (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);

      if (!trends.has(weekKey)) {
        trends.set(weekKey, {
          week: weekKey,
          totalCost: 0,
          totalTokens: 0,
          callCount: 0,
          startDate: weekStart.getTime(),
          endDate: weekEnd.getTime(),
        });
      }

      const existing = trends.get(weekKey)!;
      existing.totalCost += record.cost;
      existing.totalTokens += record.totalTokens;
      existing.callCount += 1;
    }

    return Array.from(trends.values()).sort((a, b) => a.week.localeCompare(b.week));
  }

  /**
   * Aggregate data by month
   */
  aggregateByMonth(data: TokenUsage[]): MonthlyTrend[] {
    const trends: Map<string, MonthlyTrend> = new Map();

    for (const record of data) {
      const date = new Date(record.timestamp);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      
      if (!trends.has(monthKey)) {
        trends.set(monthKey, {
          month: monthKey,
          totalCost: 0,
          totalTokens: 0,
          callCount: 0,
        });
      }

      const existing = trends.get(monthKey)!;
      existing.totalCost += record.cost;
      existing.totalTokens += record.totalTokens;
      existing.callCount += 1;
    }

    return Array.from(trends.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get ISO week number
   */
  private getISOWeek(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Clean old data before a timestamp
   */
  cleanOldData(beforeTimestamp: number): void {
    this.historicalUsage = this.historicalUsage.filter(r => r.timestamp >= beforeTimestamp);
    this.saveHistoricalData();
    
    // Also clean TokenTracker old data
    const allRecords = tokenTracker.getRecords();
    const filteredRecords = allRecords.filter(r => r.timestamp >= beforeTimestamp);
    
    // Re-save if we have fewer records
    if (filteredRecords.length < allRecords.length) {
      localStorage.setItem('pixelpal-token-usage', JSON.stringify(filteredRecords));
    }
  }

  /**
   * Clean data older than 90 days
   */
  cleanOldDataAutomatic(): void {
    const cutoff = Date.now() - DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    this.cleanOldData(cutoff);
  }

  /**
   * Export data as CSV
   */
  exportCSV(): string {
    const headers = [
      'timestamp',
      'date',
      'provider',
      'model',
      'promptTokens',
      'completionTokens',
      'totalTokens',
      'cost',
      'responseTime',
      'success'
    ];

    const rows: string[] = [headers.join(',')];

    for (const record of this.historicalUsage) {
      const date = new Date(record.timestamp).toISOString();
      const row = [
        record.timestamp,
        date,
        record.provider,
        record.model,
        record.promptTokens,
        record.completionTokens,
        record.totalTokens,
        record.cost.toFixed(6),
        record.responseTime,
        record.success
      ];
      rows.push(row.map(v => `"${v}"`).join(','));
    }

    return rows.join('\n');
  }

  /**
   * Export data as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      retentionDays: DATA_RETENTION_DAYS,
      recordCount: this.historicalUsage.length,
      data: this.historicalUsage,
    }, null, 2);
  }

  /**
   * Get hourly usage heatmap data
   */
  getHourlyUsageHeatmap(data: TokenUsage[]): Array<{
    hour: number;
    dayOfWeek: number;
    count: number;
    dayName: string;
  }> {
    const heatmap: Map<string, { hour: number; dayOfWeek: number; count: number }> = new Map();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const record of data) {
      const date = new Date(record.timestamp);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${hour}`;

      if (!heatmap.has(key)) {
        heatmap.set(key, { hour, dayOfWeek, count: 0 });
      }

      heatmap.get(key)!.count += 1;
    }

    return Array.from(heatmap.values()).map(v => ({
      ...v,
      dayName: dayNames[v.dayOfWeek],
    }));
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalRecords: number;
    oldestRecord: number | null;
    newestRecord: number | null;
    storageSizeKB: number;
  } {
    const now = Date.now();
    const oldest = this.historicalUsage.length > 0 
      ? Math.min(...this.historicalUsage.map(r => r.timestamp))
      : null;
    const newest = this.historicalUsage.length > 0
      ? Math.max(...this.historicalUsage.map(r => r.timestamp))
      : null;
    
    const jsonStr = JSON.stringify(this.historicalUsage);
    const storageSizeKB = (jsonStr.length * 2) / 1024; // Approximate UTF-16 size

    return {
      totalRecords: this.historicalUsage.length,
      oldestRecord: oldest,
      newestRecord: newest,
      storageSizeKB,
    };
  }
}

// Export singleton
export const dataPipelineEngine = new DataPipelineEngine();
export default dataPipelineEngine;
