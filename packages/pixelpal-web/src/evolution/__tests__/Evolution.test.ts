/**
 * V153: Self-Evolution Engine - Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatternAnalyzer } from '../PatternAnalyzer';
import { StrategyOptimizer } from '../StrategyOptimizer';
import { SkillCrystallizer } from '../SkillCrystallizer';

// Mock database module
vi.mock('../db/index', () => ({
  getDatabase: () => null,
  generateChangeId: () => 'mock-change-id',
  now: () => Date.now(),
}));

vi.mock('../db/syncLog', () => ({
  addChangeLogEntry: vi.fn(),
}));

// Mock DreamMemoryStore
vi.mock('../memory/DreamMemoryStore', () => ({
  getDreamMemoryStore: () => ({
    getAll: () => [
      { id: '1', content: 'test content 1', layer: 'hot', created_at: Date.now() - 3600000 },
      { id: '2', content: 'test content 2', layer: 'warm', created_at: Date.now() - 7200000 },
      { id: '3', content: 'test content 3', layer: 'hot', created_at: Date.now() - 10800000 },
      { id: '4', content: 'short', layer: 'cold', created_at: Date.now() - 14400000 },
      { id: '5', content: 'test content 5 with more words', layer: 'warm', created_at: Date.now() - 18000000 },
    ],
  }),
  getDreamMemoryStore: () => ({
    getAll: () => [],
  }),
}));

// Mock KnowledgeGraphStore
vi.mock('../services/knowledge/KnowledgeGraphStore', () => ({
  getKnowledgeGraphStore: () => ({
    queryEntities: () => [
      { id: 'e1', type: 'concept', name: 'Test Entity' },
      { id: 'e2', type: 'concept', name: 'Another Entity' },
      { id: 'e3', type: 'preference', name: 'User Preference' },
    ],
  }),
}));

// Mock HookManager
vi.mock('../core/hooks/HookManager', () => ({
  hookManager: {
    trigger: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
  });

  describe('createPattern', () => {
    it('should create a pattern with correct properties', () => {
      const pattern = analyzer.createPattern({
        type: 'temporal',
        description: 'User is active at 10am',
        frequency: 5,
        confidence: 0.8,
      });

      expect(pattern).toBeDefined();
      expect(pattern?.type).toBe('temporal');
      expect(pattern?.description).toBe('User is active at 10am');
      expect(pattern?.frequency).toBe(5);
      expect(pattern?.confidence).toBe(0.8);
      expect(pattern?.id).toBeDefined();
      expect(pattern?.created_at).toBeDefined();
    });

    it('should use default values for frequency and confidence', () => {
      const pattern = analyzer.createPattern({
        type: 'preference',
        description: 'Test pattern',
      });

      expect(pattern?.frequency).toBe(1);
      expect(pattern?.confidence).toBe(0.5);
    });
  });

  describe('getPattern', () => {
    it('should return null for non-existent pattern', () => {
      const pattern = analyzer.getPattern('non-existent-id');
      expect(pattern).toBeNull();
    });
  });

  describe('getAllPatterns', () => {
    it('should return empty array when no patterns exist', () => {
      const patterns = analyzer.getAllPatterns();
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getPatternsByType', () => {
    it('should return patterns filtered by type', () => {
      analyzer.createPattern({
        type: 'temporal',
        description: 'Temporal pattern 1',
      });
      analyzer.createPattern({
        type: 'causal',
        description: 'Causal pattern 1',
      });

      const temporalPatterns = analyzer.getPatternsByType('temporal');
      expect(temporalPatterns.every(p => p.type === 'temporal')).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return correct stats structure', () => {
      const stats = analyzer.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('avgConfidence');
      expect(stats).toHaveProperty('highConfidenceCount');
      expect(typeof stats.total).toBe('number');
    });
  });
});

describe('StrategyOptimizer', () => {
  let optimizer: StrategyOptimizer;

  beforeEach(() => {
    optimizer = new StrategyOptimizer();
  });

  describe('createStrategy', () => {
    it('should create a strategy with correct properties', () => {
      const strategy = optimizer.createStrategy({
        type: 'speed',
        target_metric: 'response_time',
        expected_improvement: 0.15,
      });

      expect(strategy).toBeDefined();
      expect(strategy?.type).toBe('speed');
      expect(strategy?.target_metric).toBe('response_time');
      expect(strategy?.expected_improvement).toBe(0.15);
      expect(strategy?.implemented).toBe(false);
      expect(strategy?.id).toBeDefined();
    });
  });

  describe('getAllStrategies', () => {
    it('should return empty array when no strategies exist', () => {
      const strategies = optimizer.getAllStrategies();
      expect(Array.isArray(strategies)).toBe(true);
    });
  });

  describe('getStrategiesByType', () => {
    it('should return strategies filtered by type', () => {
      optimizer.createStrategy({
        type: 'speed',
        target_metric: 'latency',
        expected_improvement: 0.2,
      });
      optimizer.createStrategy({
        type: 'empathy',
        target_metric: 'satisfaction',
        expected_improvement: 0.15,
      });

      const speedStrategies = optimizer.getStrategiesByType('speed');
      expect(speedStrategies.every(s => s.type === 'speed')).toBe(true);
    });
  });

  describe('getPendingStrategies', () => {
    it('should return only unimplemented strategies', () => {
      const s1 = optimizer.createStrategy({
        type: 'speed',
        target_metric: 'latency',
        expected_improvement: 0.1,
      });

      if (s1) {
        optimizer.markImplemented(s1.id);
      }

      const pending = optimizer.getPendingStrategies();
      expect(pending.every(s => !s.implemented)).toBe(true);
    });
  });

  describe('markImplemented', () => {
    it('should mark a strategy as implemented', () => {
      const strategy = optimizer.createStrategy({
        type: 'memory',
        target_metric: 'hit_rate',
        expected_improvement: 0.25,
      });

      if (strategy) {
        const updated = optimizer.markImplemented(strategy.id);
        expect(updated?.implemented).toBe(true);
      }
    });
  });

  describe('generateFromPatterns', () => {
    it('should generate strategies from patterns', () => {
      const patterns = [
        { id: 'p1', type: 'temporal' as const, frequency: 10, confidence: 0.8, description: 'Active at 10am', created_at: Date.now() },
        { id: 'p2', type: 'preference' as const, frequency: 8, confidence: 0.7, description: 'Prefers detailed content', created_at: Date.now() },
        { id: 'p3', type: 'causal' as const, frequency: 5, confidence: 0.6, description: 'Does X then Y', created_at: Date.now() },
      ];

      const result = optimizer.generateFromPatterns(patterns);
      expect(result.strategies.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats structure', () => {
      const stats = optimizer.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byType');
      expect(stats).toHaveProperty('implemented');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('avgImprovement');
    });
  });
});

describe('SkillCrystallizer', () => {
  let crystallizer: SkillCrystallizer;

  beforeEach(() => {
    crystallizer = new SkillCrystallizer();
  });

  describe('createSkill', () => {
    it('should create a skill with correct properties', () => {
      const skill = crystallizer.createSkill({
        condition: 'When user is active at 10am',
        action: 'Pre-load relevant content',
        expected_result: 'Reduced latency by 20%',
        pattern_ids: ['p1', 'p2'],
      });

      expect(skill).toBeDefined();
      expect(skill?.condition).toBe('When user is active at 10am');
      expect(skill?.action).toBe('Pre-load relevant content');
      expect(skill?.expected_result).toBe('Reduced latency by 20%');
      expect(skill?.pattern_ids).toEqual(['p1', 'p2']);
      expect(skill?.version).toBe(1);
    });
  });

  describe('getAllSkills', () => {
    it('should return empty array when no skills exist', () => {
      const skills = crystallizer.getAllSkills();
      expect(Array.isArray(skills)).toBe(true);
    });
  });

  describe('getSkillsByVersion', () => {
    it('should return skills filtered by version', () => {
      crystallizer.createSkill({
        condition: 'Test condition 1',
        action: 'Test action 1',
        expected_result: 'Test result 1',
        pattern_ids: ['p1'],
      });

      const v1Skills = crystallizer.getSkillsByVersion(1);
      expect(v1Skills.every(s => s.version === 1)).toBe(true);
    });
  });

  describe('crystallize', () => {
    it('should crystallize high-quality patterns into skills', () => {
      const patterns = [
        { id: 'p1', type: 'temporal' as const, frequency: 10, confidence: 0.8, description: 'Active at 10am', created_at: Date.now() },
        { id: 'p2', type: 'preference' as const, frequency: 3, confidence: 0.5, description: 'Low quality pattern', created_at: Date.now() },
      ];

      const result = crystallizer.crystallize(patterns, {
        minConfidence: 0.7,
        minFrequency: 5,
      });

      expect(result.skills.length).toBe(1);
      expect(result.crystallized_count).toBe(1);
    });
  });

  describe('updateSkill', () => {
    it('should update a skill and increment version', () => {
      const skill = crystallizer.createSkill({
        condition: 'Original condition',
        action: 'Original action',
        expected_result: 'Original result',
        pattern_ids: ['p1'],
      });

      if (skill) {
        const updated = crystallizer.updateSkill(skill.id, {
          condition: 'Updated condition',
        });

        expect(updated?.condition).toBe('Updated condition');
        expect(updated?.version).toBe(2);
      }
    });
  });

  describe('getStats', () => {
    it('should return correct stats structure', () => {
      const stats = crystallizer.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byVersion');
      expect(stats).toHaveProperty('avgPatternCount');
    });
  });
});

describe('Integration Tests', () => {
  describe('Pattern → Strategy → Skill flow', () => {
    it('should create patterns, generate strategies, and crystallize skills', () => {
      const analyzer = new PatternAnalyzer();
      const optimizer = new StrategyOptimizer();
      const crystallizer = new SkillCrystallizer();

      // Create patterns
      const pattern1 = analyzer.createPattern({
        type: 'temporal',
        description: 'High activity at 10am',
        frequency: 10,
        confidence: 0.85,
      });

      const pattern2 = analyzer.createPattern({
        type: 'preference',
        description: 'Prefers detailed responses',
        frequency: 8,
        confidence: 0.75,
      });

      // Generate strategies
      const strategies = optimizer.generateFromPatterns([pattern1!, pattern2!]);
      expect(strategies.strategies.length).toBeGreaterThan(0);

      // Crystallize skills
      const skills = crystallizer.crystallize([pattern1!, pattern2!], {
        minConfidence: 0.7,
        minFrequency: 5,
      });
      expect(skills.skills.length).toBe(2);
    });
  });
});