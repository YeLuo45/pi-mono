export interface PerformanceSnapshot {
  timestamp: number;
  metrics: Record<string, number>;
  score: number;
}

export class PerformanceTracker {
  private history: PerformanceSnapshot[] = [];
  private windowSize: number;

  constructor(windowSize: number = 100) {
    this.windowSize = windowSize;
  }

  capture(metrics: Record<string, number>): PerformanceSnapshot {
    const score = this.calculateScore(metrics);
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      metrics: { ...metrics },
      score,
    };
    
    this.history.push(snapshot);
    
    // Trim history to window size
    if (this.history.length > this.windowSize) {
      this.history = this.history.slice(-this.windowSize);
    }
    
    return snapshot;
  }

  private calculateScore(metrics: Record<string, number>): number {
    if (Object.keys(metrics).length === 0) {
      return 0;
    }
    
    // Simple average of all metric values
    const values = Object.values(metrics);
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  getHistory(limit?: number): PerformanceSnapshot[] {
    // Sort newest first
    const sorted = [...this.history].sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit !== undefined && limit > 0) {
      return sorted.slice(0, limit);
    }
    
    return sorted;
  }

  clear(): void {
    this.history = [];
  }

  getAverageScore(window?: number): number {
    if (this.history.length === 0) {
      return 0;
    }
    
    // Use most recent 'window' entries
    let relevantHistory = this.history;
    if (window !== undefined && window > 0) {
      relevantHistory = this.history.slice(-Math.min(window, this.history.length));
    }
    
    const scores = relevantHistory.map(s => s.score);
    const sum = scores.reduce((acc, val) => acc + val, 0);
    return sum / scores.length;
  }

  getScoreTrend(): number {
    if (this.history.length < 2) {
      return 0;
    }
    
    const midPoint = Math.floor(this.history.length / 2);
    const olderHalf = this.history.slice(0, midPoint);
    const recentHalf = this.history.slice(midPoint);
    
    const olderAvg = olderHalf.reduce((acc, s) => acc + s.score, 0) / olderHalf.length;
    const recentAvg = recentHalf.reduce((acc, s) => acc + s.score, 0) / recentHalf.length;
    
    if (olderAvg === 0) {
      return recentAvg > 0 ? 1 : 0;
    }
    
    return (recentAvg - olderAvg) / olderAvg;
  }

  getPercentile(percentile: number): number {
    if (this.history.length === 0) {
      return 0;
    }
    
    if (this.history.length === 1) {
      return this.history[0].score;
    }
    
    // Sort by score ascending
    const sorted = [...this.history].sort((a, b) => a.score - b.score);
    
    if (percentile <= 0) {
      return sorted[0].score;
    }
    if (percentile >= 100) {
      return sorted[sorted.length - 1].score;
    }
    
    // Linear interpolation
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;
    
    if (lower === upper) {
      return sorted[lower].score;
    }
    
    return sorted[lower].score * (1 - fraction) + sorted[upper].score * fraction;
  }
}