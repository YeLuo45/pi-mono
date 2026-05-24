/**
 * V156: Evolution Rules Engine - Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ruleRegistry } from '../rules/RuleRegistry';
import type { EvolutionRule } from '../rules/EvolutionRule';
import { ruleEngine } from '../rules/RuleEngine';
import { ruleScheduler } from '../rules/RuleScheduler';

// Mock HookManager
vi.mock('../../core/hooks/HookManager', () => ({
  hookManager: {
    on: vi.fn(),
    emit: vi.fn(),
    trigger: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock EvolutionEngine
vi.mock('../EvolutionEngine', () => ({
  getEvolutionEngine: () => ({
    analyze: vi.fn().mockResolvedValue({ patterns: [], total_interactions: 0, analysis_duration_ms: 0 }),
    generateStrategies: vi.fn().mockReturnValue({ strategies: [], applied_count: 0 }),
    crystallizeSkills: vi.fn().mockReturnValue({ skills: [], crystallized_count: 0 }),
    evolve: vi.fn().mockResolvedValue({
      analysis: { patterns: [], total_interactions: 0, analysis_duration_ms: 0 },
      strategies: { strategies: [], applied_count: 0 },
      skills: { skills: [], crystallized_count: 0 },
    }),
  }),
}));

describe('RuleRegistry', () => {
  beforeEach(() => {
    // Clear all rules
    ruleRegistry.getAllRules().forEach(r => ruleRegistry.removeRule(r.id));
  });

  it('addRule 后 getRule 可获取', () => {
    const rule: EvolutionRule = {
      id: 'test-rule', name: 'Test', enabled: true,
      trigger: { type: 'manual', config: {} },
      action: { type: 'analyze_patterns', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    };
    ruleRegistry.addRule(rule);
    expect(ruleRegistry.getRule('test-rule')?.name).toBe('Test');
  });

  it('removeRule 后规则消失', () => {
    const rule: EvolutionRule = {
      id: 'test-rule', name: 'Test', enabled: true,
      trigger: { type: 'manual', config: {} },
      action: { type: 'analyze_patterns', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    };
    ruleRegistry.addRule(rule);
    ruleRegistry.removeRule('test-rule');
    expect(ruleRegistry.getRule('test-rule')).toBeUndefined();
  });

  it('updateRule 更新正确字段', () => {
    const rule: EvolutionRule = {
      id: 'test-rule', name: 'Test', enabled: true,
      trigger: { type: 'manual', config: {} },
      action: { type: 'analyze_patterns', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    };
    ruleRegistry.addRule(rule);
    ruleRegistry.updateRule('test-rule', { name: 'Updated' });
    expect(ruleRegistry.getRule('test-rule')?.name).toBe('Updated');
  });

  it('getEnabledRules 只返回 enabled=true', () => {
    ruleRegistry.addRule({ id: 'r1', name: 'R1', enabled: true, trigger: { type: 'manual', config: {} }, action: { type: 'analyze_patterns', config: {} }, cooldownMs: 1000, lastTriggered: 0 } as EvolutionRule);
    ruleRegistry.addRule({ id: 'r2', name: 'R2', enabled: false, trigger: { type: 'manual', config: {} }, action: { type: 'analyze_patterns', config: {} }, cooldownMs: 1000, lastTriggered: 0 } as EvolutionRule);
    expect(ruleRegistry.getEnabledRules().length).toBe(1);
    expect(ruleRegistry.getEnabledRules()[0].id).toBe('r1');
  });

  it('cooldown 未过期时规则不触发', async () => {
    const rule: EvolutionRule = {
      id: 'cooldown-rule', name: 'Cooldown', enabled: true,
      trigger: { type: 'manual', config: {} },
      action: { type: 'analyze_patterns', config: {} },
      cooldownMs: 10000, lastTriggered: Date.now(),
    };
    ruleRegistry.addRule(rule);
    const matched = await ruleEngine.evaluateRules({
      personalityId: '', conversationCount: 0, emotionLevel: 0, emotionDelta: 0,
      recentSkills: [], recentFailures: [], timestamp: Date.now(),
    });
    expect(matched.find(r => r.id === 'cooldown-rule')).toBeUndefined();
  });

  it('默认规则正确加载', () => {
    const defaults = ruleRegistry.getDefaultRules();
    expect(defaults.length).toBe(3);
    expect(defaults.find(r => r.id === 'rule-conversation-threshold')).toBeDefined();
  });
});

describe('RuleEngine', () => {
  beforeEach(() => {
    ruleRegistry.getAllRules().forEach(r => ruleRegistry.removeRule(r.id));
  });

  it('evaluateRules 返回匹配的规则', async () => {
    ruleRegistry.addRule({
      id: 'conv-rule', name: 'Conv', enabled: true,
      trigger: { type: 'conversation_count', config: { threshold: 10, windowMs: 86400000 } },
      action: { type: 'analyze_patterns', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    } as EvolutionRule);

    const matched = await ruleEngine.evaluateRules({
      personalityId: '', conversationCount: 15, emotionLevel: 0, emotionDelta: 0,
      recentSkills: [], recentFailures: [], timestamp: Date.now(),
    });
    expect(matched.find(r => r.id === 'conv-rule')).toBeDefined();
  });

  it('evaluateRules 不返回未达标规则', async () => {
    ruleRegistry.addRule({
      id: 'conv-rule', name: 'Conv', enabled: true,
      trigger: { type: 'conversation_count', config: { threshold: 100, windowMs: 86400000 } },
      action: { type: 'analyze_patterns', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    } as EvolutionRule);

    const matched = await ruleEngine.evaluateRules({
      personalityId: '', conversationCount: 5, emotionLevel: 0, emotionDelta: 0,
      recentSkills: [], recentFailures: [], timestamp: Date.now(),
    });
    expect(matched.find(r => r.id === 'conv-rule')).toBeUndefined();
  });

  it('emotion_spike trigger 正确匹配方向', async () => {
    ruleRegistry.addRule({
      id: 'spike-rule', name: 'Spike', enabled: true,
      trigger: { type: 'emotion_spike', config: { threshold: 0.3, direction: 'up' } },
      action: { type: 'full_evolution', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    } as EvolutionRule);

    const matchedUp = await ruleEngine.evaluateRules({
      personalityId: '', conversationCount: 0, emotionLevel: 0.5, emotionDelta: 0.4,
      recentSkills: [], recentFailures: [], timestamp: Date.now(),
    });
    expect(matchedUp.find(r => r.id === 'spike-rule')).toBeDefined();
  });

  it('skill_failure trigger 正确匹配失败次数', async () => {
    ruleRegistry.addRule({
      id: 'failure-rule', name: 'Failure', enabled: true,
      trigger: { type: 'skill_failure', config: { failureCount: 3 } },
      action: { type: 'optimize_strategy', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    } as EvolutionRule);

    const matched = await ruleEngine.evaluateRules({
      personalityId: '', conversationCount: 0, emotionLevel: 0, emotionDelta: 0,
      recentSkills: [], recentFailures: ['skill1', 'skill2', 'skill3'], timestamp: Date.now(),
    });
    expect(matched.find(r => r.id === 'failure-rule')).toBeDefined();
  });

  it('time_based 规则在 evaluate 中不匹配', async () => {
    ruleRegistry.addRule({
      id: 'time-rule', name: 'Time', enabled: true,
      trigger: { type: 'time_based', config: { intervalMs: 86400000 } },
      action: { type: 'full_evolution', config: {} },
      cooldownMs: 1000, lastTriggered: 0,
    } as EvolutionRule);

    const matched = await ruleEngine.evaluateRules({
      personalityId: '', conversationCount: 0, emotionLevel: 0, emotionDelta: 0,
      recentSkills: [], recentFailures: [], timestamp: Date.now(),
    });
    expect(matched.find(r => r.id === 'time-rule')).toBeUndefined();
  });
});

describe('RuleScheduler', () => {
  it('cancel 清除定时器不抛错', () => {
    expect(() => ruleScheduler.cancel('non-existent')).not.toThrow();
  });

  it('cancelAll 清除所有定时器', () => {
    expect(() => ruleScheduler.cancelAll()).not.toThrow();
  });
});