import { agentBus, agentRegistry } from './agentRegistry'
import type { AgentMessage, Task } from './types'
import { AgentType } from './types'

export class ExecutorAgent {
  private id = 'executor'

  constructor() {
    agentRegistry.register({
      id: this.id,
      name: '执行Agent',
      type: AgentType.EXECUTOR,
      capabilities: ['code_execution', 'api_calls', 'file_operations'],
    })

    agentBus.subscribe(this.id, this.handleMessage.bind(this))
  }

  private async handleMessage(msg: AgentMessage): Promise<void> {
    if (msg.type === 'task') {
      const task = msg.payload as Task
      await this.executeTask(task, msg.traceId)
    }
  }

  private async executeTask(task: Task, traceId?: string): Promise<void> {
    try {
      task.status = 'in_progress'

      const result = await this.simulateExecution(task)

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

  private async simulateExecution(task: Task): Promise<unknown> {
    await new Promise(r => setTimeout(r, 300))

    switch (task.type) {
      case 'code_generation':
        return { code: `// Generated: ${task.description}`, language: 'javascript' }
      case 'code_review':
        return { issues: [], passed: true, score: 90 }
      default:
        return { output: `Executed: ${task.description}`, success: true }
    }
  }
}

export const executorAgent = new ExecutorAgent()
