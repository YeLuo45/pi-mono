// V84 Critic Engine Service
// Reviews task outputs, generates improvement suggestions, and scores results

import type { CriticReview, DecomposedTask, ExecutionResult } from '../../types/agent';

interface ReviewCriteria {
  name: string;
  weight: number;
  description: string;
}

const REVIEW_CRITERIA: ReviewCriteria[] = [
  { name: 'completeness', weight: 0.3, description: '任务是否完整完成' },
  { name: 'accuracy', weight: 0.3, description: '输出是否准确' },
  { name: 'relevance', weight: 0.2, description: '是否与需求相关' },
  { name: 'clarity', weight: 0.2, description: '表达是否清晰' },
];

export class CriticEngine {
  private maxRetries: number = 3;

  /**
   * Set maximum retry count
   */
  setMaxRetries(max: number): void {
    this.maxRetries = Math.max(1, Math.min(max, 5));
  }

  /**
   * Generate a comprehensive review of task execution
   */
  review(task: DecomposedTask, output: string): CriticReview {
    const scores = this.evaluateCriteria(task, output);
    const overallScore = this.calculateWeightedScore(scores);
    const issues = this.identifyIssues(task, output, scores);
    const suggestions = this.generateSuggestions(task, output, scores);

    return {
      taskId: task.id,
      score: overallScore,
      issues,
      suggestions,
      approved: overallScore >= 5.0,
      timestamp: Date.now(),
    };
  }

  /**
   * Evaluate each criterion
   */
  private evaluateCriteria(task: DecomposedTask, output: string): Map<string, number> {
    const scores = new Map<string, number>();

    for (const criterion of REVIEW_CRITERIA) {
      scores.set(criterion.name, this.scoreCriterion(criterion.name, task, output));
    }

    return scores;
  }

