/**
 * SyncManager - Multi-session data synchronization
 */

import type { SyncOperation, SyncConflict, SharedMemoryEntry } from '../types';
import { SharedMemoryStore } from '../shared-memory/SharedMemoryStore';

export class SyncManager {
  private store: SharedMemoryStore;
  private pendingOps: Map<string, SyncOperation> = new Map();
  private conflicts: Map<string, SyncConflict> = new Map();
  private isOnline: boolean = true;

  constructor(store: SharedMemoryStore) {
    this.store = store;
  }

  // ===========================================================================
  // Online/Offline Status
  // ===========================================================================

  setOnline(online: boolean): void {
    this.isOnline = online;
    if (online) {
      this.flushPendingOps();
    }
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  // ===========================================================================
  // Queue Operations
  // ===========================================================================

  queueOperation(op: Omit<SyncOperation, 'id' | 'timestamp' | 'status'>): string {
    const id = crypto.randomUUID();
    const fullOp: SyncOperation = {
      ...op,
      id,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.pendingOps.set(id, fullOp);

    if (this.isOnline) {
      this.processOp(fullOp);
    }

    return id;
  }

  getPendingOps(): SyncOperation[] {
    return Array.from(this.pendingOps.values()).filter(op => op.status === 'pending');
  }

  // ===========================================================================
  // Conflict Handling
  // ===========================================================================

  getConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  resolveConflict(opId: string, resolution: 'local' | 'remote' | 'manual'): boolean {
    const conflict = this.conflicts.get(opId);
    if (!conflict) return false;

    if (resolution === 'local') {
      // Keep local version, update remote
      this.processOp({
        ...conflict.operationId as unknown as SyncOperation,
        type: 'update',
        status: 'pending',
      });
    } else if (resolution === 'remote') {
      // Accept remote version
      if (conflict.remoteVersion) {
        this.store.set(conflict.remoteVersion);
      }
    }

    conflict.resolution = resolution;
    conflict.resolvedAt = Date.now();
    this.conflicts.delete(opId);
    return true;
  }

  // ===========================================================================
  // Processing
  // ===========================================================================

  private async processOp(op: SyncOperation): Promise<void> {
    try {
      // Simulate sync - in real impl, this would call remote API
      op.status = 'synced';
      this.pendingOps.delete(op.id);
    } catch {
      op.status = 'failed';
    }
  }

  private flushPendingOps(): void {
    const pending = this.getPendingOps();
    for (const op of pending) {
      this.processOp(op);
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStats(): { pending: number; conflicts: number; online: boolean } {
    return {
      pending: this.getPendingOps().length,
      conflicts: this.conflicts.size,
      online: this.isOnline,
    };
  }
}
