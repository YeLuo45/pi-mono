/**
 * ChainEngine — executes Skill Chains (V79)
 * Handles sequential step execution, variable interpolation, and condition evaluation.
 */

import type { ChainDefinition, ChainStep, ChainExecutionResult, ChainStepResult } from '../skills/types';
import type { SkillExecutionContext } from '../skills/types';
import { skillRunner } from '../skills/skillRunner';
import type { SkillExecutionResult as SkillExecResult } from '../skills/types';

export interface ChainExecuteContext {
  triggerMessage: string;
  metadata: Record<string, unknown>;
  recentMessages?: unknown[];
  personaId?: string;
}

/**
 * Replace {{variable}} placeholders in a template with values from vars.
 */
export function resolveTemplate(template: Record<string, string>, vars: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(template)) {
    result[key] = resolveStringTemplate(value, vars);
  }
  return result;
}

/**
 * Replace {{var}} placeholders in a single string.
 */
export function resolveStringTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split('.');
    let val: unknown = vars;
    for (const part of parts) {
      if (val && typeof val === 'object' && part in val) {
        val = (val as Record<string, unknown>)[part];
      } else {
        return match; // leave unresolved
      }
    }
    return String(val ?? match);
  });
}

/**
 * Evaluate a condition string against vars.
 * Supports: 'always' | 'if:{expr}'
 * expr examples: 'step1_result contains "晴天"' | 'step2_result > 0'
 */
export function evaluateCondition(condition: string, vars: Record<string, unknown>): boolean {
  if (condition === 'always') return true;

  if (condition.startsWith('if:')) {
    const expr = condition.slice(3).trim();
    return evaluateExpression(expr, vars);
  }

  return true;
}

function evaluateExpression(expr: string, vars: Record<string, unknown>): boolean {
  // Handle "var contains 'text'" syntax
  const containsMatch = expr.match(/^(\w+(?:\.\w+)*)\s+contains\s+["']([^"']+)["']$/);
  if (containsMatch) {
    const [, varPath, searchText] = containsMatch;
    const value = getVarValue(varPath, vars);
    return String(value).includes(searchText);
  }

  // Handle "var > num" or "var < num" comparisons
  const compMatch = expr.match(/^(\w+(?:\.\w+)*)\s*([><=!]+)\s*(\S+)$/);
  if (compMatch) {
    const [, varPath, op, right] = compMatch;
    const left = getVarValue(varPath, vars);
    const leftNum = Number(left);
    const rightNum = Number(right);
    if (!isNaN(leftNum) && !isNaN(rightNum)) {
      switch (op) {
        case '>': return leftNum > rightNum;
        case '<': return leftNum < rightNum;
        case '>=': return leftNum >= rightNum;
        case '<=': return leftNum <= rightNum;
        case '==': return leftNum === rightNum;
        case '!=': return leftNum !== rightNum;
      }
    }
    // Fallback to string comparison
    return String(left) === right;
  }

  // Default: treat as truthy variable
  const value = getVarValue(expr.trim(), vars);
  return Boolean(value);
}

function getVarValue(path: string, vars: Record<string, unknown>): unknown {
  const parts = path.split('.');
  let val: unknown = vars;
  for (const part of parts) {
    if (val && typeof val === 'object' && part in val) {
      val = (val as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return val;
}

/**
 * Execute a chain with the given context.
 */
export async function executeChain(
  chain: ChainDefinition,
  context: ChainExecuteContext
): Promise<ChainExecutionResult> {
  const startTime = Date.now();
  const results: Record<string, unknown> = {};
  const stepResults: ChainStepResult[] = [];

  // Build vars: context metadata + triggerMessage + previous step outputs
  const vars: Record<string, unknown> = {
    context: context.metadata,
    triggerMessage: context.triggerMessage,
    ...results,
  };

  for (const step of chain.steps) {
    const stepStart = Date.now();

    // Evaluate condition
    if (!evaluateCondition(step.condition, vars)) {
      stepResults.push({
        stepId: step.id,
        skillId: step.skillId,
        status: 'skipped',
        input: step.inputTemplate,
        output: '',
      });
      continue;
    }

    // Resolve input template
    const resolvedInput = resolveTemplate(step.inputTemplate, vars);

    // Build skill execution context
    const skillContext: SkillExecutionContext = {
      triggerMessage: context.triggerMessage,
      recentMessages: (context.recentMessages as any) || [],
      personaId: context.personaId || 'default',
      metadata: {
        ...context.metadata,
        chainId: chain.id,
        chainStepId: step.id,
      },
      parsedParams: resolvedInput,
    };

    try {
      // Execute skill via skillRunner
      const skillResult: SkillExecResult = await skillRunner.runSkillFromChat(
        step.skillId,
        context.triggerMessage,
        (context.recentMessages as any) || [],
        context.personaId || 'default'
      );

      const stepOutput = skillResult.response || skillResult.error || '';
      results[step.outputKey] = stepOutput;
      vars[step.outputKey] = stepOutput;

      stepResults.push({
        stepId: step.id,
        skillId: step.skillId,
        status: skillResult.success ? 'completed' : 'failed',
        input: resolvedInput,
        output: stepOutput,
        error: skillResult.error,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results[step.outputKey] = `Error: ${errorMsg}`;
      vars[step.outputKey] = `Error: ${errorMsg}`;

      stepResults.push({
        stepId: step.id,
        skillId: step.skillId,
        status: 'failed',
        input: resolvedInput,
        output: `Error: ${errorMsg}`,
        error: errorMsg,
      });
    }
  }

  const lastStep = stepResults[stepResults.length - 1];
  const finalResult = lastStep?.status === 'completed' ? lastStep.output : '';

  return {
    chainId: chain.id,
    success: stepResults.some((s) => s.status === 'completed'),
    steps: stepResults,
    finalResult,
    error: stepResults.every((s) => s.status === 'failed') ? 'All steps failed' : undefined,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Match a message against chain trigger keywords.
 */
export function matchChainTrigger(
  message: string,
  chains: ChainDefinition[]
): ChainDefinition | null {
  const lowerMsg = message.toLowerCase().trim();

  for (const chain of chains) {
    if (!chain.enabled) continue;
    for (const keyword of chain.triggerKeywords) {
      const kw = keyword.toLowerCase();
      if (lowerMsg.startsWith(kw) || lowerMsg.includes(kw)) {
        return chain;
      }
    }
  }
  return null;
}
