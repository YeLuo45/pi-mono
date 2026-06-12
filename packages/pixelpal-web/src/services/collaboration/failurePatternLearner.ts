/**
 * Failure Pattern Learner - V33 Multi-Agent Collaboration System
 * 
 * Analyzes historical failures to identify patterns, root causes,
 * and suggest preventive measures for improved system reliability.
 */

import type { PersonaRole, TaskType } from './types';

// ============================================================================
// Failure Pattern Types
// ============================================================================

export interface FailureEvent {
  id: string;
  timestamp: number;
  taskId: string;
  taskType: TaskType;
  subtaskId?: string;
  responsibleRole?: PersonaRole;
  errorType: FailureErrorType;
  errorMessage: string;
  context: Record<string, unknown>;
  severity: FailureSeverity;
  resolved: boolean;
  resolutionTime?: number;
  rootCause?: string;
  preventiveMeasures?: string[];
}

export type FailureErrorType =
  | 'timeout'
  | 'network_error'
  | 'rate_limit'
  | 'invalid_input'
  | 'dependency_failed'
  | 'resource_exhausted'
  | 'model_error'
  | 'unknown';

export type FailureSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface FailurePattern {
  id: string;
  patternType: string;
  description: string;
  frequency: number;
  occurrenceRate: number;      // Percentage of tasks affected
  avgResolutionTime: number;    // In ms
  affectedTaskTypes: TaskType[];
  affectedRoles: PersonaRole[];
  firstOccurrence: number;
  lastOccurrence: number;
  rootCauses: string[];
  symptoms: string[];
  preventiveMeasures: string[];
  successRateOfMeasures: number;
  confidence: number;          // 0-1, how confident we are in this pattern
  metadata: Record<string, unknown>;
}

export interface PatternAnalysis {
  totalFailures: number;
  uniquePatterns: number;
  mostCommonPattern: FailurePattern | null;
  mostSeverePattern: FailurePattern | null;
  trend: 'increasing' | 'stable' | 'decreasing';
  estimatedLossTime: number;
  recommendations: string[];
  newPatternsDetected: FailurePattern[];
}

export interface LearningConfig {
  minOccurrencesForPattern: number;   // Default: 3
  patternWindowMs: number;            // Time window for pattern detection (default: 24h)
  decayFactor: number;                // Older patterns weighted less (default: 0.95)
  confidenceThreshold: number;        // Minimum confidence for pattern (default: 0.6)
  maxPatterns: number;               // Maximum patterns to keep (default: 50)
}

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  minOccurrencesForPattern: 3,
  patternWindowMs: 24 * 60 * 60 * 1000, // 24 hours
  decayFactor: 0.95,
  confidenceThreshold: 0.6,
  maxPatterns: 50,
};

// ============================================================================
// Error Type Mappings
// ============================================================================

const ERROR_TYPE_KEYWORDS: Record<FailureErrorType, string[]> = {
  timeout: ['timeout', 'timed out', '超时', '等待超时'],
  network_error: ['network', 'connection', '网络', '连接', '连接失败'],
  rate_limit: ['rate limit', 'rate_limit', '限流', '请求过多', '429', '429'],
  invalid_input: ['invalid', 'malformed', '非法', '无效输入', '参数错误'],
  dependency_failed: ['dependency', 'depends on', '依赖', '前置任务失败'],
  resource_exhausted: ['memory', 'cpu', 'resource', '资源', '内存不足', 'oom'],
  model_error: ['model', 'ai', 'gpt', 'claude', '模型', 'AI响应'],
  unknown: ['unknown', 'error', '错误', '失败'],
};

const SEVERITY_WEIGHTS: Record<FailureSeverity, number> = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 8,
};

// ============================================================================
// Failure Pattern Learner Implementation
// ============================================================================

export class FailurePatternLearner {
  private failures: Map<string, FailureEvent>;
  private patterns: Map<string, FailurePattern>;
  private config: LearningConfig;
  private recentErrors: string[];

