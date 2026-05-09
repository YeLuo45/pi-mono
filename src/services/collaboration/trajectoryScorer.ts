/**
 * Trajectory Scorer - V33 Multi-Agent Collaboration System
 * 
 * Evaluates and scores execution trajectories to assess decision quality,
 * path efficiency, and outcome quality for continuous improvement.
 */

import type { Subtask, SubtaskResult, PersonaRole } from './types';

// ============================================================================
// Trajectory Types
// ============================================================================

export interface TrajectoryStep {
  stepIndex: number;
  subtaskId: string;
  action: string;
  state: Record<string, unknown>;
  duration: number;        // Time spent on this step in ms
  confidence: number;      // Confidence of the step outcome 0-1
  result?: unknown;
  error?: string;
}

export interface Trajectory {
  id: string;
  taskId: string;
  userRequest: string;
  steps: TrajectoryStep[];
  totalDuration: number;
  completedAt: number;
  success: boolean;
  finalResult?: unknown;
  error?: string;
}

export interface TrajectoryScore {
  trajectoryId: string;
  overallScore: number;          // 0-100
  efficiencyScore: number;       // 0-100 Time/resource efficiency
  qualityScore: number;          // 0-100 Output quality
  coherenceScore: number;        // 0-100 Decision coherence
  adaptabilityScore: number;     // 0-100 Adaptability to failures
  personaContributionScores: Map<PersonaRole, number>;
  breakdown: ScoreBreakdown;
  recommendations: string[];
  timestamp: number;
}

export interface ScoreBreakdown {
  optimalPathLength: number;
  actualPathLength: number;
  redundantSteps: number;
  failedSteps: number;
  retryCount: number;
  avgStepConfidence: number;
  parallelizationGain: number;   // Time saved by parallel execution
}

export interface ScoringWeights {
  efficiency: number;      // Default: 0.25
  quality: number;         // Default: 0.30
  coherence: number;       // Default: 0.20
  adaptability: number;    // Default: 0.25
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  efficiency: 0.25,
  quality: 0.30,
  coherence: 0.20,
  adaptability: 0.25,
};

// ============================================================================
// Trajectory Score thresholds
// ============================================================================

const SCORE_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  FAIR: 50,
  POOR: 30,
};

// ============================================================================
// Trajectory Scorer Implementation
// ============================================================================

export class TrajectoryScorer {
  private weights: ScoringWeights;
  private historicalScores: Map<string, TrajectoryScore>;

