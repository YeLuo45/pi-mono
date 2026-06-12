/**
 * V143: PipelineExecutor — executes pipeline steps with context threading
 * Features:
 * - Sequential execution with context threading (previous step output → next step input)
 * - Parallel execution for steps with parallel=true via Promise.all
 * - Uses topologicalSort from OrchestrationEngine
 */

import type { PipelineStep, PipelineStepResult } from '../../types/execution';
import { topologicalSort } from '../orchestration/OrchestrationEngine';
import { skillRunner } from './SkillRunner';

export class PipelineExecutor {
  /**
   * Execute pipeline steps with context threading
   * @param steps - Array of pipeline steps to execute
   * @param inputs - Initial inputs for the first step(s)
   * @returns Array of PipelineStepResult in execution order
   */
  async execute(
    steps: PipelineStep[],
    inputs: Record<string, unknown>
  ): Promise<PipelineStepResult[]> {
    if (!steps || steps.length === 0) {
      return [];
    }

    // Topological sort for dependency ordering
    const sortedSteps = topologicalSort(steps as any);

    const results: PipelineStepResult[] = [];
    let context = { ...inputs }; // Thread context passed between steps

    // Group steps by dependency level for parallel execution
    const levels = this.groupByLevel(sortedSteps);

    for (const level of levels) {
      const levelResults: PipelineStepResult[] = [];

      if (level.length === 1) {
        // Single step - execute normally
        const step = level[0];
        const result = await this.executeStep(step, context);
        levelResults.push(result);

        // Thread output to context if successful
        if (result.success) {
          context = { ...context, [step.id]: result.output };
        }
      } else {
        // Multiple steps at same level - execute in parallel
        const parallelPromises = level.map(async (step) => {
          const result = await this.executeStep(step, context);
          if (result.success) {
            context = { ...context, [step.id]: result.output };
          }
          return result;
        });

        const parallelResults = await Promise.all(parallelPromises);
        levelResults.push(...parallelResults);
      }

      results.push(...levelResults);

      // Check if any step in this level failed - abort on error if on_error=abort
      const failedStep = levelResults.find((r) => !r.success);
      if (failedStep) {
        // Fill remaining steps with failed results
        const remainingSteps = sortedSteps.slice(results.length);
        for (const step of remainingSteps) {
          results.push({
            stepId: step.id,
            output: null,
            duration: 0,
            success: false,
            error: `Aborted due to previous step failure: ${failedStep.error}`,
          });
        }
        break;
      }
    }

    return results;
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: PipelineStep,
    context: Record<string, unknown>
  ): Promise<PipelineStepResult> {
    const startTime = Date.now();

    try {
      // Merge step args with context (context takes precedence for threading)
      const inputs = { ...step.args, ...context };

      const result = await skillRunner.runSkill(step.skillId, inputs);

      return {
        stepId: step.id,
        output: result.output,
        duration: result.duration,
        success: result.success,
        error: result.error,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        stepId: step.id,
        output: null,
        duration: Date.now() - startTime,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Group steps by dependency level for parallel execution
   * Steps with the same dependency depth can run in parallel
   */
  private groupByLevel(steps: PipelineStep[]): PipelineStep[][] {
    const levels: PipelineStep[][] = [];
    const visited = new Set<string>();

    for (const step of steps) {
      // Find the level based on dependencies
      let level = 0;
      for (const depId of step.depends_on || []) {
        for (let i = 0; i < levels.length; i++) {
          if (levels[i].some((s) => s.id === depId)) {
            level = Math.max(level, i + 1);
          }
        }
      }

      while (levels.length <= level) {
        levels.push([]);
      }
      levels[level].push(step);
      visited.add(step.id);
    }

    return levels;
  }
}

export const pipelineExecutor = new PipelineExecutor();