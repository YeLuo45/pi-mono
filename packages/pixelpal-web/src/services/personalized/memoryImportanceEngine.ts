/**
 * PixelPal V22 - MemoryImportanceEngine
 * 深度个性化学习系统 - 记忆重要性引擎
 * 
 * L1-L4 importance levels + scoring + decay
 */



// ===== Type Definitions =====

export type MemoryLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface MemoryItem {
  id: string;
  content: string;            // The memory content
  level: MemoryLevel;          // Importance level
  score: number;              // 0-100 importance score
  createdAt: number;          // Timestamp when created
  lastAccessedAt: number;      // Timestamp when last accessed/reinforced
  accessCount: number;         // Number of times accessed
  decayRate: number;           // How fast this memory decays (per day)
  tags: string[];              // Associated tags/categories
  source: 'chat' | 'interaction' | 'explicit' | 'behavior' | 'emotion' | 'task';
  metadata?: Record<string, unknown>; // Additional context
}

export interface MemoryScoringInput {
  emotionalSignificance: number;  // 0-1: Was the memory emotionally charged?
  relevanceToGoals: number;       // 0-1: Is this related to user's stated goals?
  uniqueness: number;             // 0-1: How unique/uncommon is this information?
  repetitionFactor: number;       // How many times similar info has been mentioned
  recencyBonus: number;           // 0-1: Recently discussed bonus
  userExplicitWeight: number;     // 0-1: User explicitly marked as important
  socialShared: boolean;          // Was this shared with others?
}

export interface MemoryImportanceConfig {
  baseDecayRatePerDay: number;    // Default decay rate (0-1 per day)
  reinforcementBoost: number;      // Score boost when reinforced (0-100)
  decayAccelerationFactor: number; // Multiply decay for low-importance memories
  minScoreThreshold: number;       // Memories below this are pruned (default 10)
  maxMemoryCount: number;          // Max memories to store (default 500)
}

export interface MemoryStats {
  total: number;
  byLevel: Record<MemoryLevel, number>;
  bySource: Record<string, number>;
  averageScore: number;
  oldestMemoryAge: number; // days
}

// ===== Level Threshold Constants =====

const LEVEL_THRESHOLDS: Record<MemoryLevel, { min: number; max: number }> = {
  L1: { min: 0, max: 25 },    // Transient - casual mentions, quickly forgotten
  L2: { min: 25, max: 50 },   // Short-term - regular info, weekly decay
  L3: { min: 50, max: 75 },   // Medium-term - important facts, slow decay
  L4: { min: 75, max: 100 },  // Long-term - critical memories, very slow decay
};

const DEFAULT_DECAY_RATES: Record<MemoryLevel, number> = {
  L1: 0.30, // Loses 30% per day
  L2: 0.10, // Loses 10% per day
  L3: 0.03, // Loses 3% per day
  L4: 0.01, // Loses 1% per day
};

// ===== Scoring Functions =====

/**
 * Calculate initial importance score based on input features
 */