  /**
   * Score a specific criterion
   */
  private scoreCriterion(criterion: string, task: DecomposedTask, output: string): number {
    let score = 5; // Default neutral score

    switch (criterion) {
      case 'completeness':
        score = this.scoreCompleteness(task, output);
        break;
      case 'accuracy':
        score = this.scoreAccuracy(task, output);
        break;
      case 'relevance':
        score = this.scoreRelevance(task, output);
        break;
      case 'clarity':
        score = this.scoreClarity(output);
        break;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Score completeness
   */
  private scoreCompleteness(task: DecomposedTask, output: string): number {
    if (!output || output.trim().length === 0) return 0;

    const taskTitle = task.title.toLowerCase();
    const outputLower = output.toLowerCase();

    // Check for expected keywords based on task type
    const expectedIndicators: Record<string, string[]> = {
      'information gathering': ['find', 'discover', 'gather', 'search', 'result'],
      'data analysis': ['analyze', 'result', 'data', 'trend', 'pattern'],
      'report writing': ['summary', 'report', 'conclusion', 'findings'],
      'code implementation': ['code', 'function', 'implement', 'class', 'method'],
      'testing': ['test', 'pass', 'fail', 'verify', 'result'],
      'review': ['review', 'suggest', 'improve', 'recommendation'],
      'planning': ['plan', 'schedule', 'timeline', 'milestone'],
      'execution': ['execute', 'complete', 'perform', 'action'],
    };

    const indicators = expectedIndicators[taskTitle] || ['complete', 'done', 'result'];
    const matchedIndicators = indicators.filter(ind => outputLower.includes(ind));

    // Score based on indicator match ratio
    const matchRatio = matchedIndicators.length / indicators.length;
    return 5 + matchRatio * 5; // Range: 5-10
  }

  /**
   * Score accuracy
   */
  private scoreAccuracy(task: DecomposedTask, output: string): number {
    if (!output) return 0;

    // Basic sanity checks
    const outputLower = output.toLowerCase();

    // Check for common error indicators
    const errorIndicators = ['error', 'fail', 'wrong', 'incorrect', 'bug', 'issue'];
    const hasErrors = errorIndicators.some(err => outputLower.includes(err));

    if (hasErrors) {
      return 3;
    }

    // Check for placeholder text
    const placeholderIndicators = ['todo', 'placeholder', 'xxx', 'tbd'];
    const hasPlaceholders = placeholderIndicators.some(ph => outputLower.includes(ph));

    if (hasPlaceholders) {
      return 4;
    }

    // Length sanity check (not too short, not too long)
    const wordCount = output.split(/\s+/).length;
    if (wordCount < 10) return 4;
    if (wordCount > 5000) return 6;

    return 7;
  }

  /**
   * Score relevance
   */
  private scoreRelevance(task: DecomposedTask, output: string): number {
    if (!task.input || !output) return 5;

    const inputKeywords = this.extractKeywords(task.input);
    const outputLower = output.toLowerCase();

    const matchedKeywords = inputKeywords.filter(kw =>
      outputLower.includes(kw.toLowerCase())
    );

    if (inputKeywords.length === 0) return 7;

    const matchRatio = matchedKeywords.length / inputKeywords.length;
    return 5 + matchRatio * 5; // Range: 5-10
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      '我', '的', '是', '在', '有', '和', '了', '就', '都', '也', '要',
    ]);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Score clarity
   */
  private scoreClarity(output: string): number {
    if (!output) return 0;

    // Check for structure
    const hasStructure = output.includes('\n') || output.includes('•') || output.includes('- ');
    const hasNumbers = /\d+\./.test(output);
    const hasHeaders = /^#{1,3}\s/m.test(output);

    let score = 5;

    if (hasStructure) score += 1;
    if (hasNumbers) score += 1;
    if (hasHeaders) score += 1;

    // Check for excessive length without structure
    const paragraphs = output.split(/\n\n+/).length;
    const wordsPerParagraph = output.split(/\s+/).length / Math.max(1, paragraphs);

    if (wordsPerParagraph > 200) {
      score -= 1; // Penalize too dense text
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Calculate weighted overall score
   */
  private calculateWeightedScore(scores: Map<string, number>): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const criterion of REVIEW_CRITERIA) {
      const score = scores.get(criterion.name) || 0;
      weightedSum += score * criterion.weight;
      totalWeight += criterion.weight;
    }

    return Math.round(weightedSum / totalWeight * 10) / 10;
  }

  /**
   * Identify issues in the output
   */
  private identifyIssues(task: DecomposedTask, output: string, scores: Map<string, number>): string[] {
    const issues: string[] = [];

    const completeness = scores.get('completeness') || 0;
    if (completeness < 5) {
      issues.push('任务输出不完整，缺少关键内容');
    }

    const accuracy = scores.get('accuracy') || 0;
    if (accuracy < 5) {
      issues.push('输出存在错误或包含占位符文本');
    }

    const relevance = scores.get('relevance') || 0;
    if (relevance < 5) {
      issues.push('输出与原始需求关联度不高');
    }

    const clarity = scores.get('clarity') || 0;
    if (clarity < 5) {
      issues.push('输出结构不清晰，缺乏组织');
    }

    if (!output || output.trim().length === 0) {
      issues.push('输出为空');
    }

    return issues;
  }

  /**
   * Generate actionable improvement suggestions
   */
  private generateSuggestions(task: DecomposedTask, output: string, scores: Map<string, number>): string[] {
    const suggestions: string[] = [];

    const completeness = scores.get('completeness') || 0;
    if (completeness < 7) {
      suggestions.push('补充更多细节和相关背景信息');
    }

    const accuracy = scores.get('accuracy') || 0;
    if (accuracy < 7) {
      suggestions.push('检查并修正可能的错误或遗漏');
    }

    const relevance = scores.get('relevance') || 0;
    if (relevance < 7) {
      suggestions.push('确保输出紧密围绕原始需求展开');
    }

    const clarity = scores.get('clarity') || 0;
    if (clarity < 7) {
      suggestions.push('使用列表、编号或分段来组织内容');
    }

    // Task-specific suggestions
    const taskTitle = task.title.toLowerCase();
    if (taskTitle.includes('report') || taskTitle.includes('writing')) {
      suggestions.push('建议添加执行摘要和结论部分');
    }
    if (taskTitle.includes('code') || taskTitle.includes('implementation')) {
      suggestions.push('建议添加代码注释和错误处理');
    }
    if (taskTitle.includes('analysis')) {
      suggestions.push('建议添加数据支持和可视化说明');
    }

    if (suggestions.length === 0) {
      suggestions.push('输出质量良好，继续保持');
    }

    return suggestions.slice(0, 3); // Return max 3 suggestions
  }

  /**
   * Determine if a task should be retried
   */
  shouldRetry(task: DecomposedTask, retryCount: number): boolean {
    if (retryCount >= this.maxRetries) {
      return false;
    }

    return true;
  }

  /**
   * Create execution result with critic review
   */
  createExecutionResult(task: DecomposedTask, output: string, retryCount: number = 0): ExecutionResult {
    const criticReview = this.review(task, output);

    return {
      taskId: task.id,
      output,
      criticReview,
      retryCount,
      timestamp: Date.now(),
    };
  }
}

// Singleton export
export const criticEngine = new CriticEngine();

export default criticEngine;
