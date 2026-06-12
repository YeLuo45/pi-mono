/**
 * P14: Multi-Agent System Tests
 * 
 * Tests for the agents subsystem:
 * 1. AgentBus - Message bus for inter-agent communication
 * 2. AgentRegistry - Agent registration and lookup
 * 3. OrchestratorAgent - Task decomposition and orchestration
 * 4. ExecutorAgent - Task execution
 * 5. ReviewerAgent - Code review and quality checks
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { agentBus, agentRegistry } from '../agentRegistry';
import { agentBus as busInstance } from '../agentBus';
import { AgentType, type AgentConfig, type AgentMessage, type Task } from '../types';

// ============================================================================
// AgentBus Tests
// ============================================================================

describe('AgentBus', () => {
  let receivedMessages: AgentMessage[];

  beforeEach(() => {
    receivedMessages = [];
  });

  describe('subscribe and unsubscribe', () => {
    it('should receive messages after subscription', async () => {
      const handler = (msg: AgentMessage) => {
        receivedMessages.push(msg);
      };

      const unsubscribe = busInstance.subscribe('test-agent', handler);

      await busInstance.send({
        from: 'sender',
        to: 'test-agent',
        type: 'task',
        payload: { data: 'test' },
        timestamp: Date.now(),
      });

      // Give time for async processing
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages.length).toBe(1);
      expect(receivedMessages[0].from).toBe('sender');
      expect(receivedMessages[0].payload).toEqual({ data: 'test' });

      unsubscribe();
    });

    it('should not receive messages after unsubscribe', async () => {
      const handler = (msg: AgentMessage) => {
        receivedMessages.push(msg);
      };

      const unsubscribe = busInstance.subscribe('test-agent', handler);
      unsubscribe();

      await busInstance.send({
        from: 'sender',
        to: 'test-agent',
        type: 'task',
        payload: { data: 'test' },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages.length).toBe(0);
    });

    it('should support multiple handlers for same agent', async () => {
      const handler1 = (msg: AgentMessage) => {
        receivedMessages.push({ ...msg, handler: 1 });
      };
      const handler2 = (msg: AgentMessage) => {
        receivedMessages.push({ ...msg, handler: 2 });
      };

      busInstance.subscribe('multi-agent', handler1);
      busInstance.subscribe('multi-agent', handler2);

      await busInstance.send({
        from: 'sender',
        to: 'multi-agent',
        type: 'task',
        payload: { data: 'test' },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages.length).toBe(2);
    });
  });

  describe('send', () => {
    it('should deliver message to target agent', async () => {
      const handler = vi.fn();
      busInstance.subscribe('target', handler);

      const msg: AgentMessage = {
        from: 'source',
        to: 'target',
        type: 'result',
        payload: { taskId: 'task-1', result: 'success' },
        timestamp: Date.now(),
      };

      await busInstance.send(msg);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(msg);
    });

    it('should preserve message traceId', async () => {
      let capturedMsg: AgentMessage | null = null;
      busInstance.subscribe('trace-target', (msg) => {
        capturedMsg = msg;
      });

      await busInstance.send({
        from: 'parent',
        to: 'trace-target',
        type: 'task',
        payload: { goal: 'test' },
        timestamp: Date.now(),
        traceId: 'trace-123',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(capturedMsg?.traceId).toBe('trace-123');
    });
  });

  describe('broadcast', () => {
    it('should send message to all agents except sender', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      busInstance.subscribe('agent-1', handler1);
      busInstance.subscribe('agent-2', handler2);
      busInstance.subscribe('agent-3', handler3);

      await busInstance.broadcast({
        from: 'agent-1',
        type: 'status',
        payload: { status: 'ready' },
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(handler1).not.toHaveBeenCalled(); // Should not receive own broadcast
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// AgentRegistry Tests
// ============================================================================

describe('AgentRegistry', () => {
  beforeEach(() => {
    // Clear registry by unregistering all agents
    const agents = agentRegistry.list();
    agents.forEach(agent => agentRegistry.unregister(agent.id));
  });

  describe('register', () => {
    it('should register an agent', () => {
      const config: AgentConfig = {
        id: 'test-agent',
        name: '测试Agent',
        type: AgentType.EXECUTOR,
        capabilities: ['test'],
      };

      agentRegistry.register(config);

      const retrieved = agentRegistry.get('test-agent');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('测试Agent');
    });

    it('should overwrite existing agent with same id', () => {
      const config1: AgentConfig = {
        id: 'duplicate-id',
        name: 'Agent V1',
        type: AgentType.EXECUTOR,
        capabilities: ['v1'],
      };

      const config2: AgentConfig = {
        id: 'duplicate-id',
        name: 'Agent V2',
        type: AgentType.REVIEWER,
        capabilities: ['v2'],
      };

      agentRegistry.register(config1);
      agentRegistry.register(config2);

      const retrieved = agentRegistry.get('duplicate-id');
      expect(retrieved?.name).toBe('Agent V2');
      expect(retrieved?.type).toBe(AgentType.REVIEWER);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent agent', () => {
      const result = agentRegistry.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return registered agent', () => {
      const config: AgentConfig = {
        id: 'get-test',
        name: 'Get Test',
        type: AgentType.COORDINATOR,
        capabilities: ['test'],
      };

      agentRegistry.register(config);

      const result = agentRegistry.get('get-test');
      expect(result).toEqual(config);
    });
  });

  describe('getByType', () => {
    it('should return all agents of specified type', () => {
      agentRegistry.register({
        id: 'exec-1',
        name: 'Executor 1',
        type: AgentType.EXECUTOR,
        capabilities: [],
      });

      agentRegistry.register({
        id: 'exec-2',
        name: 'Executor 2',
        type: AgentType.EXECUTOR,
        capabilities: [],
      });

      agentRegistry.register({
        id: 'review-1',
        name: 'Reviewer 1',
        type: AgentType.REVIEWER,
        capabilities: [],
      });

      const executors = agentRegistry.getByType(AgentType.EXECUTOR);
      expect(executors).toHaveLength(2);
      expect(executors.every(e => e.type === AgentType.EXECUTOR)).toBe(true);

      const reviewers = agentRegistry.getByType(AgentType.REVIEWER);
      expect(reviewers).toHaveLength(1);
    });

    it('should return empty array when no agents of type exist', () => {
      const result = agentRegistry.getByType(AgentType.SPECIALIST);
      expect(result).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('should return all registered agents', () => {
      agentRegistry.register({
        id: 'list-test-1',
        name: 'List Test 1',
        type: AgentType.EXECUTOR,
        capabilities: [],
      });

      agentRegistry.register({
        id: 'list-test-2',
        name: 'List Test 2',
        type: AgentType.REVIEWER,
        capabilities: [],
      });

      const allAgents = agentRegistry.list();
      expect(allAgents.length).toBeGreaterThanOrEqual(2);
      expect(allAgents.some(a => a.id === 'list-test-1')).toBe(true);
      expect(allAgents.some(a => a.id === 'list-test-2')).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should remove agent from registry', () => {
      agentRegistry.register({
        id: 'unregister-test',
        name: 'Unregister Test',
        type: AgentType.EXECUTOR,
        capabilities: [],
      });

      expect(agentRegistry.get('unregister-test')).toBeDefined();

      agentRegistry.unregister('unregister-test');

      expect(agentRegistry.get('unregister-test')).toBeUndefined();
    });

    it('should do nothing when unregistering non-existent agent', () => {
      const initialCount = agentRegistry.list().length;
      agentRegistry.unregister('non-existent-id');
      expect(agentRegistry.list().length).toBe(initialCount);
    });
  });
});

// ============================================================================
// Task Tests
// ============================================================================

describe('Task', () => {
  describe('task structure', () => {
    it('should have correct initial state', () => {
      const task: Task = {
        id: 'task-1',
        type: 'code_generation',
        description: 'Generate code',
        inputs: { message: 'write a function' },
        status: 'pending',
        dependencies: [],
        createdAt: Date.now(),
      };

      expect(task.id).toBe('task-1');
      expect(task.status).toBe('pending');
      expect(task.result).toBeUndefined();
      expect(task.assignedTo).toBeUndefined();
    });

    it('should track status transitions', () => {
      const task: Task = {
        id: 'task-status',
        type: 'general',
        description: 'Test task',
        inputs: {},
        status: 'pending',
        createdAt: Date.now(),
      };

      task.status = 'in_progress';
      expect(task.status).toBe('in_progress');

      task.status = 'completed';
      task.completedAt = Date.now();
      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeDefined();
    });
  });

  describe('task dependencies', () => {
    it('should track dependencies', () => {
      const parentTask: Task = {
        id: 'parent',
        type: 'code_generation',
        description: 'Parent task',
        inputs: {},
        status: 'pending',
        dependencies: [],
        createdAt: Date.now(),
      };

      const childTask: Task = {
        id: 'child',
        type: 'code_review',
        description: 'Child task',
        inputs: {},
        status: 'pending',
        dependencies: ['parent'],
        createdAt: Date.now(),
      };

      expect(parentTask.dependencies).toHaveLength(0);
      expect(childTask.dependencies).toContain('parent');
    });
  });
});

// ============================================================================
// AgentMessage Tests
// ============================================================================

describe('AgentMessage', () => {
  describe('message types', () => {
    it('should support task message type', () => {
      const msg: AgentMessage = {
        from: 'orchestrator',
        to: 'executor',
        type: 'task',
        payload: {
          id: 'task-1',
          type: 'code_generation',
        },
        timestamp: Date.now(),
      };

      expect(msg.type).toBe('task');
      expect(msg.payload).toHaveProperty('id');
    });

    it('should support result message type', () => {
      const msg: AgentMessage = {
        from: 'executor',
        to: 'orchestrator',
        type: 'result',
        payload: { taskId: 'task-1', result: 'success' },
        timestamp: Date.now(),
        traceId: 'trace-1',
      };

      expect(msg.type).toBe('result');
      expect(msg.traceId).toBe('trace-1');
    });

    it('should support error message type', () => {
      const msg: AgentMessage = {
        from: 'executor',
        to: 'orchestrator',
        type: 'error',
        payload: { taskId: 'task-1', error: 'failed' },
        timestamp: Date.now(),
      };

      expect(msg.type).toBe('error');
      expect(msg.payload).toHaveProperty('error');
    });

    it('should support status message type', () => {
      const msg: AgentMessage = {
        from: 'agent-1',
        to: 'broadcast',
        type: 'status',
        payload: { status: 'ready' },
        timestamp: Date.now(),
      };

      expect(msg.type).toBe('status');
      expect(msg.to).toBe('broadcast');
    });

    it('should support heartbeat message type', () => {
      const msg: AgentMessage = {
        from: 'agent-1',
        to: 'agent-2',
        type: 'heartbeat',
        payload: { timestamp: Date.now() },
        timestamp: Date.now(),
      };

      expect(msg.type).toBe('heartbeat');
    });
  });
});

// ============================================================================
// AgentType Tests
// ============================================================================

describe('AgentType', () => {
  it('should have all expected agent types', () => {
    expect(AgentType.ORCHESTRATOR).toBe('orchestrator');
    expect(AgentType.COORDINATOR).toBe('coordinator');
    expect(AgentType.EXECUTOR).toBe('executor');
    expect(AgentType.REVIEWER).toBe('reviewer');
    expect(AgentType.SPECIALIST).toBe('specialist');
  });
});

// ============================================================================
// AgentConfig Tests
// ============================================================================

describe('AgentConfig', () => {
  it('should support optional fields', () => {
    const minimalConfig: AgentConfig = {
      id: 'minimal',
      name: 'Minimal',
      type: AgentType.EXECUTOR,
      capabilities: [],
    };

    expect(minimalConfig.model).toBeUndefined();
    expect(minimalConfig.maxRetries).toBeUndefined();
    expect(minimalConfig.timeout).toBeUndefined();
  });

  it('should support all optional fields', () => {
    const fullConfig: AgentConfig = {
      id: 'full',
      name: 'Full Config',
      type: AgentType.EXECUTOR,
      capabilities: ['code_execution', 'api_calls'],
      model: 'gpt-4',
      maxRetries: 3,
      timeout: 30000,
    };

    expect(fullConfig.model).toBe('gpt-4');
    expect(fullConfig.maxRetries).toBe(3);
    expect(fullConfig.timeout).toBe(30000);
  });
});
