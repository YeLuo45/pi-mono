/**
 * Agent Generator Service - V99
 * 
 * Generates complete Agent configuration from parsed intent.
 */

import type { ParsedAgentConfig, GeneratedAgent, AgentConfigDetail, WorkflowDefinition, WorkflowStep } from '../../types/agentBuilder';
import { ROLE_ICONS } from '../../types/agentBuilder';

/**
 * Generate a complete Agent configuration
 */
export function generateAgentConfig(parsed: ParsedAgentConfig): GeneratedAgent {
  const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  const config: AgentConfigDetail = {
    maxRetries: 3,
    timeout: 30000,
    temperature: 0.3 + (parsed.personality.creativity * 0.5), // 0.3-0.8 based on creativity
    tools: parsed.requiredTools,
    skills: [],
  };

  const workflow = generateWorkflow(parsed);

  const agent: GeneratedAgent = {
    id,
    name: parsed.name,
    description: parsed.description,
    role: parsed.role,
    icon: ROLE_ICONS[parsed.role] || '🤖',
    capabilities: parsed.capabilities,
    requiredTools: parsed.requiredTools,
    workflowTemplate: parsed.workflowTemplate,
    personality: parsed.personality,
    constraints: parsed.constraints,
    skills: [],
    createdAt: Date.now(),
    config,
  };

  return agent;
}

/**
 * Generate workflow based on template and capabilities
 */
export function generateWorkflow(parsed: ParsedAgentConfig): WorkflowDefinition {
  const workflowId = `workflow_${Date.now()}`;
  const steps: WorkflowStep[] = [];

  switch (parsed.workflowTemplate) {
    case 'sequential':
      steps.push(...generateSequentialSteps(parsed));
      break;
    case 'parallel':
      steps.push(...generateParallelSteps(parsed));
      break;
    case 'hierarchical':
      steps.push(...generateHierarchicalSteps(parsed));
      break;
    case 'reflective':
      steps.push(...generateReflectiveSteps(parsed));
      break;
    default:
      steps.push(...generateSequentialSteps(parsed));
  }

  return {
    id: workflowId,
    name: `${parsed.name} Workflow`,
    template: parsed.workflowTemplate,
    steps,
  };
}

function generateSequentialSteps(parsed: ParsedAgentConfig): WorkflowStep[] {
  const steps: WorkflowStep[] = [];
  
  // Input step
  steps.push({
    id: 'step_input',
    name: 'Receive Input',
    description: 'Receive and validate user input',
    dependsOn: [],
    input: 'user_request',
    output: 'validated_request',
  });

  // Process step based on role
  const processStep = getProcessStep(parsed);
  steps.push(processStep);

  // Output step
  steps.push({
    id: 'step_output',
    name: 'Generate Response',
    description: 'Format and return final response',
    dependsOn: [processStep.id],
    input: 'processed_result',
    output: 'final_response',
  });

  return steps;
}

function generateParallelSteps(parsed: ParsedAgentConfig): WorkflowStep[] {
  // Input step
  const inputStep: WorkflowStep = {
    id: 'step_input',
    name: 'Receive Input',
    description: 'Receive and distribute user input',
    dependsOn: [],
    input: 'user_request',
    output: 'distributed_request',
  };

  // Multiple parallel processing steps
  const capabilities = parsed.capabilities.slice(0, 3);
  const parallelSteps = capabilities.map((cap, idx) => ({
    id: `step_parallel_${idx}`,
    name: `Process: ${cap}`,
    description: `Handle ${cap} capability`,
    skillId: cap,
    dependsOn: [inputStep.id],
    input: 'distributed_request',
    output: `result_${cap}`,
  }));

  // Combine step
  const combineStep: WorkflowStep = {
    id: 'step_combine',
    name: 'Combine Results',
    description: 'Merge parallel results into final response',
    dependsOn: parallelSteps.map(s => s.id),
    input: 'parallel_results',
    output: 'final_response',
  };

  return [inputStep, ...parallelSteps, combineStep];
}

