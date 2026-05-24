/**
 * V156: RuleScheduler - Time-based Rule Scheduling
 * 
 * Schedules and manages time-based evolution rule triggers.
 */

import type { EvolutionRule } from './EvolutionRule';
import { ruleEngine } from './RuleEngine';

class RuleScheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private ruleEngine: typeof ruleEngine;

  constructor(re: typeof ruleEngine) {
    this.ruleEngine = re;
  }

  schedule(rule: EvolutionRule): void {
    if (rule.trigger.type !== 'time_based') return;

    this.cancel(rule.id);

    const config = rule.trigger.config as { intervalMs?: number };
    const delay = config.intervalMs || 86400000; // default 24h

    const timer = setTimeout(() => {
      this.timers.delete(rule.id);
      ruleEngine.triggerRule(rule, {
        personalityId: rule.personalityId || '',
        conversationCount: 0,
        emotionLevel: 0,
        emotionDelta: 0,
        recentSkills: [],
        recentFailures: [],
        timestamp: Date.now(),
      });
      // Reschedule
      this.schedule(rule);
    }, delay);

    this.timers.set(rule.id, timer);
  }

  cancel(ruleId: string): void {
    const timer = this.timers.get(ruleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(ruleId);
    }
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

export const ruleScheduler = new RuleScheduler(ruleEngine);