/**
 * V77 Skill Framework - Type Definitions
 * Skills are AI-powered task executors triggered from chat or the SkillPanel.
 */

import type { Message } from '../../types';

// =============================================================================
// Skill Manifest & Definition
// =============================================================================

export interface SkillManifest {
  id: string;
  name: string;
  description: string;
  icon: string;
  version: string;
  author: string;
  category: SkillCategory;
  tags: string[];
  /** Whether this skill can be triggered from chat keywords */
  chatTriggerable: boolean;
  /** Keywords that trigger this skill in chat (lowercase) */
  chatKeywords: string[];
  /** UI precedence (lower = higher in list) */
  order: number;
}

export type SkillCategory =
  | 'productivity'
  | 'creative'
  | 'analysis'
  | 'lifestyle'
  | 'developer'
  | 'entertainment'
  | 'custom';

export interface SkillDefinition extends SkillManifest {
  /** Whether the skill is currently enabled */
  enabled: boolean;
  /** System prompt / instructions for this skill */
  systemPrompt: string;
  /** Example prompts to show in the UI */
  examplePrompts: string[];
  /** Required context fields (passed to skill at runtime) */
  requiredContext: string[];
  /** Optional context fields */
  optionalContext: string[];
  /** Max steps this skill can use in one execution */
  maxSteps: number;
  /** Whether to show reasoning steps in chat */
  showSteps: boolean;
}

// =============================================================================
// Skill Execution
// =============================================================================

export interface SkillExecutionContext {
  /** User's message that triggered the skill */
  triggerMessage: string;
  /** Current chat history (last N messages) */
  recentMessages: Message[];
  /** Current user's selected persona */
  personaId: string;
  /** Current scene ID (if any) */
  sceneId?: string;
  /** Additional context from the skill panel */
  metadata: Record<string, unknown>;
  /** Skill-specific parameters from keyword parsing */
  parsedParams: Record<string, string>;
}

export interface SkillExecutionResult {
  skillId: string;
  success: boolean;
  /** Text response to show in chat */
  response: string;
  /** Step results if showSteps is enabled */
  steps?: SkillStepResult[];
  /** Error message if failed */
  error?: string;
  /** Tokens used (if available) */
  tokensUsed?: number;
  /** Execution time in ms */
  durationMs: number;
}

export interface SkillStepResult {
  index: number;
  description: string;
  result: string;
  status: 'completed' | 'failed' | 'skipped';
}

// =============================================================================
// Skill Events
// =============================================================================

export interface SkillEvents {
  onSkillStart?: (skill: SkillDefinition) => void;
  onSkillProgress?: (skill: SkillDefinition, progress: number) => void;
  onStepComplete?: (skill: SkillDefinition, step: SkillStepResult) => void;
  onSkillComplete?: (skill: SkillDefinition, result: SkillExecutionResult) => void;
  onSkillFail?: (skill: SkillDefinition, error: string) => void;
}

// =============================================================================
// Skill Registry State
// =============================================================================

export interface SkillRegistryState {
  skills: SkillDefinition[];
  lastExecutedSkillId: string | null;
  executionHistory: SkillExecutionResult[];
}

// =============================================================================
// Chat Skill Invocation (for ChatPanel)
// =============================================================================

export interface ChatSkillInvocation {
  skillId: string;
  userMessage: string;
  context: SkillExecutionContext;
}

// =============================================================================
// Skill Chaining (V79)
// =============================================================================

export interface ChainStep {
  id: string;
  skillId: string;
  /** Condition to execute this step: 'always' | 'if:{expr}' */
  condition: string;
  /** JSON template for skill input, supports {{variable}} interpolation */
  inputTemplate: Record<string, string>;
  /** Key to store this step's result */
  outputKey: string;
}

export interface ChainDefinition {
  id: string;
  name: string;
  description: string;
  /** Keywords that trigger this chain in chat (lowercase) */
  triggerKeywords: string[];
  steps: ChainStep[];
  /** Whether this chain is currently enabled */
  enabled: boolean;
}

export interface ChainExecutionResult {
  chainId: string;
  success: boolean;
  steps: ChainStepResult[];
  finalResult: string;
  error?: string;
  durationMs: number;
}

export interface ChainStepResult {
  stepId: string;
  skillId: string;
  status: 'completed' | 'skipped' | 'failed';
  input: Record<string, string>;
  output: string;
  error?: string;
}