export function calculateImportanceScore(input: MemoryScoringInput): number {
  const weights = {
    emotionalSignificance: 0.30,
    relevanceToGoals: 0.20,
    uniqueness: 0.15,
    userExplicitWeight: 0.25,
    socialShared: 0.10,
  };

  let score = 0;
  score += input.emotionalSignificance * weights.emotionalSignificance * 100;
  score += input.relevanceToGoals * weights.relevanceToGoals * 100;
  score += input.uniqueness * (1 - input.repetitionFactor * 0.5) * weights.uniqueness * 100;
  score += input.userExplicitWeight * weights.userExplicitWeight * 100;
  if (input.socialShared) score += weights.socialShared * 100;

  // Recency bonus
  score += input.recencyBonus * 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine memory level from score
 */
export function scoreToLevel(score: number): MemoryLevel {
  if (score >= LEVEL_THRESHOLDS.L4.min) return 'L4';
  if (score >= LEVEL_THRESHOLDS.L3.min) return 'L3';
  if (score >= LEVEL_THRESHOLDS.L2.min) return 'L2';
  return 'L1';
}

/**
 * Determine decay rate from level
 */
export function getDecayRateForLevel(level: MemoryLevel): number {
  return DEFAULT_DECAY_RATES[level];
}

// ===== MemoryImportanceEngine Class =====

class MemoryImportanceEngine {
  private memories: MemoryItem[] = [];
  private readonly STORAGE_KEY = 'pixelpal_memory_importance_v22';
  private config: MemoryImportanceConfig = {
    baseDecayRatePerDay: 0.05,
    reinforcementBoost: 15,
    decayAccelerationFactor: 1.5,
    minScoreThreshold: 10,
    maxMemoryCount: 500,
  };
  private decayInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadMemories();
    this.startDecayProcess();
  }

  private loadMemories(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.memories = JSON.parse(saved);
      }
    } catch {
      this.memories = [];
    }
  }

  private saveMemories(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.memories));
    } catch {}
  }

  private startDecayProcess(): void {
    // Apply decay every 6 hours
    this.decayInterval = setInterval(() => {
      this.applyDecay();
    }, 6 * 60 * 60 * 1000);
  }

  /** Apply time-based decay to all memories */
  private applyDecay(): void {
    const now = Date.now();
    let changed = false;

    for (const memory of this.memories) {
      const daysSinceLastAccess = (now - memory.lastAccessedAt) / (24 * 60 * 60 * 1000);
      const level = memory.level;
      
      // Decay is proportional to time passed and the memory's level
      const baseDecay = DEFAULT_DECAY_RATES[level] * daysSinceLastAccess;
      const adjustedDecay = baseDecay * this.config.decayAccelerationFactor;

      const newScore = Math.max(0, memory.score - adjustedDecay * 100);
      
      if (Math.abs(newScore - memory.score) > 0.1) {
        memory.score = newScore;
        memory.level = scoreToLevel(newScore);
        changed = true;
      }
    }

    if (changed) {
      this.saveMemories();
    }

    // Prune memories below threshold
    this.pruneMemories();
  }

  /** Remove memories below score threshold */
  private pruneMemories(): void {
    const before = this.memories.length;
    this.memories = this.memories.filter(m => m.score >= this.config.minScoreThreshold);
    
    // If still over max, remove lowest scoring
    if (this.memories.length > this.config.maxMemoryCount) {
      this.memories.sort((a, b) => a.score - b.score);
      this.memories = this.memories.slice(0, this.config.maxMemoryCount);
    }

    if (this.memories.length !== before) {
      this.saveMemories();
    }
  }

  /** Add a new memory with calculated importance */
  addMemory(
    content: string,
    input: MemoryScoringInput,
    source: MemoryItem['source'] = 'chat',
    tags: string[] = [],
    metadata?: Record<string, unknown>
  ): MemoryItem {
    const now = Date.now();
    const score = calculateImportanceScore(input);
    const level = scoreToLevel(score);

    // Check for duplicate content
    const existing = this.memories.find(m => 
      m.content === content || 
      (m.tags.some(t => tags.includes(t)) && m.source === source)
    );

    if (existing) {
      // Reinforce existing memory instead of creating new
      return this.reinforceMemory(existing.id);
    }

    const memory: MemoryItem = {
      id: crypto.randomUUID(),
      content,
      level,
      score,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      decayRate: getDecayRateForLevel(level),
      tags,
      source,
      metadata,
    };

    this.memories.push(memory);
    this.saveMemories();
    return memory;
  }

  /** Reinforce an existing memory (access, review, or explicit confirmation) */
  reinforceMemory(id: string, boostAmount?: number): MemoryItem {
    const memory = this.memories.find(m => m.id === id);
    if (!memory) throw new Error(`Memory ${id} not found`);

    const now = Date.now();
    const boost = boostAmount ?? this.config.reinforcementBoost;

    // Reinforcement is more effective for higher-level memories
    const levelMultiplier: Record<MemoryLevel, number> = {
      L1: 1.0, L2: 0.9, L3: 0.7, L4: 0.5,
    };
    const effectiveBoost = boost * levelMultiplier[memory.level];

    memory.score = Math.min(100, memory.score + effectiveBoost);
    memory.level = scoreToLevel(memory.score);
    memory.lastAccessedAt = now;
    memory.accessCount++;

    this.saveMemories();
    return memory;
  }

  /** Access a memory (update lastAccessedAt, small score bump) */
  accessMemory(id: string): MemoryItem | null {
    const memory = this.memories.find(m => m.id === id);
    if (!memory) return null;

    memory.lastAccessedAt = Date.now();
    // Small passive bump for being accessed (5% of reinforcement)
    memory.score = Math.min(100, memory.score + this.config.reinforcementBoost * 0.05);
    memory.level = scoreToLevel(memory.score);

    this.saveMemories();
    return memory;
  }

  /** Explicitly tag a memory as important (user action) */
  markMemoryImportant(id: string, level: MemoryLevel): MemoryItem {
    const memory = this.memories.find(m => m.id === id);
    if (!memory) throw new Error(`Memory ${id} not found`);

    const targetScore = (LEVEL_THRESHOLDS[level].min + LEVEL_THRESHOLDS[level].max) / 2;
    memory.score = Math.max(memory.score, targetScore);
    memory.level = level;
    memory.lastAccessedAt = Date.now();

    this.saveMemories();
    return memory;
  }

  /** Get memory by ID */
  getMemory(id: string): MemoryItem | undefined {
    return this.memories.find(m => m.id === id);
  }

  /** Get all memories sorted by score (most important first) */
  getAllMemories(): MemoryItem[] {
    return [...this.memories].sort((a, b) => b.score - a.score);
  }

  /** Get memories by level */
  getMemoriesByLevel(level: MemoryLevel): MemoryItem[] {
    return this.memories.filter(m => m.level === level);
  }

  /** Get top N most important memories */
  getTopMemories(n: number = 10): MemoryItem[] {
    return this.getAllMemories().slice(0, n);
  }

  /** Get memories relevant to current context (matching tags or recent) */
  getContextualMemories(contextTags: string[], limit: number = 5): MemoryItem[] {
    const now = Date.now();
    return this.memories
      .filter(m => m.tags.some(t => contextTags.includes(t)) || m.score > 50)
      .sort((a, b) => {
        // Prefer higher score and recent access
        const scoreDiff = b.score - a.score;
        const aAge = (now - a.lastAccessedAt) / (24 * 60 * 60 * 1000);
        const bAge = (now - b.lastAccessedAt) / (24 * 60 * 60 * 1000);
        const recencyDiff = bAge - aAge; // Higher = more recent
        return scoreDiff * 0.7 + recencyDiff * 10;
      })
      .slice(0, limit);
  }

  /** Get memories for a specific source */
  getMemoriesBySource(source: MemoryItem['source']): MemoryItem[] {
    return this.memories.filter(m => m.source === source);
  }

  /** Get recent memories (last N days) */
  getRecentMemories(days: number = 7): MemoryItem[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.memories
      .filter(m => m.createdAt > cutoff)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Delete a memory */
  deleteMemory(id: string): boolean {
    const idx = this.memories.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.memories.splice(idx, 1);
    this.saveMemories();
    return true;
  }

  /** Clear all memories */
  clearAllMemories(): void {
    this.memories = [];
    this.saveMemories();
  }

  /** Get memory statistics */
  getStats(): MemoryStats {
    const now = Date.now();
    const byLevel: Record<MemoryLevel, number> = { L1: 0, L2: 0, L3: 0, L4: 0 };
    const bySource: Record<string, number> = {};

    let totalScore = 0;
    let oldestAge = 0;

    for (const m of this.memories) {
      byLevel[m.level]++;
      bySource[m.source] = (bySource[m.source] || 0) + 1;
      totalScore += m.score;
      const age = (now - m.createdAt) / (24 * 60 * 60 * 1000);
      if (age > oldestAge) oldestAge = age;
    }

    return {
      total: this.memories.length,
      byLevel,
      bySource,
      averageScore: this.memories.length > 0 ? totalScore / this.memories.length : 0,
      oldestMemoryAge: oldestAge,
    };
  }

  /** Update configuration */
  setConfig(config: Partial<MemoryImportanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get configuration */
  getConfig(): MemoryImportanceConfig {
    return { ...this.config };
  }

  /** Search memories by content or tags */
  searchMemories(query: string, limit: number = 10): MemoryItem[] {
    const q = query.toLowerCase();
    return this.memories
      .filter(m => 
        m.content.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Bulk import memories (for sync/backup) */
  importMemories(memories: MemoryItem[]): number {
    let imported = 0;
    for (const m of memories) {
      if (!this.memories.find(existing => existing.id === m.id)) {
        this.memories.push(m);
        imported++;
      }
    }
    if (imported > 0) this.saveMemories();
    return imported;
  }

  /** Stop decay process */
  stop(): void {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
      this.decayInterval = null;
    }
  }
}

// Singleton instance
export const memoryImportanceEngine = new MemoryImportanceEngine();

// ===== React Hooks =====

import { useSyncExternalStore } from 'react';

export function useMemoryStats(): MemoryStats {
  return useSyncExternalStore(
    () => () => {},
    () => memoryImportanceEngine.getStats(),
    () => memoryImportanceEngine.getStats()
  );
}

export function useTopMemories(n: number = 10): MemoryItem[] {
  return useSyncExternalStore(
    () => () => {},
    () => memoryImportanceEngine.getTopMemories(n),
    () => []
  );
}

export function useMemoriesByLevel(level: MemoryLevel): MemoryItem[] {
  return useSyncExternalStore(
    () => () => {},
    () => memoryImportanceEngine.getMemoriesByLevel(level),
    () => []
  );
}

// ===== Helper to create memory from chat message =====

export function createMemoryFromChat(
  content: string,
  emotion: string,
  isImportant: boolean = false
): MemoryItem {
  const emotionPositive = ['happy', 'excited', 'calm'].includes(emotion);
  const emotionNegative = ['sad', 'angry', 'anxious'].includes(emotion);

  const input: MemoryScoringInput = {
    emotionalSignificance: emotionPositive ? 0.8 : (emotionNegative ? 0.9 : 0.3),
    relevanceToGoals: 0.5,
    uniqueness: 0.5,
    repetitionFactor: 0,
    recencyBonus: 1,
    userExplicitWeight: isImportant ? 1 : 0,
    socialShared: false,
  };

  return memoryImportanceEngine.addMemory(content, input, 'chat', [emotion]);
}

// ===== Exports =====

export { 
  LEVEL_THRESHOLDS, 
  DEFAULT_DECAY_RATES
};
