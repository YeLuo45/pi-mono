/**
 * V99 Natural Language Agent Builder Types
 * 
 * Defines types for the natural language Agent creation wizard.
 */

export type AgentRole = 'planner' | 'executor' | 'critic' | 'creative' | 'general';
export type WorkflowTemplate = 'sequential' | 'parallel' | 'hierarchical' | 'reflective' | 'custom';
export type ToneStyle = 'formal' | 'casual' | 'friendly';
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

/**
 * Parsed Agent configuration from natural language input
 */
export interface ParsedAgentConfig {
  name: string;
  description: string;
  role: AgentRole;
  capabilities: string[];
  requiredTools: string[];
  workflowTemplate: WorkflowTemplate;
  personality: {
    tone: ToneStyle;
    expertise: ExpertiseLevel;
    creativity: number; // 0-1
  };
  constraints: string[];
}

/**
 * Generated Agent with full configuration
 */
export interface GeneratedAgent {
  id: string;
  name: string;
  description: string;
  role: AgentRole;
  icon: string;
  capabilities: string[];
  requiredTools: string[];
  workflowTemplate: WorkflowTemplate;
  personality: {
    tone: ToneStyle;
    expertise: ExpertiseLevel;
    creativity: number;
  };
  constraints: string[];
  skills: string[]; // Skill IDs
  createdAt: number;
  config: AgentConfigDetail;
}

/**
 * Detailed Agent configuration for storage
 */
export interface AgentConfigDetail {
  maxRetries: number;
  timeout: number;
  temperature: number;
  tools: string[];
  skills: string[];
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  agentRole?: AgentRole;
  skillId?: string;
  dependsOn: string[];
  input: string;
  output: string;
}

/**
 * Workflow definition
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  template: WorkflowTemplate;
  steps: WorkflowStep[];
}

/**
 * Skill recommendation
 */
export interface SkillRecommendation {
  id: string;
  name: string;
  description: string;
  category: string;
  relevance: number; // 0-1
  selected: boolean;
}

/**
 * Intent parsing progress
 */
export interface ParsingProgress {
  stage: 'understanding' | 'analyzing' | 'structuring' | 'finalizing';
  message: string;
  progress: number; // 0-100
}

/**
 * Wizard step
 */
export type WizardStep = 'describe' | 'confirm' | 'preview' | 'test';

export interface WizardState {
  currentStep: WizardStep;
  userInput: string;
  parsedConfig: ParsedAgentConfig | null;
  generatedAgent: GeneratedAgent | null;
  selectedSkills: string[];
  workflow: WorkflowDefinition | null;
  isProcessing: boolean;
  error: string | null;
}

/**
 * Default values for new Agent
 */
export const DEFAULT_PARSED_CONFIG: ParsedAgentConfig = {
  name: '',
  description: '',
  role: 'general',
  capabilities: [],
  requiredTools: [],
  workflowTemplate: 'sequential',
  personality: {
    tone: 'friendly',
    expertise: 'intermediate',
    creativity: 0.5,
  },
  constraints: [],
};

/**
 * Role icons mapping
 */
export const ROLE_ICONS: Record<AgentRole, string> = {
  planner: '📋',
  executor: '⚡',
  critic: '🔍',
  creative: '💡',
  general: '🤖',
};

/**
 * Template icons mapping
 */
export const TEMPLATE_ICONS: Record<WorkflowTemplate, string> = {
  sequential: '➡️',
  parallel: '⚡',
  hierarchical: '🏰',
  reflective: '🔄',
  custom: '🎨',
};
