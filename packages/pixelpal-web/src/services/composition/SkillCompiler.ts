/**
 * V142: SkillCompiler — AST → Pipeline compiler + cycle detection
 */
import type { Pipeline, PipelineStep } from '../orchestration/OrchestrationEngine';
import type { AST, ASTSkillDef } from './DLSParser';
import { DLSParser } from './DLSParser';
import { DSLLexer } from './DSLLexer';
import { topologicalSort } from '../orchestration/OrchestrationEngine';

export interface CompileResult {
  success: boolean;
  pipeline?: Pipeline;
  errors: string[];
  warnings: string[];
  cycleDetected?: boolean;
}

export function detectCycles(steps: PipelineStep[]): boolean {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const deps = new Map<string, string[]>();
  for (const s of steps) { deps.set(s.id, s.depends_on); }

  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const d of deps.get(id) ?? []) { if (dfs(d)) return true; }
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  for (const id of deps.keys()) { if (dfs(id)) return true; }
  return false;
}

export function compileDSL(source: string): CompileResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  try {
    const tokens = new DSLLexer(source).tokenize();
    const parser = new DLSParser(tokens);
    const { ast, errors: parseErrors } = parser.parse();
    if (parseErrors.length) return { success: false, errors: parseErrors, warnings };
    if (!ast) return { success: false, errors: ['Parse returned null AST'], warnings };

    const def = ast as ASTSkillDef;
    const steps: PipelineStep[] = def.do.map((action, idx) => ({
      id: `step_${idx}`,
      skillId: action.skillId,
      skillVersion: action.version,
      input: action.inputMapping,
      depends_on: idx > 0 ? [`step_${idx - 1}`] : [],
      on_error: 'abort' as const,
      retry_count: 0,
    }));

    if (detectCycles(steps)) {
      warnings.push('Cycle detected in step dependencies');
      return { success: false, errors: [], warnings, cycleDetected: true };
    }

    const pipeline: Pipeline = {
      id: `composed_${def.name}_${Date.now()}`,
      name: def.name,
      description: `Composed skill from DSL v${def.version}`,
      createdBy: 'dsl-compiler',
      createdAt: new Date().toISOString(),
      steps,
      maxParallel: 2,
      retryOnFail: true,
      timeout_ms: 60000,
    };

    try { topologicalSort(steps); } catch { warnings.push('Topological sort warning: possible dependency issue'); }

    return { success: true, pipeline, errors, warnings };
  } catch (e) {
    errors.push((e as Error).message);
    return { success: false, errors, warnings };
  }
}