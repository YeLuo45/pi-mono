import type { AgentMessage } from './types'
import { planReviewGate } from '../bus/plan-review';
import type { ReviewConfig, PlanReviewResult } from '../bus/plan-review/types';
import { LoopDetector } from '../bus/loop-detection';
import type { LoopDetectionConfig } from '../bus/loop-detection/types';

type MessageHandler = (msg: AgentMessage) => void | Promise<void>

class AgentExecutionBus {
  private handlers = new Map<string, Set<MessageHandler>>()
  private agentQueues = new Map<string, AgentMessage[]>()
  private processing = new Set<string>()
  // V104: Loop Detection
  private loopDetector: LoopDetector | null = null;

  /**
   * Initialize loop detector with config
   * V104: Loop Detection integration
   */
  initLoopDetector(config: LoopDetectionConfig): void {
    this.loopDetector = new LoopDetector(config);
  }

  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set())
    }
    this.handlers.get(agentId)!.add(handler)
    return () => {
      this.handlers.get(agentId)?.delete(handler)
    }
  }

  /**
   * Execute a task with plan review gate pre-check
   * V103: Integrates PlanReviewGate before task execution
   */
  async execute(task: { type: string; description: string; inputs: Record<string, unknown> }, config: ReviewConfig): Promise<{ approved: boolean; result?: PlanReviewResult }> {
    const result = await planReviewGate.review(task.description, config);

    if (result.isApproved) {
      // Broadcast approval event
      this.broadcast({
        from: 'system',
        type: 'status',
        payload: {
          event: 'plan_review:approved',
          score: result.score,
          feedback: result.feedback,
          retryCount: result.retryCount,
        },
        timestamp: Date.now(),
      });
      // Execute the task
      await this.send({
        from: 'plan-review-gate',
        to: 'orchestrator',
        type: 'task',
        payload: task,
        timestamp: Date.now(),
      });
      return { approved: true, result };
    } else {
      // Broadcast rejection event
      this.broadcast({
        from: 'system',
        type: 'status',
        payload: {
          event: 'plan_review:rejected',
          score: result.score,
          feedback: result.feedback,
          retryCount: result.retryCount,
        },
        timestamp: Date.now(),
      });
      return { approved: false, result };
    }
  }

  async send(msg: AgentMessage): Promise<void> {
    if (!this.agentQueues.has(msg.to)) {
      this.agentQueues.set(msg.to, [])
    }
    this.agentQueues.get(msg.to)!.push(msg)
    this.processQueue(msg.to)
  }

  async broadcast(msg: Omit<AgentMessage, 'to'>): Promise<void> {
    const allAgents = Array.from(this.handlers.keys())
    await Promise.all(
      allAgents
        .filter(id => id !== msg.from)
        .map(id => this.send({ ...msg, to: id }))
    )
  }

  private async processQueue(agentId: string): Promise<void> {
    if (this.processing.has(agentId)) return
    this.processing.add(agentId)

    try {
      while (this.agentQueues.has(agentId) && this.agentQueues.get(agentId)!.length > 0) {
        const msg = this.agentQueues.get(agentId)!.shift()!
        const handlers = this.handlers.get(agentId)
        if (handlers) {
          await Promise.all(
            Array.from(handlers).map(h => {
              try {
                const result = h(msg)
                if (result instanceof Promise) return result.catch(console.warn)
              } catch (e) {
                console.warn(`[AgentExecutionBus] Handler error for ${agentId}:`, e)
              }
            })
          )
        }
      }
    } finally {
      this.processing.delete(agentId)
    }
  }
}

export const agentExecutionBus = new AgentExecutionBus()
