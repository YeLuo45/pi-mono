/**
 * RoleTemplate - Individual role template definition
 */

import type { RoleTemplate, RoleTemplateValidation } from '../types';

const VALID_CAPABILITIES = [
  'orchestration', 'task_decomposition', 'agent_coordination',
  'execution', 'code_generation', 'tool_use',
  'review', 'critique', 'quality_assurance',
  'search', 'retrieval', 'synthesis',
  'summarization', 'condensation', 'extraction',
  'planning', 'reasoning', 'problem_solving',
  'communication', 'negotiation', 'mediation',
  'monitoring', 'alerting', 'reporting',
  'data_analysis', 'visualization', 'reporting',
];

const VALID_TASK_TYPES = [
  'complex', 'multi_step', 'orchestrated',
  'action', 'code', 'build', 'run',
  'review', 'analysis', 'evaluation',
  'research', 'search', 'lookup',
  'summary', 'digest', 'condense',
  'planning', 'strategy', 'roadmap',
  'creative', 'design', 'brainstorm',
  'communication', 'email', 'message',
  'monitoring', 'watch', 'track',
];

export function createRoleTemplate(
  data: Omit<RoleTemplate, 'id' | 'version' | 'usageCount' | 'createdAt' | 'updatedAt'>
): RoleTemplate {
  return {
    ...data,
    id: crypto.randomUUID(),
    version: 1,
    usageCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function validateRoleTemplate(template: Partial<RoleTemplate>): RoleTemplateValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!template.name || template.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  } else if (template.name.length > 50) {
    errors.push('Name must be less than 50 characters');
  }

  if (!template.description || template.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }

  if (!template.capabilities || template.capabilities.length === 0) {
    errors.push('At least one capability is required');
  } else {
    const invalidCaps = template.capabilities.filter(c => !VALID_CAPABILITIES.includes(c));
    if (invalidCaps.length > 0) {
      warnings.push(`Unknown capabilities: ${invalidCaps.join(', ')}`);
    }
  }

  if (!template.compatibleTaskTypes || template.compatibleTaskTypes.length === 0) {
    warnings.push('No task types specified - template may not match any tasks');
  } else {
    const invalidTypes = template.compatibleTaskTypes.filter(t => !VALID_TASK_TYPES.includes(t));
    if (invalidTypes.length > 0) {
      warnings.push(`Unknown task types: ${invalidTypes.join(', ')}`);
    }
  }

  if (template.color && !/^#[0-9A-Fa-f]{6}$/.test(template.color)) {
    errors.push('Color must be a valid hex color (e.g., #FF5733)');
  }

  if (!template.category) {
    warnings.push('No category specified');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function updateRoleTemplate(template: RoleTemplate, updates: Partial<RoleTemplate>): RoleTemplate {
  return {
    ...template,
    ...updates,
    version: template.version + 1,
    updatedAt: Date.now(),
  };
}

export function incrementUsageCount(template: RoleTemplate): RoleTemplate {
  return {
    ...template,
    usageCount: template.usageCount + 1,
  };
}

export { VALID_CAPABILITIES, VALID_TASK_TYPES };
