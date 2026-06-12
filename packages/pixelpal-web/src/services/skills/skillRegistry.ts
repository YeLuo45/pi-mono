/**
 * V77 Skill Registry — singleton managing all skills (preset + custom)
 *
 * Load order:
 *   1. Register preset skills (always available)
 *   2. Load custom skills from storage if available
 */

import type {
  SkillDefinition,
  SkillCategory,
  SkillManifest,
  SkillExecutionContext,
  SkillExecutionResult,
  SkillStepResult,
  SkillEvents,
} from './types';
import {
  getCustomSkills,
  setEnabled,
  saveCustomSkill,
  deleteCustomSkill,
} from './skillStorage';
import { chatCompletionWithTools } from '../ai/model-registry-adapter';
import { presetSkills } from './presetSkills';

// =============================================================================
// Registry Implementation
// =============================================================================

class SkillRegistryImpl {
  private skills = new Map<string, SkillDefinition>();
  private events: SkillEvents = {};

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /** Load all skills — call once at app startup */
  async loadSkills(): Promise<void> {
    // 1. Register preset skills (always)
    for (const skill of presetSkills) {
      this.skills.set(skill.id, { ...skill });
    }

    // 2. Load custom skills from storage
    try {
      const customSkills = await getCustomSkills();
      for (const skill of customSkills) {
        if (this.skills.has(skill.id)) {
          // Merge: custom data overrides preset
          const existing = this.skills.get(skill.id)!;
          this.skills.set(skill.id, { ...existing, ...skill, enabled: skill.enabled ?? existing.enabled });
        } else {
          this.skills.set(skill.id, skill);
        }
      }
    } catch (err) {
      console.warn('[SkillRegistry] Failed to load custom skills:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getSkill(id: string): SkillDefinition | undefined {
    return this.skills.get(id);
  }

  getAllSkills(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  getEnabledSkills(): SkillDefinition[] {
    return this.getAllSkills().filter((s) => s.enabled);
  }

  getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
    return this.getEnabledSkills().filter((s) => s.category === category);
  }

  getChatTriggerableSkills(): SkillDefinition[] {
    return this.getEnabledSkills().filter((s) => s.chatTriggerable);
  }

  /** Get skill sorted by order field */
  getSortedSkills(): SkillDefinition[] {
    return this.getEnabledSkills().sort((a, b) => a.order - b.order);
  }

  // ---------------------------------------------------------------------------
  // Skill Management
  // ---------------------------------------------------------------------------

  async enableSkill(id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (!skill) return;
    skill.enabled = true;
    if (!presetSkills.find((p) => p.id === id)) {
      await setEnabled(id, true);
    }
  }

  async disableSkill(id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (!skill) return;
    skill.enabled = false;
    if (!presetSkills.find((p) => p.id === id)) {
      await setEnabled(id, false);
    }
  }

  async saveCustomSkill(skill: SkillDefinition): Promise<void> {
    this.skills.set(skill.id, skill);
    await saveCustomSkill(skill);
  }

  async deleteCustomSkill(id: string): Promise<void> {
    if (presetSkills.find((p) => p.id === id)) return; // Cannot delete preset
    this.skills.delete(id);
    await deleteCustomSkill(id);
  }

  // ---------------------------------------------------------------------------
  // Chat Keyword Matching
  // ---------------------------------------------------------------------------

  /**
   * Try to match user message against chat keywords of enabled skills.
   * Returns the best matching skill or null.
   */
  matchChatKeyword(userMessage: string): SkillDefinition | null {
    const lower = userMessage.toLowerCase().trim();

    for (const skill of this.getChatTriggerableSkills()) {
      for (const kw of skill.chatKeywords) {
        if (lower.includes(kw.toLowerCase())) {
          return skill;
        }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Skill Execution
  // ---------------------------------------------------------------------------

  /** Execute a skill by ID with the given context */
  async executeSkill(
    skillId: string,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return {
        skillId,
        success: false,
        response: `Skill "${skillId}" not found.`,
        durationMs: 0,
      };
    }

    if (!skill.enabled) {
      return {
        skillId,
        success: false,
        response: `Skill "${skill.name}" is currently disabled.`,
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    this.events.onSkillStart?.(skill);

    try {
      // Build system prompt with skill instructions + context
      const systemPrompt = this.buildSystemPrompt(skill, context);

      // Build messages array
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...context.recentMessages.slice(-10).map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        { role: 'user' as const, content: context.triggerMessage },
      ];

      // Call LLM
      const result = await chatCompletionWithTools(messages, [], skillId);

      const durationMs = Date.now() - startTime;

      if (result.success) {
        const executionResult: SkillExecutionResult = {
          skillId,
          success: true,
          response: result.content,
          durationMs,
          tokensUsed: result.usage?.totalTokens,
        };

        this.events.onSkillComplete?.(skill, executionResult);
        return executionResult;
      } else {
        const errorResult: SkillExecutionResult = {
          skillId,
          success: false,
          response: `Skill execution failed: ${result.error}`,
          error: result.error,
          durationMs,
        };
        this.events.onSkillFail?.(skill, result.error || 'Unknown error');
        return errorResult;
      }
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorResult: SkillExecutionResult = {
        skillId,
        success: false,
        response: `Skill "${skill.name}" failed: ${errorMsg}`,
        error: errorMsg,
        durationMs,
      };
      this.events.onSkillFail?.(skill, errorMsg);
      return errorResult;
    }
  }

  /**
   * Execute a skill with step-by-step progress tracking.
   * Decomposes the goal into steps and executes each one.
   */
  async executeSkillWithSteps(
    skillId: string,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return { skillId, success: false, response: `Skill "${skillId}" not found.`, durationMs: 0 };
    }

    const startTime = Date.now();
    this.events.onSkillStart?.(skill);

    const steps: SkillStepResult[] = [];
    const maxSteps = skill.maxSteps || 5;

    // Step 1: Decompose goal
    const decompositionPrompt = `You are the planning module for skill "${skill.name}".
Skill description: ${skill.description}
User request: ${context.triggerMessage}

Decompose this into exactly ${maxSteps} or fewer concrete steps. Return a JSON array where each step has:
- "description": short description of the step
- "toolName": optional tool/plugin name to call

Return ONLY the JSON array, no other text.`;

    let stepDefinitions: Array<{ description: string; toolName?: string }> = [];
    try {
      const decompResult = await chatCompletionWithTools(
        [{ role: 'user', content: decompositionPrompt }],
        [],
        `${skillId}-decomp`
      );
      const match = decompResult.content.match(/\[[\s\S]*\]/);
      if (match) {
        stepDefinitions = JSON.parse(match[0]);
      }
    } catch {
      stepDefinitions = [{ description: context.triggerMessage }];
    }

    // Execute each step
    for (let i = 0; i < Math.min(stepDefinitions.length, maxSteps); i++) {
      const stepDef = stepDefinitions[i];
      const stepResult: SkillStepResult = {
        index: i,
        description: stepDef.description,
        result: '',
        status: 'completed',
      };

      this.events.onSkillProgress?.(skill, Math.round(((i + 1) / stepDefinitions.length) * 100));

      try {
        const execPrompt = `Execute step ${i + 1}/${stepDefinitions.length}:
${stepDef.description}

Context: ${JSON.stringify(context.metadata)}
Recent messages: ${context.recentMessages.slice(-5).map((m) => `${m.role}: ${m.content}`).join('\n')}

Provide a brief result for this step.`;

        const stepResponse = await chatCompletionWithTools(
          [{ role: 'user', content: execPrompt }],
          [],
          `${skillId}-step-${i}`
        );
        stepResult.result = stepResponse.success ? stepResponse.content : `Step failed: ${stepResponse.error}`;
      } catch (err) {
        stepResult.result = err instanceof Error ? err.message : String(err);
        stepResult.status = 'failed';
      }

      steps.push(stepResult);
      this.events.onStepComplete?.(skill, stepResult);
    }

    // Final synthesis step
    const synthesisPrompt = `Based on the following step results, provide a cohesive final response for the user:

${steps.map((s, i) => `Step ${i + 1}: ${s.description}\nResult: ${s.result}`).join('\n\n')}

User's original request: ${context.triggerMessage}

Provide a clear, helpful final answer.`;

    let finalResponse = '';
    try {
      const synthResult = await chatCompletionWithTools(
        [{ role: 'user', content: synthesisPrompt }],
        [],
        `${skillId}-synthesis`
      );
      finalResponse = synthResult.success ? synthResult.content : steps.map((s) => s.result).join('\n');
    } catch {
      finalResponse = steps.map((s) => s.result).join('\n');
    }

    const durationMs = Date.now() - startTime;
    const executionResult: SkillExecutionResult = {
      skillId,
      success: true,
      response: finalResponse,
      steps,
      durationMs,
    };

    this.events.onSkillComplete?.(skill, executionResult);
    return executionResult;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  setEvents(events: SkillEvents): void {
    this.events = events;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private buildSystemPrompt(skill: SkillDefinition, context: SkillExecutionContext): string {
    const parts: string[] = [
      `# ${skill.name} Skill (v${skill.version})`,
      skill.description,
      '',
      '## Instructions',
      skill.systemPrompt,
      '',
    ];

    if (skill.examplePrompts.length > 0) {
      parts.push('## Example Prompts');
      parts.push(...skill.examplePrompts.map((p) => `- ${p}`));
      parts.push('');
    }

    parts.push('## Context');
    parts.push(`- Persona ID: ${context.personaId}`);
    if (context.sceneId) {
      parts.push(`- Scene ID: ${context.sceneId}`);
    }
    parts.push(`- User message: ${context.triggerMessage}`);
    parts.push('');

    return parts.join('\n');
  }
}

// =============================================================================
// Singleton
// =============================================================================

export const skillRegistry = new SkillRegistryImpl();
