/**
 * ChainState - Manages role chain execution state
 */

import type { ChainExecutionContext, ChainNodeResult, ChainStatus } from '../types';

export class ChainState {
  private contexts: Map<string, ChainExecutionContext> = new Map();

  createExecution(chainId: string): string {
    const executionId = crypto.randomUUID();
    const context: ChainExecutionContext = {
      chainId,
      executionId,
      status: 'pending',
      currentNodeId: null,
      variables: {},
      nodeResults: new Map(),
      startTime: Date.now(),
    };
    this.contexts.set(executionId, context);
    return executionId;
  }

  getContext(executionId: string): ChainExecutionContext | undefined {
    return this.contexts.get(executionId);
  }

  startExecution(executionId: string, entryNodeId: string): void {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    ctx.status = 'running';
    ctx.currentNodeId = entryNodeId;
  }

  startNode(executionId: string, nodeId: string): void {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    ctx.currentNodeId = nodeId;
  }

  completeNode(executionId: string, nodeId: string, result: ChainNodeResult): void {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    ctx.nodeResults.set(nodeId, result);

    // Merge output into variables if there's output mapping
    if (result.output && typeof result.output === 'object') {
      ctx.variables = { ...ctx.variables, ...(result.output as Record<string, unknown>) };
    }
  }

  failNode(executionId: string, nodeId: string, error: string): void {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    ctx.nodeResults.set(nodeId, {
      nodeId,
      output: null,
      error,
      duration: 0,
      status: 'failed',
    });
    ctx.status = 'failed';
    ctx.error = error;
    ctx.endTime = Date.now();
  }

  completeChain(executionId: string): void {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    ctx.status = 'completed';
    ctx.currentNodeId = null;
    ctx.endTime = Date.now();
  }

  cancelChain(executionId: string): void {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return;
    ctx.status = 'cancelled';
    ctx.endTime = Date.now();
  }

  getNodeResult(executionId: string, nodeId: string): ChainNodeResult | undefined {
    const ctx = this.contexts.get(executionId);
    return ctx?.nodeResults.get(nodeId);
  }

  getAllResults(executionId: string): ChainNodeResult[] {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return [];
    return Array.from(ctx.nodeResults.values());
  }

  getExecutionDuration(executionId: string): number {
    const ctx = this.contexts.get(executionId);
    if (!ctx) return 0;
    const end = ctx.endTime || Date.now();
    return end - ctx.startTime;
  }

  cleanup(olderThan: number = 3600000): void {
    const cutoff = Date.now() - olderThan;
    for (const [id, ctx] of this.contexts) {
      if (ctx.endTime && ctx.endTime < cutoff) {
        this.contexts.delete(id);
      }
    }
  }
}
