/**
 * Unit tests for agentGenerator.ts
 */

import { generateAgentConfig, updateAgentWithSkills, generateWorkflow, validateAgent } from './agentGenerator';
import type { ParsedAgentConfig } from '../../types/agentBuilder';

describe('agentGenerator', () => {
  const mockParsedConfig: ParsedAgentConfig = {
    name: 'Test Agent',
    description: 'A test agent for unit testing',
    role: 'planner',
    capabilities: ['planning', 'execution'],
    requiredTools: ['tool1', 'tool2'],
    workflowTemplate: 'sequential',
    personality: {
      tone: 'friendly',
      expertise: 'intermediate',
      creativity: 0.5,
    },
    constraints: ['constraint1'],
  };

  describe('generateAgentConfig', () => {
    it('should generate a valid agent with all fields', () => {
      const agent = generateAgentConfig(mockParsedConfig);

      expect(agent).toBeDefined();
      expect(agent.id).toMatch(/^agent_\d+_[a-z0-9]+$/);
      expect(agent.name).toBe('Test Agent');
      expect(agent.description).toBe('A test agent for unit testing');
      expect(agent.role).toBe('planner');
      expect(agent.icon).toBe('📋');
      expect(agent.capabilities).toEqual(['planning', 'execution']);
      expect(agent.requiredTools).toEqual(['tool1', 'tool2']);
      expect(agent.workflowTemplate).toBe('sequential');
      expect(agent.personality).toEqual({
        tone: 'friendly',
        expertise: 'intermediate',
        creativity: 0.5,
      });
      expect(agent.constraints).toEqual(['constraint1']);
      expect(agent.skills).toEqual([]);
      expect(agent.createdAt).toBeLessThanOrEqual(Date.now());
    });

    it('should set temperature based on creativity', () => {
      const agent = generateAgentConfig({
        ...mockParsedConfig,
        personality: { ...mockParsedConfig.personality, creativity: 0.2 },
      });

      // 0.3 + (0.2 * 0.5) = 0.4
      expect(agent.config.temperature).toBe(0.4);
    });

    it('should set default config values', () => {
      const agent = generateAgentConfig(mockParsedConfig);

      expect(agent.config.maxRetries).toBe(3);
      expect(agent.config.timeout).toBe(30000);
      expect(agent.config.tools).toEqual(['tool1', 'tool2']);
      expect(agent.config.skills).toEqual([]);
    });

    it('should generate unique IDs for each call', () => {
      const agent1 = generateAgentConfig(mockParsedConfig);
      const agent2 = generateAgentConfig(mockParsedConfig);

      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('generateWorkflow', () => {
    it('should generate sequential workflow', () => {
      const workflow = generateWorkflow(mockParsedConfig);

      expect(workflow.id).toMatch(/^workflow_\d+$/);
      expect(workflow.name).toBe('Test Agent Workflow');
      expect(workflow.template).toBe('sequential');
      expect(workflow.steps).toHaveLength(3);
      expect(workflow.steps[0].id).toBe('step_input');
      expect(workflow.steps[1].id).toBe('step_process');
      expect(workflow.steps[2].id).toBe('step_output');
    });

    it('should generate parallel workflow with multiple steps', () => {
      const parallelConfig = { ...mockParsedConfig, workflowTemplate: 'parallel' as const };
      const workflow = generateWorkflow(parallelConfig);

      expect(workflow.template).toBe('parallel');
      // input + 2 capability steps + combine = 4 steps
      expect(workflow.steps.length).toBeGreaterThanOrEqual(3);
      expect(workflow.steps[workflow.steps.length - 1].id).toBe('step_combine');
    });

    it('should generate hierarchical workflow', () => {
      const hierarchicalConfig = { ...mockParsedConfig, workflowTemplate: 'hierarchical' as const };
      const workflow = generateWorkflow(hierarchicalConfig);

      expect(workflow.template).toBe('hierarchical');
      // manager + executor steps + review
      expect(workflow.steps.length).toBeGreaterThanOrEqual(3);
      expect(workflow.steps[0].id).toBe('step_manager');
      expect(workflow.steps[workflow.steps.length - 1].id).toBe('step_review');
    });

    it('should generate reflective workflow', () => {
      const reflectiveConfig = { ...mockParsedConfig, workflowTemplate: 'reflective' as const };
      const workflow = generateWorkflow(reflectiveConfig);

      expect(workflow.template).toBe('reflective');
      // execute + reflect + refine + check
      expect(workflow.steps).toHaveLength(4);
      expect(workflow.steps[0].id).toBe('step_execute');
      expect(workflow.steps[1].id).toBe('step_reflect');
      expect(workflow.steps[2].id).toBe('step_refine');
      expect(workflow.steps[3].id).toBe('step_check');
    });

    it('should default to sequential for unknown templates', () => {
      const unknownConfig = { ...mockParsedConfig, workflowTemplate: 'custom' as const };
      const workflow = generateWorkflow(unknownConfig);

      expect(workflow.steps).toHaveLength(3);
      expect(workflow.steps[0].id).toBe('step_input');
    });
  });

  describe('updateAgentWithSkills', () => {
    it('should add skills to agent', () => {
      const agent = generateAgentConfig(mockParsedConfig);
      const skillIds = ['skill1', 'skill2', 'skill3'];
      const updated = updateAgentWithSkills(agent, skillIds);

      expect(updated.skills).toEqual(skillIds);
      expect(updated.config.skills).toEqual(skillIds);
    });

    it('should not mutate original agent', () => {
      const agent = generateAgentConfig(mockParsedConfig);
      const skillIds = ['skill1'];
      updateAgentWithSkills(agent, skillIds);

      expect(agent.skills).toEqual([]);
      expect(agent.config.skills).toEqual([]);
    });

    it('should preserve other agent properties', () => {
      const agent = generateAgentConfig(mockParsedConfig);
      const updated = updateAgentWithSkills(agent, ['skill1']);

      expect(updated.id).toBe(agent.id);
      expect(updated.name).toBe(agent.name);
      expect(updated.role).toBe(agent.role);
      expect(updated.capabilities).toEqual(agent.capabilities);
    });
  });

  describe('validateAgent', () => {
    it('should return no errors for valid agent', () => {
      const agent = generateAgentConfig(mockParsedConfig);
      const errors = validateAgent(agent);

      expect(errors).toEqual([]);
    });

    it('should return error for empty name', () => {
      const agent = generateAgentConfig({ ...mockParsedConfig, name: '   ' });
      const errors = validateAgent(agent);

      expect(errors).toContain('Agent name is required');
    });

    it('should return error for empty description', () => {
      const agent = generateAgentConfig({ ...mockParsedConfig, description: '' });
      const errors = validateAgent(agent);

      expect(errors).toContain('Agent description is required');
    });
  });
});
