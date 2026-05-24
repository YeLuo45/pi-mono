/**
 * V155: SkillHealthChecker - Singleton health checker for evolution skills
 * 
 * Tracks skill health status including consecutive failures, success rate,
 * and avg duration. Provides health/degraded/unhealthy判断.
 */

export interface HealthStatus {
  skillId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  consecutiveFailures: number;
  lastSuccess: number;
  lastError?: string;
  avgDuration: number;
  totalInvocations: number;
  successRate: number;
}

const healthStore = new Map<string, HealthStatus>();

function createDefaultHealthStatus(skillId: string): HealthStatus {
  return {
    skillId,
    status: 'healthy',
    consecutiveFailures: 0,
    lastSuccess: 0,
    avgDuration: 0,
    totalInvocations: 0,
    successRate: 1.0,
  };
}

function computeStatus(consecutiveFailures: number): 'healthy' | 'degraded' | 'unhealthy' {
  if (consecutiveFailures >= 5) return 'unhealthy';
  if (consecutiveFailures >= 3) return 'degraded';
  return 'healthy';
}

export const skillHealthChecker = {
  /**
   * Check current health status for a skill
   */
  check(skillId: string): HealthStatus {
    if (!healthStore.has(skillId)) {
      healthStore.set(skillId, createDefaultHealthStatus(skillId));
    }
    return healthStore.get(skillId)!;
  },

  /**
   * Record a successful invocation
   */
  recordSuccess(skillId: string, duration: number): void {
    const status = this.check(skillId);
    status.totalInvocations++;
    status.lastSuccess = Date.now();
    
    // Update consecutive failures reset
    status.consecutiveFailures = 0;
    
    // Update avg duration using exponential moving average
    if (status.totalInvocations === 1) {
      status.avgDuration = duration;
    } else {
      status.avgDuration = 0.9 * status.avgDuration + 0.1 * duration;
    }
    
    // Update success rate
    const successfulInvocations = status.totalInvocations - status.consecutiveFailures;
    status.successRate = successfulInvocations / status.totalInvocations;
    
    // Update computed status
    status.status = computeStatus(status.consecutiveFailures);
  },

  /**
   * Record a failed invocation
   */
  recordFailure(skillId: string, error: string): void {
    const status = this.check(skillId);
    status.totalInvocations++;
    status.consecutiveFailures++;
    status.lastError = error;
    
    // Update success rate
    const successfulInvocations = status.totalInvocations - status.consecutiveFailures;
    status.successRate = successfulInvocations / status.totalInvocations;
    
    // Update computed status
    status.status = computeStatus(status.consecutiveFailures);
  },

  /**
   * Check if skill is healthy (consecutiveFailures < 3)
   */
  isHealthy(skillId: string): boolean {
    return this.check(skillId).consecutiveFailures < 3;
  },

  /**
   * Check if skill is degraded (3 <= consecutiveFailures < 5)
   */
  isDegraded(skillId: string): boolean {
    const f = this.check(skillId).consecutiveFailures;
    return f >= 3 && f < 5;
  },

  /**
   * Check if skill is unhealthy (consecutiveFailures >= 5)
   */
  isUnhealthy(skillId: string): boolean {
    return this.check(skillId).consecutiveFailures >= 5;
  },

  /**
   * Reset skill health to healthy
   */
  reset(skillId: string): void {
    healthStore.set(skillId, createDefaultHealthStatus(skillId));
  },

  /**
   * Get all health statuses
   */
  getAllStatus(): Map<string, HealthStatus> {
    return new Map(healthStore);
  },

  /**
   * Get list of unhealthy skill IDs
   */
  getUnhealthySkills(): string[] {
    const unhealthy: string[] = [];
    for (const [skillId, status] of healthStore) {
      if (status.consecutiveFailures >= 5) {
        unhealthy.push(skillId);
      }
    }
    return unhealthy;
  },
};