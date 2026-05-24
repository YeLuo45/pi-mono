/**
 * V153: EvolutionEngine - Unified Self-Evolution Coordinator
 * 
 * Orchestrates PatternAnalyzer, StrategyOptimizer, and SkillCrystallizer
 * to enable continuous self-improvement based on user interactions.
 */

import { getPatternAnalyzer, type PatternAnalyzer } from './PatternAnalyzer';
import { getStrategyOptimizer, type StrategyOptimizer } from './StrategyOptimizer';
import { getSkillCrystallizer, type SkillCrystallizer } from './SkillCrystallizer';
import type { InteractionPattern, OptimizationStrategy, CrystallizedSkill, PatternAnalysisResult, StrategyOptimizationResult, SkillCrystallizationResult } from './types';
import { hookManager } from '../core/hooks/HookManager';
import { getDreamMemoryStore } from '../memory/DreamMemoryStore';
import { skillHealthChecker, type HealthStatus } from './SkillHealthChecker';
import { EvolutionTimeoutController } from './EvolutionTimeoutController';
import { CircuitBreaker } from './CircuitBreaker';

/**
 * EvolutionEngine configuration
 */
export interface EvolutionConfig {
  /** Minimum pattern confidence to consider (0-1) */
  minPatternConfidence: number;
  /** Minimum pattern frequency to be significant */
  minPatternFrequency: number;
  /** Minimum confidence for pattern to become a skill */
  minCrystallizationConfidence: number;
  /** Minimum frequency for pattern to become a skill */
  minCrystallizationFrequency: number;
  /** Whether to run analysis automatically after interactions */
  autoAnalyze: boolean;
  /** Batch size for analysis */
  analysisBatchSize: number;
}

/**
 * Evolution state snapshot
 */
export interface EvolutionState {
  patterns: InteractionPattern[];
  strategies: OptimizationStrategy[];
  skills: CrystallizedSkill[];
  lastAnalysis: number | null;
  totalEvolutions: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: EvolutionConfig = {
  minPatternConfidence: 0.6,
  minPatternFrequency: 3,
  minCrystallizationConfidence: 0.7,
  minCrystallizationFrequency: 5,
  autoAnalyze: true,
  analysisBatchSize: 100,
};

/**
 * EvolutionEngine - coordinates the self-evolution pipeline
 */
export class EvolutionEngine {
  private config: EvolutionConfig;
  private patternAnalyzer: PatternAnalyzer;
  private strategyOptimizer: StrategyOptimizer;
  private skillCrystallizer: SkillCrystallizer;
  private isRunning: boolean = false;
  private totalEvolutions: number = 0;
  private timeoutController: EvolutionTimeoutController;
  private circuitBreakers: Map<string, CircuitBreaker>;

  constructor(config: Partial<EvolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.patternAnalyzer = getPatternAnalyzer();
    this.strategyOptimizer = getStrategyOptimizer();
    this.skillCrystallizer = getSkillCrystallizer();
    this.timeoutController = new EvolutionTimeoutController();
    this.circuitBreakers = new Map();
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<EvolutionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): EvolutionConfig {
    return { ...this.config };
  }

