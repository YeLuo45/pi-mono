/**
 * Strategy Library - V33 Multi-Agent Collaboration System
 * 
 * Repository of reusable execution strategies that define how to handle
 * different task types, persona configurations, and failure scenarios.
 */

import type { PersonaRole, TaskType, Subtask } from './types';

// ============================================================================
// Strategy Types
// ============================================================================

export interface StrategyCondition {
  taskTypes?: TaskType[];
  keywords?: string[];
  personaRoles?: PersonaRole[];
  minComplexity?: number;
  maxComplexity?: number;
  customCheck?: (context: StrategyContext) => boolean;
}

export interface StrategyContext {
  userRequest: string;
  taskTypes: TaskType[];
  detectedEntities: string[];
  complexity: number;
  availableRoles: PersonaRole[];
  previousFailures?: string[];
  timeConstraint?: number;
}

export interface ExecutionStrategy {
  id: string;
  name: string;
  description: string;
  version: string;
  conditions: StrategyCondition;
  config: StrategyConfig;
  priority: number;
  successRate?: number;
  avgDuration?: number;
  lastUsed?: number;
  useCount: number;
}

export interface StrategyConfig {
  maxConcurrentSubtasks: number;
  taskTimeout: number;
  enableParallelExecution: boolean;
  enableCaching: boolean;
  retryPolicy: RetryPolicy;
  fallbackStrategyId?: string;
  roleAssignments: Map<PersonaRole, RoleAssignment>;
  executionOrder: ExecutionOrder;
}

export interface RoleAssignment {
  role: PersonaRole;
  taskTypes: TaskType[];
  maxConcurrent: number;
  priority: number;
  timeout: number;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ExecutionOrder {
  type: 'sequential' | 'parallel' | 'dependency_based' | 'priority_based';
  parallelGroups?: Subtask[][];
}

export interface StrategyResult {
  strategyId: string;
  selectedStrategy: ExecutionStrategy;
  estimatedDuration: number;
  confidence: number;
  warnings: string[];
}

// ============================================================================
// Built-in Strategy Templates
// ============================================================================

const STRATEGY_TEMPLATES = {
  QUICK_RESPONSE: 'quick_response',
  THOROUGH_ANALYSIS: 'thorough_analysis',
  MEMORY_FOCUSED: 'memory_focused',
  EMOTION_ANALYSIS: 'emotion_analysis',
  ADVICE_GENERATION: 'advice_generation',
  PARALLEL_EXPLORATION: 'parallel_exploration',
  CONSERVATIVE: 'conservative',
  AGGRESSIVE: 'aggressive',
};

// ============================================================================
// Default Strategies
// ============================================================================

function createDefaultRetryPolicy(): RetryPolicy {
  return {
    maxRetries: 2,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['timeout', 'network_error', 'rate_limit'],
  };
}

function createRoleAssignment(role: PersonaRole, taskTypes: TaskType[], priority: number): RoleAssignment {
  return {
    role,
    taskTypes,
    maxConcurrent: role === 'Researcher' ? 3 : 2,
    priority,
    timeout: 30000,
  };
}

// ============================================================================
// Strategy Library Implementation
// ============================================================================

export class StrategyLibrary {
  private strategies: Map<string, ExecutionStrategy>;
  private defaultStrategyId: string;
  private performanceHistory: Map<string, { success: boolean; duration: number }[]>;

  constructor() {
    this.strategies = new Map();
    this.defaultStrategyId = STRATEGY_TEMPLATES.QUICK_RESPONSE;
    this.performanceHistory = new Map();
    
    this.registerBuiltInStrategies();
  }

  /**
   * Register built-in strategies
   */
  private registerBuiltInStrategies(): void {
    // Quick Response Strategy
    this.register({
      id: STRATEGY_TEMPLATES.QUICK_RESPONSE,
      name: '快速响应策略',
      description: '适用于简单查询，快速返回结果，减少不必要的分解',
      version: '1.0.0',
      conditions: {
        keywords: ['今天', '现在', '天气', '时间', '查询', '什么是', 'how to', 'what is'],
        maxComplexity: 3,
      },
      config: {
        maxConcurrentSubtasks: 2,
        taskTimeout: 15000,
        enableParallelExecution: false,
        enableCaching: true,
        retryPolicy: { ...createDefaultRetryPolicy(), maxRetries: 1 },
        roleAssignments: new Map([
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 1)],
        ]),
        executionOrder: { type: 'sequential' },
      },
      priority: 10,
      useCount: 0,
    });

