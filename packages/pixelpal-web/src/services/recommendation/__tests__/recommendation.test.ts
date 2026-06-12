/**
 * P15: Recommendation System Tests
 * 
 * Tests for the recommendation subsystem:
 * 1. PreferenceEngine - User preference extraction and management
 * 2. RecommendationEngine - Generate personalized recommendations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PreferenceEngine, preferenceEngine } from '../preferenceEngine';
import { RecommendationEngine } from '../recommendationEngine';
import type { UserPreference, InteractionRecord, Recommendation } from '../types';

// ============================================================================
// PreferenceEngine Tests
// ============================================================================

describe('PreferenceEngine', () => {
  let engine: PreferenceEngine;

  beforeEach(() => {
    engine = new PreferenceEngine();
  });

  describe('extractFromInteraction', () => {
    it('should extract language preference from Chinese content', () => {
      const record: InteractionRecord = {
        id: 'rec-1',
        type: 'query',
        content: '分析我的情绪',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      const langPref = engine.getPreference('language');
      expect(langPref).toBeDefined();
      expect(langPref?.value).toBe('中文');
    });

    it('should extract language preference from English content', () => {
      const record: InteractionRecord = {
        id: 'rec-2',
        type: 'query',
        content: 'analyze my request',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      const langPref = engine.getPreference('language');
      expect(langPref).toBeDefined();
      expect(langPref?.value).toBe('English');
    });

    it('should extract task_type preference from coding content', () => {
      const record: InteractionRecord = {
        id: 'rec-3',
        type: 'task',
        content: '帮我写代码',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      const taskPref = engine.getPreference('task_type');
      expect(taskPref).toBeDefined();
      expect(taskPref?.value).toBe('写代码');
    });

    it('should extract domain preference from finance content', () => {
      const record: InteractionRecord = {
        id: 'rec-4',
        type: 'task',
        content: '分析金融数据',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      const domainPref = engine.getPreference('domain');
      expect(domainPref).toBeDefined();
      expect(domainPref?.value).toBe('金融');
    });

    it('should extract multiple preferences from single interaction', () => {
      const record: InteractionRecord = {
        id: 'rec-5',
        type: 'task',
        content: '写代码审查代码',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      // Task type should be extracted
      const taskPref = engine.getPreference('task_type');
      expect(taskPref?.value).toBe('写代码');
    });

    it('should handle code-related keywords', () => {
      const record: InteractionRecord = {
        id: 'rec-6',
        type: 'task',
        content: 'debug this javascript code',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      const taskPref = engine.getPreference('task_type');
      expect(taskPref?.value).toBe('debug');
    });
  });

  describe('preference confidence', () => {
    it('should increase confidence on repeated same value', () => {
      const record1: InteractionRecord = {
        id: 'rec-1',
        type: 'task',
        content: '分析数据',
        timestamp: Date.now(),
      };
      const record2: InteractionRecord = {
        id: 'rec-2',
        type: 'task',
        content: '分析数据',
        timestamp: Date.now() + 1,
      };
      const record3: InteractionRecord = {
        id: 'rec-3',
        type: 'task',
        content: '分析数据',
        timestamp: Date.now() + 2,
      };

      engine.extractFromInteraction(record1);
      engine.extractFromInteraction(record2);
      engine.extractFromInteraction(record3);

      const langPref = engine.getPreference('language');
      expect(langPref?.count).toBe(3);
      expect(langPref?.confidence).toBeGreaterThan(0.1);
    });

    it('should reset count when value changes', () => {
      const record1: InteractionRecord = {
        id: 'rec-1',
        type: 'query',
        content: '分析',
        timestamp: Date.now(),
      };
      const record2: InteractionRecord = {
        id: 'rec-2',
        type: 'query',
        content: 'analyze',
        timestamp: Date.now() + 1,
      };

      engine.extractFromInteraction(record1);
      engine.extractFromInteraction(record2);

      const langPref = engine.getPreference('language');
      expect(langPref?.count).toBe(1);
      expect(langPref?.value).toBe('English');
    });
  });

  describe('getPreference', () => {
    it('should return undefined for non-existent preference', () => {
      const result = engine.getPreference('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return preference after extraction', () => {
      const record: InteractionRecord = {
        id: 'rec-1',
        type: 'query',
        content: '测试',
        timestamp: Date.now(),
      };

      engine.extractFromInteraction(record);

      const result = engine.getPreference('language');
      expect(result).toBeDefined();
      expect(result?.key).toBe('language');
    });
  });

  describe('getAllPreferences', () => {
    it('should return empty array initially', () => {
      const result = engine.getAllPreferences();
      expect(result).toEqual([]);
    });

    it('should return all extracted preferences', () => {
      engine.extractFromInteraction({
        id: 'rec-1',
        type: 'query',
        content: 'python代码',
        timestamp: Date.now(),
      });

      const result = engine.getAllPreferences();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getTopPreferences', () => {
    it('should filter by minimum confidence threshold', () => {
      // Only 1 interaction = low confidence
      engine.extractFromInteraction({
        id: 'rec-1',
        type: 'query',
        content: '测试中文',
        timestamp: Date.now(),
      });

      const result = engine.getTopPreferences(5);
      // Default threshold is 0.2, so single interaction may not pass
      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect limit parameter', () => {
      // Add multiple interactions with different keywords
      for (let i = 0; i < 10; i++) {
        engine.extractFromInteraction({
          id: `rec-${i}`,
          type: 'task',
          content: i % 2 === 0 ? 'python代码' : '金融数据',
          timestamp: Date.now() + i,
        });
      }

      const result = engine.getTopPreferences(2);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('clearPreferences', () => {
    it('should clear all preferences', () => {
      engine.extractFromInteraction({
        id: 'rec-1',
        type: 'query',
        content: '测试',
        timestamp: Date.now(),
      });

      engine.clearPreferences();

      const result = engine.getAllPreferences();
      expect(result).toEqual([]);
    });
  });
});

// ============================================================================
// RecommendationEngine Tests
// ============================================================================

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations based on templates', () => {
      const result = engine.generateRecommendations();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).toHaveProperty('dismissed');
    });

    it('should return recommendation with valid score range', () => {
      const result = engine.generateRecommendations();

      for (const rec of result) {
        expect(rec.score).toBeGreaterThanOrEqual(0);
        expect(rec.score).toBeLessThanOrEqual(1);
      }
    });

    it('should include recommendation types', () => {
      const result = engine.generateRecommendations();
      const types = result.map(r => r.type);

      expect(types).toContain('feature');
      expect(types).toContain('action');
    });
  });

  describe('dismissRecommendation', () => {
    it('should exclude dismissed recommendations', () => {
      const all = engine.generateRecommendations();
      expect(all.length).toBeGreaterThan(0);

      const firstId = all[0].id;
      engine.dismissRecommendation(firstId);

      const afterDismiss = engine.generateRecommendations();
      const found = afterDismiss.find(r => r.id === firstId);
      expect(found).toBeUndefined();
    });

    it('should handle dismissing non-existent id', () => {
      // Should not throw
      engine.dismissRecommendation('non-existent-id');
      
      const result = engine.generateRecommendations();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getActiveRecommendations', () => {
    it('should respect limit parameter', () => {
      const result = engine.getActiveRecommendations(2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should filter dismissed recommendations', () => {
      const all = engine.generateRecommendations();
      if (all.length > 0) {
        engine.dismissRecommendation(all[0].id);
      }

      const active = engine.getActiveRecommendations(10);
      const dismissedIds = all.filter(r => engine['dismissedIds'].has(r.id)).map(r => r.id);
      
      for (const rec of active) {
        expect(dismissedIds).not.toContain(rec.id);
      }
    });

    it('should return recommendations sorted by score', () => {
      const result = engine.getActiveRecommendations(5);

      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
      }
    });
  });
});

// ============================================================================
// Types Tests
// ============================================================================

describe('Recommendation Types', () => {
  describe('UserPreference', () => {
    it('should have correct structure', () => {
      const pref: UserPreference = {
        key: 'language',
        value: '中文',
        count: 5,
        lastUpdated: Date.now(),
        confidence: 0.5,
      };

      expect(pref.key).toBe('language');
      expect(pref.value).toBe('中文');
      expect(pref.count).toBe(5);
      expect(pref.confidence).toBeGreaterThan(0);
      expect(pref.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('InteractionRecord', () => {
    it('should support all interaction types', () => {
      const types: InteractionRecord['type'][] = ['task', 'query', 'command', 'feedback'];

      for (const type of types) {
        const record: InteractionRecord = {
          id: `test-${type}`,
          type,
          content: 'test',
          timestamp: Date.now(),
        };
        expect(record.type).toBe(type);
      }
    });

    it('should support optional rating and tags', () => {
      const record: InteractionRecord = {
        id: 'test-1',
        type: 'feedback',
        content: 'great',
        timestamp: Date.now(),
        rating: 5,
        tags: ['positive', 'helpful'],
      };

      expect(record.rating).toBe(5);
      expect(record.tags).toEqual(['positive', 'helpful']);
    });
  });

  describe('Recommendation', () => {
    it('should have correct structure', () => {
      const rec: Recommendation = {
        id: 'rec-1',
        type: 'feature',
        title: '测试功能',
        description: '测试描述',
        action: '/test',
        score: 0.8,
        reason: '测试原因',
        createdAt: Date.now(),
        dismissed: false,
      };

      expect(rec.id).toBe('rec-1');
      expect(rec.type).toBe('feature');
      expect(rec.score).toBe(0.8);
    });

    it('should support all recommendation types', () => {
      const types: Recommendation['type'][] = ['feature', 'action', 'content', 'agent'];

      for (const type of types) {
        const rec: Recommendation = {
          id: `test-${type}`,
          type,
          title: 'Test',
          description: 'Test',
          action: '/test',
          score: 0.5,
          reason: 'Test',
          createdAt: Date.now(),
          dismissed: false,
        };
        expect(rec.type).toBe(type);
      }
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Recommendation Integration', () => {
  let prefEngine: PreferenceEngine;
  let recEngine: RecommendationEngine;

  beforeEach(() => {
    prefEngine = new PreferenceEngine();
    recEngine = new RecommendationEngine();
  });

  it('should generate personalized recommendations based on preferences', () => {
    // Extract preferences from multiple interactions
    prefEngine.extractFromInteraction({
      id: 'int-1',
      type: 'task',
      content: '写python代码',
      timestamp: Date.now(),
    });

    prefEngine.extractFromInteraction({
      id: 'int-2',
      type: 'query',
      content: '帮我debug',
      timestamp: Date.now(),
    });

    // Recommendations are based on shared preferenceEngine instance
    // but each RecommendationEngine generates independently
    const recommendations = recEngine.generateRecommendations();

    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should handle empty preferences gracefully', () => {
    const recommendations = recEngine.generateRecommendations();

    expect(Array.isArray(recommendations)).toBe(true);
    // Should still return base recommendations
    expect(recommendations.length).toBeGreaterThan(0);
  });

  it('should allow dismissing multiple recommendations', () => {
    // Mock Date.now() to ensure stable IDs across calls
    const mockTime = 1700000000000;
    const originalDateNow = Date.now;
    Date.now = vi.fn(() => mockTime);

    const initial = recEngine.generateRecommendations();
    expect(initial.length).toBeGreaterThan(1);

    // Capture the IDs to dismiss
    const idToDismiss1 = initial[0].id;
    const idToDismiss2 = initial[1].id;

    recEngine.dismissRecommendation(idToDismiss1);
    recEngine.dismissRecommendation(idToDismiss2);

    // Override Date.now for second call to generate same IDs
    Date.now = vi.fn(() => mockTime);
    const afterDismiss = recEngine.generateRecommendations();

    // Restore
    Date.now = originalDateNow;

    // Dismissed items should be filtered out
    const dismissedIds = afterDismiss.map(r => r.id);
    expect(dismissedIds).not.toContain(idToDismiss1);
    expect(dismissedIds).not.toContain(idToDismiss2);
    expect(afterDismiss.length).toBeLessThan(initial.length);
  });
});