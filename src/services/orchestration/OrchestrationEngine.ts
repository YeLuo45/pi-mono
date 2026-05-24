/**
 * V139: OrchestrationEngine stub — required by V142 SkillCompiler
 * Full implementation in v139-skill-orchestration branch
 */
export interface Pipeline {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  createdBy: string;
  createdAt: number;
}
export interface PipelineStep {
  id: string;
  skillId: string;
  input: Record<string, unknown>;
  depends_on: string[];
  on_error: 'abort' | 'continue';
  retry_count: number;
}
export function topologicalSort(steps: PipelineStep[]): PipelineStep[] {
  const sorted: PipelineStep[] = [];
  const visited = new Set<string>();
  const stepMap = new Map(steps.map(s => [s.id, s]));
  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const step = stepMap.get(id);
    if (step) {
      step.depends_on.forEach(depId => visit(depId));
      sorted.push(step);
    }
  }
  steps.forEach(s => visit(s.id));
  return sorted;
}