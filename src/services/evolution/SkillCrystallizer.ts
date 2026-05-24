/**
 * V163: SkillCrystallizer - Agent Self-Evolution Engine
 * 
 * Converts execution patterns into reusable skill fragments.
 * Analyzes execution data to identify high-confidence patterns (success rate > 80%)
 * and crystallizes them into storable, configurable skill fragments.
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, now } from '../../db/index';
import { addChangeLogEntry } from '../../db/syncLog';
import { hookManager } from '../../core/hooks/HookManager';

// Skill fragment storage table name
const FRAGMENTS_TABLE = 'evolution_skill_fragments';

/**
 * Execution data from task/agent execution
 */
export interface ExecutionData {
  id: string;
  taskId: string;
  agentId: string;
  executionTime: number;
  success: boolean;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Skill fragment - crystallized behavior pattern
 */
export interface SkillFragment {
  id: string;
  name: string;
  trigger: string;         // Trigger condition description
  pattern: object;          // Behavior pattern data
  successRate: number;      // Historical success rate (0-1)
  useCount: number;         // Number of times triggered
  createdAt: number;
}

/**
 * Analysis result from execution data
 */
export interface AnalysisResult {
  patterns: Array<{
    id: string;
    type: string;
    frequency: number;
    confidence: number;
    description: string;
  }>;
  totalExecutions: number;
  successfulExecutions: number;
  successRate: number;
}

/**
 * Crystallization result with fragments and recommendations
 */
export interface CrystallizationResult {
  fragments: SkillFragment[];
  recommendations: string[];
  confidence: number;
}

/**
 * SkillCrystallizer converts execution patterns into skill fragments
 */
export class SkillCrystallizer {
  private db: Database | null;
  private fragments: Map<string, SkillFragment> = new Map();

  constructor() {
    this.db = getDatabase();
    this.initTable();
  }

  /**
   * Initialize the skill fragments table
   */
  private initTable(): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    SQL`
      CREATE TABLE IF NOT EXISTS evolution_skill_fragments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger TEXT NOT NULL,
        pattern TEXT NOT NULL,
        success_rate REAL NOT NULL DEFAULT 0,
        use_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `;
    SQL`CREATE INDEX IF NOT EXISTS idx_fragments_trigger ON evolution_skill_fragments(trigger)`;
  }

  /**
   * Analyze execution data and identify patterns
   */
  analyzeExecutionData(executionData: ExecutionData[]): AnalysisResult {
    if (!executionData || executionData.length === 0) {
      return {
        patterns: [],
        totalExecutions: 0,
        successfulExecutions: 0,
        successRate: 0,
      };
    }

    // Group executions by agent and task pattern
    const agentExecutions = new Map<string, ExecutionData[]>();
    for (const exec of executionData) {
      const key = exec.agentId;
      if (!agentExecutions.has(key)) {
        agentExecutions.set(key, []);
      }
      agentExecutions.get(key)!.push(exec);
    }

    const patterns: AnalysisResult['patterns'] = [];
    let totalExecutions = executionData.length;
    let successfulExecutions = 0;

    for (const [agentId, execs] of agentExecutions) {
      const successes = execs.filter(e => e.success).length;
      const confidence = execs.length > 0 ? successes / execs.length : 0;
      const frequency = execs.length;
      
      if (successes > 0) successfulExecutions += successes;

      // Create pattern from metadata if available
      const metadata = execs[0]?.metadata || {};
      const actionType = String(metadata.action || 'unknown');

      patterns.push({
        id: `pattern-${agentId}-${actionType}`,
        type: actionType,
        frequency,
        confidence,
        description: `Agent ${agentId} executing ${actionType} with ${(confidence * 100).toFixed(0)}% success rate`,
      });
    }

    return {
      patterns,
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
    };
  }

  /**
   * Determine if a pattern should be crystallized
   */
  shouldCrystallize(pattern: { frequency: number; confidence: number }, options?: {
    minSuccessRate?: number;
    minFrequency?: number;
  }): boolean {
    const minSuccessRate = options?.minSuccessRate ?? 0.8;
    const minFrequency = options?.minFrequency ?? 5;

    return pattern.confidence >= minSuccessRate && pattern.frequency >= minFrequency;
  }

  /**
   * Create a skill fragment from pattern data
   */
  createFragment(
    pattern: { id: string; type: string; frequency: number; confidence: number; description: string },
    executionData: ExecutionData[]
  ): SkillFragment {
    return {
      id: crypto.randomUUID(),
      name: `SkillFragment-${pattern.type}-${Date.now()}`,
      trigger: pattern.description,
      pattern: {
        patternId: pattern.id,
        type: pattern.type,
        executions: executionData.map(e => ({
          taskId: e.taskId,
          success: e.success,
          executionTime: e.executionTime,
        })),
      },
      successRate: pattern.confidence,
      useCount: 0,
      createdAt: now(),
    };
  }

