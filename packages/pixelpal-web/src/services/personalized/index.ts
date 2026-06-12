/**
 * PixelPal V22 - Personalized Learning System
 * 深度个性化学习系统 - 统一导出
 */

// UserBehaviorPredictor
export {
  userBehaviorPredictor,
  useBehaviorState,
  useBehaviorPrediction,
  type BehaviorState,
  type BehaviorFeatures,
  type BehaviorPrediction,
} from './userBehaviorPredictor';

// ProactiveCareEngine
export {
  proactiveCareEngine,
  useProactiveCareState,
  usePendingCareAction,
  CARE_ACTIONS,
  type CareScenario,
  type CareAction,
  type CareTriggerRecord,
  type ProactiveCareState,
} from './proactiveCareEngine';

// MemoryImportanceEngine
export {
  memoryImportanceEngine,
  useMemoryStats,
  useTopMemories,
  useMemoriesByLevel,
  createMemoryFromChat,
  calculateImportanceScore,
  scoreToLevel,
  getDecayRateForLevel,
  LEVEL_THRESHOLDS,
  DEFAULT_DECAY_RATES,
  type MemoryLevel,
  type MemoryItem,
  type MemoryScoringInput,
  type MemoryImportanceConfig,
  type MemoryStats,
} from './memoryImportanceEngine';
