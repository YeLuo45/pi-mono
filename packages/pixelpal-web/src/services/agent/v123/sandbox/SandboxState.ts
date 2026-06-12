/**
 * SandboxState - Snapshot and restore for sandboxes
 */

import type { Sandbox, SandboxSnapshot } from '../types';
import { SandboxManager } from './SandboxManager';

export class SandboxState {
  private manager: SandboxManager;
  private snapshots: Map<string, SandboxSnapshot[]> = new Map();

  constructor(manager: SandboxManager) {
    this.manager = manager;
  }

  // ===========================================================================
  // Snapshot Operations
  // ===========================================================================

  createSnapshot(sandboxId: string, label?: string): SandboxSnapshot | undefined {
    const sandbox = this.manager.get(sandboxId);
    if (!sandbox) return undefined;

    const snapshot: SandboxSnapshot = {
      sandboxId,
      status: sandbox.status,
      variables: JSON.parse(JSON.stringify(sandbox.metadata)),
      resourceUsage: {
        memoryMB: this.estimateMemoryUsage(sandbox),
        cpuMs: 0,
        timestamp: Date.now(),
      },
      createdAt: Date.now(),
    };

    // Store up to 10 snapshots per sandbox
    const existing = this.snapshots.get(sandboxId) || [];
    existing.unshift(snapshot);
    if (existing.length > 10) existing.pop();
    this.snapshots.set(sandboxId, existing);

    return snapshot;
  }

  restoreSnapshot(sandboxId: string, snapshotId?: number): boolean {
    const snapshots = this.snapshots.get(sandboxId);
    if (!snapshots || snapshots.length === 0) return false;

    const snapshot = snapshotId !== undefined ? snapshots[snapshotId] : snapshots[0];
    if (!snapshot) return false;

    const sandbox = this.manager.get(sandboxId);
    if (!sandbox) return false;

    // Restore state
    sandbox.metadata = JSON.parse(JSON.stringify(snapshot.variables));
    
    // Note: status restoration depends on valid transitions
    if (snapshot.status === 'active' || snapshot.status === 'paused') {
      this.manager.setStatus(sandboxId, snapshot.status);
    }

    return true;
  }

  getSnapshots(sandboxId: string): SandboxSnapshot[] {
    return this.snapshots.get(sandboxId) || [];
  }

  deleteSnapshot(sandboxId: string, snapshotId: number): boolean {
    const snapshots = this.snapshots.get(sandboxId);
    if (!snapshots || snapshotId >= snapshots.length) return false;

    snapshots.splice(snapshotId, 1);
    return true;
  }

  // ===========================================================================
  // State Comparison
  // ===========================================================================

  compareSnapshots(snapshotA: SandboxSnapshot, snapshotB: SandboxSnapshot): {
    memoryDelta: number;
    metadataChanges: Record<string, { a: unknown; b: unknown }>;
  } {
    const metadataChanges: Record<string, { a: unknown; b: unknown }> = {};

    const keysA = Object.keys(snapshotA.variables);
    const keysB = Object.keys(snapshotB.variables);
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const a = snapshotA.variables[key];
      const b = snapshotB.variables[key];
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        metadataChanges[key] = { a, b };
      }
    }

    return {
      memoryDelta: snapshotB.resourceUsage.memoryMB - snapshotA.resourceUsage.memoryMB,
      metadataChanges,
    };
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private estimateMemoryUsage(sandbox: Sandbox): number {
    // Rough estimation based on metadata size
    const metadataSize = JSON.stringify(sandbox.metadata).length;
    return Math.ceil(metadataSize / 1024); // KB to MB approximation
  }

  // ===========================================================================
  // Diff & Patch
  // ===========================================================================

  createDiff(fromSnapshot: SandboxSnapshot, toSnapshot: SandboxSnapshot): string {
    const comparison = this.compareSnapshots(fromSnapshot, toSnapshot);
    return JSON.stringify(comparison, null, 2);
  }

  applyPatch(sandboxId: string, patch: string): boolean {
    try {
      const diff = JSON.parse(patch);
      const sandbox = this.manager.get(sandboxId);
      if (!sandbox) return false;

      // Apply metadata changes
      for (const [key, change] of Object.entries(diff.metadataChanges)) {
        sandbox.metadata[key] = (change as { b: unknown }).b;
      }

      return true;
    } catch {
      return false;
    }
  }
}
