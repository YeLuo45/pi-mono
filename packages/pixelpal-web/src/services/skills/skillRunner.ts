/**
 * SkillRunner — orchestrates skill execution from ChatPanel and SkillPanel.
 * Integrates with the existing agentExecutor and chat system.
 */

import type { Message } from '../../types';
import { skillRegistry } from './skillRegistry';
import type {
  SkillExecutionContext,
  SkillExecutionResult,
  SkillDefinition,
} from './types';

export interface SkillRunnerConfig {
  /** Max skills that can run concurrently */
  maxConcurrent?: number;
  /** Default skill execution mode */
  defaultShowSteps?: boolean;
  /** Callback when a skill starts producing output */
  onChunk?: (skillId: string, chunk: string) => void;
  /** Callback when skill completes */
  onComplete?: (result: SkillExecutionResult) => void;
  /** Callback on skill error */
  onError?: (skillId: string, error: string) => void;
  /** V89: Callback when skill execution is done - for Agent integration */
  onExecutionComplete?: (skillId: string, result: SkillExecutionResult, executionId?: string) => void;
}

class SkillRunnerImpl {
  private config: SkillRunnerConfig = {};
  private runningSkills = new Set<string>();

  /** Configure the runner */
  configure(config: SkillRunnerConfig): void {
    this.config = { maxConcurrent: 3, defaultShowSteps: false, ...config };
  }

  /** Check if a skill is currently running */
  isRunning(skillId: string): boolean {
    return this.runningSkills.has(skillId);
  }

  /** Get count of running skills */
  getRunningCount(): number {
    return this.runningSkills.size;
  }

  /**
   * Execute a skill directly from the SkillPanel.
   * Returns the execution result.
   */
  async runSkillFromPanel(
    skill: SkillDefinition,
    userMessage: string,
    recentMessages: Message[],
    personaId: string,
    sceneId?: string,
    metadata: Record<string, unknown> = {}
  ): Promise<SkillExecutionResult> {
    if (this.runningSkills.size >= (this.config.maxConcurrent || 3)) {
      return {
        skillId: skill.id,
        success: false,
        response: 'Too many skills running. Please wait for others to finish.',
        durationMs: 0,
      };
    }

    this.runningSkills.add(skill.id);

    const context: SkillExecutionContext = {
      triggerMessage: userMessage,
      recentMessages,
      personaId,
      sceneId,
      metadata,
      parsedParams: {},
    };

    try {
      const result =
        skill.showSteps || this.config.defaultShowSteps
          ? await skillRegistry.executeSkillWithSteps(skill.id, context)
          : await skillRegistry.executeSkill(skill.id, context);

      this.config.onComplete?.(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorResult: SkillExecutionResult = {
        skillId: skill.id,
        success: false,
        response: `Skill failed: ${errorMsg}`,
        error: errorMsg,
        durationMs: 0,
      };
      this.config.onError?.(skill.id, errorMsg);
      return errorResult;
    } finally {
      this.runningSkills.delete(skill.id);
    }
  }

  /**
   * Execute a skill from chat context (triggered by keyword).
   * The user has already triggered the skill — this prepares context and runs.
   */
  async runSkillFromChat(
    skillId: string,
    userMessage: string,
    recentMessages: Message[],
    personaId: string,
    sceneId?: string
  ): Promise<SkillExecutionResult> {
    if (this.runningSkills.size >= (this.config.maxConcurrent || 3)) {
      return {
        skillId,
        success: false,
        response: 'Too many skills running. Please wait.',
        durationMs: 0,
      };
    }

    this.runningSkills.add(skillId);

    const context: SkillExecutionContext = {
      triggerMessage: userMessage,
      recentMessages,
      personaId,
      sceneId,
      metadata: { triggeredFrom: 'chat' },
      parsedParams: {},
    };

    try {
      const result = await skillRegistry.executeSkill(skillId, context);
      this.config.onComplete?.(result);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorResult: SkillExecutionResult = {
        skillId,
        success: false,
        response: `Skill failed: ${errorMsg}`,
        error: errorMsg,
        durationMs: 0,
      };
      this.config.onError?.(skillId, errorMsg);
      return errorResult;
    } finally {
      this.runningSkills.delete(skillId);
    }
  }

  /**
   * Check if user's message matches any chat-triggerable skill keywords.
   * Returns the matched skill or null.
   */
  matchChatSkill(userMessage: string): SkillDefinition | null {
    return skillRegistry.matchChatKeyword(userMessage);
  }

  /**
   * List all skills sorted by order, grouped by category.
   */
  getGroupedSkills(): Map<string, SkillDefinition[]> {
    const skills = skillRegistry.getSortedSkills();
    const grouped = new Map<string, SkillDefinition[]>();

    for (const skill of skills) {
      const list = grouped.get(skill.category) || [];
      list.push(skill);
      grouped.set(skill.category, list);
    }

    return grouped;
  }

  /** Get a skill by ID */
  getSkill(id: string): SkillDefinition | undefined {
    return skillRegistry.getSkill(id);
  }

  /** Get all enabled skills */
  getEnabledSkills(): SkillDefinition[] {
    return skillRegistry.getEnabledSkills();
  }

  /** Get all chat-triggerable skills */
  getChatTriggerableSkills(): SkillDefinition[] {
    return skillRegistry.getChatTriggerableSkills();
  }
}

// Singleton
export const skillRunner = new SkillRunnerImpl();
