/**
 * V153: StrategyOptimizer - Behavior Optimization Engine
 * 
 * Generates optimization strategies based on detected patterns.
 * Supports speed, empathy, and memory optimization types.
 * Integrates with HookSystem (V149) and KnowledgeGraph (V148).
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, generateChangeId, now } from '../db/index';
import { addChangeLogEntry } from '../db/syncLog';
import { hookManager } from '../core/hooks/HookManager';
import { getKnowledgeGraphStore } from '../services/knowledge/KnowledgeGraphStore';
import type { OptimizationStrategy, CreateStrategyInput, StrategyOptimizationResult } from './types';
import type { InteractionPattern } from './types';

// Strategy storage table name
const STRATEGIES_TABLE = 'evolution_strategies';

/**
 * Strategy optimization types
 */
export type StrategyType = 'speed' | 'empathy' | 'memory';

/**
 * StrategyOptimizer generates and manages optimization strategies
 */
export class StrategyOptimizer {
  private db: Database | null;
  private strategies: Map<string, OptimizationStrategy> = new Map();

  constructor() {
    this.db = getDatabase();
    this.initTable();
  }

  /**
   * Initialize the strategies table
   */
  private initTable(): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    SQL`
      CREATE TABLE IF NOT EXISTS evolution_strategies (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        target_metric TEXT NOT NULL,
        expected_improvement REAL NOT NULL,
        implemented INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `;
    SQL`CREATE INDEX IF NOT EXISTS idx_strategies_type ON evolution_strategies(type)`;
    SQL`CREATE INDEX IF NOT EXISTS idx_strategies_implemented ON evolution_strategies(implemented)`;
  }

  /**
   * Create a new optimization strategy
   */
  createStrategy(input: CreateStrategyInput): OptimizationStrategy | null {
    const db = this.db;
    if (!db) return null;

    const id = crypto.randomUUID();
    const ts = now();
    const strategy: OptimizationStrategy = {
      id,
      type: input.type,
      target_metric: input.target_metric,
      expected_improvement: input.expected_improvement,
      implemented: false,
    };

    const SQL = db.getSQL();
    SQL`
      INSERT INTO evolution_strategies (id, type, target_metric, expected_improvement, implemented, created_at)
      VALUES (${strategy.id}, ${strategy.type}, ${strategy.target_metric}, ${strategy.expected_improvement}, 0, ${ts})
    `;

    addChangeLogEntry('evolution_strategies', id, 'INSERT', strategy);
    this.strategies.set(id, strategy);

    // Trigger hook for strategy generation
    hookManager.trigger('onStrategyGenerated', {
      data: strategy,
    }).catch(console.error);

    return strategy;
  }

  /**
   * Get a strategy by id
   */
  getStrategy(id: string): OptimizationStrategy | null {
    const db = this.db;
    if (!db) return null;

    if (this.strategies.has(id)) {
      return this.strategies.get(id)!;
    }

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_strategies WHERE id = ${id}`;
      const rows = stmt.toArray() as OptimizationStrategy[];
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get all strategies
   */
  getAllStrategies(): OptimizationStrategy[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_strategies ORDER BY expected_improvement DESC`;
      return stmt.toArray() as OptimizationStrategy[];
    } catch {
      return [];
    }
  }

  /**
   * Get strategies by type
   */
  getStrategiesByType(type: StrategyType): OptimizationStrategy[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_strategies WHERE type = ${type} ORDER BY expected_improvement DESC`;
      return stmt.toArray() as OptimizationStrategy[];
    } catch {
      return [];
    }
  }

  /**
   * Get unimplemented strategies
   */
  getPendingStrategies(): OptimizationStrategy[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_strategies WHERE implemented = 0 ORDER BY expected_improvement DESC`;
      return stmt.toArray() as OptimizationStrategy[];
    } catch {
      return [];
    }
  }

  /**
   * Mark a strategy as implemented
   */
  markImplemented(id: string): OptimizationStrategy | null {
    const db = this.db;
    if (!db) return null;

    const existing = this.getStrategy(id);
    if (!existing) return null;

    const SQL = db.getSQL();
    SQL`UPDATE evolution_strategies SET implemented = 1 WHERE id = ${id}`;
    addChangeLogEntry('evolution_strategies', id, 'UPDATE', { implemented: true });

    const updated: OptimizationStrategy = { ...existing, implemented: true };
    this.strategies.set(id, updated);
    return updated;
  }

  /**
   * Delete a strategy
   */
  deleteStrategy(id: string): boolean {
    const db = this.db;
    if (!db) return false;

    const SQL = db.getSQL();
    SQL`DELETE FROM evolution_strategies WHERE id = ${id}`;
    addChangeLogEntry('evolution_strategies', id, 'DELETE', { id });
    this.strategies.delete(id);
    return true;
  }

  /**
   * Generate optimization strategies from detected patterns
   * Groups patterns by type and creates targeted strategies
   */
  generateFromPatterns(patterns: InteractionPattern[]): StrategyOptimizationResult {
    const strategies: OptimizationStrategy[] = [];
    const appliedCount: number[] = [];

    // Group patterns by type
    const patternsByType = new Map<string, InteractionPattern[]>();
    for (const pattern of patterns) {
      if (!patternsByType.has(pattern.type)) {
        patternsByType.set(pattern.type, []);
      }
      patternsByType.get(pattern.type)!.push(pattern);
    }

    // Generate speed strategies for high-frequency patterns
    const temporalPatterns = patternsByType.get('temporal') || [];
    for (const pattern of temporalPatterns) {
      if (pattern.confidence >= 0.7 && pattern.frequency >= 5) {
        const strategy = this.createStrategy({
          type: 'speed',
          target_metric: 'response_time',
          expected_improvement: pattern.confidence * 0.2, // Up to 20% improvement
        });
        if (strategy) {
          strategies.push(strategy);
          appliedCount.push(0);
        }
      }
    }

    // Generate empathy strategies for preference patterns
    const preferencePatterns = patternsByType.get('preference') || [];
    for (const pattern of preferencePatterns) {
      if (pattern.confidence >= 0.6) {
        const strategy = this.createStrategy({
          type: 'empathy',
          target_metric: 'user_satisfaction',
          expected_improvement: pattern.confidence * 0.15, // Up to 15% improvement
        });
        if (strategy) {
          strategies.push(strategy);
          appliedCount.push(0);
        }
      }
    }

    // Generate memory strategies for causal patterns
    const causalPatterns = patternsByType.get('causal') || [];
    for (const pattern of causalPatterns) {
      if (pattern.confidence >= 0.5 && pattern.frequency >= 3) {
        const strategy = this.createStrategy({
          type: 'memory',
          target_metric: 'memory_hit_rate',
          expected_improvement: pattern.confidence * 0.25, // Up to 25% improvement
        });
        if (strategy) {
          strategies.push(strategy);
          appliedCount.push(0);
        }
      }
    }

    return {
      strategies,
      applied_count: appliedCount.filter(Boolean).length,
    };
  }

  /**
   * Generate speed optimization strategy
   * Targets response time improvements based on temporal patterns
   */
  generateSpeedStrategy(temporalPatterns: InteractionPattern[]): OptimizationStrategy | null {
    if (temporalPatterns.length === 0) return null;

    const avgConfidence = temporalPatterns.reduce((sum, p) => sum + p.confidence, 0) / temporalPatterns.length;
    const totalFrequency = temporalPatterns.reduce((sum, p) => sum + p.frequency, 0);

    if (avgConfidence < 0.5) return null;

    return this.createStrategy({
      type: 'speed',
      target_metric: 'response_latency',
      expected_improvement: Math.min(0.3, avgConfidence * (totalFrequency / 100)),
    });
  }

  /**
   * Generate empathy optimization strategy
   * Targets user satisfaction improvements based on preference patterns
   */
  generateEmpathyStrategy(preferencePatterns: InteractionPattern[]): OptimizationStrategy | null {
    if (preferencePatterns.length === 0) return null;

    const avgConfidence = preferencePatterns.reduce((sum, p) => sum + p.confidence, 0) / preferencePatterns.length;
    const dominantPreference = preferencePatterns.reduce((best, p) => 
      p.confidence > best.confidence ? p : best
    );

    return this.createStrategy({
      type: 'empathy',
      target_metric: 'emotional_resonance',
      expected_improvement: avgConfidence * 0.2,
    });
  }

  /**
   * Generate memory optimization strategy
   * Targets memory hit rate improvements based on causal patterns
   */
  generateMemoryStrategy(causalPatterns: InteractionPattern[]): OptimizationStrategy | null {
    if (causalPatterns.length === 0) return null;

    const avgConfidence = causalPatterns.reduce((sum, p) => sum + p.confidence, 0) / causalPatterns.length;

    return this.createStrategy({
      type: 'memory',
      target_metric: 'context_relevance',
      expected_improvement: avgConfidence * 0.25,
    });
  }

  /**
   * Optimize based on pattern analysis results
   */
  optimize(analysisResults: {
    patterns: InteractionPattern[];
    total_interactions: number;
  }): StrategyOptimizationResult {
    const strategies = this.generateFromPatterns(analysisResults.patterns);

    // Store strategies in knowledge graph for future reference
    const kgStore = getKnowledgeGraphStore();
    for (const strategy of strategies.strategies) {
      const entityId = `strategy_${strategy.id}`;
      kgStore.createEntity({
        id: entityId,
        type: 'optimization_strategy',
        name: `${strategy.type}_strategy`,
        properties: {
          target_metric: strategy.target_metric,
          expected_improvement: strategy.expected_improvement,
          implemented: strategy.implemented,
        },
      });
    }

    return strategies;
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    implemented: number;
    pending: number;
    avgImprovement: number;
  } {
    const strategies = this.getAllStrategies();
    const byType: Record<string, number> = {};
    let implemented = 0;
    let totalImprovement = 0;

    for (const s of strategies) {
      byType[s.type] = (byType[s.type] ?? 0) + 1;
      if (s.implemented) implemented++;
      totalImprovement += s.expected_improvement;
    }

    return {
      total: strategies.length,
      byType,
      implemented,
      pending: strategies.length - implemented,
      avgImprovement: strategies.length > 0 ? totalImprovement / strategies.length : 0,
    };
  }
}

// Singleton instance
let strategyOptimizerInstance: StrategyOptimizer | null = null;

export function getStrategyOptimizer(): StrategyOptimizer {
  if (!strategyOptimizerInstance) {
    strategyOptimizerInstance = new StrategyOptimizer();
  }
  return strategyOptimizerInstance;
}

export default StrategyOptimizer;