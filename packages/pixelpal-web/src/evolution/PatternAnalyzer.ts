/**
 * V153: PatternAnalyzer - Behavior Pattern Mining
 * 
 * Analyzes user interaction history to detect temporal, causal, and preference patterns.
 * Uses DreamMemoryStore (V152) for historical data and integrates with HookSystem (V149).
 */

import type { Database } from 'wa-sqlite';
import { getDatabase, generateChangeId, now } from '../db/index';
import { addChangeLogEntry } from '../db/syncLog';
import { getDreamMemoryStore, type DreamMemory } from '../memory/DreamMemoryStore';
import { getKnowledgeGraphStore, type KGEntity, type KGRelation } from '../services/knowledge/KnowledgeGraphStore';
import { hookManager } from '../core/hooks/HookManager';
import type { InteractionPattern, CreatePatternInput, PatternAnalysisResult } from './types';

// Pattern storage table name
const PATTERNS_TABLE = 'evolution_patterns';

/**
 * PatternAnalyzer mines patterns from interaction history
 */
export class PatternAnalyzer {
  private db: Database | null;
  private patterns: Map<string, InteractionPattern> = new Map();

  constructor() {
    this.db = getDatabase();
    this.initTable();
  }

  /**
   * Initialize the patterns table
   */
  private initTable(): void {
    const db = this.db;
    if (!db) return;

    const SQL = db.getSQL();
    SQL`
      CREATE TABLE IF NOT EXISTS evolution_patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        frequency INTEGER NOT NULL DEFAULT 1,
        confidence REAL NOT NULL DEFAULT 0.5,
        description TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `;
    SQL`CREATE INDEX IF NOT EXISTS idx_patterns_type ON evolution_patterns(type)`;
    SQL`CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON evolution_patterns(confidence)`;
  }

  /**
   * Create a new pattern
   */
  createPattern(input: CreatePatternInput): InteractionPattern | null {
    const db = this.db;
    if (!db) return null;

    const id = crypto.randomUUID();
    const ts = now();
    const pattern: InteractionPattern = {
      id,
      type: input.type,
      frequency: input.frequency ?? 1,
      confidence: input.confidence ?? 0.5,
      description: input.description,
      created_at: ts,
    };

    const SQL = db.getSQL();
    SQL`
      INSERT INTO evolution_patterns (id, type, frequency, confidence, description, created_at)
      VALUES (${pattern.id}, ${pattern.type}, ${pattern.frequency}, ${pattern.confidence}, ${pattern.description}, ${pattern.created_at})
    `;

    addChangeLogEntry('evolution_patterns', id, 'INSERT', pattern);
    this.patterns.set(id, pattern);

    // Trigger hook for pattern detection
    hookManager.trigger('onPatternDetected', {
      data: pattern,
    }).catch(console.error);

    return pattern;
  }

