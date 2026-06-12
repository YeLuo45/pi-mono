/**
 * SkillResultParser - V89 Agent×Skill Integration
 * 
 * Parses Skill execution results and generates structured feedback for Agent.
 * Features:
 * - Key information extraction
 * - Confidence scoring
 * - Next action suggestions
 * - Anomaly alerting
 */

import type { SkillResult } from './types';
import { chatCompletionWithTools } from '../ai/model-registry-adapter';

// ============================================================================
// Types
// ============================================================================

export interface ParsedSkillResult extends SkillResult {
  keyInformation: ExtractedInfo[];
  anomalies: Anomaly[];
  confidenceBreakdown: ConfidenceFactor[];
  formattedSummary: string;
}

export interface ExtractedInfo {
  key: string;
  value: string;
  importance: 'high' | 'medium' | 'low';
  source: string;
}

export interface Anomaly {
  type: 'error' | 'warning' | 'inconsistency' | 'low_confidence';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestion?: string;
}

export interface ConfidenceFactor {
  factor: string;
  weight: number;
  score: number; // 0-1
}

// ============================================================================
// SkillResultParser Implementation
// ============================================================================

class SkillResultParserImpl {
  // --------------------------------------------------------------------------
  // Main Parsing Entry Point
  // --------------------------------------------------------------------------

  /**
   * Parse a raw SkillResult and generate structured feedback for Agent
   */
  async parse(result: SkillResult, context?: ParseContext): Promise<ParsedSkillResult> {
    const keyInformation = this.extractKeyInformation(result);
    const anomalies = this.detectAnomalies(result, context);
    const confidenceBreakdown = this.calculateConfidenceBreakdown(result, context);
    const formattedSummary = await this.generateFormattedSummary(result, context);

    return {
      ...result,
      keyInformation,
      anomalies,
      confidenceBreakdown,
      formattedSummary,
      // Override summary with more detailed version
      summary: formattedSummary,
    };
  }

  /**
   * Quick parse without LLM (for simple results)
   */
  quickParse(result: SkillResult): ParsedSkillResult {
    const keyInformation = this.extractKeyInformation(result);
    const anomalies = this.detectAnomalies(result);
    const confidenceBreakdown = this.calculateConfidenceBreakdown(result);

    return {
      ...result,
      keyInformation,
      anomalies,
      confidenceBreakdown,
      formattedSummary: this.generateQuickSummary(result),
    };
  }

  // --------------------------------------------------------------------------
  // Key Information Extraction
  // --------------------------------------------------------------------------

  /**
   * Extract key information from skill result
   */
  private extractKeyInformation(result: SkillResult): ExtractedInfo[] {
    const info: ExtractedInfo[] = [];

    if (!result.success) {
      info.push({
        key: 'error',
        value: result.summary,
        importance: 'high',
        source: 'skill_execution',
      });
      return info;
    }

    // Parse data for structured info
    if (result.data) {
      const dataStr = typeof result.data === 'string' 
        ? result.data 
        : JSON.stringify(result.data);

      // Extract potential key-value pairs
      const extracted = this.extractKeyValues(dataStr);
      info.push(...extracted);
    }

    // Add metadata as info
    for (const [key, value] of Object.entries(result.metadata || {})) {
      if (this.isSignificantMetadata(key, value)) {
        info.push({
          key,
          value: String(value),
          importance: this.getMetadataImportance(key),
          source: 'metadata',
        });
      }
    }

    return info;
  }

  /**
   * Extract key-value pairs from text
   */
  private extractKeyValues(text: string): ExtractedInfo[] {
    const info: ExtractedInfo[] = [];
    
    // Pattern: "Key: Value" or "Key - Value"
    const kvPattern = /([A-Za-z\u4e00-\u9fa5]{2,20})[:：]\s*([^\n,，]{3,100})/g;
    let match;
    
    while ((match = kvPattern.exec(text)) !== null) {
      const [, key, value] = match;
      if (value.length > 5) {
        info.push({
          key: key.trim(),
          value: value.trim(),
          importance: 'medium',
          source: 'text_parse',
        });
      }
    }

    return info;
  }

