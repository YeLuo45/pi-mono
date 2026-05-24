/**
 * V156: RuleRegistry - Rule CRUD and Persistence
 * 
 * Manages evolution rules with localStorage persistence.
 */

import type { EvolutionRule } from './EvolutionRule';

const STORAGE_KEY = 'evolution_rules';

class RuleRegistry {
  private rules = new Map<string, EvolutionRule>();

  constructor() {
    this.loadRules();
  }

  addRule(rule: EvolutionRule): void {
    this.rules.set(rule.id, rule);
    this.saveRules();
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.saveRules();
  }

  updateRule(ruleId: string, updates: Partial<EvolutionRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates });
      this.saveRules();
    }
  }

  getRule(ruleId: string): EvolutionRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): EvolutionRule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): EvolutionRule[] {
    return this.getAllRules().filter(r => r.enabled);
  }

  getRulesForPersonality(personalityId: string): EvolutionRule[] {
    return this.getAllRules().filter(r => !r.personalityId || r.personalityId === personalityId);
  }

  async saveRules(): Promise<void> {
    try {
      const data = JSON.stringify(this.getAllRules());
      localStorage.setItem(STORAGE_KEY, data);
    } catch (e) {
      console.error('Failed to save rules', e);
    }
  }

  async loadRules(): Promise<void> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const rules: EvolutionRule[] = JSON.parse(data);
        rules.forEach(r => this.rules.set(r.id, r));
      } else {
        // Load defaults
        this.getDefaultRules().forEach(r => this.rules.set(r.id, r));
        this.saveRules();
      }
    } catch (e) {
      console.error('Failed to load rules', e);
    }
  }

  getDefaultRules(): EvolutionRule[] {
    return [
      {
        id: 'rule-conversation-threshold',
        name: 'Conversation Threshold',
        enabled: true,
        trigger: { type: 'conversation_count', config: { threshold: 100, windowMs: 86400000 } },
        action: { type: 'analyze_patterns', config: {} },
        cooldownMs: 3600000,
        lastTriggered: 0,
      },
      {
        id: 'rule-emotion-spike',
        name: 'Emotion Spike Detection',
        enabled: true,
        trigger: { type: 'emotion_spike', config: { threshold: 0.3, direction: 'both' } },
        action: { type: 'full_evolution', config: {} },
        cooldownMs: 7200000,
        lastTriggered: 0,
      },
      {
        id: 'rule-skill-failure-recovery',
        name: 'Skill Failure Recovery',
        enabled: true,
        trigger: { type: 'skill_failure', config: { failureCount: 3 } },
        action: { type: 'optimize_strategy', config: {} },
        cooldownMs: 1800000,
        lastTriggered: 0,
      },
    ];
  }
}

export const ruleRegistry = new RuleRegistry();