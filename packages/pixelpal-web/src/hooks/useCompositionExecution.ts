/**
 * V143: useCompositionExecution hook
 * DSL string → DSLLexer → DLSParser → SkillCompiler → SkillRunner.runComposedSkill
 */

import { useCallback, useState } from 'react';
import type { SkillResult, PipelineStepResult, CompiledSkill } from '../types/execution';
import { compileDSL } from '../services/composition/SkillCompiler';
import { SkillRunner } from '../services/execution/SkillRunner';

interface UseCompositionExecutionState {
  result: SkillResult | null;
  stepResults: PipelineStepResult[];
  loading: boolean;
  error: string | null;
}

export function useCompositionExecution() {
  const [state, setState] = useState<UseCompositionExecutionState>({
    result: null,
    stepResults: [],
    loading: false,
    error: null,
  });

  /**
   * Execute a DSL string as a composed skill
   */
  const runDSL = useCallback(async (
    dsl: string,
    inputs: Record<string, unknown> = {}
  ): Promise<SkillResult | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Lex + Parse + Compile
      const compileResult = compileDSL(dsl);
      if (!compileResult.success || !compileResult.pipeline) {
        const errorMsg = compileResult.errors.join(', ') || 'Compilation failed';
        setState(prev => ({ ...prev, loading: false, error: errorMsg }));
        return null;
      }

      // Convert to CompiledSkill format
      const compiledSkill: CompiledSkill = {
        id: compileResult.pipeline.id,
        name: compileResult.pipeline.name,
        version: '1.0.0',
        steps: compileResult.pipeline.steps.map(step => ({
          id: step.id,
          skillId: step.skillId,
          args: step.input,
          parallel: false,
          depends_on: step.depends_on,
        })),
      };

      // Execute via SkillRunner
      const result = await SkillRunner.runComposedSkill(compiledSkill, inputs);
      setState(prev => ({ ...prev, result, loading: false }));
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return null;
    }
  }, []);

  /**
   * Run a pipeline directly (by pipeline ID - future use with stored pipelines)
   */
  const runPipeline = useCallback(async (
    pipelineId: string,
    inputs: Record<string, unknown> = {}
  ): Promise<PipelineStepResult[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Import PipelineExecutor
      const { pipelineExecutor } = await import('../services/execution/PipelineExecutor');
      const results = await pipelineExecutor.execute([], inputs);
      setState(prev => ({ ...prev, stepResults: results, loading: false }));
      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: errorMsg }));
      return [];
    }
  }, []);

  const clearResult = useCallback(() => {
    setState({ result: null, stepResults: [], loading: false, error: null });
  }, []);

  return {
    ...state,
    runDSL,
    runPipeline,
    clearResult,
  };
}