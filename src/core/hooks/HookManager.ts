/**
 * V149: HookManager - Priority-ordered hook registry and dispatcher
 * 
 * Manages registration, unregistration, and triggering of hooks with support for:
 * - Priority ordering (higher priority executes first)
 * - Sync/async hook handlers
 * - Lifecycle events for monitoring
 */

import type { HookContext, HookDefinition, HookFn, HookLifecycleEvent } from './types';

// Event emitter for lifecycle events
type LifecycleListener = (event: HookLifecycleEvent) => void;

export class HookManager {
  private hooks: Map<string, HookDefinition[]> = new Map();
  private lifecycleListeners: Set<LifecycleListener> = new Set();
  private defaultPriority = 0;

  /**
   * Register a new hook handler
   */
  register(hook: Omit<HookDefinition, 'id'> & { id?: string }): string {
    const id = hook.id || crypto.randomUUID();
    
    const definition: HookDefinition = {
      id,
      name: hook.name,
      priority: hook.priority ?? this.defaultPriority,
      fn: hook.fn,
      metadata: hook.metadata,
      enabled: hook.enabled ?? true,
    };

    if (!this.hooks.has(hook.name)) {
      this.hooks.set(hook.name, []);
    }

    // Insert in priority order (higher priority first)
    const hooks = this.hooks.get(hook.name)!;
    const insertIndex = hooks.findIndex(h => h.priority < definition.priority);
    if (insertIndex === -1) {
      hooks.push(definition);
    } else {
      hooks.splice(insertIndex, 0, definition);
    }

    this.emitLifecycle({ hookId: id, hookName: hook.name, action: 'registered', timestamp: Date.now() });

    return id;
  }

  /**
   * Register a simple hook function with name and optional priority
   */
  registerHook(hookName: string, fn: HookFn, priority = 0, id?: string): string {
    return this.register({ id, name: hookName, priority, fn, enabled: true });
  }

  /**
   * Unregister a hook by its ID
   * Returns true if hook was found and removed
   */
  unregister(hookId: string): boolean {
    for (const [hookName, hooks] of this.hooks.entries()) {
      const index = hooks.findIndex(h => h.id === hookId);
      if (index !== -1) {
        const removed = hooks.splice(index, 1)[0];
        if (hooks.length === 0) {
          this.hooks.delete(hookName);
        }
        this.emitLifecycle({ hookId, hookName, action: 'unregistered', timestamp: Date.now() });
        return true;
      }
    }
    return false;
  }

  /**
   * Unregister all hooks for a specific hook name
   */
  unregisterAll(hookName: string): number {
    const hooks = this.hooks.get(hookName);
    if (!hooks) return 0;

    const count = hooks.length;
    this.hooks.delete(hookName);
    
    for (const hook of hooks) {
      this.emitLifecycle({ hookId: hook.id, hookName, action: 'unregistered', timestamp: Date.now() });
    }
    
    return count;
  }

  /**
   * Trigger all hooks for a given hook name
   * Executes hooks in priority order (highest first)
   * Supports both sync and async hooks
   */
  async trigger(hookName: string, context?: Partial<HookContext>): Promise<void> {
    const hooks = this.hooks.get(hookName);
    if (!hooks || hooks.length === 0) return;

    const fullContext: HookContext = {
      hookName,
      timestamp: Date.now(),
      ...context,
    };

    // Filter to only enabled hooks
    const enabledHooks = hooks.filter(h => h.enabled);

    // Execute in priority order (already sorted, higher priority first)
    for (const hook of enabledHooks) {
      try {
        this.emitLifecycle({ hookId: hook.id, hookName, action: 'triggered', timestamp: Date.now() });
        await Promise.resolve(hook.fn(fullContext));
      } catch (error) {
        this.emitLifecycle({ 
          hookId: hook.id, 
          hookName, 
          action: 'error', 
          timestamp: Date.now(),
          error: error instanceof Error ? error : new Error(String(error)),
        });
        // Continue executing other hooks even if one fails
        console.error(`[HookManager] Hook "${hook.id}" (${hookName}) threw:`, error);
      }
    }
  }

  /**
   * List all registered hooks for a hook name
   */
  list(hookName: string): HookDefinition[] {
    return this.hooks.get(hookName) || [];
  }

  /**
   * List all registered hook names
   */
  listHookNames(): string[] {
    return Array.from(this.hooks.keys());
  }

  /**
   * Get a hook by its ID
   */
  getById(hookId: string): HookDefinition | undefined {
    for (const hooks of this.hooks.values()) {
      const found = hooks.find(h => h.id === hookId);
      if (found) return found;
    }
    return undefined;
  }

  /**
   * Enable or disable a hook by ID
   */
  setEnabled(hookId: string, enabled: boolean): boolean {
    const hook = this.getById(hookId);
    if (!hook) return false;
    hook.enabled = enabled;
    return true;
  }

  /**
   * Check if a hook is enabled
   */
  isEnabled(hookId: string): boolean {
    const hook = this.getById(hookId);
    return hook?.enabled ?? false;
  }

  /**
   * Update priority of a hook (reorders within its hook name)
   */
  setPriority(hookId: string, priority: number): boolean {
    const hook = this.getById(hookId);
    if (!hook) return false;

    // Remove from current position
    const hooks = this.hooks.get(hook.name);
    if (!hooks) return false;

    const index = hooks.findIndex(h => h.id === hookId);
    if (index === -1) return false;

    hooks.splice(index, 1);
    hook.priority = priority;

    // Re-insert in correct position
    const insertIndex = hooks.findIndex(h => h.priority < priority);
    if (insertIndex === -1) {
      hooks.push(hook);
    } else {
      hooks.splice(insertIndex, 0, hook);
    }

    return true;
  }

  /**
   * Subscribe to lifecycle events
   */
  onLifecycle(listener: LifecycleListener): () => void {
    this.lifecycleListeners.add(listener);
    return () => this.lifecycleListeners.delete(listener);
  }

  /**
   * Clear all registered hooks
   */
  clear(): void {
    const hookNames = this.listHookNames();
    for (const name of hookNames) {
      this.unregisterAll(name);
    }
  }

  private emitLifecycle(event: HookLifecycleEvent): void {
    for (const listener of this.lifecycleListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[HookManager] Lifecycle listener error:', e);
      }
    }
  }
}

// Singleton instance for app-wide use
export const hookManager = new HookManager();

export default HookManager;