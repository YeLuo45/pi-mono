/**
 * SandboxExecutor - Executes code within a sandbox
 */

import type { Sandbox, ExecutionResult, SandboxMessage } from '../types';
import { SandboxManager } from './SandboxManager';

type MessageHandler = (message: SandboxMessage) => void;

export class SandboxExecutor {
  private manager: SandboxManager;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private executionHistory: Map<string, ExecutionResult> = new Map();

  constructor(manager: SandboxManager) {
    this.manager = manager;
  }

  // ===========================================================================
  // Message Handling
  // ===========================================================================

  onMessage(sandboxId: string, handler: MessageHandler): () => void {
    this.messageHandlers.set(sandboxId, handler);
    return () => this.messageHandlers.delete(sandboxId);
  }

  private sendMessage(sandboxId: string, message: Omit<SandboxMessage, 'id' | 'timestamp'>): void {
    const handler = this.messageHandlers.get(sandboxId);
    if (handler) {
      handler({
        ...message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      });
    }
  }

  // ===========================================================================
  // Execution
  // ===========================================================================

  async execute(
    sandboxId: string,
    code: string,
    context?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const sandbox = this.manager.get(sandboxId);
    if (!sandbox) {
      return {
        sandboxId,
        success: false,
        error: 'Sandbox not found',
        duration: 0,
        resourceUsage: { memoryMB: 0, cpuMs: 0 },
      };
    }

    if (sandbox.status !== 'active') {
      return {
        sandboxId,
        success: false,
        error: `Sandbox is ${sandbox.status}, cannot execute`,
        duration: 0,
        resourceUsage: { memoryMB: 0, cpuMs: 0 },
      };
    }

    this.manager.setStatus(sandboxId, 'active');
    this.sendMessage(sandboxId, { sandboxId, type: 'execute', payload: { code, context } });

    const startTime = Date.now();
    let result: ExecutionResult;

    try {
      // Check if write is allowed
      const hasWritePermission = sandbox.permissions.includes('filesystem:write');

      // Check network permission
      const hasNetwork = sandbox.permissions.includes('network:limited') || 
                        sandbox.permissions.includes('network:full');

      // Simulate execution with resource tracking
      const execResult = await this.executeInSandbox(code, context || {}, {
        maxMemoryMB: sandbox.resourceLimit.maxMemoryMB,
        maxCpuMs: sandbox.resourceLimit.maxCpuMs,
        maxExecutionMs: sandbox.resourceLimit.maxExecutionMs,
        hasWritePermission,
        hasNetwork,
      });

      result = {
        sandboxId,
        success: true,
        output: execResult,
        duration: Date.now() - startTime,
        resourceUsage: { memoryMB: Math.round(Math.random() * 100), cpuMs: Math.round(Math.random() * 1000) },
      };

      this.sendMessage(sandboxId, { sandboxId, type: 'result', payload: result });
    } catch (error) {
      result = {
        sandboxId,
        success: false,
        error: String(error),
        duration: Date.now() - startTime,
        resourceUsage: { memoryMB: 0, cpuMs: 0 },
      };

      this.sendMessage(sandboxId, { sandboxId, type: 'error', payload: result });
    }

    this.executionHistory.set(`${sandboxId}:${Date.now()}`, result);
    return result;
  }

  private async executeInSandbox(
    code: string,
    context: Record<string, unknown>,
    limits: { maxMemoryMB: number; maxCpuMs: number; maxExecutionMs: number; hasWritePermission: boolean; hasNetwork: boolean }
  ): Promise<unknown> {
    // Create sandboxed environment
    const sandboxedContext = {
      ...context,
      // Restricted console
      console: {
        log: (...args: unknown[]) => console.log('[Sandbox]', ...args),
        warn: (...args: unknown[]) => console.warn('[Sandbox]', ...args),
        error: (...args: unknown[]) => console.error('[Sandbox]', ...args),
      },
      // Restricted fetch (if no network, returns null)
      fetch: limits.hasNetwork ? fetch : () => Promise.resolve(null),
      // File system stubs (read-only by default)
      readFile: () => 'stub content',
      writeFile: limits.hasWritePermission ? () => 'written' : () => { throw new Error('Write not permitted'); },
    };

    // Execute with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), limits.maxExecutionMs);
    });

    const executePromise = new Promise((resolve, reject) => {
      try {
        // In a real implementation, this would use Web Workers or iframe sandboxing
        // For now, simulate execution
        const fn = new Function(...Object.keys(sandboxedContext), code);
        resolve(fn(...Object.values(sandboxedContext)));
      } catch (e) {
        reject(e);
      }
    });

    return Promise.race([executePromise, timeoutPromise]);
  }

  // ===========================================================================
  // History
  // ===========================================================================

  getExecutionHistory(sandboxId?: string): ExecutionResult[] {
    const all = Array.from(this.executionHistory.values());
    if (sandboxId) {
      return all.filter(r => r.sandboxId === sandboxId);
    }
    return all;
  }

  getLastExecution(sandboxId: string): ExecutionResult | undefined {
    const history = this.executionHistory.entries();
    let last: ExecutionResult | undefined;
    for (const [, result] of history) {
      if (result.sandboxId === sandboxId) {
        if (!last || result.duration > last.duration) {
          last = result;
        }
      }
    }
    return last;
  }
}
