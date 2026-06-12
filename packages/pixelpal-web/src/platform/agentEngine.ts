/**
 * AgentEngine Factory - Cross-platform agent execution engine
 *
 * V69: Provides unified access to agent core services
 */

import { agentExecutor } from '../services/agent/agentExecutor'
import { memoryManager } from '../services/agent/memory/memoryManager'
import { unifiedPluginService } from '../services/plugins/unifiedPluginService'

export function createAgentEngine() {
  return {
    executor: agentExecutor,
    memoryManager,
    unifiedPluginService
  }
}

export const agentEngine = createAgentEngine()
