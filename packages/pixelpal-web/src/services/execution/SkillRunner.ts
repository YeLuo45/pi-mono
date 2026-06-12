/**
 * V143: SkillRunner — executes skills and composed DSL skills
 * Features:
 * - runSkill(skillId, inputs) → SkillResult
 * - runComposedSkill(compiledDsl, inputs) → SkillResult
 * - 5-minute cache TTL
 */

import type { SkillResult, CompiledSkill } from '../../types/execution';
import { skillRegistry } from '../skills/skillRegistry';
import type { SkillExecutionContext, SkillExecutionResult } from '../skills/types';

// Cache entry with TTL
interface CacheEntry {
  result: SkillResult;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

class SkillRunnerImpl {
  private cache = new Map<string, CacheEntry>();

  /**
   * Generate a cache key from skillId and inputs
   */
  getCacheKey(skillId: string, inputs: Record<string, unknown>): string {
    const inputStr = JSON.stringify(inputs, Object.keys(inputs).sort());
    return `${skillId}:${inputStr}`;
  }

  /**
   * Check if a cached result exists and is still valid
   */
  private getCachedResult(cacheKey: string): SkillResult | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(cacheKey);
      return null;
    }
    return { ...entry.result, cached: true };
  }

  /**
   * Run a single skill by ID with the given inputs
   */
  async runSkill(skillId: string, inputs: Record<string, unknown>): Promise<SkillResult> {
    const cacheKey = this.getCacheKey(skillId, inputs);
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const startTime = Date.now();
    const skill = skillRegistry.getSkill(skillId);

    if (!skill) {
      return {
        skillId,
        output: null,
        duration: Date.now() - startTime,
        success: false,
        error: `Skill "${skillId}" not found`,
        cached: false,
      };
    }

    if (!skill.enabled) {
      return {
        skillId,
        output: null,
        duration: Date.now() - startTime,
        success: false,
        error: `Skill "${skill.name}" is disabled`,
        cached: false,
      };
    }

    try {
      // Build minimal execution context for skill execution
      const context: SkillExecutionContext = {
        triggerMessage: JSON.stringify(inputs),
        recentMessages: [],
        personaId: 'system',
        metadata: { inputs },
        parsedParams: {},
      };

      const result: SkillExecutionResult = await skillRegistry.executeSkill(skillId, context);
      const duration = Date.now() - startTime;

      const skillResult: SkillResult = {
        skillId,
        output: result.success ? result.response : null,
        duration,
        success: result.success,
        error: result.error,
        cached: false,
      };

      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, { result: skillResult, timestamp: Date.now() });
      }

      return skillResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        skillId,
        output: null,
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg,
        cached: false,
      };
    }
  }

  /**
   * Run a composed skill (DSL compiled pipeline) with the given inputs
   * Executes steps sequentially with context threading
   */
  async runComposedSkill(
    compiledDsl: CompiledSkill,
    inputs: Record<string, unknown>
  ): Promise<SkillResult> {
    const startTime = Date.now();
    const { steps } = compiledDsl;

    if (!steps || steps.length === 0) {
      return {
        skillId: compiledDsl.id,
        output: null,
        duration: Date.now() - startTime,
        success: false,
        error: 'No steps to execute',
        cached: false,
      };
    }

    // Import PipelineExecutor lazily to avoid circular deps
    const { PipelineExecutor } = await import('./PipelineExecutor');
    const executor = new PipelineExecutor();

    try {
      // Convert CompiledSkill steps to PipelineExecutor format
      const pipelineSteps = steps.map((step, idx) => ({
        id: step.id || `step_${idx}`,
        skillId: step.skillId,
        args: step.args || {},
        parallel: step.parallel || false,
        depends_on: step.depends_on || [],
      }));

      const stepResults = await executor.execute(pipelineSteps, inputs);
      const duration = Date.now() - startTime;

      // Check if any step failed
      const failedStep = stepResults.find((r) => !r.success);
      const lastOutput = stepResults.length > 0 ? stepResults[stepResults.length - 1].output : null;

      return {
        skillId: compiledDsl.id,
        output: lastOutput,
        duration,
        success: !failedStep,
        error: failedStep?.error,
        cached: false,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        skillId: compiledDsl.id,
        output: null,
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg,
        cached: false,
      };
    }
  }

  /**
   * Clear the execution cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton
export const skillRunner = new SkillRunnerImpl();
export const SkillRunner = skillRunner;