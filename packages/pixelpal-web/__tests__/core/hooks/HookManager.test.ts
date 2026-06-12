/**
 * V149: HookManager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HookManager } from '../../src/core/hooks/HookManager';
import type { HookContext, HookFn } from '../../src/core/hooks/types';

describe('HookManager', () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = new HookManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe('register', () => {
    it('should register a hook with default priority', () => {
      const hookFn: HookFn = vi.fn();
      const id = manager.register({ name: 'test.hook', fn: hookFn });

      expect(id).toBeDefined();
      const hooks = manager.list('test.hook');
      expect(hooks).toHaveLength(1);
      expect(hooks[0].id).toBe(id);
      expect(hooks[0].priority).toBe(0);
      expect(hooks[0].enabled).toBe(true);
    });

    it('should register a hook with custom priority', () => {
      const hookFn: HookFn = vi.fn();
      manager.register({ name: 'test.hook', fn: hookFn, priority: 100 });

      const hooks = manager.list('test.hook');
      expect(hooks[0].priority).toBe(100);
    });

    it('should return a unique ID for each registration', () => {
      const hookFn: HookFn = vi.fn();
      const id1 = manager.register({ name: 'test.hook', fn: hookFn });
      const id2 = manager.register({ name: 'test.hook', fn: hookFn });

      expect(id1).not.toBe(id2);
    });
  });

  describe('unregister', () => {
    it('should remove a registered hook by ID', () => {
      const hookFn: HookFn = vi.fn();
      const id = manager.register({ name: 'test.hook', fn: hookFn });

      const result = manager.unregister(id);
      expect(result).toBe(true);
      expect(manager.list('test.hook')).toHaveLength(0);
    });

    it('should return false when unregistering non-existent hook', () => {
      const result = manager.unregister('non-existent-id');
      expect(result).toBe(false);
    });

    it('should handle unregisterAll for a hook name', () => {
      const hookFn: HookFn = vi.fn();
      manager.register({ name: 'test.hook', fn: hookFn });
      manager.register({ name: 'test.hook', fn: hookFn });
      manager.register({ name: 'test.hook', fn: hookFn });

      const count = manager.unregisterAll('test.hook');
      expect(count).toBe(3);
      expect(manager.list('test.hook')).toHaveLength(0);
    });
  });

  describe('trigger', () => {
    it('should call all registered hooks for a hook name', async () => {
      const hookFn1: HookFn = vi.fn();
      const hookFn2: HookFn = vi.fn();

      manager.register({ name: 'test.hook', fn: hookFn1 });
      manager.register({ name: 'test.hook', fn: hookFn2 });

      const context: HookContext = { hookName: 'test.hook', timestamp: Date.now() };
      await manager.trigger('test.hook', context);

      expect(hookFn1).toHaveBeenCalledWith(context);
      expect(hookFn2).toHaveBeenCalledWith(context);
    });

    it('should not throw if no hooks registered for trigger', async () => {
      await expect(manager.trigger('non.existent')).resolves.not.toThrow();
    });

    it('should continue executing hooks even if one throws', async () => {
      const errorFn: HookFn = vi.fn(() => { throw new Error('Hook error'); });
      const successFn: HookFn = vi.fn();

      manager.register({ name: 'test.hook', fn: errorFn });
      manager.register({ name: 'test.hook', fn: successFn });

      const context: HookContext = { hookName: 'test.hook', timestamp: Date.now() };
      await manager.trigger('test.hook', context);

      expect(errorFn).toHaveBeenCalled();
      expect(successFn).toHaveBeenCalled();
    });
  });

  describe('priority ordering', () => {
    it('should execute higher priority hooks first', async () => {
      const callOrder: string[] = [];

      manager.register({
        name: 'test.hook',
        fn: () => callOrder.push('low'),
        priority: 0,
      });
      manager.register({
        name: 'test.hook',
        fn: () => callOrder.push('high'),
        priority: 100,
      });
      manager.register({
        name: 'test.hook',
        fn: () => callOrder.push('medium'),
        priority: 50,
      });

      await manager.trigger('test.hook');

      expect(callOrder).toEqual(['high', 'medium', 'low']);
    });

    it('should maintain FIFO order for same priority hooks', async () => {
      const callOrder: string[] = [];

      manager.register({ name: 'test.hook', fn: () => callOrder.push('first'), priority: 50 });
      manager.register({ name: 'test.hook', fn: () => callOrder.push('second'), priority: 50 });
      manager.register({ name: 'test.hook', fn: () => callOrder.push('third'), priority: 50 });

      await manager.trigger('test.hook');

      expect(callOrder).toEqual(['first', 'second', 'third']);
    });
  });

  describe('async hooks', () => {
    it('should handle async hook functions', async () => {
      const asyncFn: HookFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      manager.register({ name: 'test.hook', fn: asyncFn });
      await manager.trigger('test.hook');

      expect(asyncFn).toHaveBeenCalled();
    });

    it('should handle mixed sync and async hooks', async () => {
      const syncFn: HookFn = vi.fn();
      const asyncFn: HookFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      manager.register({ name: 'test.hook', fn: syncFn, priority: 1 });
      manager.register({ name: 'test.hook', fn: asyncFn, priority: 0 });

      await manager.trigger('test.hook');

      expect(syncFn).toHaveBeenCalled();
      expect(asyncFn).toHaveBeenCalled();
    });
  });

  describe('enable/disable', () => {
    it('should disable a hook and skip it during trigger', async () => {
      const hookFn: HookFn = vi.fn();
      const id = manager.register({ name: 'test.hook', fn: hookFn });

      manager.setEnabled(id, false);
      await manager.trigger('test.hook');

      expect(hookFn).not.toHaveBeenCalled();
    });

    it('should re-enable a disabled hook', async () => {
      const hookFn: HookFn = vi.fn();
      const id = manager.register({ name: 'test.hook', fn: hookFn });

      manager.setEnabled(id, false);
      manager.setEnabled(id, true);
      await manager.trigger('test.hook');

      expect(hookFn).toHaveBeenCalled();
    });

    it('should report correct enabled status', () => {
      const hookFn: HookFn = vi.fn();
      const id = manager.register({ name: 'test.hook', fn: hookFn });

      expect(manager.isEnabled(id)).toBe(true);
      manager.setEnabled(id, false);
      expect(manager.isEnabled(id)).toBe(false);
    });
  });

  describe('lifecycle events', () => {
    it('should emit lifecycle events on register', () => {
      const events: unknown[] = [];
      manager.onLifecycle(event => events.push(event));

      manager.register({ name: 'test.hook', fn: vi.fn() });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        action: 'registered',
        hookName: 'test.hook',
      });
    });

    it('should emit lifecycle events on unregister', () => {
      const events: unknown[] = [];
      manager.onLifecycle(event => events.push(event));

      const id = manager.register({ name: 'test.hook', fn: vi.fn() });
      events.length = 0; // Clear register events

      manager.unregister(id);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        action: 'unregistered',
        hookId: id,
        hookName: 'test.hook',
      });
    });
  });
});