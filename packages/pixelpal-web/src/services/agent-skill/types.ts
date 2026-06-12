/**
 * V89 Agent×Skill Integration Types
 * 
 * Defines the core interfaces for Agent calling Skill and Skill feedback to Agent.
 */

// ============================================================================
// Skill Execution (Agent calls Skill)
// ============================================================================

export type SkillExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface SkillExecution {
  id: string;
  skillId: string;
  agentId: string;
  taskId: string;
  input: unknown;
  output?: unknown;
  error?: string;
  status: SkillExecutionStatus;
  startedAt: number;
  completedAt?: number;
  confidence?: number;
  suggestions?: string[];
}

// ============================================================================
// Skill Result (Skill feedback to Agent)
// ============================================================================

export interface SkillResult {
  success: boolean;
  data: unknown;
  summary: string;
  confidence: number; // 0-1
  nextActions: string[];
  metadata: Record<string, unknown>;
}

// ============================================================================
// Skill Matching (Agent auto-matches available Skills)
// ============================================================================

export interface SkillMatch {
  skillId: string;
  skillName: string;
  confidence: number; // 0-1 match score
  matchReason: string;
  capabilities: string[];
}

// ============================================================================
// Agent-Skill Collaboration Events
// ============================================================================

export type AgentSkillEventType =
  | 'skill:execution_start'
  | 'skill:execution_complete'
  | 'skill:execution_failed'
  | 'skill:result_parsed'
  | 'agent:skill_matched'
  | 'agent:skill_suggested';

export interface AgentSkillEvent {
  type: AgentSkillEventType;
  executionId?: string;
  skillId?: string;
  agentId?: string;
  taskId?: string;
  payload?: unknown;
  timestamp: number;
}

// ============================================================================
// Demo Scenario Types (协作场景Demo)
// ============================================================================

export type DemoScenarioType = 'research' | 'coding' | 'creative';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  type: DemoScenarioType;
  steps: DemoScenarioStep[];
}

export interface DemoScenarioStep {
  agentRole: string;
  skillId?: string;
  action: string;
  expectedOutput: string;
}

// ============================================================================
// Skill Chain for multi-skill execution
// ============================================================================

export interface SkillChainStep {
  skillId: string;
  input: Record<string, unknown>;
  condition?: string; // 'always' | 'if:{expr}'
  outputKey: string;
}

export interface SkillChain {
  id: string;
  name: string;
  description: string;
  steps: SkillChainStep[];
}

// ============================================================================
// Agent Skill Configuration
// ============================================================================

export interface AgentSkillConfig {
  autoMatchEnabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  fallbackOnError: boolean;
}

export const DEFAULT_AGENT_SKILL_CONFIG: AgentSkillConfig = {
  autoMatchEnabled: true,
  maxRetries: 2,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  fallbackOnError: true,
};