  /**
   * Check if metadata is significant enough to include
   */
  private isSignificantMetadata(key: string, value: unknown): boolean {
    const excludedKeys = ['executionId', 'skillId', 'timestamp', 'traceId'];
    if (excludedKeys.includes(key)) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === 'object') return false; // Skip nested objects
    return true;
  }

  /**
   * Get importance level for metadata key
   */
  private getMetadataImportance(key: string): 'high' | 'medium' | 'low' {
    const highImportance = ['durationMs', 'tokensUsed', 'confidence'];
    const mediumImportance = ['skillName', 'category', 'tags'];
    
    if (highImportance.includes(key)) return 'high';
    if (mediumImportance.includes(key)) return 'medium';
    return 'low';
  }

  // --------------------------------------------------------------------------
  // Anomaly Detection
  // --------------------------------------------------------------------------

  /**
   * Detect anomalies in skill execution result
   */
  private detectAnomalies(result: SkillResult, context?: ParseContext): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Failure detection
    if (!result.success) {
      anomalies.push({
        type: 'error',
        message: result.summary || '技能执行失败',
        severity: 'critical',
        suggestion: '检查技能配置和输入参数，或联系技能开发者',
      });
    }

    // Low confidence warning
    if (result.confidence < 0.5) {
      anomalies.push({
        type: 'low_confidence',
        message: `置信度过低: ${Math.round(result.confidence * 100)}%`,
        severity: result.confidence < 0.3 ? 'high' : 'medium',
        suggestion: '建议人工复核结果或重试',
      });
    }

    // Empty result warning
    if (result.success && !result.data) {
      anomalies.push({
        type: 'warning',
        message: '技能返回空结果',
        severity: 'medium',
        suggestion: '可能需要调整技能输入或等待数据源更新',
      });
    }

    // Check for common error patterns in data
    if (result.data && typeof result.data === 'string') {
      const errorPatterns = [
        { pattern: /rate limit|ratelimit|限流/i, message: 'API速率限制' },
        { pattern: /timeout|超时/i, message: '请求超时' },
        { pattern: /unauthorized|未授权|权限不足/i, message: '权限验证失败' },
        { pattern: /not found|不存在|404/i, message: '资源不存在' },
        { pattern: /server error|服务器错误|500/i, message: '服务器内部错误' },
      ];

      for (const { pattern, message } of errorPatterns) {
        if (pattern.test(result.data)) {
          anomalies.push({
            type: 'error',
            message,
            severity: 'high',
            suggestion: '检查API配置或稍后重试',
          });
        }
      }
    }

    // Context-specific anomalies
    if (context) {
      if (context.expectedDuration && result.metadata?.durationMs) {
        const actualDuration = result.metadata.durationMs as number;
        if (actualDuration > context.expectedDuration * 2) {
          anomalies.push({
            type: 'warning',
            message: `执行时间异常: 实际${actualDuration}ms vs 预期${context.expectedDuration}ms`,
            severity: 'low',
            suggestion: '可能是网络延迟或服务繁忙',
          });
        }
      }
    }

    return anomalies;
  }

  // --------------------------------------------------------------------------
  // Confidence Calculation
  // --------------------------------------------------------------------------

  /**
   * Calculate detailed confidence breakdown
   */
  private calculateConfidenceBreakdown(
    result: SkillResult,
    context?: ParseContext
  ): ConfidenceFactor[] {
    const factors: ConfidenceFactor[] = [];

    // Base confidence from result
    factors.push({
      factor: '基础置信度',
      weight: 0.4,
      score: result.confidence,
    });

    // Success factor
    factors.push({
      factor: '执行状态',
      weight: 0.25,
      score: result.success ? 1.0 : 0.0,
    });

    // Anomaly factor (deduct for anomalies)
    const anomalyCount = this.detectAnomalies(result).length;
    factors.push({
      factor: '异常检测',
      weight: 0.2,
      score: Math.max(0, 1 - anomalyCount * 0.15),
    });

    // Context factor (if provided)
    if (context?.historicalConfidence) {
      factors.push({
        factor: '历史表现',
        weight: 0.15,
        score: context.historicalConfidence,
      });
    }

    return factors;
  }

  // --------------------------------------------------------------------------
  // Summary Generation
  // --------------------------------------------------------------------------

  /**
   * Generate formatted summary using LLM
   */
  private async generateFormattedSummary(
    result: SkillResult,
    context?: ParseContext
  ): Promise<string> {
    // Build prompt
    const prompt = `分析以下技能执行结果，生成简洁的中文摘要：

成功状态: ${result.success ? '成功' : '失败'}
原始摘要: ${result.summary}
置信度: ${Math.round(result.confidence * 100)}%
建议的下一步: ${result.nextActions.join(', ') || '无'}
元数据: ${JSON.stringify(result.metadata)}

${context?.taskDescription ? `任务描述: ${context.taskDescription}` : ''}

请生成50字以内的摘要，包含：
1. 执行结果的核心内容
2. 关键发现（如有）
3. 对下一步行动的建议

格式: "结论/发现 + 建议"`;

    try {
      const response = await chatCompletionWithTools(
        [{ role: 'user' as const, content: prompt }],
        [],
        'shell'
      );
      
      const summary = typeof response === 'string' ? response : JSON.stringify(response);
      // Clean up the response
      return summary.replace(/\n/g, ' ').substring(0, 200);
    } catch {
      // Fallback to quick summary
      return this.generateQuickSummary(result);
    }
  }

  /**
   * Generate quick summary without LLM
   */
  private generateQuickSummary(result: SkillResult): string {
    if (result.success) {
      const dataPreview = result.data
        ? (typeof result.data === 'string'
            ? result.data.substring(0, 50)
            : JSON.stringify(result.data).substring(0, 50))
        : '无数据';
      
      return `[成功 ${Math.round(result.confidence * 100)}%] ${dataPreview}`;
    }
    
    return `[失败] ${result.summary}`;
  }

  // --------------------------------------------------------------------------
  // Utility Methods
  // --------------------------------------------------------------------------

  /**
   * Aggregate multiple skill results
   */
  aggregateResults(results: SkillResult[]): AggregatedResults {
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);
    
    // Calculate overall confidence
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    // Collect all next actions
    const allNextActions = new Set<string>();
    results.forEach(r => r.nextActions.forEach(a => allNextActions.add(a)));
    
    // Merge metadata
    const mergedMetadata: Record<string, unknown> = {};
    results.forEach(r => {
      Object.entries(r.metadata).forEach(([k, v]) => {
        if (!(k in mergedMetadata)) {
          mergedMetadata[k] = v;
        }
      });
    });

    return {
      totalCount: results.length,
      successCount: successes.length,
      failureCount: failures.length,
      overallConfidence: avgConfidence,
      aggregatedSummary: this.generateAggregatedSummary(successes, failures),
      consolidatedNextActions: Array.from(allNextActions),
      mergedMetadata,
    };
  }

  /**
   * Generate aggregated summary text
   */
  private generateAggregatedSummary(
    successes: SkillResult[],
    failures: SkillResult[]
  ): string {
    const total = successes.length + failures.length;
    if (successes.length === total && successes.length > 0) {
      return `全部 ${successes.length} 个技能执行成功`;
    }
    if (failures.length === total && failures.length > 0) {
      return `全部 ${failures.length} 个技能执行失败`;
    }
    return `${successes.length} 成功 / ${failures.length} 失败`;
  }

  /**
   * Format result for Agent context injection
   */
  formatForAgentContext(parsed: ParsedSkillResult): string {
    const lines: string[] = [];
    
    lines.push(`【技能执行结果】`);
    lines.push(`状态: ${parsed.success ? '✓ 成功' : '✗ 失败'}`);
    lines.push(`置信度: ${Math.round(parsed.confidence * 100)}%`);
    
    if (parsed.keyInformation.length > 0) {
      lines.push(`\n关键信息:`);
      for (const info of parsed.keyInformation.slice(0, 5)) {
        lines.push(`  • ${info.key}: ${info.value}`);
      }
    }
    
    if (parsed.anomalies.length > 0) {
      lines.push(`\n⚠️ 异常提醒:`);
      for (const anomaly of parsed.anomalies) {
        lines.push(`  • [${anomaly.severity}] ${anomaly.message}`);
        if (anomaly.suggestion) {
          lines.push(`    建议: ${anomaly.suggestion}`);
        }
      }
    }
    
    if (parsed.nextActions.length > 0) {
      lines.push(`\n建议的下一步:`);
      for (const action of parsed.nextActions.slice(0, 3)) {
        lines.push(`  → ${action}`);
      }
    }
    
    return lines.join('\n');
  }
}

// ============================================================================
// Types for aggregation
// ============================================================================

export interface AggregatedResults {
  totalCount: number;
  successCount: number;
  failureCount: number;
  overallConfidence: number;
  aggregatedSummary: string;
  consolidatedNextActions: string[];
  mergedMetadata: Record<string, unknown>;
}

export interface ParseContext {
  taskDescription?: string;
  expectedDuration?: number;
  historicalConfidence?: number;
  userId?: string;
}

// Singleton
export const skillResultParser = new SkillResultParserImpl();
export default skillResultParser;
