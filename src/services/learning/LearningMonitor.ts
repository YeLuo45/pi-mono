export interface LearningMetrics {
  totalInteractions: number;
  successfulInteractions: number;
  failedInteractions: number;
  averageOutcome: number;
  lastUpdated: number;
}

export interface FeedbackLoop {
  id: string;
  type: string;
  triggerCondition: string;
  action: string;
  successRate: number;
  lastTriggered: number;
}

export class LearningMonitor {
  private metrics: LearningMetrics;
  private feedbackLoops: Map<string, FeedbackLoop>;
  private recentOutcomes: number[] = [];
  private readonly trendWindowSize = 4;
  private readonly alertThreshold = 0.4;

  constructor() {
    this.metrics = {
      totalInteractions: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      averageOutcome: 0,
      lastUpdated: Date.now(),
    };
    this.feedbackLoops = new Map();
  }

  recordInteraction(outcome: number): void {
    this.metrics.totalInteractions++;
    
    if (outcome > 0.5) {
      this.metrics.successfulInteractions++;
    } else {
      this.metrics.failedInteractions++;
    }
    
    // Update average outcome
    const totalOutcome = this.metrics.averageOutcome * (this.metrics.totalInteractions - 1) + outcome;
    this.metrics.averageOutcome = totalOutcome / this.metrics.totalInteractions;
    
    // Track recent outcomes for trend analysis
    this.recentOutcomes.push(outcome);
    if (this.recentOutcomes.length > 10) {
      this.recentOutcomes.shift();
    }
    
    this.metrics.lastUpdated = Date.now();
  }

  getMetrics(): LearningMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalInteractions: 0,
      successfulInteractions: 0,
      failedInteractions: 0,
      averageOutcome: 0,
      lastUpdated: Date.now(),
    };
    this.recentOutcomes = [];
  }

  registerLoop(loop: FeedbackLoop): void {
    this.feedbackLoops.set(loop.id, { ...loop });
  }

  triggerLoop(loopId: string): boolean {
    const loop = this.feedbackLoops.get(loopId);
    if (!loop) {
      return false;
    }
    
    loop.lastTriggered = Date.now();
    this.feedbackLoops.set(loopId, loop);
    return true;
  }

  getLoop(loopId: string): FeedbackLoop | null {
    const loop = this.feedbackLoops.get(loopId);
    return loop ? { ...loop } : null;
  }

  getAllLoops(): FeedbackLoop[] {
    return Array.from(this.feedbackLoops.values()).map(loop => ({ ...loop }));
  }

  getSuccessRate(): number {
    if (this.metrics.totalInteractions === 0) {
      return 0;
    }
    return this.metrics.successfulInteractions / this.metrics.totalInteractions;
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.recentOutcomes.length < this.trendWindowSize) {
      return 'stable';
    }
    
    const recentWindow = this.recentOutcomes.slice(-this.trendWindowSize);
    const midPoint = Math.floor(this.trendWindowSize / 2);
    
    const olderAvg = recentWindow.slice(0, midPoint).reduce((a, b) => a + b, 0) / midPoint;
    const recentAvg = recentWindow.slice(midPoint).reduce((a, b) => a + b, 0) / (this.trendWindowSize - midPoint);
    
    const threshold = 0.05;
    const diff = recentAvg - olderAvg;
    
    if (diff > threshold) {
      return 'improving';
    } else if (diff < -threshold) {
      return 'declining';
    }
    return 'stable';
  }

  shouldTriggerAlert(): boolean {
    if (this.metrics.totalInteractions < 3) {
      return false;
    }
    return this.getSuccessRate() < this.alertThreshold;
  }

  toJSON(): object {
    return {
      metrics: { ...this.metrics },
      feedbackLoops: this.getAllLoops(),
    };
  }

  static fromJSON(data: any): LearningMonitor {
    const monitor = new LearningMonitor();
    
    if (data && data.metrics) {
      monitor.metrics = {
        totalInteractions: data.metrics.totalInteractions || 0,
        successfulInteractions: data.metrics.successfulInteractions || 0,
        failedInteractions: data.metrics.failedInteractions || 0,
        averageOutcome: data.metrics.averageOutcome || 0,
        lastUpdated: data.metrics.lastUpdated || Date.now(),
      };
    }
    
    if (data && Array.isArray(data.feedbackLoops)) {
      for (const loop of data.feedbackLoops) {
        if (loop && loop.id) {
          monitor.feedbackLoops.set(loop.id, {
            id: loop.id,
            type: loop.type || '',
            triggerCondition: loop.triggerCondition || '',
            action: loop.action || '',
            successRate: loop.successRate || 0,
            lastTriggered: loop.lastTriggered || 0,
          });
        }
      }
    }
    
    return monitor;
  }
}