  constructor(weights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_SCORING_WEIGHTS, ...weights };
    this.historicalScores = new Map();
  }

  /**
   * Score a completed trajectory
   */
  async score(trajectory: Trajectory): Promise<TrajectoryScore> {
    const breakdown = this.calculateBreakdown(trajectory);
    
    const efficiencyScore = this.calculateEfficiencyScore(breakdown);
    const qualityScore = this.calculateQualityScore(trajectory, breakdown);
    const coherenceScore = this.calculateCoherenceScore(trajectory);
    const adaptabilityScore = this.calculateAdaptabilityScore(breakdown);
    
    const personaScores = this.calculatePersonaScores(trajectory);
    
    const overallScore = Math.round(
      efficiencyScore * this.weights.efficiency +
      qualityScore * this.weights.quality +
      coherenceScore * this.weights.coherence +
      adaptabilityScore * this.weights.adaptability
    );

    const score: TrajectoryScore = {
      trajectoryId: trajectory.id,
      overallScore,
      efficiencyScore: Math.round(efficiencyScore),
      qualityScore: Math.round(qualityScore),
      coherenceScore: Math.round(coherenceScore),
      adaptabilityScore: Math.round(adaptabilityScore),
      personaContributionScores: personaScores,
      breakdown,
      recommendations: this.generateRecommendations(breakdown, overallScore),
      timestamp: Date.now(),
    };

    this.historicalScores.set(trajectory.id, score);
    return score;
  }

  /**
   * Calculate breakdown metrics from trajectory
   */
  private calculateBreakdown(trajectory: Trajectory): ScoreBreakdown {
    const steps = trajectory.steps;
    const optimalPathLength = this.estimateOptimalPathLength(trajectory);
    const actualPathLength = steps.length;
    
    let redundantSteps = 0;
    let failedSteps = 0;
    let retryCount = 0;
    let totalConfidence = 0;
    
    const seenActions = new Set<string>();
    
    for (const step of steps) {
      if (step.error) {
        failedSteps++;
      }
      
      if (seenActions.has(step.action)) {
        redundantSteps++;
      } else {
        seenActions.add(step.action);
      }
      
      if (step.result && typeof step.result === 'object' && 
          (step.result as Record<string, unknown>).retryCount !== undefined) {
        retryCount += (step.result as Record<string, unknown>).retryCount as number;
      }
      
      totalConfidence += step.confidence;
    }
    
    // Calculate parallelization gain (estimate)
    const sequentialTime = steps.reduce((sum, s) => sum + s.duration, 0);
    const parallelizationGain = Math.max(0, sequentialTime - trajectory.totalDuration);
    
    return {
      optimalPathLength,
      actualPathLength,
      redundantSteps,
      failedSteps,
      retryCount,
      avgStepConfidence: steps.length > 0 ? totalConfidence / steps.length : 0,
      parallelizationGain,
    };
  }

  /**
   * Estimate optimal path length based on task type
   */
  private estimateOptimalPathLength(trajectory: Trajectory): number {
    const request = trajectory.userRequest.toLowerCase();
    
    if (request.includes('分析') || request.includes('emotion') || request.includes('情绪')) {
      return 3; // emotion_analysis workflow
    }
    if (request.includes('记忆') || request.includes('memory')) {
      return 2; // memory retrieval workflow
    }
    if (request.includes('建议') || request.includes('advice')) {
      return 3; // advice generation workflow
    }
    
    return Math.ceil(trajectory.steps.length * 0.6); // Generally 60% of actual
  }

  /**
   * Calculate efficiency score based on path length and time
   */
  private calculateEfficiencyScore(breakdown: ScoreBreakdown): number {
    const { optimalPathLength, actualPathLength, redundantSteps } = breakdown;
    
    // Path efficiency: credit for staying close to optimal
    const pathEfficiency = optimalPathLength > 0 
      ? Math.min(100, (optimalPathLength / actualPathLength) * 100)
      : 100;
    
    // Penalty for redundant steps
    const redundancyPenalty = Math.min(30, redundantSteps * 10);
    
    // Time efficiency (assuming optimal would be ~3s per step)
    const optimalTime = optimalPathLength * 3000;
    const timeEfficiency = optimalTime > 0
      ? Math.min(100, (optimalTime / (optimalTime + breakdown.parallelizationGain + 1000)) * 100)
      : 100;
    
    return pathEfficiency * 0.6 + timeEfficiency * 0.4 - redundancyPenalty;
  }

  /**
   * Calculate quality score based on confidence and success
   */
  private calculateQualityScore(trajectory: Trajectory, breakdown: ScoreBreakdown): number {
    const { avgStepConfidence, failedSteps } = breakdown;
    
    // Base on average confidence
    let quality = avgStepConfidence * 100;
    
    // Penalty for failed steps
    const failurePenalty = (failedSteps / Math.max(1, trajectory.steps.length)) * 40;
    quality -= failurePenalty;
    
    // Bonus for successful completion
    if (trajectory.success) {
      quality = Math.min(100, quality + 10);
    }
    
    // Check result quality if available
    if (trajectory.finalResult) {
      const resultQuality = this.assessResultQuality(trajectory.finalResult);
      quality = quality * 0.7 + resultQuality * 0.3;
    }
    
    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Assess the quality of a final result
   */
  private assessResultQuality(result: unknown): number {
    if (!result) return 0;
    
    // If result has a confidence field, use it
    if (typeof result === 'object' && result !== null) {
      const record = result as Record<string, unknown>;
      if (typeof record.confidence === 'number') {
        return record.confidence * 100;
      }
      if (typeof record.quality === 'number') {
        return record.quality * 100;
      }
      if (Array.isArray(record.entities) && record.entities.length > 0) {
        return 70; // Good structured output
      }
      if (typeof record.summary === 'string' && record.summary.length > 50) {
        return 75; // Good text output
      }
    }
    
    return 60; // Default decent quality
  }

  /**
   * Calculate coherence score based on decision logic flow
   */
  private calculateCoherenceScore(trajectory: Trajectory): number {
    const steps = trajectory.steps;
    if (steps.length <= 1) return 100;
    
    let coherentTransitions = 0;
    let totalTransitions = steps.length - 1;
    
    for (let i = 1; i < steps.length; i++) {
      const prevStep = steps[i - 1];
      const currStep = steps[i];
      
      // Check if current step logically follows from previous
      if (this.isLogicalTransition(prevStep, currStep)) {
        coherentTransitions++;
      }
    }
    
    // Coherence based on logical transitions
    const transitionScore = totalTransitions > 0
      ? (coherentTransitions / totalTransitions) * 100
      : 100;
    
    // Check for dependency violations
    const dependencyViolations = this.countDependencyViolations(steps);
    const violationPenalty = Math.min(30, dependencyViolations * 15);
    
    return Math.max(0, transitionScore - violationPenalty);
  }

  /**
   * Check if a transition between steps is logical
   */
  private isLogicalTransition(prevStep: TrajectoryStep, currStep: TrajectoryStep): boolean {
    const prevAction = prevStep.action.toLowerCase();
    const currAction = currStep.action.toLowerCase();
    
    // Memory retrieval should come before analysis
    if (currAction.includes('analysis') || currAction.includes('分析')) {
      if (prevAction.includes('memory') || prevAction.includes('记忆')) {
        return true;
      }
    }
    
    // Research should come before advice
    if (currAction.includes('advice') || currAction.includes('建议')) {
      if (prevAction.includes('search') || prevAction.includes('研究') || 
          prevAction.includes('memory') || prevAction.includes('记忆')) {
        return true;
      }
    }
    
    // Steps of same type are acceptable sequentially
    if (prevAction.split('_')[0] === currAction.split('_')[0]) {
      return true;
    }
    
    // Default: assume coherent if we can't determine otherwise
    return true;
  }

  /**
   * Count dependency violations in the trajectory
   */
  private countDependencyViolations(steps: TrajectoryStep[]): number {
    // Simplified check: assume no violations if steps completed without errors
    return steps.filter(s => s.error).length;
  }

  /**
   * Calculate adaptability score based on failure recovery
   */
  private calculateAdaptabilityScore(breakdown: ScoreBreakdown): number {
    const { failedSteps, retryCount } = breakdown;
    
    // Base score
    let adaptability = 100;
    
    // Penalty for failures
    adaptability -= failedSteps * 15;
    
    // Bonus for retries (showing recovery attempt)
    adaptability += Math.min(20, retryCount * 5);
    
    // If no failures, bonus
    if (failedSteps === 0) {
      adaptability = Math.min(100, adaptability + 10);
    }
    
    return Math.max(0, Math.min(100, adaptability));
  }

  /**
   * Calculate contribution scores for each persona role
   */
  private calculatePersonaScores(trajectory: Trajectory): Map<PersonaRole, number> {
    const scores = new Map<PersonaRole, number>();
    const roleSteps = new Map<PersonaRole, TrajectoryStep[]>();
    
    // Group steps by role (derived from action naming convention)
    for (const step of trajectory.steps) {
      const role = this.inferRoleFromAction(step.action);
      if (!roleSteps.has(role)) {
        roleSteps.set(role, []);
      }
      roleSteps.get(role)!.push(step);
    }
    
    // Calculate score for each role
    for (const [role, steps] of roleSteps) {
      const totalConfidence = steps.reduce((sum, s) => sum + s.confidence, 0);
      const avgConfidence = steps.length > 0 ? totalConfidence / steps.length : 0;
      const hasFailure = steps.some(s => s.error);
      
      let score = avgConfidence * 100;
      if (hasFailure) score -= 20;
      
      scores.set(role, Math.round(Math.max(0, Math.min(100, score))));
    }
    
    return scores;
  }

  /**
   * Infer persona role from action name
   */
  private inferRoleFromAction(action: string): PersonaRole {
    const lower = action.toLowerCase();
    
    if (lower.includes('memory')) return 'MemoryExpert';
    if (lower.includes('emotion') || lower.includes('分析')) return 'EmotionAnalyst';
    if (lower.includes('advice') || lower.includes('建议')) return 'Advisor';
    if (lower.includes('search') || lower.includes('研究')) return 'Researcher';
    if (lower.includes('code') || lower.includes('执行')) return 'Coder';
    
    return 'Advisor'; // Default
  }

  /**
   * Generate recommendations based on score and breakdown
   */
  private generateRecommendations(breakdown: ScoreBreakdown, overallScore: number): string[] {
    const recommendations: string[] = [];
    
    if (overallScore >= SCORE_THRESHOLDS.EXCELLENT) {
      recommendations.push('轨迹表现优秀，继续保持当前策略');
      return recommendations;
    }
    
    if (breakdown.redundantSteps > 0) {
      recommendations.push(`发现${breakdown.redundantSteps}个冗余步骤，考虑优化任务分解减少重复`);
    }
    
    if (breakdown.failedSteps > 0) {
      recommendations.push(`存在${breakdown.failedSteps}个失败步骤，建议分析失败原因并添加错误处理`);
    }
    
    if (breakdown.actualPathLength > breakdown.optimalPathLength * 1.5) {
      recommendations.push('路径长度远超最优值，建议重新设计任务分解策略');
    }
    
    if (breakdown.avgStepConfidence < 0.6) {
      recommendations.push('平均置信度偏低，建议提高检索质量或增加验证步骤');
    }
    
    if (breakdown.retryCount > 3) {
      recommendations.push('重试次数过多，建议添加前置条件检查减少失败可能');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('整体表现可接受，可针对具体短板进行优化');
    }
    
    return recommendations;
  }

  /**
   * Compare two trajectories and return comparison result
   */
  compare(trajectoryA: Trajectory, trajectoryB: Trajectory): {
    winner: 'A' | 'B' | 'tie';
    scoreDiff: number;
    dimensionDiffs: {
      efficiency: number;
      quality: number;
      coherence: number;
      adaptability: number;
    };
  } {
    const scoreA = this.historicalScores.get(trajectoryA.id) 
      || { efficiencyScore: 70, qualityScore: 70, coherenceScore: 70, adaptabilityScore: 70, overallScore: 70 };
    const scoreB = this.historicalScores.get(trajectoryB.id)
      || { efficiencyScore: 70, qualityScore: 70, coherenceScore: 70, adaptabilityScore: 70, overallScore: 70 };
    
    const efficiencyDiff = scoreA.efficiencyScore - scoreB.efficiencyScore;
    const qualityDiff = scoreA.qualityScore - scoreB.qualityScore;
    const coherenceDiff = scoreA.coherenceScore - scoreB.coherenceScore;
    const adaptabilityDiff = scoreA.adaptabilityScore - scoreB.adaptabilityScore;
    const totalDiff = scoreA.overallScore - scoreB.overallScore;
    
    let winner: 'A' | 'B' | 'tie';
    if (totalDiff > 5) winner = 'A';
    else if (totalDiff < -5) winner = 'B';
    else winner = 'tie';
    
    return {
      winner,
      scoreDiff: Math.round(totalDiff),
      dimensionDiffs: {
        efficiency: Math.round(efficiencyDiff),
        quality: Math.round(qualityDiff),
        coherence: Math.round(coherenceDiff),
        adaptability: Math.round(adaptabilityDiff),
      },
    };
  }

  /**
   * Get historical scores for a persona role
   */
  getRoleHistoricalScores(role: PersonaRole): number[] {
    const scores: number[] = [];
    
    for (const score of this.historicalScores.values()) {
      const roleScore = score.personaContributionScores.get(role);
      if (roleScore !== undefined) {
        scores.push(roleScore);
      }
    }
    
    return scores;
  }

  /**
   * Get average score across all trajectories
   */
  getAverageScore(): number {
    if (this.historicalScores.size === 0) return 0;
    
    let total = 0;
    for (const score of this.historicalScores.values()) {
      total += score.overallScore;
    }
    
    return Math.round(total / this.historicalScores.size);
  }

  /**
   * Update scoring weights
   */
  updateWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Clear historical scores
   */
  clearHistory(): void {
    this.historicalScores.clear();
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTrajectoryScorer(weights?: Partial<ScoringWeights>): TrajectoryScorer {
  return new TrajectoryScorer(weights);
}
