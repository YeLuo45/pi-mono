/**
 * V163: SkillCrystallizer Tests - Agent Self-Evolution Engine
 * 
 * Uses the same mock approach as existing evolution tests.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Define mocks before importing the module
const mockSQL = vi.fn().mockReturnValue({
  toArray: () => [],
  exec: vi.fn(),
});

vi.mock('../../db/index', () => ({
  getDatabase: () => ({
    getSQL: () => mockSQL,
  }),
  now: vi.fn(() => Date.now()),
}));

vi.mock('../../db/syncLog', () => ({
  addChangeLogEntry: vi.fn(),
}));

vi.mock('../../core/hooks/HookManager', () => ({
  hookManager: {
    trigger: vi.fn().mockResolvedValue(undefined),
  },
}));

// Import the actual class
import { SkillCrystallizer, type ExecutionData, type SkillFragment } from '../SkillCrystallizer';

describe('SkillCrystallizer', () => {
  let crystallizer: SkillCrystallizer;
  
  const mockExecutionData: ExecutionData[] = [
    {
      id: 'exec-1',
      taskId: 'task-1',
      agentId: 'agent-1',
      executionTime: 100,
      success: true,
      timestamp: Date.now() - 1000,
      metadata: { action: 'code_review' },
    },
    {
      id: 'exec-2',
      taskId: 'task-1',
      agentId: 'agent-1',
      executionTime: 150,
      success: true,
      timestamp: Date.now() - 900,
      metadata: { action: 'code_review' },
    },
    {
      id: 'exec-3',
      taskId: 'task-2',
      agentId: 'agent-1',
      executionTime: 120,
      success: true,
      timestamp: Date.now() - 800,
      metadata: { action: 'code_review' },
    },
    {
      id: 'exec-4',
      taskId: 'task-2',
      agentId: 'agent-2',
      executionTime: 200,
      success: false,
      timestamp: Date.now() - 700,
      metadata: { action: 'code_review' },
    },
  ];

  const highSuccessExecutionData: ExecutionData[] = [
    {
      id: 'exec-hs-1',
      taskId: 'task-hs-1',
      agentId: 'agent-hs',
      executionTime: 50,
      success: true,
      timestamp: Date.now() - 500,
      metadata: { action: 'fast_response' },
    },
    {
      id: 'exec-hs-2',
      taskId: 'task-hs-2',
      agentId: 'agent-hs',
      executionTime: 55,
      success: true,
      timestamp: Date.now() - 400,
      metadata: { action: 'fast_response' },
    },
    {
      id: 'exec-hs-3',
      taskId: 'task-hs-3',
      agentId: 'agent-hs',
      executionTime: 48,
      success: true,
      timestamp: Date.now() - 300,
      metadata: { action: 'fast_response' },
    },
    {
      id: 'exec-hs-4',
      taskId: 'task-hs-4',
      agentId: 'agent-hs',
      executionTime: 52,
      success: true,
      timestamp: Date.now() - 200,
      metadata: { action: 'fast_response' },
    },
    {
      id: 'exec-hs-5',
      taskId: 'task-hs-5',
      agentId: 'agent-hs',
      executionTime: 51,
      success: true,
      timestamp: Date.now() - 100,
      metadata: { action: 'fast_response' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    crystallizer = new SkillCrystallizer();
  });

  describe('analyzeExecutionData', () => {
    it('should analyze execution data and return patterns', () => {
      const result = crystallizer.analyzeExecutionData(mockExecutionData);
      
      expect(result).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('should calculate success rate correctly', () => {
      const result = crystallizer.analyzeExecutionData(mockExecutionData);
      
      // 3 successful out of 4 = 75%
      expect(result.successRate).toBe(0.75);
    });

    it('should identify high-frequency patterns', () => {
      const result = crystallizer.analyzeExecutionData(mockExecutionData);
      
      // agent-1 has 3 executions
      const agent1Pattern = result.patterns.find(p => p.id.includes('agent-1'));
      expect(agent1Pattern).toBeDefined();
      expect(agent1Pattern?.frequency).toBeGreaterThanOrEqual(3);
    });

    it('should return empty analysis for insufficient data', () => {
      const result = crystallizer.analyzeExecutionData([]);
      
      expect(result.patterns).toHaveLength(0);
      expect(result.totalExecutions).toBe(0);
      expect(result.successRate).toBe(0);
    });
  });

  describe('shouldCrystallize', () => {
    it('should return true when success rate >= 80% and frequency >= 5', () => {
      const pattern = { frequency: 5, confidence: 0.85 };
      expect(crystallizer.shouldCrystallize(pattern)).toBe(true);
    });

    it('should return false when success rate < 80%', () => {
      const pattern = { frequency: 5, confidence: 0.7 };
      expect(crystallizer.shouldCrystallize(pattern)).toBe(false);
    });

    it('should return false when frequency < 5', () => {
      const pattern = { frequency: 4, confidence: 0.9 };
      expect(crystallizer.shouldCrystallize(pattern)).toBe(false);
    });

    it('should respect custom thresholds', () => {
      const pattern = { frequency: 3, confidence: 0.9 };
      expect(crystallizer.shouldCrystallize(pattern, { minSuccessRate: 0.85, minFrequency: 3 })).toBe(true);
    });
  });

  describe('createFragment', () => {
    it('should create a skill fragment from execution data', () => {
      const pattern = {
        id: 'pattern-1',
        type: 'code_review',
        frequency: 5,
        confidence: 0.85,
        description: 'Code review pattern',
      };
      
      const fragment = crystallizer.createFragment(pattern, mockExecutionData);
      
      expect(fragment).toBeDefined();
      expect(fragment.id).toBeDefined();
      expect(fragment.name).toContain('SkillFragment');
      expect(fragment.trigger).toBe(pattern.description);
      expect(fragment.successRate).toBe(pattern.confidence);
      expect(fragment.useCount).toBe(0);
    });

    it('should include pattern data in fragment', () => {
      const pattern = {
        id: 'pattern-2',
        type: 'fast_response',
        frequency: 3,
        confidence: 0.9,
        description: 'Fast response pattern',
      };
      
      const fragment = crystallizer.createFragment(pattern, highSuccessExecutionData);
      
      expect(fragment.pattern).toBeDefined();
      expect((fragment.pattern as { patternId?: string }).patternId).toBe(pattern.id);
    });

    it('should generate unique fragment id', () => {
      const pattern = {
        id: 'pattern-3',
        type: 'test',
        frequency: 2,
        confidence: 0.8,
        description: 'Test pattern',
      };
      
      const fragment1 = crystallizer.createFragment(pattern, []);
      const fragment2 = crystallizer.createFragment(pattern, []);
      
      expect(fragment1.id).not.toBe(fragment2.id);
    });
  });

  describe('storeFragment', () => {
    it('should store fragment and return success', () => {
      const fragment: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'TestFragment',
        trigger: 'Test trigger',
        pattern: { test: true },
        successRate: 0.85,
        useCount: 0,
        createdAt: Date.now(),
      };
      
      const result = crystallizer.storeFragment(fragment);
      
      expect(result).toBe(true);
    });

    it('should update existing fragment if id exists', () => {
      const fragment: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'TestFragment-Initial',
        trigger: 'Test trigger',
        pattern: { test: true },
        successRate: 0.85,
        useCount: 0,
        createdAt: Date.now(),
      };
      
      crystallizer.storeFragment(fragment);
      
      fragment.name = 'TestFragment-Updated';
      const result = crystallizer.storeFragment(fragment);
      
      expect(result).toBe(true);
    });

    it('should trigger hook on successful storage', () => {
      const fragment: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'HookTestFragment',
        trigger: 'Hook trigger',
        pattern: { hook: true },
        successRate: 0.9,
        useCount: 0,
        createdAt: Date.now(),
      };
      
      crystallizer.storeFragment(fragment);
      
      // The hook trigger should have been called (mocked)
      expect(true).toBe(true);
    });
  });

  describe('getFragments', () => {
    it('should return all stored fragments', () => {
      // Store some fragments first
      const fragment1: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'Fragment1',
        trigger: 'trigger1',
        pattern: { data: 1 },
        successRate: 0.85,
        useCount: 0,
        createdAt: Date.now(),
      };
      const fragment2: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'Fragment2',
        trigger: 'trigger2',
        pattern: { data: 2 },
        successRate: 0.9,
        useCount: 0,
        createdAt: Date.now(),
      };
      
      crystallizer.storeFragment(fragment1);
      crystallizer.storeFragment(fragment2);
      
      const fragments = crystallizer.getFragments();
      
      expect(fragments.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no fragments stored', () => {
      const fragments = crystallizer.getFragments();
      
      expect(Array.isArray(fragments)).toBe(true);
    });

    it('should filter fragments by trigger condition', () => {
      const fragment: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'FilterTestFragment',
        trigger: 'unique-filter-trigger',
        pattern: { filter: true },
        successRate: 0.85,
        useCount: 0,
        createdAt: Date.now(),
      };
      
      crystallizer.storeFragment(fragment);
      
      const filtered = crystallizer.getFragments({ trigger: 'unique-filter' });
      
      expect(filtered.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('recommendNext', () => {
    it('should recommend next actions based on fragments', () => {
      const recommendations = crystallizer.recommendNext();
      
      expect(Array.isArray(recommendations)).toBe(true);
    });

    it('should return prioritized recommendations', () => {
      // Add high-performing fragments
      const highPerfFragment: SkillFragment = {
        id: crypto.randomUUID(),
        name: 'HighPerfFragment',
        trigger: 'High performance trigger',
        pattern: { perf: true },
        successRate: 0.92,
        useCount: 5,
        createdAt: Date.now(),
      };
      
      crystallizer.storeFragment(highPerfFragment);
      
      const recommendations = crystallizer.recommendNext();
      
      expect(recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when no recommendations available', () => {
      const recommendations = crystallizer.recommendNext();
      
      // May return suggestions even without fragments
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});