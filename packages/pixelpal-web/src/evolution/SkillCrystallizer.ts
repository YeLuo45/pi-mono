/**
 * V153: SkillCrystallizer - Pattern to Skill Rule Conversion
 * 
 * Converts high-frequency, high-confidence patterns into executable skill rules.
 * Stores crystallized skills in SQLite and integrates with KnowledgeGraph (V148).
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, generateChangeId, now } from '../db/index';
import { addChangeLogEntry } from '../db/syncLog';
import { hookManager } from '../core/hooks/HookManager';
import { getKnowledgeGraphStore } from '../services/knowledge/KnowledgeGraphStore';
import type { CrystallizedSkill, CreateCrystallizedSkillInput, SkillCrystallizationResult } from './types';
import type { InteractionPattern, OptimizationStrategy } from './types';

// Skill storage table name
const SKILLS_TABLE = 'evolution_skills';

/**
 * SkillCrystallizer converts patterns into executable skill rules
 */
export class SkillCrystallizer {
  private db: Database | null;
  private skills: Map<string, CrystallizedSkill> = new Map();

  constructor() {
    this.db = getDatabase();
    this.initTable();
  }

  /**
   * Initialize the skills table
   */
  private initTable(): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    SQL`
      CREATE TABLE IF NOT EXISTS evolution_skills (
        id TEXT PRIMARY KEY,
        condition TEXT NOT NULL,
        action TEXT NOT NULL,
        expected_result TEXT NOT NULL,
        pattern_ids TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL
      )
    `;
    SQL`CREATE INDEX IF NOT EXISTS idx_skills_version ON evolution_skills(version)`;
  }

  /**
   * Create a new crystallized skill from patterns
   */
  createSkill(input: CreateCrystallizedSkillInput): CrystallizedSkill | null {
    const db = this.db;
    if (!db) return null;

    const id = crypto.randomUUID();
    const ts = now();
    const skill: CrystallizedSkill = {
      id,
      condition: input.condition,
      action: input.action,
      expected_result: input.expected_result,
      pattern_ids: input.pattern_ids,
      version: 1,
      created_at: ts,
    };

    const SQL = db.getSQL();
    SQL`
      INSERT INTO evolution_skills (id, condition, action, expected_result, pattern_ids, version, created_at)
      VALUES (${skill.id}, ${skill.condition}, ${skill.action}, ${skill.expected_result}, ${JSON.stringify(skill.pattern_ids)}, ${skill.version}, ${ts})
    `;

    addChangeLogEntry('evolution_skills', id, 'INSERT', skill);
    this.skills.set(id, skill);

    // Trigger hook for skill crystallization
    hookManager.trigger('onSkillCrystallized', {
      data: skill,
    }).catch(console.error);

    return skill;
  }

  /**
   * Get a skill by id
   */
  getSkill(id: string): CrystallizedSkill | null {
    const db = this.db;
    if (!db) return null;

    if (this.skills.has(id)) {
      return this.skills.get(id)!;
    }

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_skills WHERE id = ${id}`;
      const rows = stmt.toArray() as CrystallizedSkill[];
      if (rows[0]) {
        // Parse pattern_ids JSON
        const skill = { ...rows[0] };
        if (typeof skill.pattern_ids === 'string') {
          skill.pattern_ids = JSON.parse(skill.pattern_ids);
        }
        return skill;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get all crystallized skills
   */
  getAllSkills(): CrystallizedSkill[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_skills ORDER BY created_at DESC`;
      const rows = stmt.toArray() as CrystallizedSkill[];
      return rows.map(row => {
        if (typeof row.pattern_ids === 'string') {
          return { ...row, pattern_ids: JSON.parse(row.pattern_ids) };
        }
        return row;
      });
    } catch {
      return [];
    }
  }

  /**
   * Get skills by version
   */
  getSkillsByVersion(version: number): CrystallizedSkill[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_skills WHERE version = ${version} ORDER BY created_at DESC`;
      return stmt.toArray() as CrystallizedSkill[];
    } catch {
      return [];
    }
  }

  /**
   * Update a skill (creates new version)
   */
  updateSkill(id: string, updates: Partial<Pick<CrystallizedSkill, 'condition' | 'action' | 'expected_result'>>): CrystallizedSkill | null {
    const db = this.db;
    if (!db) return null;

    const existing = this.getSkill(id);
    if (!existing) return null;

    const SQL = db.getSQL();
    const newVersion = existing.version + 1;
    const ts = now();

    const newData = {
      condition: updates.condition ?? existing.condition,
      action: updates.action ?? existing.action,
      expected_result: updates.expected_result ?? existing.expected_result,
      version: newVersion,
    };

    SQL`
      UPDATE evolution_skills
      SET condition = ${newData.condition}, action = ${newData.action}, 
          expected_result = ${newData.expected_result}, version = ${newVersion}
      WHERE id = ${id}
    `;

    addChangeLogEntry('evolution_skills', id, 'UPDATE', newData);

    const updated: CrystallizedSkill = {
      ...existing,
      ...newData,
      created_at: ts,
    };
    this.skills.set(id, updated);
    return updated;
  }

  /**
   * Delete a skill
   */
  deleteSkill(id: string): boolean {
    const db = this.db;
    if (!db) return null;

    const SQL = db.getSQL();
    SQL`DELETE FROM evolution_skills WHERE id = ${id}`;
    addChangeLogEntry('evolution_skills', id, 'DELETE', { id });
    this.skills.delete(id);
    return true;
  }

  /**
   * Crystallize patterns into skills
   * Only high-confidence, high-frequency patterns become skills
   */
  crystallize(patterns: InteractionPattern[], options?: {
    minConfidence?: number;
    minFrequency?: number;
  }): SkillCrystallizationResult {
    const minConfidence = options?.minConfidence ?? 0.7;
    const minFrequency = options?.minFrequency ?? 5;
    const skills: CrystallizedSkill[] = [];

    // Filter patterns that meet crystallization threshold
    const crystallizable = patterns.filter(p => 
      p.confidence >= minConfidence && p.frequency >= minFrequency
    );

    for (const pattern of crystallizable) {
      const skill = this.createSkill({
        condition: this.generateConditionFromPattern(pattern),
        action: this.generateActionFromPattern(pattern),
        expected_result: this.generateExpectedResultFromPattern(pattern),
        pattern_ids: [pattern.id],
      });

      if (skill) {
        skills.push(skill);
      }
    }

    return {
      skills,
      crystallized_count: skills.length,
    };
  }

  /**
   * Crystallize from multiple patterns combined
   */
  crystallizeFromStrategies(strategies: OptimizationStrategy[], patterns: InteractionPattern[]): SkillCrystallizationResult {
    const skills: CrystallizedSkill[] = [];
    const kgStore = getKnowledgeGraphStore();

    for (const strategy of strategies) {
      if (strategy.implemented) continue; // Skip already implemented

      // Find related patterns
      const relatedPatterns = patterns.filter(p => {
        if (strategy.type === 'speed') return p.type === 'temporal';
        if (strategy.type === 'empathy') return p.type === 'preference';
        if (strategy.type === 'memory') return p.type === 'causal';
        return false;
      });

      if (relatedPatterns.length === 0) continue;

      // Create skill from strategy and patterns
      const skill = this.createSkill({
        condition: `When optimizing ${strategy.type} with target ${strategy.target_metric}`,
        action: `Apply ${strategy.type} optimization based on ${relatedPatterns.length} patterns`,
        expected_result: `Expected ${(strategy.expected_improvement * 100).toFixed(0)}% improvement in ${strategy.target_metric}`,
        pattern_ids: relatedPatterns.map(p => p.id),
      });

      if (skill) {
        skills.push(skill);

        // Store in knowledge graph
        const entityId = `skill_${skill.id}`;
        kgStore.createEntity({
          id: entityId,
          type: 'crystallized_skill',
          name: `${strategy.type}_skill_v${skill.version}`,
          properties: {
            condition: skill.condition,
            action: skill.action,
            expected_result: skill.expected_result,
            version: skill.version,
          },
        });
      }
    }

    return {
      skills,
      crystallized_count: skills.length,
    };
  }

  /**
   * Generate condition string from pattern
   */
  private generateConditionFromPattern(pattern: InteractionPattern): string {
    switch (pattern.type) {
      case 'temporal':
        return `When user interaction occurs at detected temporal window (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`;
      case 'causal':
        return `When causal trigger pattern "${pattern.description}" is detected`;
      case 'preference':
        return `When user preference for ${pattern.description.split(' ')[0]} is observed`;
      default:
        return `When pattern "${pattern.id}" is detected`;
    }
  }

  /**
   * Generate action string from pattern
   */
  private generateActionFromPattern(pattern: InteractionPattern): string {
    switch (pattern.type) {
      case 'temporal':
        return `Pre-load relevant context during detected time windows to reduce latency`;
      case 'causal':
        return `Enable proactive assistance based on detected cause-effect relationship`;
      case 'preference':
        return `Adjust content presentation to match observed preference pattern`;
      default:
        return `Execute appropriate response based on detected pattern`;
    }
  }

  /**
   * Generate expected result string from pattern
   */
  private generateExpectedResultFromPattern(pattern: InteractionPattern): string {
    const improvement = (pattern.confidence * 100).toFixed(0);
    switch (pattern.type) {
      case 'temporal':
        return `Reduced response latency by approximately ${improvement}% during active periods`;
      case 'causal':
        return `Improved user satisfaction through proactive assistance (${improvement}% expected)`;
      case 'preference':
        return `Better content alignment with user preferences (${improvement}% improvement expected)`;
      default:
        return `Expected improvement: ${improvement}%`;
    }
  }

  /**
   * Get skills statistics
   */
  getStats(): {
    total: number;
    byVersion: Record<number, number>;
    avgPatternCount: number;
  } {
    const skills = this.getAllSkills();
    const byVersion: Record<number, number> = {};
    let totalPatterns = 0;

    for (const skill of skills) {
      byVersion[skill.version] = (byVersion[skill.version] ?? 0) + 1;
      totalPatterns += skill.pattern_ids.length;
    }

    return {
      total: skills.length,
      byVersion,
      avgPatternCount: skills.length > 0 ? totalPatterns / skills.length : 0,
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