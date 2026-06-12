/**
 * Self Evolution Engine
 * generic-agent-design Self-Evolution Engine - Performance + Adaptation + Strategy
 */

export interface PerformanceMetrics {
  accuracy: number;
  speed: number;
  resourceUsage: number;
}

export interface AdaptationRule {
  trigger: (metrics: PerformanceMetrics) => boolean;
  adjustment: number;
}

export interface Strategy {
  id: string;
  name: string;
  score: number;
  active: boolean;
}

export class SelfEvolutionEngine {
  private metricsHistory: PerformanceMetrics[] = [];
  private rules: AdaptationRule[] = [];
  private strategies: Strategy[] = [];
  private currentAdjustment = 0;
  private strategyCounter = 0;
  private evolutionCount = 0;

  /**
   * Track performance metrics
   */
  trackMetrics(metrics: PerformanceMetrics): void {
    this.metricsHistory.push({ ...metrics });
  }

  /**
   * Add an adaptation rule
   */
  addRule(rule: AdaptationRule): void {
    this.rules.push(rule);
  }

  /**
   * Trigger adaptation based on current metrics
   */
  trigger(): number {
    if (this.metricsHistory.length === 0) return 0;

    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    let totalAdjustment = 0;

    for (const rule of this.rules) {
      if (rule.trigger(latest)) {
        totalAdjustment += rule.adjustment;
      }
    }

    this.currentAdjustment = totalAdjustment;
    return totalAdjustment;
  }

  /**
   * Get the active strategy
   */
  getActiveStrategy(): Strategy | null {
    return this.strategies.find(s => s.active) ?? null;
  }

  /**
   * Evolve and create a new strategy
   */
  evolve(): Strategy {
    this.evolutionCount++;
    const id = `strategy-${++this.strategyCounter}`;
    const baseScore = this.calculateBaseScore();

    const strategy: Strategy = {
      id,
      name: `Strategy ${this.evolutionCount}`,
      score: baseScore + this.currentAdjustment,
      active: false,
    };

    // Deactivate all others
    for (const s of this.strategies) {
      s.active = false;
    }

    this.strategies.push(strategy);
    strategy.active = true;

    return strategy;
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get all strategies
   */
  getStrategies(): Strategy[] {
    return [...this.strategies];
  }

  /**
   * Activate a strategy by id
   */
  activateStrategy(strategyId: string): boolean {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return false;

    for (const s of this.strategies) {
      s.active = s.id === strategyId;
    }

    return true;
  }

  /**
   * Calculate base score from history
   */
  private calculateBaseScore(): number {
    if (this.metricsHistory.length === 0) return 50;

    const sum = this.metricsHistory.reduce((acc, m) => {
      return acc + (m.accuracy + m.speed - m.resourceUsage);
    }, 0);

    return Math.round(sum / this.metricsHistory.length);
  }

  /**
   * Get best strategy
   */
  getBestStrategy(): Strategy | null {
    if (this.strategies.length === 0) return null;
    return this.strategies.reduce((best, s) => s.score > best.score ? s : best);
  }

  /**
   * Get average accuracy
   */
  getAverageAccuracy(): number {
    if (this.metricsHistory.length === 0) return 0;
    const sum = this.metricsHistory.reduce((acc, m) => acc + m.accuracy, 0);
    return Math.round(sum / this.metricsHistory.length * 100) / 100;
  }

  /**
   * Get average speed
   */
  getAverageSpeed(): number {
    if (this.metricsHistory.length === 0) return 0;
    const sum = this.metricsHistory.reduce((acc, m) => acc + m.speed, 0);
    return Math.round(sum / this.metricsHistory.length * 100) / 100;
  }

  /**
   * Get average resource usage
   */
  getAverageResourceUsage(): number {
    if (this.metricsHistory.length === 0) return 0;
    const sum = this.metricsHistory.reduce((acc, m) => acc + m.resourceUsage, 0);
    return Math.round(sum / this.metricsHistory.length * 100) / 100;
  }

  /**
   * Get evolution count
   */
  getEvolutionCount(): number {
    return this.evolutionCount;
  }

  /**
   * Get current adjustment
   */
  getCurrentAdjustment(): number {
    return this.currentAdjustment;
  }

  /**
   * Prune old metrics (keep last n)
   */
  pruneMetrics(keepLast: number): void {
    if (this.metricsHistory.length > keepLast) {
      this.metricsHistory = this.metricsHistory.slice(-keepLast);
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.metricsHistory = [];
    this.rules = [];
    this.strategies = [];
    this.currentAdjustment = 0;
    this.strategyCounter = 0;
    this.evolutionCount = 0;
  }
}

export default SelfEvolutionEngine;