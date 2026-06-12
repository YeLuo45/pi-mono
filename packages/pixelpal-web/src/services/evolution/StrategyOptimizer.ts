/**
 * V163: StrategyOptimizer - Agent Self-Evolution Engine
 * 
 * Manages decision points and dynamic strategy adjustments.
 * Records agent decision data, adjusts strategy weights based on outcomes,
 * and supports rollback to historical strategy versions.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, now } from '../../db/index';
import { addChangeLogEntry } from '../../db/syncLog';
import { hookManager } from '../../core/hooks/HookManager';

// Decision and strategy storage table names
const DECISIONS_TABLE = 'evolution_decisions';
const STRATEGIES_TABLE = 'evolution_strategies_v163';

/**
 * Decision point recorded during task execution
 */
export interface DecisionPoint {
  id: string;
  taskId: string;
  agentId: string;
  decisionType: string;
  context: Record<string, unknown>;
  outcome?: 'success' | 'failure' | 'pending';
  timestamp: number;
}

/**
 * A single strategy version with weights
 */
export interface StrategyVersion {
  version: number;
  weights: Record<string, number>;
  adjustments: StrategyAdjustment[];
  createdAt: number;
  createdBy: string;
}

/**
 * Strategy adjustment record
 */
export interface StrategyAdjustment {
  id: string;
  metric: string;
  previousValue: number;
  newValue: number;
  reason: string;
  timestamp: number;
}

/**
 * Current strategy state
 */
export interface Strategy {
  id: string;
  name: string;
  currentVersion: number;
  weights: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

/**
 * StrategyOptimizer manages decision tracking and strategy adjustments
 */
export class StrategyOptimizer {
  private db: Database | null;
  private decisions: Map<string, DecisionPoint> = new Map();
  private strategyHistory: StrategyVersion[] = [];
  private currentStrategy: Strategy | null = null;

  constructor() {
    this.db = getDatabase();
    this.initTables();
    this.loadCurrentStrategy();
  }

  /**
   * Initialize storage tables
   */
  private initTables(): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    
    // Decisions table
    SQL`
      CREATE TABLE IF NOT EXISTS evolution_decisions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        decision_type TEXT NOT NULL,
        context TEXT NOT NULL,
        outcome TEXT,
        timestamp INTEGER NOT NULL
      )
    `;
    SQL`CREATE INDEX IF NOT EXISTS idx_decisions_task ON evolution_decisions(task_id)`;
    SQL`CREATE INDEX IF NOT EXISTS idx_decisions_agent ON evolution_decisions(agent_id)`;

