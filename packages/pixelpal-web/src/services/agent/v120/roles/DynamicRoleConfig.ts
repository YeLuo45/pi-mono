/**
 * DynamicRoleConfig - Runtime role configuration management
 */

import type { RoleDefinition, RoleConfigUpdate } from '../types';
import { RoleRegistry } from './RoleRegistry';

export class DynamicRoleConfig {
  private registry: RoleRegistry;
  private pendingUpdates: RoleConfigUpdate[] = [];
  private updateListeners: ((update: RoleConfigUpdate) => void)[] = [];

  constructor(registry: RoleRegistry) {
    this.registry = registry;
  }

  /**
   * Queue a config update to be applied
   */
  queueUpdate(update: RoleConfigUpdate): void {
    this.pendingUpdates.push({ ...update, updates: { ...update.updates } });
  }

  /**
   * Apply all pending updates
   */
  applyPendingUpdates(): { applied: number; failed: number } {
    let applied = 0, failed = 0;
    for (const update of this.pendingUpdates) {
      const success = this.registry.update(update.roleId, update.updates);
      if (success) {
        applied++;
        this.notifyListeners(update);
      } else {
        failed++;
      }
    }
    this.pendingUpdates = [];
    return { applied, failed };
  }

  /**
   * Get pending updates count
   */
  getPendingCount(): number {
    return this.pendingUpdates.length;
  }

  /**
   * Subscribe to config updates
   */
  onUpdate(listener: (update: RoleConfigUpdate) => void): () => void {
    this.updateListeners.push(listener);
    return () => {
      this.updateListeners = this.updateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Validate update before queuing
   */
  validateUpdate(update: RoleConfigUpdate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const role = this.registry.get(update.roleId);

    if (!role) {
      errors.push(`Role ${update.roleId} not found`);
      return { valid: false, errors };
    }

    if (update.updates.name !== undefined && update.updates.name.trim() === '') {
      errors.push('Role name cannot be empty');
    }

    if (update.updates.priority !== undefined && (update.updates.priority < 0 || update.updates.priority > 100)) {
      errors.push('Priority must be between 0 and 100');
    }

    return { valid: errors.length === 0, errors };
  }

  private notifyListeners(update: RoleConfigUpdate): void {
    for (const listener of this.updateListeners) {
      try {
        listener(update);
      } catch { /* ignore listener errors */ }
    }
  }
}
