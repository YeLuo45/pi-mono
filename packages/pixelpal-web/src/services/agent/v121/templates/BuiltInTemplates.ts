/**
 * Built-in Role Templates - Pre-defined templates for common use cases
 */

import type { RoleTemplate } from '../types';
import { createRoleTemplate } from './RoleTemplate';

export const BUILT_IN_TEMPLATES: Omit<RoleTemplate, 'id' | 'version' | 'usageCount' | 'createdAt' | 'updatedAt'>[] = [
  // Collaboration Roles
  {
    name: 'Team Leader',
    description: 'Leads collaborative efforts, delegates tasks, coordinates agent activities',
    capabilities: ['orchestration', 'agent_coordination', 'communication', 'planning'],
    compatibleTaskTypes: ['complex', 'multi_step', 'orchestrated', 'planning'],
    category: 'collaboration',
    tags: ['leadership', 'coordination', 'management'],
    icon: 'leader',
    color: '#4F46E5',
    isBuiltIn: true,
    rating: 4.8,
    author: 'System',
  },
  {
    name: 'Facilitator',
    description: 'Helps agents work together smoothly, resolves conflicts, promotes collaboration',
    capabilities: ['mediation', 'communication', 'negotiation', 'monitoring'],
    compatibleTaskTypes: ['complex', 'orchestrated'],
    category: 'collaboration',
    tags: ['facilitation', 'collaboration', 'conflict-resolution'],
    icon: 'handshake',
    color: '#0891B2',
    isBuiltIn: true,
    rating: 4.5,
    author: 'System',
  },

  // Tool Roles
  {
    name: 'Code Assistant',
    description: 'Helps with code generation, debugging, and refactoring tasks',
    capabilities: ['code_generation', 'execution', 'tool_use', 'review'],
    compatibleTaskTypes: ['code', 'build', 'action'],
    category: 'tool',
    tags: ['coding', 'development', 'programming'],
    icon: 'code',
    color: '#7C3AED',
    isBuiltIn: true,
    rating: 4.9,
    author: 'System',
  },
  {
    name: 'Tool Operator',
    description: 'Expert in using and combining various tools and APIs',
    capabilities: ['tool_use', 'execution', 'orchestration'],
    compatibleTaskTypes: ['action', 'run', 'build'],
    category: 'tool',
    tags: ['tools', 'automation', 'integration'],
    icon: 'tool',
    color: '#EA580C',
    isBuiltIn: true,
    rating: 4.6,
    author: 'System',
  },

  // Analysis Roles
  {
    name: 'Data Analyst',
    description: 'Analyzes data, identifies patterns, generates insights',
    capabilities: ['data_analysis', 'retrieval', 'synthesis', 'visualization'],
    compatibleTaskTypes: ['analysis', 'research'],
    category: 'analysis',
    tags: ['data', 'analytics', 'insights'],
    icon: 'chart',
    color: '#059669',
    isBuiltIn: true,
    rating: 4.7,
    author: 'System',
  },
  {
    name: 'Quality Reviewer',
    description: 'Reviews outputs for quality, accuracy, and completeness',
    capabilities: ['review', 'quality_assurance', 'critique'],
    compatibleTaskTypes: ['review', 'evaluation', 'analysis'],
    category: 'analysis',
    tags: ['quality', 'review', 'qa'],
    icon: 'checklist',
    color: '#DC2626',
    isBuiltIn: true,
    rating: 4.4,
    author: 'System',
  },

  // Creative Roles
  {
    name: 'Creative Writer',
    description: 'Generates creative content, brainstorming, ideation',
    capabilities: ['brainstorm', 'planning', 'communication'],
    compatibleTaskTypes: ['creative', 'brainstorm', 'design'],
    category: 'creative',
    tags: ['creative', 'writing', 'content'],
    icon: 'pencil',
    color: '#DB2777',
    isBuiltIn: true,
    rating: 4.6,
    author: 'System',
  },
  {
    name: 'Strategic Planner',
    description: 'Develops strategic plans, roadmaps, and long-term thinking',
    capabilities: ['planning', 'reasoning', 'problem_solving', 'orchestration'],
    compatibleTaskTypes: ['planning', 'strategy', 'roadmap'],
    category: 'creative',
    tags: ['strategy', 'planning', 'roadmap'],
    icon: 'map',
    color: '#9333EA',
    isBuiltIn: true,
    rating: 4.7,
    author: 'System',
  },

  // Utility Roles
  {
    name: 'Information Gatherer',
    description: 'Efficiently searches and retrieves relevant information',
    capabilities: ['search', 'retrieval', 'extraction'],
    compatibleTaskTypes: ['research', 'lookup', 'search'],
    category: 'utility',
    tags: ['search', 'research', 'information'],
    icon: 'search',
    color: '#2563EB',
    isBuiltIn: true,
    rating: 4.5,
    author: 'System',
  },
  {
    name: 'Summarizer Pro',
    description: 'Creates concise summaries of long content',
    capabilities: ['summarization', 'condensation', 'extraction'],
    compatibleTaskTypes: ['summary', 'digest', 'condense'],
    category: 'utility',
    tags: ['summary', 'digest', 'condense'],
    icon: 'scissors',
    color: '#475569',
    isBuiltIn: true,
    rating: 4.3,
    author: 'System',
  },
];

export function getBuiltInTemplates(): RoleTemplate[] {
  return BUILT_IN_TEMPLATES.map(t => createRoleTemplate(t));
}

export function initializeBuiltInTemplates(): Map<string, RoleTemplate> {
  const templates = new Map<string, RoleTemplate>();
  for (const template of getBuiltInTemplates()) {
    templates.set(template.id, template);
  }
  return templates;
}