  constructor(config?: Partial<LearningConfig>) {
    this.failures = new Map();
    this.patterns = new Map();
    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config };
    this.recentErrors = [];
  }

  /**
   * Record a new failure event
   */
  async recordFailure(
    taskId: string,
    taskType: TaskType,
    error: Error | string,
    context: Record<string, unknown> = {},
    responsibleRole?: PersonaRole,
    severity: FailureSeverity = 'medium'
  ): Promise<FailureEvent> {
    const errorType = this.classifyError(error);
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    const failureEvent: FailureEvent = {
      id: `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      taskId,
      taskType,
      errorType,
      errorMessage,
      context,
      severity,
      resolved: false,
    };

    if (responsibleRole) {
      failureEvent.responsibleRole = responsibleRole;
    }

    this.failures.set(failureEvent.id, failureEvent);
    this.recentErrors.push(errorMessage);
    
    // Keep recent errors list bounded
    if (this.recentErrors.length > 100) {
      this.recentErrors.shift();
    }

    // Trigger pattern learning
    await this.learnPatterns();

    return failureEvent;
  }

  /**
   * Resolve a failure event
   */
  resolveFailure(failureId: string, rootCause?: string, preventiveMeasures?: string[]): boolean {
    const failure = this.failures.get(failureId);
    if (!failure) return false;

    failure.resolved = true;
    failure.resolutionTime = Date.now() - failure.timestamp;
    failure.rootCause = rootCause;
    failure.preventiveMeasures = preventiveMeasures;

    return true;
  }

  /**
   * Classify error type from error message
   */
  private classifyError(error: Error | string): FailureErrorType {
    const message = typeof error === 'string' ? error.toLowerCase() : error.message.toLowerCase();

    for (const [type, keywords] of Object.entries(ERROR_TYPE_KEYWORDS)) {
      if (keywords.some(kw => message.includes(kw))) {
        return type as FailureErrorType;
      }
    }

    return 'unknown';
  }

  /**
   * Learn patterns from recorded failures
   */
  private async learnPatterns(): Promise<void> {
    const recentFailures = this.getRecentFailures();
    
    // Group failures by similarity
    const groups = this.groupFailuresBySimilarity(recentFailures);
    
    for (const group of groups) {
      if (group.length < this.config.minOccurrencesForPattern) {
        continue;
      }

      const pattern = this.derivePattern(group);
      if (pattern.confidence >= this.config.confidenceThreshold) {
        this.updatePattern(pattern);
      }
    }

    // Prune old patterns
    this.prunePatterns();
  }

  /**
   * Get failures within the pattern window
   */
  private getRecentFailures(): FailureEvent[] {
    const cutoff = Date.now() - this.config.patternWindowMs;
    
    return Array.from(this.failures.values())
      .filter(f => f.timestamp >= cutoff);
  }

  /**
   * Group failures by similarity
   */
  private groupFailuresBySimilarity(failures: FailureEvent[]): FailureEvent[][] {
    const groups: FailureEvent[][] = [];
    const assigned = new Set<string>();

    for (const failure of failures) {
      if (assigned.has(failure.id)) continue;

      const group: FailureEvent[] = [failure];
      assigned.add(failure.id);

      // Find similar failures
      for (const other of failures) {
        if (assigned.has(other.id)) continue;
        
        if (this.areSimilar(failure, other)) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two failures are similar
   */
  private areSimilar(a: FailureEvent, b: FailureEvent): boolean {
    // Same error type
    if (a.errorType !== b.errorType) return false;

    // Same task type or both involve same role
    if (a.taskType !== b.taskType && a.responsibleRole !== b.responsibleRole) {
      return false;
    }

    // Similar error message (simple heuristic: same words)
    const wordsA = new Set(a.errorMessage.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.errorMessage.toLowerCase().split(/\s+/));
    const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
    const union = new Set([...wordsA, ...wordsB]).size;
    
    const similarity = intersection / union;
    return similarity >= 0.5;
  }

  /**
   * Derive a pattern from a group of similar failures
   */
  private derivePattern(failures: FailureEvent[]): FailurePattern {
    const firstFailure = failures[0];
    const lastFailure = failures[failures.length - 1];
    
    // Calculate occurrence rate
    const allTasks = new Set(failures.map(f => f.taskId));
    const totalTasks = this.failures.size; // Simplified
    const occurrenceRate = Math.min(1, failures.length / Math.max(1, totalTasks));

    // Calculate average resolution time
    const resolvedFailures = failures.filter(f => f.resolutionTime !== undefined);
    const avgResolutionTime = resolvedFailures.length > 0
      ? resolvedFailures.reduce((sum, f) => sum + (f.resolutionTime || 0), 0) / resolvedFailures.length
      : Date.now() - firstFailure.timestamp;

    // Aggregate root causes
    const rootCauses = [...new Set(
      failures
        .filter(f => f.rootCause)
        .map(f => f.rootCause!)
    )];

    // Extract symptoms from error messages
    const symptoms = this.extractSymptoms(failures);

    // Determine affected roles
    const affectedRoles = [...new Set(
      failures
        .filter(f => f.responsibleRole)
        .map(f => f.responsibleRole!)
    )];

    // Generate pattern type identifier
    const patternType = this.generatePatternType(firstFailure);

    // Calculate confidence based on consistency and occurrences
    const consistency = this.calculateConsistency(failures);
    const confidence = Math.min(1, (failures.length / 10) * consistency);

    // Generate preventive measures
    const preventiveMeasures = this.suggestPreventiveMeasures(failures);

    // Calculate success rate of measures
    const successRateOfMeasures = this.calculateMeasureSuccessRate(preventiveMeasures);

    return {
      id: `pattern_${patternType}_${Date.now()}`,
      patternType,
      description: this.generatePatternDescription(failures),
      frequency: failures.length,
      occurrenceRate,
      avgResolutionTime,
      affectedTaskTypes: [...new Set(failures.map(f => f.taskType))],
      affectedRoles,
      firstOccurrence: firstFailure.timestamp,
      lastOccurrence: lastFailure.timestamp,
      rootCauses,
      symptoms,
      preventiveMeasures,
      successRateOfMeasures,
      confidence,
      metadata: {
        severity: this.getMostCommonSeverity(failures),
        avgContextSize: failures.reduce((sum, f) => sum + Object.keys(f.context).length, 0) / failures.length,
      },
    };
  }

  /**
   * Calculate consistency score for a group of failures
   */
  private calculateConsistency(failures: FailureEvent[]): number {
    if (failures.length < 2) return 1;

    // Check error message similarity
    const errorMessages = failures.map(f => f.errorMessage.toLowerCase());
    const uniqueMessages = new Set(errorMessages).size;
    const messageConsistency = 1 - (uniqueMessages / failures.length);

    // Check context key similarity
    const contextKeys = failures.map(f => Object.keys(f.context).sort().join(','));
    const uniqueContexts = new Set(contextKeys).size;
    const contextConsistency = 1 - (uniqueContexts / failures.length);

    return (messageConsistency + contextConsistency) / 2;
  }

  /**
   * Extract symptoms from error messages
   */
  private extractSymptoms(failures: FailureEvent[]): string[] {
    const symptoms: string[] = [];
    const allWords: Map<string, number> = new Map();

    for (const failure of failures) {
      const words = failure.errorMessage.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 4) {
          allWords.set(word, (allWords.get(word) || 0) + 1);
        }
      }
    }

    // Get most frequent words as symptoms
    const sortedWords = [...allWords.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [word, count] of sortedWords) {
      if (count >= failures.length * 0.3) {
        symptoms.push(word);
      }
    }

    return symptoms;
  }

  /**
   * Generate pattern type identifier
   */
  private generatePatternType(failure: FailureEvent): string {
    const parts = [
      failure.errorType,
      failure.taskType,
      failure.responsibleRole || 'unknown',
    ];
    return parts.join('_');
  }

  /**
   * Generate human-readable pattern description
   */
  private generatePatternDescription(failures: FailureEvent[]): string {
    const errorType = failures[0].errorType;
    const taskTypes = [...new Set(failures.map(f => f.taskType))];
    const roles = [...new Set(failures.filter(f => f.responsibleRole).map(f => f.responsibleRole!))];

    const parts: string[] = [];
    
    if (errorType !== 'unknown') {
      parts.push(`${errorType}错误`);
    }
    
    if (taskTypes.length === 1) {
      parts.push(`在${taskTypes[0]}任务中`);
    } else if (taskTypes.length > 1) {
      parts.push(`在多种任务(${taskTypes.length}种)`);
    }

    if (roles.length > 0) {
      parts.push(`涉及${roles.join(',')}角色`);
    }

    parts.push(`共发生${failures.length}次`);

    return parts.join('');
  }

  /**
   * Suggest preventive measures based on error type
   */
  private suggestPreventiveMeasures(failures: FailureEvent[]): string[] {
    const errorType = failures[0].errorType;
    const measures: string[] = [];

    switch (errorType) {
      case 'timeout':
        measures.push('增加超时时间限制');
        measures.push('添加重试机制');
        measures.push('优化任务执行效率');
        break;
      case 'network_error':
        measures.push('添加网络状态检查');
        measures.push('实现断线重连');
        measures.push('增加请求缓冲');
        break;
      case 'rate_limit':
        measures.push('实现请求限流');
        measures.push('添加请求队列');
        measures.push('使用指数退避策略');
        break;
      case 'invalid_input':
        measures.push('增强输入验证');
        measures.push('添加参数类型检查');
        measures.push('提供更明确的错误提示');
        break;
      case 'dependency_failed':
        measures.push('添加前置任务检查');
        measures.push('实现依赖健康检查');
        measures.push('添加任务依赖超时');
        break;
      case 'resource_exhausted':
        measures.push('实现资源监控');
        measures.push('添加资源配额管理');
        measures.push('优化内存使用');
        break;
      case 'model_error':
        measures.push('添加模型响应验证');
        measures.push('实现模型降级策略');
        measures.push('增加备用模型');
        break;
      default:
        measures.push('添加详细日志记录');
        measures.push('实现异常捕获');
        measures.push('添加监控告警');
    }

    return [...new Set(measures)];
  }

  /**
   * Calculate success rate of preventive measures
   */
  private calculateMeasureSuccessRate(measures: string[]): number {
    // Simplified: track if measures have been applied and if they worked
    // For now, return a default based on measure type
    const knownMeasures = measures.filter(m => 
      m.includes('重试') || m.includes('监控') || m.includes('检查')
    );
    return knownMeasures.length / Math.max(1, measures.length);
  }

  /**
   * Get most common severity in failures
   */
  private getMostCommonSeverity(failures: FailureEvent[]): FailureSeverity {
    const counts: Record<FailureSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const failure of failures) {
      counts[failure.severity]++;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])[0][0] as FailureSeverity;
  }

  /**
   * Update or add a pattern
   */
  private updatePattern(pattern: FailurePattern): void {
    const existing = this.findSimilarPattern(pattern);
    
    if (existing) {
      // Update existing pattern
      existing.frequency += pattern.frequency;
      existing.lastOccurrence = pattern.lastOccurrence;
      existing.confidence = Math.min(1, (existing.confidence + pattern.confidence) / 2);
      
      // Update root causes if new ones found
      for (const cause of pattern.rootCauses) {
        if (!existing.rootCauses.includes(cause)) {
          existing.rootCauses.push(cause);
        }
      }
      
      // Update measures if new ones have higher success
      if (pattern.successRateOfMeasures > existing.successRateOfMeasures) {
        existing.preventiveMeasures = pattern.preventiveMeasures;
        existing.successRateOfMeasures = pattern.successRateOfMeasures;
      }
    } else {
      // Add new pattern
      this.patterns.set(pattern.id, pattern);
    }
  }

  /**
   * Find similar existing pattern
   */
  private findSimilarPattern(pattern: FailurePattern): FailurePattern | undefined {
    for (const existing of this.patterns.values()) {
      if (existing.patternType === pattern.patternType) {
        return existing;
      }
    }
    return undefined;
  }

  /**
   * Prune old or low-confidence patterns
   */
  private prunePatterns(): void {
    if (this.patterns.size <= this.config.maxPatterns) return;

    const patterns = Array.from(this.patterns.values());
    
    // Sort by confidence and recency
    patterns.sort((a, b) => {
      const scoreA = a.confidence * (this.config.decayFactor ** this.getAgeFactor(a));
      const scoreB = b.confidence * (this.config.decayFactor ** this.getAgeFactor(b));
      return scoreB - scoreA;
    });

    // Keep only top patterns
    const toRemove = patterns.slice(this.config.maxPatterns);
    for (const pattern of toRemove) {
      this.patterns.delete(pattern.id);
    }
  }

  /**
   * Get age factor for a pattern
   */
  private getAgeFactor(pattern: FailurePattern): number {
    const ageMs = Date.now() - pattern.lastOccurrence;
    return ageMs / this.config.patternWindowMs;
  }

  /**
   * Analyze patterns and generate insights
   */
  analyze(): PatternAnalysis {
    const recentFailures = this.getRecentFailures();
    const allPatterns = Array.from(this.patterns.values());

    // Calculate trend
    const now = Date.now();
    const recentWindow = 7 * 24 * 60 * 60 * 1000; // 7 days
    const recentCount = recentFailures.filter(f => now - f.timestamp < recentWindow).length;
    const olderCount = recentFailures.filter(f => now - f.timestamp >= recentWindow).length;
    
    let trend: 'increasing' | 'stable' | 'decreasing';
    if (recentCount > olderCount * 1.2) {
      trend = 'increasing';
    } else if (recentCount < olderCount * 0.8) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Find most common and most severe patterns
    const sortedByFrequency = [...allPatterns].sort((a, b) => b.frequency - a.frequency);
    const sortedBySeverity = [...allPatterns].sort(
      (a, b) => (b.metadata.severity as number || 0) - (a.metadata.severity as number || 0)
    );

    // Calculate estimated loss time
    const estimatedLossTime = allPatterns.reduce(
      (sum, p) => sum + p.frequency * p.avgResolutionTime,
      0
    );

    // Detect new patterns
    const newPatterns = allPatterns.filter(
      p => now - p.firstOccurrence < 24 * 60 * 60 * 1000 // Within 24 hours
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(allPatterns, trend);

    return {
      totalFailures: recentFailures.length,
      uniquePatterns: allPatterns.length,
      mostCommonPattern: sortedByFrequency[0] || null,
      mostSeverePattern: sortedBySeverity[0] || null,
      trend,
      estimatedLossTime,
      recommendations,
      newPatternsDetected: newPatterns,
    };
  }

  /**
   * Generate recommendations based on patterns and trend
   */
  private generateRecommendations(
    patterns: FailurePattern[],
    trend: 'increasing' | 'stable' | 'decreasing'
  ): string[] {
    const recommendations: string[] = [];

    if (trend === 'increasing') {
      recommendations.push('失败率呈上升趋势，建议立即调查最近新增的失败模式');
    }

    // Top patterns by frequency
    const topPatterns = [...patterns]
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 3);

    for (const pattern of topPatterns) {
      if (pattern.successRateOfMeasures < 0.5 && pattern.preventiveMeasures.length > 0) {
        recommendations.push(
          `${pattern.patternType}的预防措施效果不佳(成功率${Math.round(pattern.successRateOfMeasures * 100)}%)，建议重新评估`
        );
      }
    }

    // High severity patterns
    const criticalPatterns = patterns.filter(p => p.metadata.severity === 'critical');
    if (criticalPatterns.length > 0) {
      recommendations.push(`存在${criticalPatterns.length}个严重失败模式，需要优先处理`);
    }

    // Timeout patterns
    const timeoutPatterns = patterns.filter(p => p.patternType.includes('timeout'));
    if (timeoutPatterns.length > 0) {
      recommendations.push('检测到超时问题，建议检查系统负载和网络状况');
    }

    // Rate limit patterns
    const rateLimitPatterns = patterns.filter(p => p.patternType.includes('rate_limit'));
    if (rateLimitPatterns.length > 0) {
      recommendations.push('检测到限流问题，建议优化请求频率或升级服务配额');
    }

    if (recommendations.length === 0) {
      recommendations.push('当前失败模式稳定，建议继续监控');
    }

    return recommendations;
  }

  /**
   * Get patterns for a specific task type
   */
  getPatternsForTaskType(taskType: TaskType): FailurePattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.affectedTaskTypes.includes(taskType));
  }

  /**
   * Get patterns for a specific role
   */
  getPatternsForRole(role: PersonaRole): FailurePattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.affectedRoles.includes(role));
  }

  /**
   * Get all patterns sorted by frequency
   */
  getAllPatterns(): FailurePattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get pattern by ID
   */
  getPattern(patternId: string): FailurePattern | undefined {
    return this.patterns.get(patternId);
  }

  /**
   * Get recent failures
   */
  getRecentFailuresList(limit: number = 50): FailureEvent[] {
    return Array.from(this.failures.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get failure statistics
   */
  getStatistics(): {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<FailureErrorType, number>;
    bySeverity: Record<FailureSeverity, number>;
    byRole: Record<PersonaRole, number>;
    avgResolutionTime: number;
  } {
    const failures = Array.from(this.failures.values());
    const resolved = failures.filter(f => f.resolved);
    const unresolved = failures.filter(f => !f.resolved);

    const byType: Record<FailureErrorType, number> = {
      timeout: 0,
      network_error: 0,
      rate_limit: 0,
      invalid_input: 0,
      dependency_failed: 0,
      resource_exhausted: 0,
      model_error: 0,
      unknown: 0,
    };

    const bySeverity: Record<FailureSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byRole: Record<PersonaRole, number> = {
      MemoryExpert: 0,
      EmotionAnalyst: 0,
      Advisor: 0,
      Researcher: 0,
      Coder: 0,
    };

    for (const failure of failures) {
      byType[failure.errorType]++;
      bySeverity[failure.severity]++;
      if (failure.responsibleRole) {
        byRole[failure.responsibleRole]++;
      }
    }

    const resolvedWithTime = resolved.filter(f => f.resolutionTime !== undefined);
    const avgResolutionTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, f) => sum + (f.resolutionTime || 0), 0) / resolvedWithTime.length
      : 0;

    return {
      total: failures.length,
      resolved: resolved.length,
      unresolved: unresolved.length,
      byType,
      bySeverity,
      byRole,
      avgResolutionTime,
    };
  }

  /**
   * Clear old failures
   */
  clearOldFailures(olderThanMs: number = 30 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    let count = 0;

    for (const [id, failure] of this.failures.entries()) {
      if (failure.timestamp < cutoff && failure.resolved) {
        this.failures.delete(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LearningConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFailurePatternLearner(
  config?: Partial<LearningConfig>
): FailurePatternLearner {
  return new FailurePatternLearner(config);
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isRetryableError(errorType: FailureErrorType): boolean {
  return ['timeout', 'network_error', 'rate_limit'].includes(errorType);
}

export function getErrorTypeSeverity(errorType: FailureErrorType): FailureSeverity {
  switch (errorType) {
    case 'critical':
      return 'critical';
    case 'resource_exhausted':
      return 'high';
    case 'timeout':
    case 'dependency_failed':
      return 'medium';
    default:
      return 'low';
  }
}
