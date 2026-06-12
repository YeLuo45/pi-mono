/**
 * V153: Self-Evolution Engine - Data Types
 * 
 * Core types for pattern analysis, strategy optimization, and skill crystallization.
 */

/**
 * Represents a detected pattern in user interactions
 */
export interface InteractionPattern {
  id: string;
  type: 'temporal' | 'causal' | 'preference';
  frequency: number;
  confidence: number;
  description: string;
  created_at: number;
}

/**
 * Strategy for optimizing behavior
 */
export interface OptimizationStrategy {
  id: string;
  type: 'speed' | 'empathy' | 'memory';
  target_metric: string;
  expected_improvement: number;
  implemented: boolean;
}

/**
 * A crystallized skill rule derived from patterns
 */
export interface CrystallizedSkill {
  id: string;
  condition: string;
  action: string;
  expected_result: string;
  pattern_ids: string[];
  version: number;
  created_at: number;
}

/**
 * Input for creating a pattern
 */
export interface CreatePatternInput {
  type: 'temporal' | 'causal' | 'preference';
  description: string;
  frequency?: number;
  confidence?: number;
}

/**
 * Input for creating an optimization strategy
 */
export interface CreateStrategyInput {
  type: 'speed' | 'empathy' | 'memory';
  target_metric: string;
  expected_improvement: number;
}

/**
 * Input for creating a crystallized skill
 */
export interface CreateCrystallizedSkillInput {
  condition: string;
  action: string;
  expected_result: string;
  pattern_ids: string[];
}

/**
 * Analysis result containing detected patterns
 */
export interface PatternAnalysisResult {
  patterns: InteractionPattern[];
  total_interactions: number;
  analysis_duration_ms: number;
}

/**
 * Strategy optimization result
 */
export interface StrategyOptimizationResult {
  strategies: OptimizationStrategy[];
  applied_count: number;
}

/**
 * Skill crystallization result
 */
export interface SkillCrystallizationResult {
  skills: CrystallizedSkill[];
  crystallized_count: number;
}