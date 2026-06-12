import { executorAgent } from './executorAgent'
import { reviewerAgent } from './reviewerAgent'
import { agentRegistry } from './agentRegistry'

export function initMultiAgentSystem(): void {
  console.log('[MultiAgent] Initializing...')

  // executorAgent和reviewerAgent构造时会自动注册
  void executorAgent
  void reviewerAgent

  // 注册orchestrator
  if (!agentRegistry.get('orchestrator')) {
    agentRegistry.register({
      id: 'orchestrator',
      name: '任务编排Agent',
      type: 'orchestrator' as any,
      capabilities: ['task_decomposition', 'agent_selection', 'progress_tracking'],
    })
  }

  const agents = agentRegistry.list()
  console.log('[MultiAgent] Ready - registered:', agents.map(a => a.id).join(', '))
}