    // Thorough Analysis Strategy
    this.register({
      id: STRATEGY_TEMPLATES.THOROUGH_ANALYSIS,
      name: '深度分析策略',
      description: '适用于复杂分析任务，充分检索和验证',
      version: '1.0.0',
      conditions: {
        keywords: ['分析', '比较', '评估', '分析一下', 'analyze', 'compare', 'evaluate'],
        minComplexity: 4,
      },
      config: {
        maxConcurrentSubtasks: 4,
        taskTimeout: 60000,
        enableParallelExecution: true,
        enableCaching: true,
        retryPolicy: createDefaultRetryPolicy(),
        roleAssignments: new Map([
          ['MemoryExpert', createRoleAssignment('MemoryExpert', ['memory_retrieval'], 1)],
          ['EmotionAnalyst', createRoleAssignment('EmotionAnalyst', ['emotion_analysis'], 2)],
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 3)],
        ]),
        executionOrder: { type: 'dependency_based' },
      },
      priority: 5,
      useCount: 0,
    });

    // Memory Focused Strategy
    this.register({
      id: STRATEGY_TEMPLATES.MEMORY_FOCUSED,
      name: '记忆优先策略',
      description: '优先从记忆库检索相关信息，适用于回顾类请求',
      version: '1.0.0',
      conditions: {
        taskTypes: ['memory_retrieval'],
        keywords: ['记得', '以前', '过去', '曾经', '历史', 'remember', 'past'],
      },
      config: {
        maxConcurrentSubtasks: 2,
        taskTimeout: 30000,
        enableParallelExecution: false,
        enableCaching: true,
        retryPolicy: createDefaultRetryPolicy(),
        roleAssignments: new Map([
          ['MemoryExpert', createRoleAssignment('MemoryExpert', ['memory_retrieval'], 1)],
        ]),
        executionOrder: { type: 'sequential' },
      },
      priority: 8,
      useCount: 0,
    });

    // Emotion Analysis Strategy
    this.register({
      id: STRATEGY_TEMPLATES.EMOTION_ANALYSIS,
      name: '情绪分析策略',
      description: '专门针对情绪分析场景的完整工作流',
      version: '1.0.0',
      conditions: {
        taskTypes: ['emotion_analysis'],
        keywords: ['情绪', '心情', '感受', 'emotion', 'feeling', 'mood'],
      },
      config: {
        maxConcurrentSubtasks: 3,
        taskTimeout: 45000,
        enableParallelExecution: true,
        enableCaching: false,
        retryPolicy: { ...createDefaultRetryPolicy(), maxRetries: 3 },
        roleAssignments: new Map([
          ['MemoryExpert', createRoleAssignment('MemoryExpert', ['memory_retrieval'], 1)],
          ['EmotionAnalyst', createRoleAssignment('EmotionAnalyst', ['emotion_analysis'], 2)],
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 3)],
        ]),
        executionOrder: { type: 'dependency_based' },
      },
      priority: 9,
      useCount: 0,
    });

    // Advice Generation Strategy
    this.register({
      id: STRATEGY_TEMPLATES.ADVICE_GENERATION,
      name: '建议生成策略',
      description: '综合信息生成建议的完整工作流',
      version: '1.0.0',
      conditions: {
        taskTypes: ['advice_generation'],
        keywords: ['建议', '怎么办', '如何', '应该', 'advice', 'suggest', 'should'],
      },
      config: {
        maxConcurrentSubtasks: 3,
        taskTimeout: 50000,
        enableParallelExecution: true,
        enableCaching: true,
        retryPolicy: createDefaultRetryPolicy(),
        roleAssignments: new Map([
          ['Researcher', createRoleAssignment('Researcher', ['web_search'], 1)],
          ['MemoryExpert', createRoleAssignment('MemoryExpert', ['memory_retrieval'], 1)],
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 2)],
        ]),
        executionOrder: { type: 'priority_based' },
      },
      priority: 8,
      useCount: 0,
    });

    // Parallel Exploration Strategy
    this.register({
      id: STRATEGY_TEMPLATES.PARALLEL_EXPLORATION,
      name: '并行探索策略',
      description: '多角度并行探索，适用于需要广泛调研的任务',
      version: '1.0.0',
      conditions: {
        keywords: ['研究', '探索', '调研', 'research', 'explore', 'survey'],
        minComplexity: 5,
      },
      config: {
        maxConcurrentSubtasks: 5,
        taskTimeout: 90000,
        enableParallelExecution: true,
        enableCaching: true,
        retryPolicy: { ...createDefaultRetryPolicy(), maxRetries: 3 },
        roleAssignments: new Map([
          ['Researcher', createRoleAssignment('Researcher', ['web_search'], 1)],
          ['MemoryExpert', createRoleAssignment('MemoryExpert', ['memory_retrieval'], 1)],
          ['EmotionAnalyst', createRoleAssignment('EmotionAnalyst', ['emotion_analysis'], 2)],
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 3)],
        ]),
        executionOrder: { type: 'parallel' },
      },
      priority: 4,
      useCount: 0,
    });

    // Conservative Strategy
    this.register({
      id: STRATEGY_TEMPLATES.CONSERVATIVE,
      name: '保守策略',
      description: '高可靠性策略，多次验证，适合重要任务',
      version: '1.0.0',
      conditions: {
        maxComplexity: 10,
      },
      config: {
        maxConcurrentSubtasks: 2,
        taskTimeout: 120000,
        enableParallelExecution: false,
        enableCaching: true,
        retryPolicy: { ...createDefaultRetryPolicy(), maxRetries: 4 },
        roleAssignments: new Map([
          ['MemoryExpert', createRoleAssignment('MemoryExpert', ['memory_retrieval'], 1)],
          ['EmotionAnalyst', createRoleAssignment('EmotionAnalyst', ['emotion_analysis'], 2)],
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 3)],
          ['Researcher', createRoleAssignment('Researcher', ['web_search'], 2)],
        ]),
        executionOrder: { type: 'sequential' },
      },
      priority: 1,
      useCount: 0,
    });

    // Aggressive Strategy
    this.register({
      id: STRATEGY_TEMPLATES.AGGRESSIVE,
      name: '激进策略',
      description: '最大并行化，追求速度而非可靠性',
      version: '1.0.0',
      conditions: {
        maxComplexity: 4,
      },
      config: {
        maxConcurrentSubtasks: 6,
        taskTimeout: 10000,
        enableParallelExecution: true,
        enableCaching: false,
        retryPolicy: { ...createDefaultRetryPolicy(), maxRetries: 1 },
        roleAssignments: new Map([
          ['Researcher', createRoleAssignment('Researcher', ['web_search'], 1)],
          ['Advisor', createRoleAssignment('Advisor', ['advice_generation'], 2)],
        ]),
        executionOrder: { type: 'parallel' },
      },
      priority: 2,
      useCount: 0,
    });
  }

  /**
   * Register a new strategy
   */
  register(strategy: ExecutionStrategy): void {
    this.strategies.set(strategy.id, { ...strategy, useCount: 0 });
  }

  /**
   * Unregister a strategy
   */
  unregister(strategyId: string): boolean {
    if (strategyId === this.defaultStrategyId) {
      return false; // Cannot unregister default
    }
    return this.strategies.delete(strategyId);
  }

  /**
   * Select the best strategy for given context
   */
  select(context: StrategyContext): StrategyResult {
    const matchedStrategies = this.matchStrategies(context);
    
    if (matchedStrategies.length === 0) {
      // Return default strategy
      const defaultStrategy = this.strategies.get(this.defaultStrategyId)!;
      return this.createStrategyResult(defaultStrategy, context, 'medium');
    }

    // Sort by priority and success rate
    matchedStrategies.sort((a, b) => {
      const scoreA = this.calculateStrategyScore(a, context);
      const scoreB = this.calculateStrategyScore(b, context);
      return scoreB - scoreA;
    });

    const selected = matchedStrategies[0];
    const confidence = this.calculateStrategyScore(selected, context) / 100;
    
    // Record usage
    selected.useCount++;
    selected.lastUsed = Date.now();

    const warnings: string[] = [];
    
    // Check for potential issues
    if (context.previousFailures && context.previousFailures.length > 0) {
      warnings.push('检测到历史失败，可能需要更保守的策略');
    }
    
    if (context.timeConstraint && selected.config.taskTimeout > context.timeConstraint) {
      warnings.push('策略超时设置可能超过时间限制');
    }

    return this.createStrategyResult(selected, context, confidence, warnings);
  }

  /**
   * Match strategies against context conditions
   */
  private matchStrategies(context: StrategyContext): ExecutionStrategy[] {
    const matched: ExecutionStrategy[] = [];

    for (const strategy of this.strategies.values()) {
      if (this.matchesConditions(strategy, context)) {
        matched.push(strategy);
      }
    }

    return matched;
  }

  /**
   * Check if context matches strategy conditions
   */
  private matchesConditions(strategy: ExecutionStrategy, context: StrategyContext): boolean {
    const conditions = strategy.conditions;

    // Check task types
    if (conditions.taskTypes && conditions.taskTypes.length > 0) {
      const hasMatch = conditions.taskTypes.some(tt => context.taskTypes.includes(tt));
      if (!hasMatch) return false;
    }

    // Check keywords
    if (conditions.keywords && conditions.keywords.length > 0) {
      const requestLower = context.userRequest.toLowerCase();
      const hasMatch = conditions.keywords.some(kw => requestLower.includes(kw.toLowerCase()));
      if (!hasMatch) return false;
    }

    // Check complexity
    if (conditions.minComplexity !== undefined && context.complexity < conditions.minComplexity) {
      return false;
    }
    if (conditions.maxComplexity !== undefined && context.complexity > conditions.maxComplexity) {
      return false;
    }

    // Check custom condition
    if (conditions.customCheck && !conditions.customCheck(context)) {
      return false;
    }

    return true;
  }

  /**
   * Calculate strategy score based on context fit and performance
   */
  private calculateStrategyScore(strategy: ExecutionStrategy, context: StrategyContext): number {
    let score = 50; // Base score

    // Priority boost (higher priority = higher score)
    score += strategy.priority * 3;

    // Performance boost
    if (strategy.successRate !== undefined) {
      score += strategy.successRate * 0.3;
    }

    // Recency boost (recently used strategies might be better suited)
    if (strategy.lastUsed) {
      const hoursSinceUsed = (Date.now() - strategy.lastUsed) / (1000 * 60 * 60);
      if (hoursSinceUsed < 24) {
        score += 10;
      } else if (hoursSinceUsed < 72) {
        score += 5;
      }
    }

    // Keyword match bonus
    if (strategy.conditions.keywords) {
      const requestLower = context.userRequest.toLowerCase();
      const matchCount = strategy.conditions.keywords.filter(
        kw => requestLower.includes(kw.toLowerCase())
      ).length;
      score += matchCount * 5;
    }

    // Complexity fit bonus
    if (strategy.conditions.minComplexity !== undefined || strategy.conditions.maxComplexity !== undefined) {
      if (context.complexity >= (strategy.conditions.minComplexity || 0) &&
          context.complexity <= (strategy.conditions.maxComplexity || 100)) {
        score += 15;
      }
    }

    // Failure history penalty
    if (context.previousFailures && context.previousFailures.includes(strategy.id)) {
      score -= 30;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Create strategy result
   */
  private createStrategyResult(
    strategy: ExecutionStrategy,
    context: StrategyContext,
    confidence: number,
    warnings: string[] = []
  ): StrategyResult {
    const estimatedDuration = this.estimateDuration(strategy, context);
    
    return {
      strategyId: strategy.id,
      selectedStrategy: strategy,
      estimatedDuration,
      confidence: Math.round(confidence * 100) / 100,
      warnings,
    };
  }

  /**
   * Estimate execution duration for a strategy
   */
  private estimateDuration(strategy: ExecutionStrategy, context: StrategyContext): number {
    let duration = strategy.config.taskTimeout;
    
    // Adjust based on complexity
    duration *= (context.complexity / 5);
    
    // Adjust based on concurrent subtasks
    duration /= Math.sqrt(strategy.config.maxConcurrentSubtasks);
    
    // Add penalty for retries
    duration += strategy.config.retryPolicy.maxRetries * strategy.config.retryPolicy.initialDelayMs;
    
    return Math.round(duration);
  }

  /**
   * Record strategy performance
   */
  recordPerformance(strategyId: string, success: boolean, duration: number): void {
    if (!this.performanceHistory.has(strategyId)) {
      this.performanceHistory.set(strategyId, []);
    }
    
    const history = this.performanceHistory.get(strategyId)!;
    history.push({ success, duration });
    
    // Keep only last 100 records
    if (history.length > 100) {
      history.shift();
    }
    
    // Update strategy success rate
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      const successes = history.filter(h => h.success).length;
      strategy.successRate = successes / history.length;
      
      const totalDuration = history.reduce((sum, h) => sum + h.duration, 0);
      strategy.avgDuration = totalDuration / history.length;
    }
  }

  /**
   * Get all registered strategies
   */
  getAllStrategies(): ExecutionStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Get strategy by ID
   */
  getStrategy(strategyId: string): ExecutionStrategy | undefined {
    return this.strategies.get(strategyId);
  }

  /**
   * Get strategies sorted by performance
   */
  getTopStrategies(limit: number = 5): ExecutionStrategy[] {
    return this.getAllStrategies()
      .filter(s => s.successRate !== undefined)
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, limit);
  }

  /**
   * Get recommended strategies for a task type
   */
  getRecommendedForTaskType(taskType: TaskType): ExecutionStrategy[] {
    return this.getAllStrategies()
      .filter(s => s.conditions.taskTypes?.includes(taskType))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update strategy
   */
  updateStrategy(strategyId: string, updates: Partial<ExecutionStrategy>): boolean {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return false;
    
    this.strategies.set(strategyId, { ...strategy, ...updates });
    return true;
  }

  /**
   * Set default strategy
   */
  setDefaultStrategy(strategyId: string): boolean {
    if (!this.strategies.has(strategyId)) {
      return false;
    }
    this.defaultStrategyId = strategyId;
    return true;
  }

  /**
   * Create custom strategy from template
   */
  createFromTemplate(
    templateId: string,
    customizations: Partial<ExecutionStrategy>
  ): ExecutionStrategy | undefined {
    const template = this.strategies.get(templateId);
    if (!template) return undefined;
    
    const customStrategy: ExecutionStrategy = {
      ...template,
      ...customizations,
      id: customizations.id || `${templateId}_custom_${Date.now()}`,
      version: '1.0.0',
      useCount: 0,
    };
    
    return customStrategy;
  }

  /**
   * Export strategy as JSON
   */
  exportStrategy(strategyId: string): string | undefined {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return undefined;
    
    // Convert Maps to arrays for JSON serialization
    const exportable = {
      ...strategy,
      config: {
        ...strategy.config,
        roleAssignments: Array.from(strategy.config.roleAssignments.entries()),
      },
    };
    
    return JSON.stringify(exportable, null, 2);
  }

  /**
   * Import strategy from JSON
   */
  importStrategy(json: string): ExecutionStrategy | undefined {
    try {
      const parsed = JSON.parse(json);
      
      // Convert roleAssignments array back to Map
      if (Array.isArray(parsed.config.roleAssignments)) {
        parsed.config.roleAssignments = new Map(parsed.config.roleAssignments);
      }
      
      this.register(parsed);
      return parsed;
    } catch {
      return undefined;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createStrategyLibrary(): StrategyLibrary {
  return new StrategyLibrary();
}

// ============================================================================
// Built-in Strategy IDs Export
// ============================================================================

export { STRATEGY_TEMPLATES };
