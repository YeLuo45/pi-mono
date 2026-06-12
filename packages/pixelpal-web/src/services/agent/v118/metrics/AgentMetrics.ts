/**
 * AgentMetrics - Computes per-agent KPIs from execution records
 */

import type { AgentMetrics as AgentMetricsType } from '../introspection/types';
import { ExecutionRecorder } from '../introspection/ExecutionRecorder';

export class AgentMetrics {
  private recorder: ExecutionRecorder;

  constructor(recorder: ExecutionRecorder) {
    this.recorder = recorder;
  }

  /**
   * Get metrics for a specific agent
   */
  getAgentMetrics(agentId: string): AgentMetricsType | null {
    const records = this.recorder.getByAgent(agentId, 200);
    if (records.length === 0) return null;

    const durations = records.map(r => r.duration);
    const successRecords = records.filter(r => r.status === 'success');
    const failureRecords = records.filter(r => r.status === 'failed');

    // Calculate consecutive failures (from most recent)
    let consecutiveFailures = 0;
    const sortedByTime = records.sort((a, b) => b.startTime - a.startTime);
    for (const record of sortedByTime) {
      if (record.status === 'failed') consecutiveFailures++;
      else break;
    }

    // Calculate sub-tasks per execution
    const subTasks = records.map(r => r.subTaskCount);
    const avgSubTasks = subTasks.reduce((a, b) => a + b, 0) / subTasks.length;

    return {
      agentId,
      totalExecutions: records.length,
      successCount: successRecords.length,
      failureCount: failureRecords.length,
      successRate: records.length > 0 ? successRecords.length / records.length : 0,
      avgResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length,
      minResponseTime: Math.min(...durations),
      maxResponseTime: Math.max(...durations),
      currentLoad: 0, // Would be set by real-time monitoring
      peakLoad: Math.max(...durations) / 1000, // Simplified
      lastExecutionAt: records[0].startTime,
      consecutiveFailures,
      avgSubTasksPerExecution: avgSubTasks,
    };
  }

  /**
   * Get metrics for all known agents
   */
  getAllAgentMetrics(): AgentMetricsType[] {
    const agentIds = Array.from(this.recorder.getCountByAgent().keys());
    return agentIds
      .map(id => this.getAgentMetrics(id))
      .filter((m): m is AgentMetricsType => m !== null)
      .sort((a, b) => b.totalExecutions - a.totalExecutions);
  }

  /**
   * Get agents sorted by success rate (lowest first - needs attention)
   */
  getAgentsNeedingAttention(): AgentMetricsType[] {
    return this.getAllAgentMetrics()
      .filter(m => m.successRate < 0.8 || m.consecutiveFailures > 2)
      .sort((a, b) => {
        // Prioritize by consecutive failures
        const aPriority = a.consecutiveFailures * 10 + (1 - a.successRate);
        const bPriority = b.consecutiveFailures * 10 + (1 - b.successRate);
        return bPriority - aPriority;
      });
  }

  /**
   * Get top performing agents
   */
  getTopPerformers(minExecutions: number = 10): AgentMetricsType[] {
    return this.getAllAgentMetrics()
      .filter(m => m.totalExecutions >= minExecutions && m.successRate >= 0.9)
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime) // Among top performers, prefer faster ones
      .reverse();
  }
}
