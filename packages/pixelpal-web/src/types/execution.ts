/**
 * V143: Skill Runtime & Execution Types
 * Core interfaces for SkillRunner, PipelineExecutor, and execution storage.
 */

/**
 * Result of a single skill execution
 */
export interface SkillResult {
  skillId: string;
  output: unknown;
  duration: number; // ms
  success: boolean;
  error?: string;
  cached: boolean;
}

/**
 * Result of a single pipeline step execution
 */
export interface PipelineStepResult {
  stepId: string;
  output: unknown;
  duration: number; // ms
  success: boolean;
  error?: string;
}

/**
 * A step in a pipeline to be executed
 * (mirrors PipelineStep from OrchestrationEngine but with optional parallel flag)
 */
export interface PipelineStep {
  id: string;
  skillId: string;
  args?: Record<string, unknown>;
  parallel?: boolean;
  depends_on?: string[];
}

/**
 * Execution log entry stored in wa-sqlite
 */
export interface ExecutionLog {
  id: string;
  skillId: string;
  pipelineId?: string;
  inputs: Record<string, unknown>;
  output: unknown;
  duration: number; // ms
  success: boolean;
  error?: string;
  cached: boolean;
  timestamp: number;
}

/**
 * CompiledSkill from SkillCompiler (DSL result)
 */
export interface CompiledSkill {
  id: string;
  name: string;
  version: string;
  steps: PipelineStep[];
}