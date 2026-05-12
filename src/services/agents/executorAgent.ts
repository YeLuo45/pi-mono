import { agentBus } from './agentBus'
import { agentRegistry } from './agentRegistry'
import type { AgentMessage, Task } from './types'
import { AgentType } from './types'
import { agentExecutor } from '../agent/agentExecutor'

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
    try {
      // 调用V64的真实agentExecutor
      const result = await agentExecutor.executeTask({
        goal: task.description,
        type: task.type,
        inputs: task.inputs,
      } as any)
      return result
    } catch (error) {
      console.warn('[ExecutorAgent] agentExecutor error:', error)
      throw error
    }
  }
}

export const executorAgent = new ExecutorAgent()
