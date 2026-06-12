/**
 * planningUtils - Utilities for planning mode detection
 */

/**
 * Whether a message should trigger planning/agent mode
 */
export function shouldUsePlanningMode(message: string): boolean {
  const keywords = ['帮我', '帮我做', '计划', '安排', '分析', '整理', '搜索', '查找', '帮我找', '任务'];
  return keywords.some((kw) => message.includes(kw));
}

/**
 * Estimate number of steps for a given goal
 */
export function estimateStepCount(goal: string): number {
  const len = goal.length;
  if (len < 10) return 1;
  if (len < 30) return 2;
  if (len < 60) return 3;
  return 5;
}