  /**
   * Store a skill fragment
   */
  storeFragment(fragment: SkillFragment): boolean {
    const db = this.db;
    if (!db) return false;

    // Check if fragment already exists
    if (this.fragments.has(fragment.id)) {
      // Update existing
      const SQL = db.getSQL();
      SQL`
        UPDATE evolution_skill_fragments
        SET name = ${fragment.name}, trigger = ${fragment.trigger}, 
            pattern = ${JSON.stringify(fragment.pattern)}, success_rate = ${fragment.successRate},
            use_count = ${fragment.useCount}
        WHERE id = ${fragment.id}
      `;
      addChangeLogEntry('evolution_skill_fragments', fragment.id, 'UPDATE', fragment);
    } else {
      // Insert new
      const SQL = db.getSQL();
      SQL`
        INSERT INTO evolution_skill_fragments (id, name, trigger, pattern, success_rate, use_count, created_at)
        VALUES (${fragment.id}, ${fragment.name}, ${fragment.trigger}, ${JSON.stringify(fragment.pattern)}, 
                ${fragment.successRate}, ${fragment.useCount}, ${fragment.createdAt})
      `;
      addChangeLogEntry('evolution_skill_fragments', fragment.id, 'INSERT', fragment);
    }

    this.fragments.set(fragment.id, fragment);

    // Trigger hook for skill crystallization
    hookManager.trigger('onSkillFragmentCrystallized', {
      data: fragment,
    }).catch(console.error);

    return true;
  }

  /**
   * Get all stored skill fragments
   */
  getFragments(filter?: { trigger?: string }): SkillFragment[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    
    if (filter?.trigger) {
      const stmt = SQL`SELECT * FROM evolution_skill_fragments WHERE trigger LIKE ${'%' + filter.trigger + '%'} ORDER BY created_at DESC`;
      const rows = stmt.toArray() as Array<{
        id: string;
        name: string;
        trigger: string;
        pattern: string;
        success_rate: number;
        use_count: number;
        created_at: number;
      }>;
      
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        trigger: row.trigger,
        pattern: typeof row.pattern === 'string' ? JSON.parse(row.pattern) : row.pattern,
        successRate: row.success_rate,
        useCount: row.use_count,
        createdAt: row.created_at,
      }));
    }

    const stmt = SQL`SELECT * FROM evolution_skill_fragments ORDER BY created_at DESC`;
    const rows = stmt.toArray() as Array<{
      id: string;
      name: string;
      trigger: string;
      pattern: string;
      success_rate: number;
      use_count: number;
      created_at: number;
    }>;

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      trigger: row.trigger,
      pattern: typeof row.pattern === 'string' ? JSON.parse(row.pattern) : row.pattern,
      successRate: row.success_rate,
      useCount: row.use_count,
      createdAt: row.created_at,
    }));
  }

  /**
   * Recommend next actions based on stored fragments
   */
  recommendNext(): string[] {
    const fragments = this.getFragments();
    if (fragments.length === 0) {
      return [];
    }

    // Sort by success rate and use count to prioritize
    const sorted = [...fragments].sort((a, b) => {
      const scoreA = a.successRate * 0.6 + Math.min(a.useCount / 10, 1) * 0.4;
      const scoreB = b.successRate * 0.6 + Math.min(b.useCount / 10, 1) * 0.4;
      return scoreB - scoreA;
    });

    const recommendations: string[] = [];
    
    // Recommend high-performing fragments for reuse
    for (const fragment of sorted.slice(0, 3)) {
      if (fragment.successRate >= 0.85) {
        recommendations.push(`Use "${fragment.name}" for similar tasks (${(fragment.successRate * 100).toFixed(0)}% success rate)`);
      }
    }

    // Recommend crystallizing more patterns if few fragments exist
    if (fragments.length < 3) {
      recommendations.push('Execute more tasks to enable pattern detection');
    }

    return recommendations;
  }

  /**
   * Increment use count for a fragment
   */
  incrementUseCount(fragmentId: string): void {
    const fragment = this.fragments.get(fragmentId);
    if (fragment) {
      fragment.useCount++;
      this.storeFragment(fragment);
    }
  }

  /**
   * Get crystallization statistics
   */
  getStats(): {
    totalFragments: number;
    avgSuccessRate: number;
    totalUses: number;
    highConfidenceCount: number;
  } {
    const fragments = this.getFragments();
    
    if (fragments.length === 0) {
      return {
        totalFragments: 0,
        avgSuccessRate: 0,
        totalUses: 0,
        highConfidenceCount: 0,
      };
    }

    const totalSuccessRate = fragments.reduce((sum, f) => sum + f.successRate, 0);
    const totalUses = fragments.reduce((sum, f) => sum + f.useCount, 0);
    const highConfidenceCount = fragments.filter(f => f.successRate >= 0.8).length;

    return {
      totalFragments: fragments.length,
      avgSuccessRate: totalSuccessRate / fragments.length,
      totalUses,
      highConfidenceCount,
    };
  }
}

// Singleton instance
let skillCrystallizerInstance: SkillCrystallizer | null = null;

export function getSkillCrystallizer(): SkillCrystallizer {
  if (!skillCrystallizerInstance) {
    skillCrystallizerInstance = new SkillCrystallizer();
  }
  return skillCrystallizerInstance;
}

export default SkillCrystallizer;