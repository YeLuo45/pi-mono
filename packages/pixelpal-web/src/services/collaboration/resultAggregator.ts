/**
 * Result Aggregator - V33 Multi-Agent Collaboration System
 * 
 * Aggregates multiple subtask results into a coherent final response.
 * Handles conflict resolution and confidence weighting.
 */

import type {
  SubtaskResult,
  CollaborationSession,
  SharedContext,
  ConflictReport,
  ConflictStrategy,
} from './types';
import { getRoleDisplayName, getRoleEmoji } from './personaRoleRegistry';

// ============================================================================
// Result Aggregator Implementation
// ============================================================================

export interface AggregationOptions {
  strategy: 'concatenation' | 'weighted' | 'hierarchical';
  maxLength?: number;       // Max final response length
  includeConfidence?: boolean;
  conflictResolution?: ConflictStrategy;
}

const DEFAULT_OPTIONS: AggregationOptions = {
  strategy: 'concatenation',
  maxLength: 500,
  includeConfidence: true,
  conflictResolution: 'confidence_weighted',
};

/**
 * Aggregate multiple subtask results into a final response
 */
export class ResultAggregator {
  /**
   * Aggregate results using the specified strategy
   */
  aggregate(
    results: SubtaskResult[],
    userRequest: string,
    options: Partial<AggregationOptions> = {}
  ): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (results.length === 0) {
      return '抱歉，无法生成回复。';
    }

    switch (opts.strategy) {
      case 'concatenation':
        return this.concatenate(results, opts);
      case 'weighted':
        return this.weightedAggregate(results, opts);
      case 'hierarchical':
        return this.hierarchicalAggregate(results, opts);
      default:
        return this.concatenate(results, opts);
    }
  }

  /**
   * Simple concatenation of results
   */
  private concatenate(results: SubtaskResult[], opts: AggregationOptions): string {
    const parts: string[] = [];

    for (const result of results) {
      const header = `${getRoleEmoji(result.role)} ${getRoleDisplayName(result.role)}`;
      const content = result.output.split('\n').slice(1).join(' ').trim();
      parts.push(`${header}：${content}`);
    }

    let response = parts.join('\n\n');

    if (opts.maxLength && response.length > opts.maxLength) {
      response = response.slice(0, opts.maxLength) + '...';
    }

    return response;
  }

  /**
   * Weighted aggregation based on confidence scores
   */
  private weightedAggregate(results: SubtaskResult[], opts: AggregationOptions): string {
    // Sort by confidence
    const sorted = [...results].sort((a, b) => b.confidence - a.confidence);

    const parts: string[] = [];
    let totalConfidence = 0;

    for (const result of sorted) {
      const weight = result.confidence;
      totalConfidence += weight;

      const header = `${getRoleEmoji(result.role)} ${getRoleDisplayName(result.role)}`;
      const content = result.output.split('\n').slice(1).join(' ').trim();
      parts.push(`【置信度 ${Math.round(weight * 100)}%】${header}：${content}`);
    }

    const avgConfidence = totalConfidence / results.length;
    let response = parts.join('\n\n');

    if (opts.includeConfidence) {
      response += `\n\n📈 综合置信度：${Math.round(avgConfidence * 100)}%`;
    }

    if (opts.maxLength && response.length > opts.maxLength) {
      response = response.slice(0, opts.maxLength) + '...';
    }

    return response;
  }

  /**
   * Hierarchical aggregation - Advisor synthesizes others
   */
  private hierarchicalAggregate(results: SubtaskResult[], opts: AggregationOptions): string {
    // Find advisor result if exists
    const advisorResult = results.find(r => r.role === 'Advisor');
    const otherResults = results.filter(r => r.role !== 'Advisor');

    if (advisorResult) {
      // Advisor provides synthesis
      const synthesis = advisorResult.output.split('\n').slice(1).join(' ').trim();

      let response = `💡 综合建议：\n\n${synthesis}`;

      if (opts.includeConfidence) {
        response += `\n\n📊 置信度：${Math.round(advisorResult.confidence * 100)}%`;
      }

      // Optionally include other results as details
      if (otherResults.length > 0 && opts.maxLength && response.length < opts.maxLength - 200) {
        response += '\n\n---\n📋 详细分析：';
        for (const result of otherResults) {
          const content = result.output.split('\n').slice(1).join(' ').trim();
          response += `\n• ${getRoleDisplayName(result.role)}：${content}`;
        }
      }

      if (opts.maxLength && response.length > opts.maxLength) {
        response = response.slice(0, opts.maxLength) + '...';
      }

      return response;
    }

    // Fallback to concatenation
    return this.concatenate(results, opts);
  }

  /**
   * Detect conflicts between results
   */
  detectConflicts(results: SubtaskResult[]): ConflictReport[] {
    const conflicts: ConflictReport[] = [];

    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const resultA = results[i];
        const resultB = results[j];

        // Simple conflict detection based on keywords
        if (this.haveConflict(resultA.output, resultB.output)) {
          conflicts.push({
            subtaskIdA: resultA.subtaskId,
            subtaskIdB: resultB.subtaskId,
            conclusionA: resultA.output.slice(0, 100),
            conclusionB: resultB.output.slice(0, 100),
            strategy: 'confidence_weighted',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Simple conflict detection based on opposing keywords
   */
  private haveConflict(textA: string, textB: string): boolean {
    const positive = ['好', '积极', '正面', '上升', '提高', '推荐', 'good', 'positive', 'increase'];
    const negative = ['坏', '消极', '负面', '下降', '降低', '不推荐', 'bad', 'negative', 'decrease'];

    const hasPositive = (text: string) => positive.some(w => text.includes(w));
    const hasNegative = (text: string) => negative.some(w => text.includes(w));

    // Conflict if one is positive and other is negative
    return (hasPositive(textA) && hasNegative(textB)) ||
           (hasNegative(textA) && hasPositive(textB));
  }

  /**
   * Resolve conflicts using specified strategy
   */
  resolveConflict(conflict: ConflictReport, results: SubtaskResult[]): string {
    const resultA = results.find(r => r.subtaskId === conflict.subtaskIdA);
    const resultB = results.find(r => r.subtaskId === conflict.subtaskIdB);

    if (!resultA || !resultB) {
      return '无法解决冲突';
    }

    switch (conflict.strategy) {
      case 'vote':
        // Simple majority - just pick higher confidence
        return resultA.confidence >= resultB.confidence ? resultA.output : resultB.output;

      case 'arbitration':
        // Use third party (simulated) - Advisor role
        const advisorResult = results.find(r => r.role === 'Advisor');
        return advisorResult?.output ?? resultA.output;

      case 'confidence_weighted':
      default:
        // Weight by confidence
        const weightedA = resultA.confidence / (resultA.confidence + resultB.confidence);
        const weightedB = resultB.confidence / (resultA.confidence + resultB.confidence);

        if (weightedA > weightedB + 0.2) {
          return resultA.output;
        } else if (weightedB > weightedA + 0.2) {
          return resultB.output;
        } else {
          // Too close - combine both
          return `综合考虑：\n${resultA.output}\n\n同时注意：\n${resultB.output}`;
        }
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createResultAggregator(): ResultAggregator {
  return new ResultAggregator();
}
