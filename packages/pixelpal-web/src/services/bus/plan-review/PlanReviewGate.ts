/**
 * Plan Review Gate
 * V103: Stub implementation for quality control before agent execution
 */

import type { PlanReviewResult, ReviewConfig } from './types';

// Review prompt strategy (from PRD section 3.4)
const REVIEW_PROMPT = `请审查以下 Agent 执行计划：
Plan: {planText}
Expected Output: {expectedOutput}
历史上下文: {recentHistory}

请从以下维度评分(0-100)并给出意见：
1. 清晰度 — 目标是否明确？
2. 可行性 — 步骤是否可执行？
3. 安全性 — 是否有风险操作？
4. 效率 — 是否最优路径？

返回 JSON: {"isApproved": bool, "score": number, "feedback": string}`;

export class PlanReviewGate {
  /**
   * Review a plan before execution
   * Stub implementation returns auto-approved result
   */
  async review(
    planText: string,
    config: ReviewConfig,
    options?: {
      expectedOutput?: string;
      recentHistory?: string[];
    }
  ): Promise<PlanReviewResult> {
    // Stub: Return auto-approved result without calling LLM
    return {
      isApproved: true,
      score: 85,
      feedback: 'Auto-approved in stub mode',
      retryCount: 0,
    };
  }

  /**
   * Get the review prompt template
   */
  getPromptTemplate(): string {
    return REVIEW_PROMPT;
  }
}

// Singleton instance for convenience
export const planReviewGate = new PlanReviewGate();