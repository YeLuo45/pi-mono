/**
 * RoleAnalytics - Role usage statistics and analysis
 */

import type { RoleUsageStats, RoleDefinition } from '../types';
import { RoleRegistry } from '../roles/RoleRegistry';

interface AssignmentRecord {
  roleId: string;
  agentId: string;
  success: boolean;
  duration: number;
  timestamp: number;
}

export class RoleAnalytics {
  private registry: RoleRegistry;
  private records: AssignmentRecord[] = [];

  constructor(registry: RoleRegistry) {
    this.registry = registry;
  }

  /**
   * Record an assignment outcome
   */
  recordAssignment(roleId: string, agentId: string, success: boolean, duration: number): void {
    this.records.push({ roleId, agentId, success, duration, timestamp: Date.now() });
  }

  /**
   * Get usage stats for a specific role
   */
  getRoleStats(roleId: string): RoleUsageStats | null {
    const role = this.registry.get(roleId);
    if (!role) return null;

    const roleRecords = this.records.filter(r => r.roleId === roleId);
    if (roleRecords.length === 0) {
      return {
        roleId,
        totalAssignments: 0,
        successfulAssignments: 0,
        avgConfidence: 0,
        avgDuration: 0,
        loadDistribution: new Map(),
      };
    }

    const successful = roleRecords.filter(r => r.success);
    const loadDistribution = new Map<string, number>();
    for (const record of roleRecords) {
      loadDistribution.set(record.agentId, (loadDistribution.get(record.agentId) || 0) + 1);
    }

    return {
      roleId,
      totalAssignments: roleRecords.length,
      successfulAssignments: successful.length,
      avgConfidence: successful.length / roleRecords.length,
      avgDuration: roleRecords.reduce((a, r) => a + r.duration, 0) / roleRecords.length,
      loadDistribution,
    };
  }

  /**
   * Get stats for all roles
   */
  getAllRoleStats(): RoleUsageStats[] {
    const roles = this.registry.getAll();
    return roles.map(r => this.getRoleStats(r.id)!).filter(Boolean);
  }

  /**
   * Get most used roles
   */
  getMostUsedRoles(limit: number = 5): RoleUsageStats[] {
    return this.getAllRoleStats()
      .sort((a, b) => b.totalAssignments - a.totalAssignments)
      .slice(0, limit);
  }

  /**
   * Get least used roles
   */
  getLeastUsedRoles(limit: number = 5): RoleUsageStats[] {
    return this.getAllRoleStats()
      .sort((a, b) => a.totalAssignments - b.totalAssignments)
      .slice(0, limit);
  }

  /**
   * Get agent load distribution
   */
  getAgentLoad(agentId: string): number {
    return this.records.filter(r => r.agentId === agentId).length;
  }

  /**
   * Get success rate trend for a role
   */
  getRoleSuccessTrend(roleId: string, bucketCount: number = 5): { bucket: number; rate: number }[] {
    const roleRecords = this.records
      .filter(r => r.roleId === roleId)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (roleRecords.length === 0) return [];

    const bucketSize = Math.ceil(roleRecords.length / bucketCount);
    const buckets: { bucket: number; rate: number }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketRecords = roleRecords.slice(i * bucketSize, (i + 1) * bucketSize);
      if (bucketRecords.length === 0) break;
      const successCount = bucketRecords.filter(r => r.success).length;
      buckets.push({ bucket: i, rate: successCount / bucketRecords.length });
    }

    return buckets;
  }

  /**
   * Prune old records
   */
  pruneOldRecords(maxAge: number = 30 * 86400000): number {
    const cutoff = Date.now() - maxAge;
    const initialCount = this.records.length;
    this.records = this.records.filter(r => r.timestamp >= cutoff);
    return initialCount - this.records.length;
  }
}