function generateHierarchicalSteps(parsed: ParsedAgentConfig): WorkflowStep[] {
  // Manager/Orchestrator step
  const managerStep: WorkflowStep = {
    id: 'step_manager',
    name: 'Orchestrate',
    description: 'Break down task and assign to sub-agents',
    agentRole: 'planner',
    dependsOn: [],
    input: 'user_request',
    output: 'task_assignments',
  };

  // Executor steps
  const executorSteps = parsed.capabilities.slice(0, 2).map((cap, idx) => ({
    id: `step_executor_${idx}`,
    name: `Execute: ${cap}`,
    description: `Execute ${cap} task`,
    agentRole: 'executor' as const,
    dependsOn: [managerStep.id],
    input: `task_${cap}`,
    output: `result_${cap}`,
  }));

  // Manager review
  const reviewStep: WorkflowStep = {
    id: 'step_review',
    name: 'Review Results',
    description: 'Review and finalize outputs',
    agentRole: 'critic',
    dependsOn: executorSteps.map(s => s.id),
    input: 'executor_results',
    output: 'final_response',
  };

  return [managerStep, ...executorSteps, reviewStep];
}

function generateReflectiveSteps(parsed: ParsedAgentConfig): WorkflowStep[] {
  // Initial execution
  const executeStep: WorkflowStep = {
    id: 'step_execute',
    name: 'Initial Execution',
    description: 'Execute task for the first time',
    dependsOn: [],
    input: 'user_request',
    output: 'initial_result',
  };

  // Reflection/Critique
  const reflectStep: WorkflowStep = {
    id: 'step_reflect',
    name: 'Self-Reflection',
    description: 'Review and critique the result',
    agentRole: 'critic',
    dependsOn: [executeStep.id],
    input: 'initial_result',
    output: 'critique',
  };

  // Refinement
  const refineStep: WorkflowStep = {
    id: 'step_refine',
    name: 'Refine Output',
    description: 'Apply improvements based on critique',
    dependsOn: [reflectStep.id],
    input: 'critique',
    output: 'refined_result',
  };

  // Final check
  const checkStep: WorkflowStep = {
    id: 'step_check',
    name: 'Final Verification',
    description: 'Final verification before delivery',
    dependsOn: [refineStep.id],
    input: 'refined_result',
    output: 'final_response',
  };

  return [executeStep, reflectStep, refineStep, checkStep];
}

function getProcessStep(parsed: ParsedAgentConfig): WorkflowStep {
  const roleConfig: Record<string, { name: string; description: string }> = {
    planner: { name: 'Plan', description: 'Create execution plan' },
    executor: { name: 'Execute', description: 'Execute the task' },
    critic: { name: 'Analyze', description: 'Analyze and critique' },
    creative: { name: 'Create', description: 'Generate creative output' },
    general: { name: 'Process', description: 'Process user request' },
  };

  const config = roleConfig[parsed.role] || roleConfig.general;

  return {
    id: 'step_process',
    name: config.name,
    description: config.description,
    agentRole: parsed.role,
    dependsOn: ['step_input'],
    input: 'validated_request',
    output: 'processed_result',
  };
}

/**
 * Update agent with selected skills
 */
export function updateAgentWithSkills(
  agent: GeneratedAgent,
  skillIds: string[]
): GeneratedAgent {
  return {
    ...agent,
    skills: skillIds,
    config: {
      ...agent.config,
      skills: skillIds,
    },
  };
}

/**
 * Validate generated agent
 */
export function validateAgent(agent: GeneratedAgent): string[] {
  const errors: string[] = [];

  if (!agent.name || agent.name.trim().length === 0) {
    errors.push('Agent name is required');
  }

  if (!agent.description || agent.description.trim().length === 0) {
    errors.push('Agent description is required');
  }

  return errors;
}

export default generateAgentConfig;
