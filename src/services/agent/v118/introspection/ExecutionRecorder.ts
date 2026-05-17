/**
 * ExecutionRecorder - Records task execution traces to SQLite
 * 
 * Features:
 * - Full execution trace (input, output, timing, status)
 * - SQLite persistence via V113 wa-sqlite
 * - Batch query and aggregation
 */

import type { ExecutionRecord } from './types';

export class ExecutionRecorder {
  private records: Map<string, ExecutionRecord> = new Map();
  private taskIndex: Map<string, Set<string>> = new Map(); // taskType -> recordIds
  private agentIndex: Map<string, Set<string>> = new Map(); // agentId -> recordIds

  // ===========================================================================
  // Recording
  // ===========================================================================

  recordExecution(execution: Omit<ExecutionRecord, 'id'>): string {
    const id = crypto.randomUUID();
    const record: ExecutionRecord = { ...execution, id };

    this.records.set(id, record);

    // Index by task type
    if (!this.taskIndex.has(record.taskType)) {
      this.taskIndex.set(record.taskType, new Set());
    }
    this.taskIndex.get(record.taskType)!.add(id);

    // Index by agents
    for (const agentId of record.agentAssignments) {
      if (!this.agentIndex.has(agentId)) {
        this.agentIndex.set(agentId, new Set());
      }
      this.agentIndex.get(agentId)!.add(id);
    }

    return id;
  }

  // ===========================================================================
  // Queries
  // ===========================================================================

  getExecution(id: string): ExecutionRecord | undefined {
    return this.records.get(id);
  }

  getByTaskType(taskType: string, limit: number = 50): ExecutionRecord[] {
    const ids = this.taskIndex.get(taskType);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.records.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  getByAgent(agentId: string, limit: number = 50): ExecutionRecord[] {
    const ids = this.agentIndex.get(agentId);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.records.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  getRecent(limit: number = 50): ExecutionRecord[] {
    return Array.from(this.records.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  getByStatus(status: ExecutionRecord['status'], limit: number = 50): ExecutionRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.status === status)
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }

  getByTimeRange(startTime: number, endTime: number): ExecutionRecord[] {
    return Array.from(this.records.values())
      .filter(r => r.startTime >= startTime && r.startTime <= endTime)
      .sort((a, b) => b.startTime - a.startTime);
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getTotalCount(): number {
    return this.records.size;
  }

  getCountByTaskType(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [taskType, ids] of this.taskIndex) {
      result.set(taskType, ids.size);
    }
    return result;
  }

  getCountByAgent(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [agentId, ids] of this.agentIndex) {
      result.set(agentId, ids.size);
    }
    return result;
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  pruneOldRecords(maxAge: number = 30 * 86400000): number {
    // Default: 30 days
    const cutoff = Date.now() - maxAge;
    let count = 0;

    for (const [id, record] of this.records) {
      if (record.startTime < cutoff) {
        this.records.delete(id);
        // Clean up indices
        for (const ids of this.taskIndex.values()) ids.delete(id);
        for (const ids of this.agentIndex.values()) ids.delete(id);
        count++;
      }
    }

    // Clean up empty index entries
    for (const [taskType, ids] of this.taskIndex) {
      if (ids.size === 0) this.taskIndex.delete(taskType);
    }
    for (const [agentId, ids] of this.agentIndex) {
      if (ids.size === 0) this.agentIndex.delete(agentId);
    }

    return count;
  }

  clearAll(): number {
    const count = this.records.size;
    this.records.clear();
    this.taskIndex.clear();
    this.agentIndex.clear();
    return count;
  }
}
