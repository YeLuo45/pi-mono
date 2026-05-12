// V83 Multi-Agent Collaboration System Types

export type AgentRole = 'orchestrator' | 'planner' | 'executor' | 'critic' | 'creative';
export type AgentStatus = 'idle' | 'running' | 'thinking' | 'waiting';

export interface Agent {
  id: string;
  role: AgentRole;
  name: string;
  icon: string;
  status: AgentStatus;
  currentTask?: string;
  messages: AgentMessage[];
  capabilities: string[];
}

export interface AgentMessage {
  id: string;
  agentId: string;
  type: 'thought' | 'action' | 'result' | 'critique';
  content: string;
  timestamp: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedAgent?: string;
  parentTaskId?: string;
  children: string[];
}

// Event types for EventBus
export type AgentEventType = 
  | 'agent:created'
  | 'agent:destroyed'
  | 'agent:status_changed'
  | 'agent:message'
  | 'task:created'
  | 'task:assigned'
  | 'task:status_changed'
  | 'task:completed'
  | 'task:failed'
  | 'orchestrator:task_split'
  | 'planner:plan_created'
  | 'executor:action_executed'
  | 'critic:critique_generated'
  | 'creative:idea_generated';

export interface AgentEvent {
  type: AgentEventType;
  agentId?: string;
  taskId?: string;
  payload?: unknown;
  timestamp: number;
}

// Task scheduler modes
export type ScheduleMode = 'parallel' | 'sequential' | 'dependency';

// Agent configuration
export interface AgentConfig {
  id: string;
  role: AgentRole;
  name: string;
  icon: string;
  capabilities: string[];
  maxRetries?: number;
  timeout?: number;
}

// Default agents configuration
export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'orchestrator',
    role: 'orchestrator',
    name: 'Orchestrator',
    icon: '🎯',
    capabilities: ['task_decomposition', 'intent_understanding', 'coordination'],
  },
  {
    id: 'planner',
    role: 'planner',
    name: 'Planner',
    icon: '📋',
    capabilities: ['planning', 'feasibility_assessment', 'resource_allocation'],
  },
  {
    id: 'executor',
    role: 'executor',
    name: 'Executor',
    icon: '⚡',
    capabilities: ['tool_execution', 'api_calls', 'code_generation'],
  },
  {
    id: 'critic',
    role: 'critic',
    name: 'Critic',
    icon: '🔍',
    capabilities: ['result_review', 'improvement_suggestion', 'quality_assessment'],
  },
  {
    id: 'creative',
    role: 'creative',
    name: 'Creative',
    icon: '💡',
    capabilities: ['brainstorming', 'idea_generation', 'creative_writing'],
  },
];
