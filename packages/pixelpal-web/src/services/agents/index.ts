export { agentRegistry } from './agentRegistry'
export { agentExecutionBus } from './AgentExecutionBus'
export { agentBus } from './agentBus' // backward compat re-export
export { orchestratorAgent } from './orchestratorAgent'
export { executorAgent } from './executorAgent'
export { reviewerAgent } from './reviewerAgent'
export { multiAgentStore } from './multiAgentStore'
export type { AgentConfig, AgentMessage, Task } from './types'
export { AgentType } from './types'

// V84 New Services
export { agentTaskDecomposer } from './TaskDecomposer'
export { criticEngine } from './CriticEngine'
export { orchestratorService } from './Orchestrator'
export { DEMO_SCENARIOS } from './Orchestrator'
export type { OrchestratorState } from './Orchestrator'
