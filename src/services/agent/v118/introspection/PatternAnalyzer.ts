/**
 * PatternAnalyzer - Analyzes task execution patterns and success metrics
 */

import type { ExecutionRecord, TaskPattern, ExecutionStats } from './types';
import { ExecutionRecorder } from './ExecutionRecorder';

export class PatternAnalyzer {
  private recorder: ExecutionRecorder;

  constructor(recorder: ExecutionRecorder) {
    this.recorder = recorder;
  }

  /**
   * Analyze patterns for a specific task type
   */
  analyzeTaskType(taskType: string): TaskPattern | null {
    const records = this.recorder.getByTaskType(taskType, 100);
    if (records.length === 0) return null;

    const successRecords = records.filter(r => r.status === 'success');
    const durations = records.map(r => r.duration);
    const subTasks = records.map(r => r.subTaskCount);

    // Find best agent combination (most successful)
    const agentComboCount = new Map<string, number>();
    for (const record of successRecords) {
      const combo = record.agentAssignments.sort().join('+');
      agentComboCount.set(combo, (agentComboCount.get(combo) || 0) + 1);
    }
    const bestCombo = Array.from(agentComboCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0].split('+') || [];

    // Calculate trend (compare recent vs older executions)
    const sortedByTime = records.sort((a, b) => a.startTime - b.startTime);
    const mid = Math.floor(sortedByTime.length / 2);
    const recentRecords = sortedByTime.slice(mid);
    const olderRecords = sortedByTime.slice(0, mid);
    
    const recentSuccessRate = recentRecords.filter(r => r.status === 'success').length / recentRecords.length;
    const olderSuccessRate = olderRecords.length > 0 
      ? olderRecords.filter(r => r.status === 'success').length / olderRecords.length 
      : recentSuccessRate;
    
    let trend: TaskPattern['trend'] = 'stable';
    if (recentSuccessRate > olderSuccessRate + 0.1) trend = 'improving';
    else if (recentSuccessRate < olderSuccessRate - 0.1) trend = 'degrading';

    return {
      taskType,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      successRate: successRecords.length / records.length,
      avgSubTasks: subTasks.reduce((a, b) => a + b, 0) / subTasks.length,
      bestAgentCombination: bestCombo,
      executionCount: records.length,
      lastExecutedAt: records[0].startTime,
      trend,
    };
  }

  /**
   * Get all known task patterns
   */
  getAllPatterns(): TaskPattern[] {
    const taskTypes = Array.from(this.recorder.getCountByTaskType().keys());
    return taskTypes
      .map(tt => this.analyzeTaskType(tt))
      .filter((p): p is TaskPattern => p !== null)
      .sort((a, b) => b.executionCount - a.executionCount);
  }

  /**
   * Get global execution statistics
   */
  getGlobalStats(): ExecutionStats {
    const records = this.recorder.getRecent(500);
    const successRecords = records.filter(r => r.status === 'success');
    const failureRecords = records.filter(r => r.status === 'failed');

    // Most common failure message
    const failureMessages = new Map<string, number>();
    for (const record of failureRecords) {
      const msg = record.errorMessage || 'Unknown error';
      failureMessages.set(msg, (failureMessages.get(msg) || 0) + 1);
    }
    const mostCommonFailure = Array.from(failureMessages.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    return {
      totalExecutions: records.length,
      successCount: successRecords.length,
      failureCount: failureRecords.length,
      avgDuration: records.map(r => r.duration).reduce((a, b) => a + b, 0) / records.length,
      totalDuration: records.map(r => r.duration).reduce((a, b) => a + b, 0),
      mostCommonFailure,
    };
  }

  /**
   * Get time series data for success rate trending
   */
  getSuccessRateTimeSeries(bucketCount: number = 10): { bucket: number; successRate: number }[] {
    const records = this.recorder.getRecent(200).sort((a, b) => a.startTime - b.startTime);
    if (records.length === 0) return [];

    const minTime = records[0].startTime;
    const maxTime = records[records.length - 1].startTime;
    const bucketSize = (maxTime - minTime) / bucketCount || 1;

    const buckets: Map<number, { total: number; success: number }> = new Map();
    for (let i = 0; i < bucketCount; i++) {
      buckets.set(i, { total: 0, success: 0 });
    }

    for (const record of records) {
      const bucketIdx = Math.min(Math.floor((record.startTime - minTime) / bucketSize), bucketCount - 1);
      const bucket = buckets.get(bucketIdx)!;
      bucket.total++;
      if (record.status === 'success') bucket.success++;
    }

    return Array.from(buckets.entries()).map(([idx, bucket]) => ({
      bucket: idx,
      successRate: bucket.total > 0 ? bucket.success / bucket.total : 0,
    }));
  }
}
