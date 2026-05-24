/**
 * V153: Self-Evolution Engine - Main Export
 * 
 * Provides pattern analysis, strategy optimization, and skill crystallization
 * for continuous self-improvement based on user interactions.
 */

// Types
export type {
  InteractionPattern,
  OptimizationStrategy,
  CrystallizedSkill,
  CreatePatternInput,
  CreateStrategyInput,
  CreateCrystallizedSkillInput,
  PatternAnalysisResult,
  StrategyOptimizationResult,
  SkillCrystallizationResult,
} from './types';

// PatternAnalyzer
export { PatternAnalyzer, getPatternAnalyzer } from './PatternAnalyzer';

// StrategyOptimizer
export { StrategyOptimizer, getStrategyOptimizer, type StrategyType } from './StrategyOptimizer';

// SkillCrystallizer
export { SkillCrystallizer, getSkillCrystallizer } from './SkillCrystallizer';

// EvolutionEngine
export { 
  EvolutionEngine, 
  getEvolutionEngine, 
  type EvolutionConfig, 
  type EvolutionState 
} from './EvolutionEngine';

// SkillHealthChecker
export { skillHealthChecker, type HealthStatus } from './SkillHealthChecker';

// EvolutionTimeoutController
export { EvolutionTimeoutController, type TimeoutConfig } from './EvolutionTimeoutController';

// CircuitBreaker
export { CircuitBreaker, type CircuitState, type CircuitBreakerConfig } from './CircuitBreaker';

// Evolution Rules Engine (V156)
export {
  ruleRegistry,
  ruleEngine,
  ruleScheduler,
  type EvolutionRule,
  type EvolutionContext,
  type TriggerType,
  type ActionType,
} from './rules';