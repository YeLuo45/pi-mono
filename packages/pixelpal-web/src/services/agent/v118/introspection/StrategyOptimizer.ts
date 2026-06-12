/**
 * StrategyOptimizer - Dynamically optimizes task decomposition strategy
 * based on historical execution data
 */

import type { ExecutionRecord, StrategyRecommendation } from './types';
import { PatternAnalyzer } from './PatternAnalyzer';

export class StrategyOptimizer {
  private analyzer: PatternAnalyzer;
  private minConfidenceThreshold = 0.6;

  constructor(analyzer: PatternAnalyzer) {
    this.analyzer = analyzer;
  }

  /**
   * Get strategy recommendation for a task type
   */
  recommend(taskType: string): StrategyRecommendation | null {
    const pattern = this.analyzer.analyzeTaskType(taskType);
    if (!pattern) return null;

    // Only recommend if we have enough data
    if (pattern.executionCount < 3) {
      return {
        taskType,
        recommendedAgents: ['MainAgent'], // Fallback to safe default
        estimatedDuration: 5000,
        confidence: 0.3,
        basedOnExecutions: pattern.executionCount,
        parallelGroupSize: 1,
        reasoning: `Only ${pattern.executionCount} executions recorded, using conservative default`,
      };
    }

    if (pattern.successRate < 0.5 && pattern.executionCount > 5) {
      // Low success rate - need to investigate
      return {
        taskType,
        recommendedAgents: pattern.bestAgentCombination.length > 0 
          ? pattern.bestAgentCombination 
          : ['MainAgent', 'MemoryAgent'],
        estimatedDuration: pattern.avgDuration * 1.5, // Add buffer
        confidence: pattern.successRate,
        basedOnExecutions: pattern.executionCount,
        parallelGroupSize: this.calculateOptimalParallelGroup(pattern),
        reasoning: `Low success rate (${(pattern.successRate * 100).toFixed(0)}%), adding buffer time. Best combo: ${pattern.bestAgentCombination.join(', ') || 'unknown'}`,
      };
    }

    return {
      taskType,
      recommendedAgents: pattern.bestAgentCombination,
      estimatedDuration: pattern.avgDuration,
      confidence: Math.min(pattern.successRate, 0.95), // Cap at 95%
      basedOnExecutions: pattern.executionCount,
      parallelGroupSize: this.calculateOptimalParallelGroup(pattern),
      reasoning: `Based on ${pattern.executionCount} executions, ${(pattern.successRate * 100).toFixed(0)}% success rate. Trend: ${pattern.trend}`,
    };
  }

  /**
   * Calculate optimal parallel group size based on task complexity
   */
  private calculateOptimalParallelGroup(pattern: { avgSubTasks: number; successRate: number }): number {
    if (pattern.avgSubTasks <= 1) return 1;
    if (pattern.avgSubTasks <= 3) return Math.min(2, Math.ceil(pattern.avgSubTasks / 2));
    if (pattern.avgSubTasks <= 5) return 3;
    return Math.min(4, Math.ceil(pattern.avgSubTasks / 2));
  }

  /**
   * Get all recommendations for all known task types
   */
  getAllRecommendations(): StrategyRecommendation[] {
    const patterns = this.analyzer.getAllPatterns();
    return patterns
      .map(p => this.recommend(p.taskType))
      .filter((r): r is StrategyRecommendation => r !== null);
  }

  /**
   * Evaluate if current strategy is working well
   */
  evaluateStrategy(taskType: string): { isGood: boolean; reason: string } {
    const pattern = this.analyzer.analyzeTaskType(taskType);
    if (!pattern) return { isGood: true, reason: 'No historical data' };

    if (pattern.successRate >= 0.9) return { isGood: true, reason: `High success rate: ${(pattern.successRate * 100).toFixed(0)}%` };
    if (pattern.successRate >= 0.7) return { isGood: true, reason: `Acceptable success rate: ${(pattern.successRate * 100).toFixed(0)}%` };
    if (pattern.trend === 'improving') return { isGood: true, reason: `Improving trend (${pattern.trend})` };

    return {
      isGood: false,
      reason: `Success rate ${(pattern.successRate * 100).toFixed(0)}% is below threshold, trend: ${pattern.trend}`,
    };
  }

  /**
   * Suggest improvements for a task type
   */
  suggestImprovements(taskType: string): string[] {
    const pattern = this.analyzer.analyzeTaskType(taskType);
    const suggestions: string[] = [];

    if (!pattern) {
      suggestions.push('Collect more execution data before making recommendations');
      return suggestions;
    }

    if (pattern.successRate < 0.8) {
      suggestions.push('Consider adding MemoryAgent for context retrieval');
    }
    if (pattern.avgDuration > 10000) {
      suggestions.push('Task duration is high - consider breaking into smaller subtasks');
    }
    if (pattern.trend === 'degrading') {
      suggestions.push('Performance is degrading - investigate recent failures');
    }
    if (pattern.bestAgentCombination.length > 3) {
      suggestions.push('Too many agents assigned - simplify agent combination');
    }

    if (suggestions.length === 0) {
      suggestions.push('Current strategy is performing well');
    }

    return suggestions;
  }
}