  /**
   * Get a pattern by id
   */
  getPattern(id: string): InteractionPattern | null {
    const db = this.db;
    if (!db) return null;

    // Check cache first
    if (this.patterns.has(id)) {
      return this.patterns.get(id)!;
    }

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_patterns WHERE id = ${id}`;
      const rows = stmt.toArray() as InteractionPattern[];
      return rows[0] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): InteractionPattern[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_patterns ORDER BY confidence DESC, frequency DESC`;
      return stmt.toArray() as InteractionPattern[];
    } catch {
      return [];
    }
  }

  /**
   * Get patterns by type
   */
  getPatternsByType(type: InteractionPattern['type']): InteractionPattern[] {
    const db = this.db;
    if (!db) return [];

    const SQL = db.getSQL();
    try {
      const stmt = SQL`SELECT * FROM evolution_patterns WHERE type = ${type} ORDER BY confidence DESC`;
      return stmt.toArray() as InteractionPattern[];
    } catch {
      return [];
    }
  }

  /**
   * Update pattern frequency and confidence based on new interaction
   */
  updatePattern(id: string, increment = 1): InteractionPattern | null {
    const db = this.db;
    if (!db) return null;

    const existing = this.getPattern(id);
    if (!existing) return null;

    const SQL = db.getSQL();
    const newFrequency = existing.frequency + increment;
    // Confidence increases with more samples, capped at 0.99
    const newConfidence = Math.min(0.99, existing.confidence + 0.05);

    SQL`
      UPDATE evolution_patterns
      SET frequency = ${newFrequency}, confidence = ${newConfidence}
      WHERE id = ${id}
    `;

    addChangeLogEntry('evolution_patterns', id, 'UPDATE', { frequency: newFrequency, confidence: newConfidence });

    const updated: InteractionPattern = {
      ...existing,
      frequency: newFrequency,
      confidence: newConfidence,
    };
    this.patterns.set(id, updated);
    return updated;
  }

  /**
   * Delete a pattern
   */
  deletePattern(id: string): boolean {
    const db = this.db;
    if (!db) return false;

    const SQL = db.getSQL();
    SQL`DELETE FROM evolution_patterns WHERE id = ${id}`;
    addChangeLogEntry('evolution_patterns', id, 'DELETE', { id });
    this.patterns.delete(id);
    return true;
  }

  /**
   * Analyze interaction history from DreamMemoryStore
   * Detects temporal, causal, and preference patterns
   */
  async analyzeHistory(options?: {
    limit?: number;
    minConfidence?: number;
  }): Promise<PatternAnalysisResult> {
    const startTime = performance.now();
    const limit = options?.limit ?? 100;
    const minConfidence = options?.minConfidence ?? 0.5;

    const dreamStore = getDreamMemoryStore();
    const kgStore = getKnowledgeGraphStore();

    // Get recent memories for analysis
    const memories = dreamStore.getAll().slice(0, limit);
    const patterns: InteractionPattern[] = [];

    // Analyze temporal patterns (time-based behaviors)
    const temporalPatterns = this.detectTemporalPatterns(memories);
    patterns.push(...temporalPatterns);

    // Analyze causal patterns (trigger → result relationships)
    const causalPatterns = this.detectCausalPatterns(memories);
    patterns.push(...causalPatterns);

    // Analyze preference patterns (user choice tendencies)
    const preferencePatterns = await this.detectPreferencePatterns(memories);
    patterns.push(...preferencePatterns);

    // Store detected patterns
    for (const p of patterns) {
      if (p.confidence >= minConfidence) {
        this.createPattern({
          type: p.type,
          description: p.description,
          frequency: p.frequency,
          confidence: p.confidence,
        });
      }
    }

    const duration = performance.now() - startTime;

    return {
      patterns,
      total_interactions: memories.length,
      analysis_duration_ms: duration,
    };
  }

  /**
   * Detect temporal patterns - time-based user behaviors
   */
  private detectTemporalPatterns(memories: DreamMemory[]): InteractionPattern[] {
    const patterns: InteractionPattern[] = [];

    // Group memories by hour of day
    const hourlyGroups = new Map<number, DreamMemory[]>();
    for (const memory of memories) {
      const hour = new Date(memory.created_at).getHours();
      if (!hourlyGroups.has(hour)) {
        hourlyGroups.set(hour, []);
      }
      hourlyGroups.get(hour)!.push(memory);
    }

    // Find peak activity hours
    for (const [hour, group] of hourlyGroups) {
      if (group.length >= 5) { // At least 5 interactions to be significant
        const percentage = (group.length / memories.length) * 100;
        if (percentage >= 15) { // 15%+ of interactions at this hour
          patterns.push({
            id: `temporal_${hour}`,
            type: 'temporal',
            frequency: group.length,
            confidence: Math.min(0.95, percentage / 100),
            description: `User is most active around ${hour}:00 (${percentage.toFixed(1)}% of interactions)`,
            created_at: now(),
          });
        }
      }
    }

    // Look for day-of-week patterns
    const dowGroups = new Map<number, DreamMemory[]>();
    for (const memory of memories) {
      const dow = new Date(memory.created_at).getDay();
      if (!dowGroups.has(dow)) {
        dowGroups.set(dow, []);
      }
      dowGroups.get(dow)!.push(memory);
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const [dow, group] of dowGroups) {
      if (group.length >= memories.length * 0.15) {
        patterns.push({
          id: `temporal_dow_${dow}`,
          type: 'temporal',
          frequency: group.length,
          confidence: group.length / memories.length,
          description: `User shows high activity on ${dayNames[dow]}s (${group.length} interactions)`,
          created_at: now(),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect causal patterns - trigger → result relationships
   */
  private detectCausalPatterns(memories: DreamMemory[]): InteractionPattern[] {
    const patterns: InteractionPattern[] = [];

    // Analyze content for action-result pairs
    // Look for common patterns like:
    // - "When X happens, user does Y"
    // - "After doing X, user tends to do Y"
    const contentText = memories.map(m => m.content).join(' ');
    const words = contentText.toLowerCase().split(/\s+/);

    // Detect common action sequences
    const actionWords = ['ask', 'query', 'search', 'click', 'select', 'choose', 'create', 'update', 'delete', 'done'];
    const consequenceWords = ['then', 'after', 'next', 'following', 'resulting', 'leads', 'causes'];

    // Simple pattern detection for action-consequence sequences
    for (let i = 0; i < words.length - 3; i++) {
      const word = words[i];
      const nextWord = words[i + 1];
      const thirdWord = words[i + 2];

      // Check for action-adverb-consequence pattern
      if (actionWords.some(a => contentText.includes(a)) && consequenceWords.some(c => contentText.includes(c))) {
        // Found a potential causal sequence
        const confidence = 0.6; // Default confidence for causal pattern
        patterns.push({
          id: `causal_${i}`,
          type: 'causal',
          frequency: 1,
          confidence,
          description: `Detected action sequence pattern in content`,
          created_at: now(),
        });
        break; // Only add one for now to avoid over-generation
      }
    }

    return patterns;
  }

  /**
   * Detect preference patterns - user choice tendencies
   */
  private async detectPreferencePatterns(memories: DreamMemory[]): Promise<InteractionPattern[]> {
    const patterns: InteractionPattern[] = [];
    const kgStore = getKnowledgeGraphStore();

    // Analyze layer distribution (preference for hot/warm/cold memory)
    const layerCounts = { hot: 0, warm: 0, cold: 0 };
    for (const memory of memories) {
      layerCounts[memory.layer]++;
    }

    const total = memories.length;
    if (total > 0) {
      // Find dominant layer preference
      const dominant = Object.entries(layerCounts).reduce((a, b) => 
        a[1] > b[1] ? a : b
      );

      if (dominant[1] / total >= 0.4) {
        patterns.push({
          id: `preference_layer_${dominant[0]}`,
          type: 'preference',
          frequency: dominant[1],
          confidence: dominant[1] / total,
          description: `User prefers ${dominant[0]} layer memories (${((dominant[1] / total) * 100).toFixed(1)}% of interactions)`,
          created_at: now(),
        });
      }

      // Check for content length preferences
      const avgLength = memories.reduce((sum, m) => sum + m.content.length, 0) / total;
      const longContent = memories.filter(m => m.content.length > avgLength * 1.5);
      const shortContent = memories.filter(m => m.content.length < avgLength * 0.5);

      if (longContent.length / total >= 0.3) {
        patterns.push({
          id: 'preference_long_content',
          type: 'preference',
          frequency: longContent.length,
          confidence: longContent.length / total,
          description: `User frequently engages with detailed, long-form content`,
          created_at: now(),
        });
      }

      if (shortContent.length / total >= 0.3) {
        patterns.push({
          id: 'preference_short_content',
          type: 'preference',
          frequency: shortContent.length,
          confidence: shortContent.length / total,
          description: `User tends to create brief, concise interactions`,
          created_at: now(),
        });
      }
    }

    // Look for entity preferences in knowledge graph
    const entities = kgStore.queryEntities({});
    if (entities.length > 0) {
      const entityTypeCounts = new Map<string, number>();
      for (const entity of entities) {
        entityTypeCounts.set(entity.type, (entityTypeCounts.get(entity.type) ?? 0) + 1);
      }

      const topType = Array.from(entityTypeCounts.entries()).sort((a, b) => b[1] - a[1])[0];
      if (topType && topType[1] >= 3) {
        patterns.push({
          id: `preference_entity_${topType[0]}`,
          type: 'preference',
          frequency: topType[1],
          confidence: Math.min(0.9, topType[1] / entities.length),
          description: `User frequently interacts with ${topType[0]} type entities`,
          created_at: now(),
        });
      }
    }

    return patterns;
  }

  /**
   * Get pattern statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
    highConfidenceCount: number;
  } {
    const patterns = this.getAllPatterns();
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    let highConfidenceCount = 0;

    for (const p of patterns) {
      byType[p.type] = (byType[p.type] ?? 0) + 1;
      totalConfidence += p.confidence;
      if (p.confidence >= 0.8) highConfidenceCount++;
    }

    return {
      total: patterns.length,
      byType,
      avgConfidence: patterns.length > 0 ? totalConfidence / patterns.length : 0,
      highConfidenceCount,
    };
  }
}

// Singleton instance
let patternAnalyzerInstance: PatternAnalyzer | null = null;

export function getPatternAnalyzer(): PatternAnalyzer {
  if (!patternAnalyzerInstance) {
    patternAnalyzerInstance = new PatternAnalyzer();
  }
  return patternAnalyzerInstance;
}

export default PatternAnalyzer;