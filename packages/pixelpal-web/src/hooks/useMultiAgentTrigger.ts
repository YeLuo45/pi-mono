import { useCallback } from 'react'
import { agentBus } from '../services/agents/agentBus'
import { orchestratorAgent } from '../services/agents/orchestratorAgent'

export function useMultiAgentTrigger() {
  const triggerMultiAgent = useCallback((message: string) => {
    agentBus.send({
      from: 'ui',
      to: 'orchestrator',
      type: 'task',
      payload: { message },
      timestamp: Date.now(),
    })
    return true
  }, [])

  const parseCommand = useCallback((input: string): { mode: 'multi' | 'single'; message: string } => {
    const trimmed = input.trim()

    if (trimmed.startsWith('/multi ')) {
      return { mode: 'multi', message: trimmed.slice(7) }
    }

    if (trimmed.startsWith('/single ')) {
      return { mode: 'single', message: trimmed.slice(8) }
    }

    const multiKeywords = ['写代码', '代码审查', '检查代码', '帮我', '多个任务', '分解']
    const shouldMulti = multiKeywords.some(k => trimmed.includes(k))

    return {
      mode: shouldMulti ? 'multi' : 'single',
      message: trimmed,
    }
  }, [])

  return {
    triggerMultiAgent,
    parseCommand,
  }
}
