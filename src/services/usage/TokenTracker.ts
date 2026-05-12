/**
 * TokenTracker Service for PixelPal V88
 * 
 * Tracks token usage for all AI provider calls.
 */

import type { TokenUsage } from '../../types/usage';

const STORAGE_KEY = 'pixelpal-token-usage';
const MAX_RECORDS = 10000; // Keep last 10k records

class TokenTracker {
  private usageRecords: TokenUsage[] = [];
  private listeners: Set<(record: TokenUsage) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.usageRecords = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load token usage from storage:', e);
      this.usageRecords = [];
    }
  }

  private saveToStorage(): void {
    try {
      // Keep only last MAX_RECORDS
      if (this.usageRecords.length > MAX_RECORDS) {
        this.usageRecords = this.usageRecords.slice(-MAX_RECORDS);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.usageRecords));
    } catch (e) {
      console.warn('Failed to save token usage to storage:', e);
    }
  }

  /**
   * Record a token usage event
   */
  recordUsage(usage: Omit<TokenUsage, 'timestamp'>): void {
    const record: TokenUsage = {
      ...usage,
      timestamp: Date.now(),
    };
    this.usageRecords.push(record);
    this.saveToStorage();
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(record);
      } catch (e) {
        console.warn('TokenTracker listener error:', e);
      }
    });
  }

  /**
   * Subscribe to usage events
   */
  subscribe(listener: (record: TokenUsage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get all usage records
   */
  getRecords(): TokenUsage[] {
    return [...this.usageRecords];
  }

  /**
   * Get usage records for a specific provider
   */
  getRecordsByProvider(provider: string): TokenUsage[] {
    return this.usageRecords.filter(r => r.provider === provider);
  }

  /**
   * Get usage records within a time range
   */
  getRecordsInRange(startTime: number, endTime: number): TokenUsage[] {
    return this.usageRecords.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
  }

  /**
   * Get usage records for today
   */
  getTodayRecords(): TokenUsage[] {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
    return this.getRecordsInRange(startOfDay, endOfDay);
  }

  /**
   * Get usage records for this week
   */
  getWeekRecords(): TokenUsage[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1;
    return this.getRecordsInRange(startOfWeek.getTime(), endOfWeek);
  }

  /**
   * Get usage records for this month
   */
  getMonthRecords(): TokenUsage[] {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return this.getRecordsInRange(startOfMonth, endOfMonth);
  }

  /**
   * Calculate total cost for records
   */
  calculateTotalCost(records: TokenUsage[]): number {
    return records.reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Calculate total tokens for records
   */
  calculateTotalTokens(records: TokenUsage[]): number {
    return records.reduce((sum, r) => sum + r.totalTokens, 0);
  }

  /**
   * Get today's cost
   */
  getTodayCost(): number {
    return this.calculateTotalCost(this.getTodayRecords());
  }

  /**
   * Get this week's cost
   */
  getWeekCost(): number {
    return this.calculateTotalCost(this.getWeekRecords());
  }

  /**
   * Get this month's cost
   */
  getMonthCost(): number {
    return this.calculateTotalCost(this.getMonthRecords());
  }

  /**
   * Get today's token count
   */
  getTodayTokens(): number {
    return this.calculateTotalTokens(this.getTodayRecords());
  }

  /**
   * Get provider-specific stats
   */
  getProviderStats(provider: string): {
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    totalTokens: number;
  } {
    const records = this.getRecordsByProvider(provider);
    if (records.length === 0) {
      return { totalCalls: 0, successRate: 0, avgResponseTime: 0, totalCost: 0, totalTokens: 0 };
    }
    const successful = records.filter(r => r.success);
    const totalCost = this.calculateTotalCost(records);
    const totalTokens = this.calculateTotalTokens(records);
    const avgResponseTime = records.reduce((sum, r) => sum + r.responseTime, 0) / records.length;
    return {
      totalCalls: records.length,
      successRate: successful.length / records.length,
      avgResponseTime,
      totalCost,
      totalTokens,
    };
  }

  /**
   * Get daily cost trends for the last N days
   */
  getDailyCostTrend(days: number = 30): Array<{ date: string; cost: number; tokens: number; calls: number }> {
    const trends: Map<string, { cost: number; tokens: number; calls: number }> = new Map();
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * msPerDay);
      const dateStr = date.toISOString().split('T')[0];
      trends.set(dateStr, { cost: 0, tokens: 0, calls: 0 });
    }

    // Aggregate records
    for (const record of this.usageRecords) {
      if (now - record.timestamp > days * msPerDay) continue;
      const dateStr = new Date(record.timestamp).toISOString().split('T')[0];
      const existing = trends.get(dateStr);
      if (existing) {
        existing.cost += record.cost;
        existing.tokens += record.totalTokens;
        existing.calls += 1;
      }
    }

    return Array.from(trends.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));
  }

  /**
   * Clear all usage records
   */
  clearAll(): void {
    this.usageRecords = [];
    this.saveToStorage();
  }

  /**
   * Export usage data
   */
  exportData(): string {
    return JSON.stringify(this.usageRecords, null, 2);
  }
}

// Export singleton
export const tokenTracker = new TokenTracker();
export default tokenTracker;
