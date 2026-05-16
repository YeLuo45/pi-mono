/**
 * Plan Review Gate Types
 * V103: Plan Review Gate stub for quality control before agent execution
 */

/**
 * Result of a plan review operation
 */
export interface PlanReviewResult {
  isApproved: boolean;
  score: number;           // 0-100
  feedback: string;        // 审查意见
  retryCount: number;
}

/**
 * Configuration for the plan review gate
 */
export interface ReviewConfig {
  enabled: boolean;
  reviewModel: string;     // 使用的审查模型
  maxRetries: number;      // 默认 2
}