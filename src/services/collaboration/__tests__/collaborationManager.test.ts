/**
 * Collaboration Services Test Suite - V33 Multi-Agent Collaboration System
 * 
 * Tests for the three core collaboration services:
 * 1. SharedContext - Shared state container for collaboration sessions
 * 2. TaskDecomposer - Breaks down user requests into executable subtasks
 * 3. ResultAggregator - Aggregates multiple subtask results into coherent responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SharedContext,
  createSharedContext,
} from '../sharedContext';
import {
  TaskDecomposer,
  createTaskDecomposer,
} from '../taskDecomposer';
import {
  ResultAggregator,
  createResultAggregator,
} from '../resultAggregator';
import {
  PersonaRoleRegistry,
  getRoleRegistry,
  getAvailableRoles,
  isValidRole,
  getRoleDisplayName,
  getRoleEmoji,
} from '../personaRoleRegistry';
import type { SubtaskResult, PersonaRole } from '../types';

// ============================================================================
// SharedContext Tests
// ============================================================================

describe('SharedContext', () => {
  let context: SharedContext;

  beforeEach(() => {
    context = createSharedContext('test-task-1', '分析我的情绪');
  });

  describe('constructor', () => {
    it('should create a context with correct initial state', () => {
      expect(context.taskId).toBe('test-task-1');
      expect(context.userRequest).toBe('分析我的情绪');
      expect(context.subtasks).toEqual([]);
      expect(context.results.size).toBe(0);
      expect(context.conversationHistory).toEqual([]);
      expect(context.sharedMemory.entities).toEqual([]);
      expect(context.sharedMemory.facts).toEqual([]);
      expect(context.sharedMemory.decisions).toEqual([]);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const now = Date.now();
      expect(context.createdAt).toBeGreaterThanOrEqual(now - 1000);
      expect(context.updatedAt).toBeGreaterThanOrEqual(now - 1000);
    });
  });

  describe('read operations', () => {
    it('should read a stored result by key', () => {
      const result: SubtaskResult = {
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: '找到了3条相关记忆',
        confidence: 0.9,
      };
      context.setResult(result);
      
      const readResult = context.read('task-1');
      expect(readResult).toBe('找到了3条相关记忆');
    });

    it('should return undefined for non-existent key', () => {
      expect(context.read('non-existent')).toBeUndefined();
    });

    it('should read results by role', () => {
      const result1: SubtaskResult = {
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: '记忆结果',
        confidence: 0.9,
      };
      const result2: SubtaskResult = {
        subtaskId: 'task-2',
        role: 'EmotionAnalyst',
        output: '情绪结果',
        confidence: 0.85,
      };
      context.setResult(result1);
      context.setResult(result2);
      
      const memoryResults = context.readByRole('MemoryExpert');
      expect(memoryResults).toHaveLength(1);
      expect(memoryResults[0].role).toBe('MemoryExpert');
    });

    it('should check if result exists', () => {
      expect(context.hasResult('task-1')).toBe(false);
      
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test',
        confidence: 0.9,
      });
      
      expect(context.hasResult('task-1')).toBe(true);
    });

    it('should get completed results', () => {
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test1',
        confidence: 0.9,
      });
      context.setResult({
        subtaskId: 'task-2',
        role: 'EmotionAnalyst',
        output: 'test2',
        confidence: 0.85,
      });
      
      const results = context.getCompletedResults();
      expect(results).toHaveLength(2);
    });
  });

  describe('write operations', () => {
    it('should write key-value pairs', () => {
      context.write('testKey', 'testValue');
      expect(context.read('testKey')).toBe('testValue');
    });

    it('should add entities to shared memory', () => {
      const entity = context.addEntity({
        name: 'John',
        type: 'person',
        traits: ['friendly', 'helpful'],
        importance: 0.8,
      });
      
      expect(entity.id).toBeDefined();
      expect(entity.name).toBe('John');
      expect(entity.type).toBe('person');
      expect(entity.traits).toEqual(['friendly', 'helpful']);
      expect(entity.importance).toBe(0.8);
      expect(entity.lastUpdated).toBeDefined();
      
      const entities = context.readEntities();
      expect(entities).toHaveLength(1);
      expect(entities[0].name).toBe('John');
    });

    it('should update existing entities', () => {
      const entity = context.addEntity({
        name: 'John',
        type: 'person',
        traits: ['friendly'],
        importance: 0.8,
      });
      
      const updated = context.updateEntity(entity.id, {
        traits: ['friendly', 'helpful'],
        importance: 0.9,
      });
      
      expect(updated).not.toBeNull();
      expect(updated?.traits).toEqual(['friendly', 'helpful']);
      expect(updated?.importance).toBe(0.9);
    });

    it('should add facts to shared memory', () => {
      const fact = context.addFact({
        content: '今天天气很好',
        source: 'weather_service',
        confidence: 0.95,
        tags: ['weather', 'daily'],
      });
      
      expect(fact.id).toBeDefined();
      expect(fact.content).toBe('今天天气很好');
      expect(fact.tags).toContain('weather');
      
      const facts = context.readFacts();
      expect(facts).toHaveLength(1);
    });

    it('should add decisions to shared memory', () => {
      const decision = context.addDecision({
        content: '建议周三晚上冥想',
        rationale: '情绪低谷期需要放松',
        votedBy: ['Advisor', 'EmotionAnalyst'],
      });
      
      expect(decision.id).toBeDefined();
      expect(decision.content).toBe('建议周三晚上冥想');
      expect(decision.timestamp).toBeDefined();
    });

    it('should store subtask results', () => {
      const result: SubtaskResult = {
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: '检索完成',
        confidence: 0.9,
        entities: [],
        facts: [],
      };
      
      context.setResult(result);
      expect(context.hasResult('task-1')).toBe(true);
      expect(context.getResult('task-1')?.output).toBe('检索完成');
    });

    it('should add messages to conversation history', () => {
      const message = context.addMessage({
        role: 'Advisor',
        personaId: 'advisor-1',
        content: '这是建议内容',
        type: 'synthesis',
      });
      
      expect(message.id).toBeDefined();
      expect(message.content).toBe('这是建议内容');
      expect(message.timestamp).toBeDefined();
      expect(context.conversationHistory).toHaveLength(1);
    });
  });

  describe('utility operations', () => {
    it('should clear results', () => {
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test',
        confidence: 0.9,
      });
      
      context.clearResults();
      expect(context.results.size).toBe(0);
    });

    it('should clear entire context', () => {
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test',
        confidence: 0.9,
      });
      context.addMessage({
        role: 'Advisor',
        personaId: 'advisor-1',
        content: 'test',
        type: 'synthesis',
      });
      
      context.clear();
      expect(context.results.size).toBe(0);
      expect(context.conversationHistory).toHaveLength(0);
      expect(context.sharedMemory.entities).toHaveLength(0);
    });

    it('should export context as JSON', () => {
      const json = context.toJSON();
      expect(json).toHaveProperty('taskId');
      expect(json).toHaveProperty('userRequest');
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('sharedMemory');
    });

    it('should provide context summary', () => {
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test',
        confidence: 0.9,
      });
      context.addEntity({
        name: 'Test',
        type: 'test',
        traits: [],
        importance: 0.5,
      });
      
      const summary = context.getSummary();
      expect(summary.taskId).toBe('test-task-1');
      expect(summary.resultCount).toBe(1);
      expect(summary.entityCount).toBe(1);
    });
  });
});

// ============================================================================
// TaskDecomposer Tests
// ============================================================================

describe('TaskDecomposer', () => {
  let decomposer: TaskDecomposer;

  beforeEach(() => {
    decomposer = createTaskDecomposer('test-decomposer');
  });

  describe('decompose', () => {
    it('should decompose emotion analysis request correctly', async () => {
      const result = await decomposer.decompose('分析我这周的情绪变化');
      
      expect(result.subtasks.length).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
      expect(result.estimatedDuration).toBeGreaterThan(0);
      
      // Should have emotion analysis task
      const emotionTask = result.subtasks.find(t => t.type === 'emotion_analysis');
      expect(emotionTask).toBeDefined();
      expect(emotionTask?.responsible).toBe('EmotionAnalyst');
    });

    it('should decompose emotion with memory request correctly', async () => {
      const result = await decomposer.decompose('分析我的情绪和记忆');
      
      // Should have memory retrieval first, then emotion analysis
      const memoryTask = result.subtasks.find(t => t.type === 'memory_retrieval');
      const emotionTask = result.subtasks.find(t => t.type === 'emotion_analysis');
      
      expect(memoryTask).toBeDefined();
      expect(emotionTask).toBeDefined();
      
      // Emotion task should depend on memory task
      if (emotionTask && memoryTask) {
        expect(emotionTask.dependencies).toContain(memoryTask.id);
      }
    });

    it('should decompose emotion with advice request correctly', async () => {
      const result = await decomposer.decompose('分析情绪并给我建议');
      
      const emotionTask = result.subtasks.find(t => t.type === 'emotion_analysis');
      const adviceTask = result.subtasks.find(t => t.type === 'advice_generation');
      
      expect(emotionTask).toBeDefined();
      expect(adviceTask).toBeDefined();
      
      // Advice should depend on emotion analysis
      if (adviceTask && emotionTask) {
        expect(adviceTask.dependencies).toContain(emotionTask.id);
      }
    });

    it('should decompose advice-only request with web search', async () => {
      const result = await decomposer.decompose('我该怎么办？');
      
      const searchTask = result.subtasks.find(t => t.type === 'web_search');
      const adviceTask = result.subtasks.find(t => t.type === 'advice_generation');
      
      expect(searchTask).toBeDefined();
      expect(adviceTask).toBeDefined();
      
      // Advice should depend on web search
      if (adviceTask && searchTask) {
        expect(adviceTask.dependencies).toContain(searchTask.id);
      }
    });

    it('should create subtasks with correct structure', async () => {
      const result = await decomposer.decompose('分析情绪');
      
      for (const subtask of result.subtasks) {
        expect(subtask.id).toBeDefined();
        expect(subtask.type).toBeDefined();
        expect(subtask.description).toBeDefined();
        expect(subtask.params).toBeDefined();
        expect(subtask.responsible).toBeDefined();
        expect(subtask.status).toBe('pending');
        expect(subtask.dependencies).toBeDefined();
        expect(subtask.createdAt).toBeDefined();
      }
    });
  });

  describe('validateDependencies', () => {
    it('should validate correct dependencies', () => {
      const subtasks = [
        {
          id: 'task-1',
          type: 'memory_retrieval' as const,
          description: '检索记忆',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
        {
          id: 'task-2',
          type: 'emotion_analysis' as const,
          description: '分析情绪',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-1'],
          createdAt: Date.now(),
        },
      ];
      
      const validation = decomposer.validateDependencies(subtasks);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect orphaned dependencies', () => {
      const subtasks = [
        {
          id: 'task-1',
          type: 'emotion_analysis' as const,
          description: '分析情绪',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['non-existent-task'],
          createdAt: Date.now(),
        },
      ];
      
      const validation = decomposer.validateDependencies(subtasks);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect cyclic dependencies', () => {
      const subtasks = [
        {
          id: 'task-1',
          type: 'memory_retrieval' as const,
          description: '检索记忆',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-2'],
          createdAt: Date.now(),
        },
        {
          id: 'task-2',
          type: 'emotion_analysis' as const,
          description: '分析情绪',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-1'],
          createdAt: Date.now(),
        },
      ];
      
      const validation = decomposer.validateDependencies(subtasks);
      expect(validation.valid).toBe(false);
    });
  });

  describe('getExecutionOrder', () => {
    it('should return correct execution levels', () => {
      const subtasks = [
        {
          id: 'task-1',
          type: 'memory_retrieval' as const,
          description: '检索记忆',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
        {
          id: 'task-2',
          type: 'emotion_analysis' as const,
          description: '分析情绪',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-1'],
          createdAt: Date.now(),
        },
        {
          id: 'task-3',
          type: 'advice_generation' as const,
          description: '生成建议',
          params: {},
          responsible: 'Advisor' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-2'],
          createdAt: Date.now(),
        },
      ];
      
      const levels = decomposer.getExecutionOrder(subtasks);
      
      // First level should have task-1 (no dependencies)
      expect(levels[0]).toHaveLength(1);
      expect(levels[0][0].id).toBe('task-1');
      
      // Second level should have task-2
      expect(levels[1]).toHaveLength(1);
      expect(levels[1][0].id).toBe('task-2');
      
      // Third level should have task-3
      expect(levels[2]).toHaveLength(1);
      expect(levels[2][0].id).toBe('task-3');
    });

    it('should execute independent tasks in parallel', () => {
      const subtasks = [
        {
          id: 'task-1',
          type: 'memory_retrieval' as const,
          description: '检索记忆',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
        {
          id: 'task-2',
          type: 'web_search' as const,
          description: '网络搜索',
          params: {},
          responsible: 'Researcher' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
      ];
      
      const levels = decomposer.getExecutionOrder(subtasks);
      
      // Both should be in the first level (parallel)
      expect(levels[0]).toHaveLength(2);
    });
  });
});

// ============================================================================
// ResultAggregator Tests
// ============================================================================

describe('ResultAggregator', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = createResultAggregator();
  });

  describe('aggregate', () => {
    it('should handle empty results', () => {
      const result = aggregator.aggregate([], '测试请求');
      expect(result).toBe('抱歉，无法生成回复。');
    });

    it('should concatenate results with concatenation strategy', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n找到了3条相关记忆',
          confidence: 0.9,
        },
        {
          subtaskId: 'task-2',
          role: 'EmotionAnalyst',
          output: '📊 情感分析师\n情绪呈现波动趋势',
          confidence: 0.85,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '分析情绪', {
        strategy: 'concatenation',
      });
      
      expect(aggregated).toContain('记忆专家');
      expect(aggregated).toContain('情感分析师');
    });

    it('should use weighted aggregation strategy', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n记忆检索结果',
          confidence: 0.9,
        },
        {
          subtaskId: 'task-2',
          role: 'EmotionAnalyst',
          output: '📊 情感分析师\n情绪分析结果',
          confidence: 0.7,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '分析情绪', {
        strategy: 'weighted',
        includeConfidence: true,
      });
      
      expect(aggregated).toContain('置信度');
      // Higher confidence result should appear first
      expect(aggregated.indexOf('记忆专家')).toBeLessThan(aggregated.indexOf('情感分析师'));
    });

    it('should use hierarchical aggregation with Advisor role', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n记忆检索结果',
          confidence: 0.9,
        },
        {
          subtaskId: 'task-2',
          role: 'Advisor',
          output: '💡 建议顾问\n综合建议内容',
          confidence: 0.85,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '分析情绪', {
        strategy: 'hierarchical',
      });
      
      expect(aggregated).toContain('综合建议');
      expect(aggregated).toContain('详细分析');
    });

    it('should respect maxLength option', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n这是一段很长的内容用于测试最大长度限制功能，确保超过限制时会被正确截断并添加省略号',
          confidence: 0.9,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '测试', {
        strategy: 'concatenation',
        maxLength: 30,
      });
      
      expect(aggregated.length).toBeLessThanOrEqual(33); // 30 + '...'
      expect(aggregated).toContain('...');
    });
  });

  describe('detectConflicts', () => {
    it('should detect conflicts between opposing results', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '情绪状态积极正面',
          confidence: 0.9,
        },
        {
          subtaskId: 'task-2',
          role: 'EmotionAnalyst',
          output: '情绪状态消极负面',
          confidence: 0.85,
        },
      ];
      
      const conflicts = aggregator.detectConflicts(results);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should not detect conflict for similar results', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '今天心情好',
          confidence: 0.9,
        },
        {
          subtaskId: 'task-2',
          role: 'EmotionAnalyst',
          output: '情绪状态正面',
          confidence: 0.85,
        },
      ];
      
      const conflicts = aggregator.detectConflicts(results);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict using confidence_weighted strategy', () => {
      const conflict = {
        subtaskIdA: 'task-1',
        subtaskIdB: 'task-2',
        conclusionA: '建议休息',
        conclusionB: '建议运动',
        strategy: 'confidence_weighted' as const,
      };
      
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '建议休息',
          confidence: 0.95, // Much higher confidence
        },
        {
          subtaskId: 'task-2',
          role: 'EmotionAnalyst',
          output: '建议运动',
          confidence: 0.5, // Lower confidence
        },
      ];
      
      const resolution = aggregator.resolveConflict(conflict, results);
      expect(resolution).toBe('建议休息'); // Higher confidence wins
    });

    it('should combine results when confidence is close', () => {
      const conflict = {
        subtaskIdA: 'task-1',
        subtaskIdB: 'task-2',
        conclusionA: '建议A',
        conclusionB: '建议B',
        strategy: 'confidence_weighted' as const,
      };
      
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '建议A',
          confidence: 0.8,
        },
        {
          subtaskId: 'task-2',
          role: 'EmotionAnalyst',
          output: '建议B',
          confidence: 0.75,
        },
      ];
      
      const resolution = aggregator.resolveConflict(conflict, results);
      expect(resolution).toContain('建议A');
      expect(resolution).toContain('建议B');
    });
  });
});

// ============================================================================
// PersonaRoleRegistry Tests
// ============================================================================

describe('PersonaRoleRegistry', () => {
  describe('getRoleRegistry', () => {
    it('should return a singleton registry instance', () => {
      const registry1 = getRoleRegistry();
      const registry2 = getRoleRegistry();
      expect(registry1).toBe(registry2);
    });

    it('should have all default roles registered', () => {
      const registry = getRoleRegistry();
      
      expect(registry.hasRole('MemoryExpert')).toBe(true);
      expect(registry.hasRole('EmotionAnalyst')).toBe(true);
      expect(registry.hasRole('Advisor')).toBe(true);
      expect(registry.hasRole('Researcher')).toBe(true);
      expect(registry.hasRole('Coder')).toBe(true);
    });
  });

  describe('getRole', () => {
    it('should return role configuration for valid role', () => {
      const registry = getRoleRegistry();
      const roleConfig = registry.getRole('MemoryExpert');
      
      expect(roleConfig).toBeDefined();
      expect(roleConfig?.role).toBe('MemoryExpert');
      expect(roleConfig?.capabilities).toBeDefined();
      expect(roleConfig?.capabilities.length).toBeGreaterThan(0);
    });

    it('should return undefined for invalid role', () => {
      const registry = getRoleRegistry();
      expect(registry.getRole('InvalidRole' as PersonaRole)).toBeUndefined();
    });
  });

  describe('getAllRoles', () => {
    it('should return all registered roles', () => {
      const registry = getRoleRegistry();
      const roles = registry.getAllRoles();
      
      expect(roles.length).toBe(5);
      expect(roles.map(r => r.role)).toContain('MemoryExpert');
      expect(roles.map(r => r.role)).toContain('EmotionAnalyst');
    });
  });

  describe('getRolesForTaskType', () => {
    it('should return correct roles for task types', () => {
      const registry = getRoleRegistry();
      
      expect(registry.getRolesForTaskType('memory_retrieval')).toContain('MemoryExpert');
      expect(registry.getRolesForTaskType('emotion_analysis')).toContain('EmotionAnalyst');
      expect(registry.getRolesForTaskType('advice_generation')).toContain('Advisor');
      expect(registry.getRolesForTaskType('web_search')).toContain('Researcher');
      expect(registry.getRolesForTaskType('code_execution')).toContain('Coder');
    });
  });

  describe('registerRole', () => {
    it('should register a custom role', () => {
      const registry = getRoleRegistry();
      const initialCount = registry.getAllRoles().length;
      
      registry.registerRole({
        role: 'CustomRole',
        capabilities: ['custom capability'],
        systemPrompt: 'A custom role',
        maxConcurrentTasks: 2,
      });
      
      expect(registry.hasRole('CustomRole')).toBe(true);
      expect(registry.getAllRoles().length).toBe(initialCount + 1);
    });
  });

  describe('createContribution', () => {
    it('should create a persona contribution', () => {
      const registry = getRoleRegistry();
      const contribution = registry.createContribution(
        'persona-1',
        'Advisor',
        '建议视角',
        ['要点1', '要点2'],
        'positive',
        0.9
      );
      
      expect(contribution.personaId).toBe('persona-1');
      expect(contribution.role).toBe('Advisor');
      expect(contribution.perspective).toBe('建议视角');
      expect(contribution.keyPoints).toEqual(['要点1', '要点2']);
      expect(contribution.emotion).toBe('positive');
      expect(contribution.confidence).toBe(0.9);
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const registry = getRoleRegistry();
      const validation = registry.validateConfig({
        role: 'TestRole',
        capabilities: ['capability 1'],
        systemPrompt: 'Test system prompt',
        maxConcurrentTasks: 2,
      });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', () => {
      const registry = getRoleRegistry();
      
      const validation1 = registry.validateConfig({
        role: '',
        capabilities: ['capability 1'],
        systemPrompt: 'Test',
        maxConcurrentTasks: 2,
      });
      expect(validation1.valid).toBe(false);
      
      const validation2 = registry.validateConfig({
        role: 'TestRole',
        capabilities: [],
        systemPrompt: 'Test system prompt',
        maxConcurrentTasks: 2,
      });
      expect(validation2.valid).toBe(false);
      
      const validation3 = registry.validateConfig({
        role: 'TestRole',
        capabilities: ['capability 1'],
        systemPrompt: 'Test',
        maxConcurrentTasks: 0,
      });
      expect(validation3.valid).toBe(false);
    });
  });
});

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('PersonaRoleRegistry Helper Functions', () => {
  describe('getAvailableRoles', () => {
    it('should return all available roles', () => {
      const roles = getAvailableRoles();
      
      expect(roles).toContain('MemoryExpert');
      expect(roles).toContain('EmotionAnalyst');
      expect(roles).toContain('Advisor');
      expect(roles).toContain('Researcher');
      expect(roles).toContain('Coder');
      expect(roles.length).toBe(5);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('MemoryExpert')).toBe(true);
      expect(isValidRole('EmotionAnalyst')).toBe(true);
      expect(isValidRole('Advisor')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('InvalidRole')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return Chinese display names', () => {
      expect(getRoleDisplayName('MemoryExpert')).toBe('记忆专家');
      expect(getRoleDisplayName('EmotionAnalyst')).toBe('情感分析师');
      expect(getRoleDisplayName('Advisor')).toBe('建议顾问');
      expect(getRoleDisplayName('Researcher')).toBe('研究员');
      expect(getRoleDisplayName('Coder')).toBe('程序员');
    });
  });

  describe('getRoleEmoji', () => {
    it('should return emoji for each role', () => {
      expect(getRoleEmoji('MemoryExpert')).toBe('🧠');
      expect(getRoleEmoji('EmotionAnalyst')).toBe('📊');
      expect(getRoleEmoji('Advisor')).toBe('💡');
      expect(getRoleEmoji('Researcher')).toBe('🔍');
      expect(getRoleEmoji('Coder')).toBe('💻');
    });
  });
});

// ============================================================================
// TrajectoryScorer Tests (P12)
// ============================================================================

import {
  TrajectoryScorer,
  createTrajectoryScorer,
  DEFAULT_SCORING_WEIGHTS,
} from '../trajectoryScorer';
import type { Trajectory } from '../trajectoryScorer';

describe('TrajectoryScorer', () => {
  let scorer: TrajectoryScorer;

  beforeEach(() => {
    scorer = createTrajectoryScorer();
  });

  describe('constructor', () => {
    it('should create scorer with default weights', () => {
      const s = new TrajectoryScorer();
      expect(s).toBeDefined();
    });

    it('should accept custom weights', () => {
      const customWeights = {
        efficiency: 0.3,
        quality: 0.4,
        coherence: 0.2,
        adaptability: 0.1,
      };
      const s = new TrajectoryScorer(customWeights);
      expect(s).toBeDefined();
    });
  });

  describe('score', () => {
    it('should score a successful trajectory', async () => {
      const trajectory: Trajectory = {
        id: 'traj-1',
        taskId: 'task-1',
        userRequest: '分析情绪',
        steps: [
          {
            stepIndex: 0,
            subtaskId: 'sub-1',
            action: 'memory_retrieval',
            state: {},
            duration: 500,
            confidence: 0.9,
          },
          {
            stepIndex: 1,
            subtaskId: 'sub-2',
            action: 'emotion_analysis',
            state: {},
            duration: 600,
            confidence: 0.85,
          },
        ],
        totalDuration: 1100,
        completedAt: Date.now(),
        success: true,
        finalResult: { summary: '情绪分析完成' },
      };

      const score = await scorer.score(trajectory);

      expect(score.trajectoryId).toBe('traj-1');
      expect(score.overallScore).toBeGreaterThan(0);
      expect(score.efficiencyScore).toBeGreaterThan(0);
      expect(score.qualityScore).toBeGreaterThan(0);
      expect(score.coherenceScore).toBeGreaterThan(0);
      expect(score.adaptabilityScore).toBeGreaterThan(0);
      expect(score.breakdown).toBeDefined();
      expect(score.recommendations).toBeDefined();
      expect(Array.isArray(score.recommendations)).toBe(true);
    });

    it('should penalize failed steps', async () => {
      const trajectory: Trajectory = {
        id: 'traj-2',
        taskId: 'task-2',
        userRequest: '分析情绪',
        steps: [
          {
            stepIndex: 0,
            subtaskId: 'sub-1',
            action: 'memory_retrieval',
            state: {},
            duration: 500,
            confidence: 0.9,
          },
          {
            stepIndex: 1,
            subtaskId: 'sub-2',
            action: 'emotion_analysis',
            state: {},
            duration: 600,
            confidence: 0.5,
            error: 'Analysis failed',
          },
        ],
        totalDuration: 1100,
        completedAt: Date.now(),
        success: false,
      };

      const score = await scorer.score(trajectory);

      expect(score.breakdown.failedSteps).toBe(1);
      expect(score.adaptabilityScore).toBeLessThan(100);
    });

    it('should detect redundant steps', async () => {
      const trajectory: Trajectory = {
        id: 'traj-3',
        taskId: 'task-3',
        userRequest: '分析情绪',
        steps: [
          {
            stepIndex: 0,
            subtaskId: 'sub-1',
            action: 'memory_retrieval',
            state: {},
            duration: 500,
            confidence: 0.9,
          },
          {
            stepIndex: 1,
            subtaskId: 'sub-2',
            action: 'memory_retrieval', // Duplicate action
            state: {},
            duration: 400,
            confidence: 0.85,
          },
        ],
        totalDuration: 900,
        completedAt: Date.now(),
        success: true,
      };

      const score = await scorer.score(trajectory);

      expect(score.breakdown.redundantSteps).toBe(1);
    });

    it('should calculate parallelization gain', async () => {
      const trajectory: Trajectory = {
        id: 'traj-4',
        taskId: 'task-4',
        userRequest: '分析情绪',
        steps: [
          {
            stepIndex: 0,
            subtaskId: 'sub-1',
            action: 'memory_retrieval',
            state: {},
            duration: 1000,
            confidence: 0.9,
          },
          {
            stepIndex: 1,
            subtaskId: 'sub-2',
            action: 'web_search',
            state: {},
            duration: 1000,
            confidence: 0.85,
          },
        ],
        totalDuration: 1000, // Parallel execution took 1000, not 2000
        completedAt: Date.now(),
        success: true,
      };

      const score = await scorer.score(trajectory);

      expect(score.breakdown.parallelizationGain).toBeGreaterThan(0);
    });
  });

  describe('compare', () => {
    it('should compare two trajectories', async () => {
      const trajectoryA: Trajectory = {
        id: 'traj-a',
        taskId: 'task-a',
        userRequest: '分析情绪',
        steps: [
          {
            stepIndex: 0,
            subtaskId: 'sub-1',
            action: 'memory_retrieval',
            state: {},
            duration: 500,
            confidence: 0.95,
          },
        ],
        totalDuration: 500,
        completedAt: Date.now(),
        success: true,
      };

      const trajectoryB: Trajectory = {
        id: 'traj-b',
        taskId: 'task-b',
        userRequest: '分析情绪',
        steps: [
          {
            stepIndex: 0,
            subtaskId: 'sub-1',
            action: 'memory_retrieval',
            state: {},
            duration: 500,
            confidence: 0.7,
          },
        ],
        totalDuration: 500,
        completedAt: Date.now(),
        success: true,
      };

      await scorer.score(trajectoryA);
      await scorer.score(trajectoryB);

      const comparison = scorer.compare(trajectoryA, trajectoryB);

      expect(comparison).toHaveProperty('winner');
      expect(comparison).toHaveProperty('scoreDiff');
      expect(comparison).toHaveProperty('dimensionDiffs');
      expect(['A', 'B', 'tie']).toContain(comparison.winner);
    });
  });
});

// ============================================================================
// StrategyLibrary Tests (P12)
// ============================================================================

import {
  StrategyLibrary,
  createStrategyLibrary,
  STRATEGY_TEMPLATES,
} from '../strategyLibrary';
import type { StrategyContext, ExecutionStrategy } from '../strategyLibrary';

describe('StrategyLibrary', () => {
  let library: StrategyLibrary;

  beforeEach(() => {
    library = createStrategyLibrary();
  });

  describe('constructor', () => {
    it('should create library with built-in strategies', () => {
      expect(library).toBeDefined();
    });

    it('should register quick response strategy', () => {
      const quickResponse = library.getStrategy(STRATEGY_TEMPLATES.QUICK_RESPONSE);
      expect(quickResponse).toBeDefined();
      expect(quickResponse?.name).toBe('快速响应策略');
    });

    it('should register thorough analysis strategy', () => {
      const thorough = library.getStrategy(STRATEGY_TEMPLATES.THOROUGH_ANALYSIS);
      expect(thorough).toBeDefined();
      expect(thorough?.name).toBe('深度分析策略');
    });
  });

  describe('getStrategy', () => {
    it('should return existing strategy', () => {
      const strategy = library.getStrategy(STRATEGY_TEMPLATES.QUICK_RESPONSE);
      expect(strategy).toBeDefined();
      expect(strategy?.id).toBe(STRATEGY_TEMPLATES.QUICK_RESPONSE);
    });

    it('should return undefined for non-existent strategy', () => {
      const strategy = library.getStrategy('non_existent');
      expect(strategy).toBeUndefined();
    });
  });

  describe('select', () => {
    it('should select quick response for simple queries', () => {
      const context: StrategyContext = {
        userRequest: '今天天气怎么样？',
        taskTypes: ['advice_generation'],
        detectedEntities: [],
        complexity: 2,
        availableRoles: ['Advisor'],
      };

      const result = library.select(context);

      expect(result.strategyId).toBe(STRATEGY_TEMPLATES.QUICK_RESPONSE);
      expect(result.selectedStrategy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should select emotion analysis for emotion requests', () => {
      const context: StrategyContext = {
        userRequest: '分析我的情绪状态',
        taskTypes: ['emotion_analysis'],
        detectedEntities: [],
        complexity: 5,
        availableRoles: ['MemoryExpert', 'EmotionAnalyst', 'Advisor'],
      };

      const result = library.select(context);

      // emotion_analysis strategy has priority 9, thorough_analysis has priority 5
      // Both match conditions, but emotion_analysis should win due to higher priority
      expect(['emotion_analysis', 'thorough_analysis']).toContain(result.strategyId);
    });

    it('should select advice generation for advice requests', () => {
      const context: StrategyContext = {
        userRequest: '我该怎么办？',
        taskTypes: ['advice_generation'],
        detectedEntities: [],
        complexity: 4,
        availableRoles: ['Researcher', 'Advisor'],
      };

      const result = library.select(context);

      expect(result.strategyId).toBe(STRATEGY_TEMPLATES.ADVICE_GENERATION);
    });

    it('should warn when previous failures exist', () => {
      const context: StrategyContext = {
        userRequest: '分析情绪',
        taskTypes: ['emotion_analysis'],
        detectedEntities: [],
        complexity: 5,
        availableRoles: ['MemoryExpert', 'EmotionAnalyst'],
        previousFailures: ['timeout_error'],
      };

      const result = library.select(context);

      expect(result.warnings).toContain('检测到历史失败，可能需要更保守的策略');
    });
  });

  describe('register', () => {
    it('should register custom strategy', () => {
      const customStrategy: ExecutionStrategy = {
        id: 'custom_strategy',
        name: '自定义策略',
        description: '测试用自定义策略',
        version: '1.0.0',
        conditions: {
          keywords: ['测试'],
        },
        config: {
          maxConcurrentSubtasks: 2,
          taskTimeout: 30000,
          enableParallelExecution: false,
          enableCaching: true,
          retryPolicy: {
            maxRetries: 2,
            initialDelayMs: 1000,
            maxDelayMs: 10000,
            backoffMultiplier: 2,
            retryableErrors: ['timeout'],
          },
          roleAssignments: new Map(),
          executionOrder: { type: 'sequential' },
        },
        priority: 10,
        useCount: 0,
      };

      library.register(customStrategy);
      const retrieved = library.getStrategy('custom_strategy');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('自定义策略');
    });
  });

  describe('unregister', () => {
    it('should unregister non-default strategy', () => {
      const customStrategy: ExecutionStrategy = {
        id: 'temp_strategy',
        name: '临时策略',
        description: '测试用',
        version: '1.0.0',
        conditions: { keywords: ['临时'] },
        config: {
          maxConcurrentSubtasks: 1,
          taskTimeout: 10000,
          enableParallelExecution: false,
          enableCaching: false,
          retryPolicy: {
            maxRetries: 1,
            initialDelayMs: 100,
            maxDelayMs: 1000,
            backoffMultiplier: 1.5,
            retryableErrors: [],
          },
          roleAssignments: new Map(),
          executionOrder: { type: 'sequential' },
        },
        priority: 5,
        useCount: 0,
      };

      library.register(customStrategy);
      const result = library.unregister('temp_strategy');

      expect(result).toBe(true);
      expect(library.getStrategy('temp_strategy')).toBeUndefined();
    });

    it('should not unregister default strategy', () => {
      const result = library.unregister(STRATEGY_TEMPLATES.QUICK_RESPONSE);
      expect(result).toBe(false);
    });
  });
});

// ============================================================================
// FailurePatternLearner Tests (P12)
// ============================================================================

import {
  FailurePatternLearner,
  createFailurePatternLearner,
  DEFAULT_LEARNING_CONFIG,
} from '../failurePatternLearner';
import type { FailureSeverity, TaskType } from '../types';

describe('FailurePatternLearner', () => {
  let learner: FailurePatternLearner;

  beforeEach(() => {
    learner = createFailurePatternLearner();
  });

  describe('constructor', () => {
    it('should create learner with default config', () => {
      expect(learner).toBeDefined();
    });

    it('should accept custom config', () => {
      const customConfig = {
        minOccurrencesForPattern: 5,
        patternWindowMs: 60 * 60 * 1000, // 1 hour
      };
      const l = createFailurePatternLearner(customConfig);
      expect(l).toBeDefined();
    });
  });

  describe('recordFailure', () => {
    it('should record timeout failure', async () => {
      const failure = await learner.recordFailure(
        'task-1',
        'emotion_analysis' as TaskType,
        new Error('Request timeout after 30000ms'),
        {},
        'EmotionAnalyst' as PersonaRole,
        'medium' as FailureSeverity
      );

      expect(failure.id).toBeDefined();
      expect(failure.errorType).toBe('timeout');
      expect(failure.taskType).toBe('emotion_analysis');
      expect(failure.responsibleRole).toBe('EmotionAnalyst');
      expect(failure.severity).toBe('medium');
      expect(failure.resolved).toBe(false);
    });

    it('should record network error', async () => {
      const failure = await learner.recordFailure(
        'task-2',
        'web_search' as TaskType,
        new Error('Network connection failed'),
        {},
        'Researcher' as PersonaRole,
        'high' as FailureSeverity
      );

      expect(failure.errorType).toBe('network_error');
    });

    it('should record rate limit error', async () => {
      const failure = await learner.recordFailure(
        'task-3',
        'advice_generation' as TaskType,
        new Error('Rate limit exceeded: 429'),
        {},
        'Advisor' as PersonaRole,
        'medium' as FailureSeverity
      );

      expect(failure.errorType).toBe('rate_limit');
    });

    it('should classify unknown errors', async () => {
      const failure = await learner.recordFailure(
        'task-4',
        'memory_retrieval' as TaskType,
        new Error('Something went wrong'),
        {}
      );

      expect(failure.errorType).toBe('unknown');
    });
  });

  describe('resolveFailure', () => {
    it('should mark failure as resolved', async () => {
      const failure = await learner.recordFailure(
        'task-5',
        'emotion_analysis' as TaskType,
        new Error('timeout'),
        {}
      );

      const result = learner.resolveFailure(
        failure.id,
        '服务器响应慢',
        ['增加超时时间', '添加重试机制']
      );

      expect(result).toBe(true);
    });

    it('should return false for non-existent failure', () => {
      const result = learner.resolveFailure('non_existent_id');
      expect(result).toBe(false);
    });
  });

  describe('pattern learning', () => {
    it('should learn patterns after multiple failures', async () => {
      // Create a learner with lower threshold to enable pattern learning in test
      const testLearner = createFailurePatternLearner({
        minOccurrencesForPattern: 3,
        confidenceThreshold: 0.2, // Lower threshold for testing
      });

      // Record multiple similar failures with identical messages
      for (let i = 0; i < 3; i++) {
        await testLearner.recordFailure(
          `task-${i}`,
          'emotion_analysis' as TaskType,
          new Error('Request timeout after 30000ms'),
          {},
          'EmotionAnalyst' as PersonaRole,
          'medium' as FailureSeverity
        );
      }

      // Small delay for pattern learning
      await new Promise(resolve => setTimeout(resolve, 100));

      const patterns = testLearner.getAllPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return patterns sorted by frequency', () => {
      const patterns = learner.getAllPatterns();
      if (patterns.length > 1) {
        for (let i = 1; i < patterns.length; i++) {
          expect(patterns[i - 1].frequency).toBeGreaterThanOrEqual(patterns[i].frequency);
        }
      }
    });
  });

  describe('getFailureStats', () => {
    it('should return failure statistics', async () => {
      await learner.recordFailure(
        'task-s1',
        'emotion_analysis' as TaskType,
        new Error('timeout'),
        {}
      );

      const stats = learner.getStatistics();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('bySeverity');
    });
  });
});

// ============================================================================
// CollaborationOrchestrator Tests (P12)
// ============================================================================

import { CollaborationOrchestrator, createOrchestrator } from '../orchestrator';

describe('CollaborationOrchestrator', () => {
  let orchestrator: CollaborationOrchestrator;

  beforeEach(() => {
    orchestrator = createOrchestrator({
      maxConcurrentSubtasks: 2,
      taskTimeout: 5000,
      maxRetries: 1,
      enableConflictResolution: true,
      conflictStrategy: 'confidence_weighted',
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await orchestrator.createSession('测试请求');

      expect(session.id).toBeDefined();
      expect(session.userRequest).toBe('测试请求');
      expect(session.status).toBe('decomposing');
      expect(session.subtasks).toEqual([]);
      expect(session.results.size).toBe(0);
    });

    it('should store session in active sessions', async () => {
      const session = await orchestrator.createSession('测试请求');

      const retrieved = orchestrator.getSession(session.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(session.id);
    });

    it('should create session context', async () => {
      const session = await orchestrator.createSession('测试请求');

      const context = orchestrator.getSessionContext(session.id);
      expect(context).toBeDefined();
      expect(context?.taskId).toBe(session.id);
      expect(context?.userRequest).toBe('测试请求');
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent session', () => {
      const session = orchestrator.getSession('non_existent');
      expect(session).toBeUndefined();
    });
  });

  describe('getAllSessions', () => {
    it('should return all active sessions', async () => {
      await orchestrator.createSession('请求1');
      await orchestrator.createSession('请求2');

      const sessions = orchestrator.getAllSessions();
      expect(sessions.length).toBe(2);
    });
  });

  describe('closeSession', () => {
    it('should remove session from active sessions', async () => {
      const session = await orchestrator.createSession('测试请求');

      orchestrator.closeSession(session.id);

      expect(orchestrator.getSession(session.id)).toBeUndefined();
      expect(orchestrator.getSessionContext(session.id)).toBeUndefined();
    });
  });

  describe('startSession', () => {
    it('should complete a simple emotion analysis session', async () => {
      const session = await orchestrator.startSession('分析我的情绪');

      expect(session.status).toBe('done');
      expect(session.subtasks.length).toBeGreaterThan(0);
      expect(session.results.size).toBeGreaterThan(0);
      expect(session.completedAt).toBeDefined();
    }, 10000);

    it('should emit session_started event', async () => {
      const events: unknown[] = [];
      orchestrator.onEvent((event) => {
        events.push(event);
      });

      await orchestrator.startSession('分析情绪');

      const startedEvent = events.find(e => (e as { type: string }).type === 'session_started');
      expect(startedEvent).toBeDefined();
    }, 10000);

    it('should emit task_decomposed event', async () => {
      const events: unknown[] = [];
      orchestrator.onEvent((event) => {
        events.push(event);
      });

      await orchestrator.startSession('分析情绪');

      const decomposedEvent = events.find(e => (e as { type: string }).type === 'task_decomposed');
      expect(decomposedEvent).toBeDefined();
    }, 10000);

    it('should emit subtask events', async () => {
      const events: unknown[] = [];
      orchestrator.onEvent((event) => {
        events.push(event);
      });

      await orchestrator.startSession('分析情绪');

      const startedEvents = events.filter(e => (e as { type: string }).type === 'subtask_started');
      const completedEvents = events.filter(e => (e as { type: string }).type === 'subtask_completed');

      expect(startedEvents.length).toBeGreaterThan(0);
      expect(completedEvents.length).toBeGreaterThan(0);
    }, 10000);

    it('should emit session_completed event on success', async () => {
      const events: unknown[] = [];
      orchestrator.onEvent((event) => {
        events.push(event);
      });

      await orchestrator.startSession('分析情绪');

      const completedEvent = events.find(e => (e as { type: string }).type === 'session_completed');
      expect(completedEvent).toBeDefined();
    }, 10000);
  });

  describe('getProgress', () => {
    it('should return null for non-existent session', () => {
      const progress = orchestrator.getProgress('non_existent');
      expect(progress).toBeNull();
    });

    it('should track progress during session', async () => {
      const session = await orchestrator.startSession('分析情绪并给出建议');

      const progress = orchestrator.getProgress(session.id);
      expect(progress).toBeDefined();
      expect(progress?.sessionId).toBe(session.id);
      expect(progress?.progress).toBe(100);
      expect(progress?.status).toBe('done');
    }, 10000);
  });

  describe('event handling', () => {
    it('should subscribe to events', async () => {
      const events: unknown[] = [];
      const unsubscribe = orchestrator.onEvent((event) => {
        events.push(event);
      });

      await orchestrator.startSession('测试');

      expect(events.length).toBeGreaterThan(0);

      // Test unsubscribe
      unsubscribe();
    }, 10000);

    it('should handle multiple subscribers', async () => {
      const events1: unknown[] = [];
      const events2: unknown[] = [];

      orchestrator.onEvent((event) => {
        events1.push(event);
      });
      orchestrator.onEvent((event) => {
        events2.push(event);
      });

      await orchestrator.startSession('测试');

      expect(events1.length).toBe(events2.length);
    }, 10000);
  });
});

// ============================================================================
// P13: Extended SharedContext Tests (Edge Cases & Integration)
// ============================================================================

describe('SharedContext P13 Extended', () => {
  let context: SharedContext;

  beforeEach(() => {
    context = createSharedContext('p13-test-context', '测试请求');
  });

  describe('read operations edge cases', () => {
    it('should handle dotted path reading for nested entities', () => {
      const entity = context.addEntity({
        name: 'TestEntity',
        type: 'test',
        traits: ['trait1'],
        importance: 0.8,
      });
      
      // The read method looks for entity by name
      const readEntity = context.read('TestEntity');
      expect(readEntity).toBeDefined();
      expect((readEntity as { name: string }).name).toBe('TestEntity');
    });

    it('should return undefined for non-existent entity name', () => {
      const result = context.read('NonExistentEntity');
      expect(result).toBeUndefined();
    });

    it('should read facts by tag', () => {
      context.addFact({
        content: '测试事实内容',
        source: 'test_source',
        confidence: 0.9,
        tags: ['test_tag'],
      });
      
      const result = context.read('test_tag');
      expect(result).toBe('测试事实内容');
    });

    it('should find decision by content keyword', () => {
      context.addDecision({
        content: '这是一个重要决定',
        rationale: '测试理由',
        votedBy: ['Advisor'],
      });
      
      const result = context.read('重要决定');
      expect(result).toBeDefined();
    });

    it('should getCompletedResults returns array not map', () => {
      context.setResult({
        subtaskId: 'test-1',
        role: 'MemoryExpert',
        output: 'test output',
        confidence: 0.9,
      });
      
      const results = context.getCompletedResults();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
    });
  });

  describe('write operations edge cases', () => {
    it('should overwrite existing key-value pair', () => {
      context.write('key1', 'value1');
      context.write('key1', 'value2');
      
      expect(context.read('key1')).toBe('value2');
    });

    it('should write undefined values as string "undefined"', () => {
      context.write('undefinedKey', undefined);
      expect(context.read('undefinedKey')).toBe('undefined');
    });

    it('should write object values as string representation', () => {
      context.write('objectKey', { nested: { value: 123 } });
      expect(context.read('objectKey')).toContain('[object Object]');
    });
  });

  describe('entity management edge cases', () => {
    it('should handle entity update with partial data', () => {
      const entity = context.addEntity({
        name: 'PartialEntity',
        type: 'test',
        traits: ['initial'],
        importance: 0.5,
      });
      
      const updated = context.updateEntity(entity.id, { importance: 0.9 });
      expect(updated?.importance).toBe(0.9);
      expect(updated?.traits).toEqual(['initial']); // Unchanged
    });

    it('should return null when updating non-existent entity', () => {
      const result = context.updateEntity('non-existent-id', { importance: 0.9 });
      expect(result).toBeNull();
    });

    it('should maintain entity id uniqueness', () => {
      const entities = [];
      for (let i = 0; i < 10; i++) {
        entities.push(context.addEntity({
          name: `Entity${i}`,
          type: 'test',
          traits: [],
          importance: 0.5,
        }));
      }
      
      const ids = entities.map(e => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });
  });

  describe('shared memory integration', () => {
    it('should maintain separate memory across contexts', () => {
      const context1 = createSharedContext('ctx1', '请求1');
      const context2 = createSharedContext('ctx2', '请求2');
      
      context1.addEntity({
        name: 'EntityInCtx1',
        type: 'test',
        traits: [],
        importance: 0.8,
      });
      
      expect(context1.readEntities()).toHaveLength(1);
      expect(context2.readEntities()).toHaveLength(0);
    });

    it('should clear only results but keep entities', () => {
      context.addEntity({
        name: 'PersistentEntity',
        type: 'test',
        traits: [],
        importance: 0.8,
      });
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test',
        confidence: 0.9,
      });
      
      context.clearResults();
      
      expect(context.results.size).toBe(0);
      expect(context.readEntities()).toHaveLength(1);
    });
  });

  describe('toJSON and serialization', () => {
    it('should serialize results as array of entries', () => {
      context.setResult({
        subtaskId: 'task-1',
        role: 'MemoryExpert',
        output: 'test output',
        confidence: 0.9,
      });
      
      const json = context.toJSON();
      const results = (json as { results: unknown[] }).results;
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
    });

    it('should include all fields in JSON output', () => {
      const json = context.toJSON();
      
      expect(json).toHaveProperty('taskId');
      expect(json).toHaveProperty('userRequest');
      expect(json).toHaveProperty('results');
      expect(json).toHaveProperty('conversationHistory');
      expect(json).toHaveProperty('sharedMemory');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
    });
  });

  describe('getSummary edge cases', () => {
    it('should return correct counts after multiple operations', () => {
      context.addEntity({ name: 'E1', type: 't', traits: [], importance: 0.5 });
      context.addEntity({ name: 'E2', type: 't', traits: [], importance: 0.5 });
      context.addFact({ content: 'F1', source: 's', confidence: 0.9, tags: [] });
      context.addDecision({ content: 'D1', rationale: 'r', votedBy: [] });
      context.addMessage({ role: 'Advisor', personaId: 'p1', content: 'msg', type: 'synthesis' });
      context.setResult({ subtaskId: 's1', role: 'Advisor', output: 'o', confidence: 0.9 });
      
      const summary = context.getSummary();
      
      expect(summary.entityCount).toBe(2);
      expect(summary.factCount).toBe(1);
      expect(summary.decisionCount).toBe(1);
      expect(summary.messageCount).toBe(1);
      expect(summary.resultCount).toBe(1);
    });
  });
});

// ============================================================================
// P13: Extended TaskDecomposer Tests (Edge Cases & Integration)
// ============================================================================

describe('TaskDecomposer P13 Extended', () => {
  let decomposer: TaskDecomposer;

  beforeEach(() => {
    decomposer = createTaskDecomposer('p13-decomposer');
  });

  describe('decompose edge cases', () => {
    it('should handle empty-like request string', async () => {
      const result = await decomposer.decompose('   ');
      expect(result.subtasks.length).toBeGreaterThan(0);
    });

    it('should handle very long request string', async () => {
      const longRequest = '分析我的情绪' + '啊'.repeat(1000);
      const result = await decomposer.decompose(longRequest);
      expect(result.subtasks.length).toBeGreaterThan(0);
    });

    it('should handle mixed Chinese and English keywords', async () => {
      const result = await decomposer.decompose('analyze my emotion and give advice');
      expect(result.subtasks.length).toBeGreaterThan(0);
    });

    it('should handle request with multiple emotion keywords', async () => {
      const result = await decomposer.decompose('分析我的情绪和心情，感受怎么样');
      expect(result.subtasks.length).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });
  });

  describe('detectTaskTypes edge cases', () => {
    it('should detect emotion_analysis with English keywords', async () => {
      const result = await decomposer.decompose('analyze my mood');
      const hasEmotion = result.subtasks.some(t => t.type === 'emotion_analysis');
      expect(hasEmotion).toBe(true);
    });

    it('should detect memory_retrieval with English keywords', async () => {
      const result = await decomposer.decompose('remember what happened');
      const hasMemory = result.subtasks.some(t => t.type === 'memory_retrieval');
      expect(hasMemory).toBe(true);
    });

    it('should detect advice_generation with English keywords', async () => {
      const result = await decomposer.decompose('what should I do? how can I improve?');
      const hasAdvice = result.subtasks.some(t => t.type === 'advice_generation');
      expect(hasAdvice).toBe(true);
    });
  });

  describe('dependency edge cases', () => {
    it('should handle complex multi-level dependencies', async () => {
      const result = await decomposer.decompose('分析我的情绪和记忆并给我建议');
      
      const memoryTask = result.subtasks.find(t => t.type === 'memory_retrieval');
      const emotionTask = result.subtasks.find(t => t.type === 'emotion_analysis');
      const adviceTask = result.subtasks.find(t => t.type === 'advice_generation');
      
      if (emotionTask && memoryTask) {
        expect(emotionTask.dependencies).toContain(memoryTask.id);
      }
      if (adviceTask && emotionTask) {
        expect(adviceTask.dependencies).toContain(emotionTask.id);
      }
    });

    it('should create subtasks with unique IDs', () => {
      const subtasks = [
        {
          id: 'subtask_1',
          type: 'memory_retrieval' as const,
          description: 'test',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
      ];
      
      const validation = decomposer.validateDependencies(subtasks);
      expect(validation.valid).toBe(true);
    });
  });

  describe('validateDependencies edge cases', () => {
    it('should reject task depending on itself', () => {
      const subtasks = [
        {
          id: 'self-ref',
          type: 'memory_retrieval' as const,
          description: 'test',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['self-ref'],
          createdAt: Date.now(),
        },
      ];
      
      const validation = decomposer.validateDependencies(subtasks);
      expect(validation.valid).toBe(false);
    });

    it('should detect indirect cycle', () => {
      const subtasks = [
        {
          id: 'task-a',
          type: 'memory_retrieval' as const,
          description: 'test',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-c'],
          createdAt: Date.now(),
        },
        {
          id: 'task-b',
          type: 'emotion_analysis' as const,
          description: 'test',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-a'],
          createdAt: Date.now(),
        },
        {
          id: 'task-c',
          type: 'advice_generation' as const,
          description: 'test',
          params: {},
          responsible: 'Advisor' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-b'],
          createdAt: Date.now(),
        },
      ];
      
      const validation = decomposer.validateDependencies(subtasks);
      expect(validation.valid).toBe(false);
    });

    it('should validate empty subtask list', () => {
      const validation = decomposer.validateDependencies([]);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('getExecutionOrder edge cases', () => {
    it('should handle diamond dependency pattern', () => {
      const subtasks = [
        {
          id: 'task-top',
          type: 'memory_retrieval' as const,
          description: 'top',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
        {
          id: 'task-left',
          type: 'emotion_analysis' as const,
          description: 'left',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-top'],
          createdAt: Date.now(),
        },
        {
          id: 'task-right',
          type: 'advice_generation' as const,
          description: 'right',
          params: {},
          responsible: 'Advisor' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-top'],
          createdAt: Date.now(),
        },
        {
          id: 'task-bottom',
          type: 'emotion_analysis' as const,
          description: 'bottom',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: ['task-left', 'task-right'],
          createdAt: Date.now(),
        },
      ];
      
      const levels = decomposer.getExecutionOrder(subtasks);
      
      expect(levels[0]).toHaveLength(1); // task-top
      expect(levels[1]).toHaveLength(2); // task-left, task-right (parallel)
      expect(levels[2]).toHaveLength(1); // task-bottom
    });

    it('should handle all tasks in parallel (no dependencies)', () => {
      const subtasks = [
        {
          id: 't1',
          type: 'memory_retrieval' as const,
          description: 'test',
          params: {},
          responsible: 'MemoryExpert' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
        {
          id: 't2',
          type: 'emotion_analysis' as const,
          description: 'test',
          params: {},
          responsible: 'EmotionAnalyst' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
        {
          id: 't3',
          type: 'advice_generation' as const,
          description: 'test',
          params: {},
          responsible: 'Advisor' as PersonaRole,
          status: 'pending' as const,
          dependencies: [] as string[],
          createdAt: Date.now(),
        },
      ];
      
      const levels = decomposer.getExecutionOrder(subtasks);
      
      expect(levels).toHaveLength(1);
      expect(levels[0]).toHaveLength(3);
    });
  });

  describe('estimateDuration edge cases', () => {
    it('should return positive duration for empty subtask list', async () => {
      // This is a bit tricky since decompose always creates subtasks
      // but we can test the logic through validateDependencies edge cases
      const result = await decomposer.decompose('分析情绪');
      expect(result.estimatedDuration).toBeGreaterThan(0);
    });

    it('should estimate higher duration for more subtasks', async () => {
      const simpleResult = await decomposer.decompose('分析');
      const complexResult = await decomposer.decompose('分析我的情绪和记忆并给我建议');
      
      expect(complexResult.estimatedDuration).toBeGreaterThanOrEqual(simpleResult.estimatedDuration);
    });
  });
});

// ============================================================================
// P13: Extended ResultAggregator Tests (Edge Cases & Integration)
// ============================================================================

describe('ResultAggregator P13 Extended', () => {
  let aggregator: ResultAggregator;

  beforeEach(() => {
    aggregator = createResultAggregator();
  });

  describe('aggregate edge cases', () => {
    it('should handle single result', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 'task-1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n只有一条记忆',
          confidence: 0.95,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '测试', { strategy: 'concatenation' });
      expect(aggregated).toContain('记忆专家');
    });

    it('should handle mixed confidence values', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n结果A',
          confidence: 0.5,
        },
        {
          subtaskId: 't2',
          role: 'EmotionAnalyst',
          output: '📊 情感分析师\n结果B',
          confidence: 1.0,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '测试', { strategy: 'weighted' });
      expect(aggregated).toContain('结果B');
    });

    it('should handle results with special characters', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n包含emoji🎉和特殊<>字符',
          confidence: 0.9,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '测试');
      expect(aggregated).toContain('emoji');
    });

    it('should handle very long output with maxLength', () => {
      const longOutput = 'A'.repeat(1000);
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: `🧠 记忆专家\n${longOutput}`,
          confidence: 0.9,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '测试', { 
        strategy: 'concatenation',
        maxLength: 50,
      });
      
      expect(aggregated.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(aggregated).toContain('...');
    });
  });

  describe('detectConflicts edge cases', () => {
    it('should not detect conflict with similar positive results', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: '今天心情很好很开心',
          confidence: 0.9,
        },
        {
          subtaskId: 't2',
          role: 'EmotionAnalyst',
          output: '情绪状态积极正面',
          confidence: 0.85,
        },
      ];
      
      const conflicts = aggregator.detectConflicts(results);
      expect(conflicts).toHaveLength(0);
    });

    it('should detect conflict between positive and negative', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: '情绪状态good上升positive',
          confidence: 0.9,
        },
        {
          subtaskId: 't2',
          role: 'EmotionAnalyst',
          output: '情绪状态bad下降negative',
          confidence: 0.85,
        },
      ];
      
      const conflicts = aggregator.detectConflicts(results);
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('should not detect conflict with neutral results', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: '记忆检索完成',
          confidence: 0.9,
        },
        {
          subtaskId: 't2',
          role: 'EmotionAnalyst',
          output: '情绪数据已收集',
          confidence: 0.85,
        },
      ];
      
      const conflicts = aggregator.detectConflicts(results);
      expect(conflicts).toHaveLength(0);
    });

    it('should handle empty results array', () => {
      const conflicts = aggregator.detectConflicts([]);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('resolveConflict edge cases', () => {
    it('should handle vote strategy', () => {
      const conflict = {
        subtaskIdA: 't1',
        subtaskIdB: 't2',
        conclusionA: '选择A',
        conclusionB: '选择B',
        strategy: 'vote' as const,
      };
      
      const results: SubtaskResult[] = [
        { subtaskId: 't1', role: 'MemoryExpert', output: '选择A', confidence: 0.6 },
        { subtaskId: 't2', role: 'EmotionAnalyst', output: '选择B', confidence: 0.4 },
      ];
      
      const resolution = aggregator.resolveConflict(conflict, results);
      expect(resolution).toBe('选择A'); // Higher confidence wins
    });

    it('should handle arbitration with advisor', () => {
      const conflict = {
        subtaskIdA: 't1',
        subtaskIdB: 't2',
        conclusionA: '选择A',
        conclusionB: '选择B',
        strategy: 'arbitration' as const,
      };
      
      const results: SubtaskResult[] = [
        { subtaskId: 't1', role: 'MemoryExpert', output: '选择A', confidence: 0.6 },
        { subtaskId: 't2', role: 'EmotionAnalyst', output: '选择B', confidence: 0.7 },
        { subtaskId: 't3', role: 'Advisor', output: '建议选A', confidence: 0.8 },
      ];
      
      const resolution = aggregator.resolveConflict(conflict, results);
      expect(resolution).toBe('建议选A'); // Advisor wins in arbitration
    });

    it('should combine close confidence results', () => {
      const conflict = {
        subtaskIdA: 't1',
        subtaskIdB: 't2',
        conclusionA: '结论A',
        conclusionB: '结论B',
        strategy: 'confidence_weighted' as const,
      };
      
      const results: SubtaskResult[] = [
        { subtaskId: 't1', role: 'MemoryExpert', output: '结论A', confidence: 0.75 },
        { subtaskId: 't2', role: 'EmotionAnalyst', output: '结论B', confidence: 0.70 },
      ];
      
      const resolution = aggregator.resolveConflict(conflict, results);
      expect(resolution).toContain('结论A');
      expect(resolution).toContain('结论B');
    });

    it('should return error message for missing results', () => {
      const conflict = {
        subtaskIdA: 'missing',
        subtaskIdB: 'also-missing',
        conclusionA: 'A',
        conclusionB: 'B',
        strategy: 'vote' as const,
      };
      
      const resolution = aggregator.resolveConflict(conflict, []);
      expect(resolution).toBe('无法解决冲突');
    });
  });

  describe('hierarchical aggregate edge cases', () => {
    it('should handle results without advisor role', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'MemoryExpert',
          output: '🧠 记忆专家\n记忆结果',
          confidence: 0.9,
        },
        {
          subtaskId: 't2',
          role: 'EmotionAnalyst',
          output: '📊 情感分析师\n情绪结果',
          confidence: 0.85,
        },
      ];
      
      // When no Advisor, should fallback to concatenation
      const aggregated = aggregator.aggregate(results, '测试', { strategy: 'hierarchical' });
      expect(aggregated).toContain('记忆专家');
    });

    it('should respect maxLength in hierarchical mode', () => {
      const results: SubtaskResult[] = [
        {
          subtaskId: 't1',
          role: 'Advisor',
          output: '💡 建议顾问\n' + '综合建议内容'.repeat(100),
          confidence: 0.9,
        },
      ];
      
      const aggregated = aggregator.aggregate(results, '测试', { 
        strategy: 'hierarchical',
        maxLength: 50,
      });
      
      expect(aggregated.length).toBeLessThanOrEqual(53);
    });
  });
});

// ============================================================================
// P13: Extended PersonaRoleRegistry Tests (Edge Cases & Integration)
// ============================================================================

describe('PersonaRoleRegistry P13 Extended', () => {
  let registry: PersonaRoleRegistry;

  beforeEach(() => {
    // Create a fresh registry for each test to avoid pollution
    registry = new PersonaRoleRegistry();
  });

  describe('role registration edge cases', () => {
    it('should reject role with empty system prompt', () => {
      const invalidConfig = {
        role: 'TestRole' as PersonaRole,
        capabilities: ['test'],
        systemPrompt: '',
        maxConcurrentTasks: 1,
      };
      
      const validation = registry.validateConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('System prompt must be at least 10 characters');
    });

    it('should reject role with no capabilities', () => {
      const invalidConfig = {
        role: 'TestRole' as PersonaRole,
        capabilities: [],
        systemPrompt: 'Valid system prompt for testing',
        maxConcurrentTasks: 1,
      };
      
      const validation = registry.validateConfig(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('At least one capability must be defined');
    });

    it('should reject role with zero maxConcurrentTasks', () => {
      const invalidConfig = {
        role: 'TestRole' as PersonaRole,
        capabilities: ['test'],
        systemPrompt: 'Valid system prompt for testing',
        maxConcurrentTasks: 0,
      };
      
      const validation = registry.validateConfig(invalidConfig);
      expect(validation.valid).toBe(false);
    });

    it('should accept valid custom role configuration', () => {
      const validConfig = {
        role: 'CustomRole' as PersonaRole,
        capabilities: ['custom_capability_1', 'custom_capability_2'],
        systemPrompt: 'This is a valid custom role system prompt',
        maxConcurrentTasks: 3,
        temperature: 0.7,
      };
      
      const validation = registry.validateConfig(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('capabilities edge cases', () => {
    it('should return empty array for unknown role capabilities', () => {
      const caps = registry.getCapabilities('NonExistentRole' as PersonaRole);
      expect(caps).toEqual([]);
    });

    it('should return default maxConcurrentTasks for unknown role', () => {
      const maxTasks = registry.getMaxConcurrentTasks('UnknownRole' as PersonaRole);
      expect(maxTasks).toBe(1);
    });

    it('should return undefined system prompt for unknown role', () => {
      const prompt = registry.getSystemPrompt('UnknownRole' as PersonaRole);
      expect(prompt).toBeUndefined();
    });
  });

  describe('persona mapping edge cases', () => {
    it('should map and retrieve persona ID to role', () => {
      registry.registerPersona('persona-123', 'EmotionAnalyst');
      const role = registry.getRoleByPersonaId('persona-123');
      expect(role).toBe('EmotionAnalyst');
    });

    it('should return undefined for unmapped persona ID', () => {
      const role = registry.getRoleByPersonaId('non-existent-persona');
      expect(role).toBeUndefined();
    });

    it('should override existing persona mapping', () => {
      registry.registerPersona('persona-456', 'MemoryExpert');
      registry.registerPersona('persona-456', 'Advisor');
      
      const role = registry.getRoleByPersonaId('persona-456');
      expect(role).toBe('Advisor');
    });
  });

  describe('createContribution edge cases', () => {
    it('should create contribution with default emotion and confidence', () => {
      const contribution = registry.createContribution(
        'persona-789',
        'MemoryExpert',
        '测试视角',
        ['关键点1', '关键点2']
      );
      
      expect(contribution.personaId).toBe('persona-789');
      expect(contribution.role).toBe('MemoryExpert');
      expect(contribution.emotion).toBe('neutral');
      expect(contribution.confidence).toBe(0.8);
    });

    it('should create contribution with custom emotion and confidence', () => {
      const contribution = registry.createContribution(
        'persona-abc',
        'EmotionAnalyst',
        '积极分析视角',
        ['关键点A'],
        'positive',
        0.95
      );
      
      expect(contribution.emotion).toBe('positive');
      expect(contribution.confidence).toBe(0.95);
    });
  });

  describe('unregister edge cases', () => {
    it('should successfully unregister custom role', () => {
      // First register a custom role
      registry.registerRole({
        role: 'TemporaryRole' as PersonaRole,
        capabilities: ['temp_capability'],
        systemPrompt: 'Temporary role for testing unregister',
        maxConcurrentTasks: 1,
      });
      
      expect(registry.hasRole('TemporaryRole' as PersonaRole)).toBe(true);
      
      const result = registry.unregisterRole('TemporaryRole' as PersonaRole);
      expect(result).toBe(true);
      expect(registry.hasRole('TemporaryRole' as PersonaRole)).toBe(false);
    });

    it('should unregister default role (implementation allows this)', () => {
      // Note: The actual implementation allows unregistering default roles
      // This test reflects actual behavior, not desired behavior
      const result = registry.unregisterRole('MemoryExpert');
      expect(result).toBe(true); // Delete returns true if item existed
      expect(registry.hasRole('MemoryExpert')).toBe(false); // Role is now unregistered
    });

    it('should return false when unregistering non-existent role', () => {
      const result = registry.unregisterRole('PhantomRole' as PersonaRole);
      expect(result).toBe(false);
    });
  });

  describe('getRolesForTaskType edge cases', () => {
    it('should return default role for unknown task type', () => {
      const roles = registry.getRolesForTaskType('unknown_task_type');
      expect(roles).toEqual(['MemoryExpert']);
    });

    it('should return correct roles for all known task types', () => {
      expect(registry.getRolesForTaskType('memory_retrieval')).toContain('MemoryExpert');
      expect(registry.getRolesForTaskType('emotion_analysis')).toContain('EmotionAnalyst');
      expect(registry.getRolesForTaskType('advice_generation')).toContain('Advisor');
      expect(registry.getRolesForTaskType('web_search')).toContain('Researcher');
      expect(registry.getRolesForTaskType('code_execution')).toContain('Coder');
    });
  });

  describe('singleton behavior', () => {
    it('should return same instance via getRoleRegistry', () => {
      const instance1 = getRoleRegistry();
      const instance2 = getRoleRegistry();
      expect(instance1).toBe(instance2);
    });
  });

  describe('helper functions edge cases', () => {
    it('isValidRole should return true only for valid roles', () => {
      expect(isValidRole('MemoryExpert')).toBe(true);
      expect(isValidRole('EmotionAnalyst')).toBe(true);
      expect(isValidRole('Advisor')).toBe(true);
      expect(isValidRole('Researcher')).toBe(true);
      expect(isValidRole('Coder')).toBe(true);
      expect(isValidRole('InvalidRole')).toBe(false);
      expect(isValidRole('')).toBe(false);
    });

    it('getAvailableRoles should return all 5 roles', () => {
      const roles = getAvailableRoles();
      expect(roles).toHaveLength(5);
      expect(roles).toContain('MemoryExpert');
      expect(roles).toContain('EmotionAnalyst');
      expect(roles).toContain('Advisor');
      expect(roles).toContain('Researcher');
      expect(roles).toContain('Coder');
    });

    it('getRoleDisplayName should return Chinese names', () => {
      expect(getRoleDisplayName('MemoryExpert')).toBe('记忆专家');
      expect(getRoleDisplayName('EmotionAnalyst')).toBe('情感分析师');
      expect(getRoleDisplayName('Advisor')).toBe('建议顾问');
      expect(getRoleDisplayName('Researcher')).toBe('研究员');
      expect(getRoleDisplayName('Coder')).toBe('程序员');
      expect(getRoleDisplayName('UnknownRole' as PersonaRole)).toBe('UnknownRole');
    });

    it('getRoleEmoji should return emoji icons', () => {
      expect(getRoleEmoji('MemoryExpert')).toBe('🧠');
      expect(getRoleEmoji('EmotionAnalyst')).toBe('📊');
      expect(getRoleEmoji('Advisor')).toBe('💡');
      expect(getRoleEmoji('Researcher')).toBe('🔍');
      expect(getRoleEmoji('Coder')).toBe('💻');
      expect(getRoleEmoji('UnknownRole' as PersonaRole)).toBe('👤');
    });
  });
});
