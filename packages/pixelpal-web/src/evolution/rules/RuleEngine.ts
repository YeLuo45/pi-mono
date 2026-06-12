/**
 * V156: RuleEngine - Rules Evaluation and Triggering
 * 
 * Evaluates rules against context and triggers actions.
 */

import { ruleRegistry } from './RuleRegistry';
import type { EvolutionRule, EvolutionContext } from './EvolutionRule';
import { hookManager } from '../../core/hooks/HookManager';

class RuleEngine {
  private isEvaluating = false;

  async evaluateRules(context: EvolutionContext): Promise<EvolutionRule[]> {
    const enabledRules = ruleRegistry.getEnabledRules();
    const personalityRules = ruleRegistry.getRulesForPersonality(context.personalityId);
    const matched: EvolutionRule[] = [];

    for (const rule of personalityRules) {
      if (!rule.enabled) continue;
      if (this.isInCooldown(rule)) continue;
      if (await this.matchesTrigger(rule, context)) {
        matched.push(rule);
      }
    }

    return matched;
  }

  async triggerRule(rule: EvolutionRule, context: EvolutionContext): Promise<void> {
    if (this.isInCooldown(rule)) {
      hookManager.emit('evolution:rule-cooldown', { ruleId: rule.id, context });
      return;
    }

    // Execute action
    await this.executeAction(rule.action, context);

    // Update lastTriggered
    ruleRegistry.updateRule(rule.id, { lastTriggered: Date.now() });

    // Emit event
    hookManager.emit('evolution:rule-triggered', { ruleId: rule.id, ruleName: rule.name, context });

    // Schedule next trigger for time-based rules
    if (rule.trigger.type === 'time_based') {
      this.scheduleNextTrigger(rule);
    }
  }

  private isInCooldown(rule: EvolutionRule): boolean {
    if (rule.lastTriggered === 0) return false;
    return Date.now() - rule.lastTriggered < rule.cooldownMs;
  }

  private async matchesTrigger(rule: EvolutionRule, context: EvolutionContext): Promise<boolean> {
    const { type, config } = rule.trigger;

    switch (type) {
      case 'conversation_count':
        return context.conversationCount >= (config.threshold as number);

      case 'emotion_spike': {
        const threshold = config.threshold as number;
        const direction = config.direction as string;
        if (direction === 'up') return context.emotionDelta > threshold;
        if (direction === 'down') return context.emotionDelta < -threshold;
        return Math.abs(context.emotionDelta) > threshold;
      }

      case 'skill_failure': {
        const failureCount = config.failureCount as number;
        const failedSkillIds = context.recentFailures;
        return failedSkillIds.length >= failureCount;
      }

      case 'time_based':
        return false; // Time-based handled by scheduler

      case 'manual':
        return false;

      default:
        return false;
    }
  }

  private async executeAction(action: EvolutionRule['action'], context: EvolutionContext): Promise<void> {
    // Import evolution engine dynamically to avoid circular deps
    const { getEvolutionEngine } = await import('../EvolutionEngine');
    const evolutionEngine = getEvolutionEngine();

    switch (action.type) {
      case 'analyze_patterns':
        await evolutionEngine.analyze();
        break;
      case 'optimize_strategy':
        await evolutionEngine.generateStrategies();
        break;
      case 'crystallize_skill':
        await evolutionEngine.crystallizeSkills();
        break;
      case 'full_evolution':
        await evolutionEngine.evolve();
        break;
    }
  }

  private scheduleNextTrigger(rule: EvolutionRule): void {
    // Handled by RuleScheduler
  }

  setupEventListeners(): void {
    hookManager.on('conversation:new', async (data) => {
      if (this.isEvaluating) return;
      this.isEvaluating = true;
      try {
        const context: EvolutionContext = {
          personalityId: data.personalityId,
          conversationCount: 1,
          emotionLevel: data.emotionLevel || 0,
          emotionDelta: data.emotionDelta || 0,
          recentSkills: [],
          recentFailures: [],
          timestamp: Date.now(),
        };
        const matched = await this.evaluateRules(context);
        for (const rule of matched) {
          await this.triggerRule(rule, context);
        }
      } finally {
        this.isEvaluating = false;
      }
    });
  }
}

export const ruleEngine = new RuleEngine();