/**
 * SandboxManager - Manages sandbox lifecycle and resources
 */

import type { Sandbox, SandboxConfig, SandboxStatus, ResourceLimit, SandboxSnapshot } from '../types';
import { createSandbox, validateSandboxConfig, getDefaultResourceLimit, getDefaultPermissions } from './SandboxDefinition';

const MAX_CONCURRENT_SANDBOXES = 10;

export class SandboxManager {
  private sandboxes: Map<string, Sandbox> = new Map();
  private snapshots: Map<string, SandboxSnapshot> = new Map();

  // ===========================================================================
  // Lifecycle Management
  // ===========================================================================

  create(config: SandboxConfig): { sandbox?: Sandbox; error?: string } {
    if (this.sandboxes.size >= MAX_CONCURRENT_SANDBOXES) {
      return { error: `Maximum concurrent sandboxes (${MAX_CONCURRENT_SANDBOXES}) reached` };
    }

    const validation = validateSandboxConfig(config);
    if (!validation.valid) {
      return { error: validation.errors.join(', ') };
    }

    const sandbox = createSandbox({
      name: config.name,
      description: config.description || '',
      status: 'pending',
      resourceLimit: config.resourceLimit,
      permissions: config.permissions,
      agentIds: config.agentIds,
      parentSandboxId: config.parentSandboxId,
      metadata: config.metadata || {},
    });

    this.sandboxes.set(sandbox.id, sandbox);
    return { sandbox };
  }

  destroy(sandboxId: string): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return false;

    sandbox.status = 'terminated';
    this.sandboxes.delete(sandboxId);
    this.snapshots.delete(sandboxId);
    return true;
  }

  get(sandboxId: string): Sandbox | undefined {
    return this.sandboxes.get(sandboxId);
  }

  getAll(): Sandbox[] {
    return Array.from(this.sandboxes.values()).filter(s => s.status !== 'terminated');
  }

  getByAgent(agentId: string): Sandbox[] {
    return Array.from(this.sandboxes.values()).filter(
      s => s.agentIds.includes(agentId) && s.status !== 'terminated'
    );
  }

  // ===========================================================================
  // Status Management
  // ===========================================================================

  setStatus(sandboxId: string, status: SandboxStatus): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return false;

    const validTransitions: Record<SandboxStatus, SandboxStatus[]> = {
      'pending': ['initializing', 'terminated'],
      'initializing': ['active', 'error', 'terminated'],
      'active': ['paused', 'terminated', 'error'],
      'paused': ['active', 'terminated'],
      'terminated': [],
      'error': ['terminated', 'active'],
    };

    if (!validTransitions[sandbox.status]?.includes(status)) {
      return false;
    }

    sandbox.status = status;
    sandbox.updatedAt = Date.now();

    if (status === 'active' && !sandbox.startedAt) {
      sandbox.startedAt = Date.now();
    }

    return true;
  }

  // ===========================================================================
  // Resource Monitoring
  // ===========================================================================

  getResourceUsage(sandboxId: string): ResourceLimit | undefined {
    return this.sandboxes.get(sandboxId)?.resourceLimit;
  }

  checkResourceQuota(sandboxId: string, usage: { memoryMB: number; cpuMs: number }): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return false;

    const { maxMemoryMB, maxCpuMs } = sandbox.resourceLimit;
    return usage.memoryMB <= maxMemoryMB && usage.cpuMs <= maxCpuMs;
  }

  // ===========================================================================
  // Snapshot Management
  // ===========================================================================

  createSnapshot(sandboxId: string): SandboxSnapshot | undefined {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) return undefined;

    const snapshot: SandboxSnapshot = {
      sandboxId,
      status: sandbox.status,
      variables: { ...sandbox.metadata },
      resourceUsage: {
        memoryMB: 0,
        cpuMs: 0,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
    };

    this.snapshots.set(sandboxId, snapshot);
    return snapshot;
  }

  restoreSnapshot(snapshot: SandboxSnapshot): boolean {
    const sandbox = this.sandboxes.get(snapshot.sandboxId);
    if (!sandbox) return false;

    sandbox.metadata = { ...snapshot.variables };
    sandbox.updatedAt = Date.now();
    return true;
  }

  getSnapshot(sandboxId: string): SandboxSnapshot | undefined {
    return this.snapshots.get(sandboxId);
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  cleanup(olderThanMs: number = 3600000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleaned = 0;

    for (const [id, sandbox] of this.sandboxes) {
      if (sandbox.status === 'terminated' || 
          (sandbox.updatedAt < cutoff && sandbox.status !== 'active')) {
        this.sandboxes.delete(id);
        this.snapshots.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStats(): { total: number; byStatus: Record<SandboxStatus, number> } {
    const byStatus: Partial<Record<SandboxStatus, number>> = {};
    for (const sandbox of this.sandboxes.values()) {
      byStatus[sandbox.status] = (byStatus[sandbox.status] || 0) + 1;
    }
    return { total: this.sandboxes.size, byStatus: byStatus as Record<SandboxStatus, number> };
  }
}
