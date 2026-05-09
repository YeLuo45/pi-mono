export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  COORDINATOR = 'coordinator',
  EXECUTOR = 'executor',
  REVIEWER = 'reviewer',
  SPECIALIST = 'specialist',
}

export interface AgentConfig {
  id: string
  name: string
  type: AgentType
  capabilities: string[]
  model?: string
  maxRetries?: number
  timeout?: number
}

export interface AgentMessage {
  from: string
  to: string | 'broadcast'
  type: 'task' | 'result' | 'error' | 'status' | 'heartbeat'
  payload: unknown
  timestamp: number
  traceId?: string
}

export interface Task {
  id: string
  type: string
  description: string
  inputs: Record<string, unknown>
  assignedTo?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: unknown
  dependencies?: string[]
  createdAt: number
  completedAt?: number
}
