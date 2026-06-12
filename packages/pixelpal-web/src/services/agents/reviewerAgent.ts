import { agentBus, agentRegistry } from './agentRegistry'
import type { AgentMessage, Task } from './types'
import { AgentType } from './types'

export class ReviewerAgent {
  private id = 'reviewer'

  constructor() {
    agentRegistry.register({
      id: this.id,
      name: '审查Agent',
      type: AgentType.REVIEWER,
      capabilities: ['code_review', 'quality_check', 'test_generation'],
    })

    agentBus.subscribe(this.id, this.handleMessage.bind(this))
  }

  private async handleMessage(msg: AgentMessage): Promise<void> {
    if (msg.type === 'task' && (msg.payload as Task).type === 'code_review') {
      const task = msg.payload as Task
      await this.review(task, msg.traceId)
    }
  }

  private async review(task: Task, traceId?: string): Promise<void> {
    try {
      task.status = 'in_progress'

      const result = {
        passed: true,
        score: 85,
        issues: [{ severity: 'warning', message: '建议添加注释' }],
        suggestion: '代码整体良好',
      }

      await agentBus.send({
        from: this.id,
        to: 'orchestrator',
        type: 'result',
        payload: { taskId: task.id, result },
        timestamp: Date.now(),
        traceId,
      })
    } catch (error) {
      await agentBus.send({
        from: this.id,
        to: 'orchestrator',
        type: 'error',
        payload: { taskId: task.id, error: String(error) },
        timestamp: Date.now(),
        traceId,
      })
    }
  }
}

export const reviewerAgent = new ReviewerAgent()