  /**
   * Check if evolution engine is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Run full evolution cycle: analyze → optimize → crystallize
   */
  async evolve(): Promise<{
    analysis: PatternAnalysisResult;
    strategies: StrategyOptimizationResult;
    skills: SkillCrystallizationResult;
  }> {
    this.isRunning = true;
    this.totalEvolutions++;

    try {
      // Step 1: Analyze patterns from interaction history
      const analysis = await this.patternAnalyzer.analyzeHistory({
        limit: this.config.analysisBatchSize,
        minConfidence: this.config.minPatternConfidence,
      });

      // Step 2: Generate optimization strategies from patterns
      const strategies = this.strategyOptimizer.optimize({
        patterns: analysis.patterns,
        total_interactions: analysis.total_interactions,
      });

      // Step 3: Crystallize high-quality patterns into skills
      const skills = this.skillCrystallizer.crystallize(
        analysis.patterns,
        {
          minConfidence: this.config.minCrystallizationConfidence,
          minFrequency: this.config.minCrystallizationFrequency,
        }
      );

      // Also crystallize from strategies for more complete coverage
      this.skillCrystallizer.crystallizeFromStrategies(
        strategies.strategies,
        analysis.patterns
      );

      return { analysis, strategies, skills };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run analysis only (pattern detection)
   */
  async analyze(): Promise<PatternAnalysisResult> {
    return this.patternAnalyzer.analyzeHistory({
      limit: this.config.analysisBatchSize,
      minConfidence: this.config.minPatternConfidence,
    });
  }

  /**
   * Generate strategies from existing patterns
   */
  generateStrategies(patterns?: InteractionPattern[]): StrategyOptimizationResult {
    const patternsToUse = patterns || this.patternAnalyzer.getAllPatterns();
    return this.strategyOptimizer.generateFromPatterns(patternsToUse);
  }

  /**
   * Crystallize patterns into skills
   */
  crystallizeSkills(patterns?: InteractionPattern[]): SkillCrystallizationResult {
    const patternsToUse = patterns || this.patternAnalyzer.getAllPatterns();
    return this.skillCrystallizer.crystallize(patternsToUse, {
      minConfidence: this.config.minCrystallizationConfidence,
      minFrequency: this.config.minCrystallizationFrequency,
    });
  }

  /**
   * Get current evolution state
   */
  getState(): EvolutionState {
    return {
      patterns: this.patternAnalyzer.getAllPatterns(),
      strategies: this.strategyOptimizer.getAllStrategies(),
      skills: this.skillCrystallizer.getAllSkills(),
      lastAnalysis: null,
      totalEvolutions: this.totalEvolutions,
    };
  }

  /**
   * Get pattern statistics
   */
  getPatternStats() {
    return this.patternAnalyzer.getStats();
  }

  /**
   * Get strategy statistics
   */
  getStrategyStats() {
    return this.strategyOptimizer.getStats();
  }

  /**
   * Get skill statistics
   */
  getSkillStats() {
    return this.skillCrystallizer.getStats();
  }

  /**
   * Apply a pending strategy (marks as implemented)
   */
  applyStrategy(strategyId: string): OptimizationStrategy | null {
    return this.strategyOptimizer.markImplemented(strategyId);
  }

  /**
   * Update a crystallized skill
   */
  updateSkill(skillId: string, updates: Partial<Pick<CrystallizedSkill, 'condition' | 'action' | 'expected_result'>>): CrystallizedSkill | null {
    return this.skillCrystallizer.updateSkill(skillId, updates);
  }

  /**
   * Delete a pattern
   */
  deletePattern(patternId: string): boolean {
    return this.patternAnalyzer.deletePattern(patternId);
  }

  /**
   * Delete a strategy
   */
  deleteStrategy(strategyId: string): boolean {
    return this.strategyOptimizer.deleteStrategy(strategyId);
  }

  /**
   * Delete a skill
   */
  deleteSkill(skillId: string): boolean {
    return this.skillCrystallizer.deleteSkill(skillId);
  }

  /**
   * Get a specific pattern
   */
  getPattern(patternId: string): InteractionPattern | null {
    return this.patternAnalyzer.getPattern(patternId);
  }

  /**
   * Get a specific strategy
   */
  getStrategy(strategyId: string): OptimizationStrategy | null {
    return this.strategyOptimizer.getStrategy(strategyId);
  }

  /**
   * Get a specific skill
   */
  getSkill(skillId: string): CrystallizedSkill | null {
    return this.skillCrystallizer.getSkill(skillId);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): InteractionPattern[] {
    return this.patternAnalyzer.getAllPatterns();
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): OptimizationStrategy[] {
    return this.strategyOptimizer.getAllStrategies();
  }

  /**
   * Get all skills
   */
  getAllSkills(): CrystallizedSkill[] {
    return this.skillCrystallizer.getAllSkills();
  }

  /**
   * Get pending (unimplemented) strategies
   */
  getPendingStrategies(): OptimizationStrategy[] {
    return this.strategyOptimizer.getPendingStrategies();
  }

  /**
   * Register evolution hooks
   */
  registerHooks(): void {
    // These hooks will be triggered by the sub-components
    // but we can also register listeners here for logging/monitoring
    hookManager.registerHook('onPatternDetected', async (context) => {
      console.log('[EvolutionEngine] Pattern detected:', context.data);
    });

    hookManager.registerHook('onStrategyGenerated', async (context) => {
      console.log('[EvolutionEngine] Strategy generated:', context.data);
    });

    hookManager.registerHook('onSkillCrystallized', async (context) => {
      console.log('[EvolutionEngine] Skill crystallized:', context.data);
    });
  }

  /**
   * Check skill health status
   */
  checkSkillHealth(skillId: string): HealthStatus {
    return skillHealthChecker.check(skillId);
  }

  /**
   * Check if a skill is available (healthy + circuit breaker allows execution)
   */
  isSkillAvailable(skillId: string): boolean {
    if (!skillHealthChecker.isHealthy(skillId)) {
      return false;
    }
    const breaker = this.circuitBreakers.get(skillId);
    if (breaker && !breaker.canExecute()) {
      return false;
    }
    return true;
  }

  /**
   * Get or create circuit breaker for a skill
   */
  getCircuitBreaker(skillId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(skillId)) {
      this.circuitBreakers.set(skillId, new CircuitBreaker());
    }
    return this.circuitBreakers.get(skillId)!;
  }
}

// Singleton instance
let evolutionEngineInstance: EvolutionEngine | null = null;

export function getEvolutionEngine(config?: Partial<EvolutionConfig>): EvolutionEngine {
  if (!evolutionEngineInstance) {
    evolutionEngineInstance = new EvolutionEngine(config);
    evolutionEngineInstance.registerHooks();
  }
  return evolutionEngineInstance;
}

export default EvolutionEngine;