    // Strategy versions table
    SQL`
      CREATE TABLE IF NOT EXISTS evolution_strategies_v163 (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        current_version INTEGER NOT NULL DEFAULT 1,
        weights TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
  }

  /**
   * Load current strategy from database
   */
  private loadCurrentStrategy(): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    const stmt = SQL`SELECT * FROM evolution_strategies_v163 ORDER BY current_version DESC LIMIT 1`;
    const rows = stmt.toArray() as Array<{
      id: string;
      name: string;
      current_version: number;
      weights: string;
      created_at: number;
      updated_at: number;
    }>;

    if (rows.length > 0) {
      const row = rows[0];
      this.currentStrategy = {
        id: row.id,
        name: row.name,
        currentVersion: row.current_version,
        weights: typeof row.weights === 'string' ? JSON.parse(row.weights) : row.weights,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }

  /**
   * Record a decision point during task execution
   */
  recordDecision(
    taskId: string,
    agentId: string,
    decisionType: string,
    context: Record<string, unknown>
  ): DecisionPoint {
    const decision: DecisionPoint = {
      id: crypto.randomUUID(),
      taskId,
      agentId,
      decisionType,
      context,
      outcome: 'pending',
      timestamp: now(),
    };

    const db = this.db;
    if (db) {
      const SQL = db.getSQL();
      SQL`
        INSERT INTO evolution_decisions (id, task_id, agent_id, decision_type, context, outcome, timestamp)
        VALUES (${decision.id}, ${decision.taskId}, ${decision.agentId}, ${decision.decisionType}, 
                ${JSON.stringify(decision.context)}, ${decision.outcome}, ${decision.timestamp})
      `;
      addChangeLogEntry('evolution_decisions', decision.id, 'INSERT', decision);
    }

    this.decisions.set(decision.id, decision);
    return decision;
  }

  /**
   * Update decision outcome
   */
  updateDecisionOutcome(decisionId: string, outcome: 'success' | 'failure'): boolean {
    const decision = this.decisions.get(decisionId);
    if (!decision) return false;

    decision.outcome = outcome;
    
    const db = this.db;
    if (db) {
      const SQL = db.getSQL();
      SQL`UPDATE evolution_decisions SET outcome = ${outcome} WHERE id = ${decisionId}`;
      addChangeLogEntry('evolution_decisions', decisionId, 'UPDATE', { outcome });
    }

    return true;
  }

  /**
   * Adjust strategy based on decision outcomes
   */
  adjustStrategy(
    metric: string,
    newValue: number,
    reason: string,
    createdBy: string = 'system'
  ): StrategyVersion | null {
    if (!this.currentStrategy) {
      // Create initial strategy
      this.currentStrategy = {
        id: crypto.randomUUID(),
        name: 'default-strategy',
        currentVersion: 1,
        weights: { [metric]: newValue },
        createdAt: now(),
        updatedAt: now(),
      };
      
      const db = this.db;
      if (db) {
        const SQL = db.getSQL();
        SQL`
          INSERT INTO evolution_strategies_v163 (id, name, current_version, weights, created_at, updated_at)
          VALUES (${this.currentStrategy.id}, ${this.currentStrategy.name}, ${this.currentStrategy.currentVersion},
                  ${JSON.stringify(this.currentStrategy.weights)}, ${this.currentStrategy.createdAt}, ${this.currentStrategy.updatedAt})
        `;
        addChangeLogEntry('evolution_strategies_v163', this.currentStrategy.id, 'INSERT', this.currentStrategy);
      }
      
      return this.createStrategyVersion(this.currentStrategy, createdBy);
    }

    const previousValue = this.currentStrategy.weights[metric] ?? 0;
    this.currentStrategy.weights[metric] = newValue;
    this.currentStrategy.currentVersion++;
    this.currentStrategy.updatedAt = now();

    const adjustment: StrategyAdjustment = {
      id: crypto.randomUUID(),
      metric,
      previousValue,
      newValue,
      reason,
      timestamp: now(),
    };

    const db = this.db;
    if (db) {
      const SQL = db.getSQL();
      SQL`
        UPDATE evolution_strategies_v163 
        SET weights = ${JSON.stringify(this.currentStrategy.weights)}, 
            current_version = ${this.currentStrategy.currentVersion},
            updated_at = ${this.currentStrategy.updatedAt}
        WHERE id = ${this.currentStrategy.id}
      `;
      addChangeLogEntry('evolution_strategies_v163', this.currentStrategy.id, 'UPDATE', {
        metric,
        previousValue,
        newValue,
        reason,
      });
    }

    // Trigger hook for strategy adjustment
    hookManager.trigger('onStrategyAdjusted', {
      data: {
        metric,
        previousValue,
        newValue,
        reason,
      },
    }).catch(console.error);

    return this.createStrategyVersion(this.currentStrategy, createdBy, adjustment);
  }

  /**
   * Create a strategy version record
   */
  private createStrategyVersion(
    strategy: Strategy,
    createdBy: string,
    adjustment?: StrategyAdjustment
  ): StrategyVersion {
    const version: StrategyVersion = {
      version: strategy.currentVersion,
      weights: { ...strategy.weights },
      adjustments: adjustment ? [adjustment] : [],
      createdAt: now(),
      createdBy,
    };

    this.strategyHistory.push(version);
    return version;
  }

  /**
   * Get current strategy
   */
  getCurrentStrategy(): Strategy | null {
    return this.currentStrategy ? { ...this.currentStrategy } : null;
  }

  /**
   * Rollback to a specific strategy version
   */
  rollbackToVersion(version: number): boolean {
    if (!this.currentStrategy || version < 1 || version >= this.currentStrategy.currentVersion) {
      return false;
    }

    // Find the target version in history
    const targetVersion = this.strategyHistory.find(v => v.version === version);
    if (!targetVersion) {
      return false;
    }

    // Update current strategy with target version's weights
    this.currentStrategy.weights = { ...targetVersion.weights };
    this.currentStrategy.updatedAt = now();

    // Note: We don't change currentVersion when rolling back to preserve history
    
    const db = this.db;
    if (db) {
      const SQL = db.getSQL();
      SQL`
        UPDATE evolution_strategies_v163 
        SET weights = ${JSON.stringify(this.currentStrategy.weights)}, 
            updated_at = ${this.currentStrategy.updatedAt}
        WHERE id = ${this.currentStrategy.id}
      `;
      addChangeLogEntry('evolution_strategies_v163', this.currentStrategy.id, 'ROLLBACK', {
        toVersion: version,
        weights: this.currentStrategy.weights,
      });
    }

    // Trigger hook for rollback
    hookManager.trigger('onStrategyRollback', {
      data: {
        toVersion: version,
        weights: this.currentStrategy.weights,
      },
    }).catch(console.error);

    return true;
  }

  /**
   * Get complete strategy history
   */
  getStrategyHistory(): StrategyVersion[] {
    return [...this.strategyHistory];
  }

  /**
   * Get decision statistics
   */
  getDecisionStats(): {
    totalDecisions: number;
    successCount: number;
    failureCount: number;
    pendingCount: number;
  } {
    let successCount = 0;
    let failureCount = 0;
    let pendingCount = 0;

    for (const decision of this.decisions.values()) {
      switch (decision.outcome) {
        case 'success':
          successCount++;
          break;
        case 'failure':
          failureCount++;
          break;
        default:
          pendingCount++;
      }
    }

    return {
      totalDecisions: this.decisions.size,
      successCount,
      failureCount,
      pendingCount,
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