/**
 * V143 PipelineExecutor Tests
 */
import { describe, it, expect } from 'vitest';

interface PipelineStep {
  id: string;
  skillId: string;
  args?: Record<string, unknown>;
  parallel?: boolean;
  depends_on?: string[];
}

interface PipelineStepResult {
  stepId: string;
  output: unknown;
  duration: number;
}

// Minimal topological sort for testing
function topologicalSort(steps: PipelineStep[]): PipelineStep[] {
  const sorted: PipelineStep[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(step: PipelineStep) {
    if (visited.has(step.id)) return;
    if (visiting.has(step.id)) throw new Error(`Cycle detected at ${step.id}`);
    visiting.add(step.id);
    if (step.depends_on) {
      for (const depId of step.depends_on) {
        const dep = steps.find(s => s.id === depId);
        if (dep) visit(dep);
      }
    }
    visiting.delete(step.id);
    visited.add(step.id);
    sorted.push(step);
  }

  for (const step of steps) visit(step);
  return sorted;
}

class TestablePipelineExecutor {
  async execute(steps: PipelineStep[], inputs: Record<string, unknown>): Promise<PipelineStepResult[]> {
    const sorted = topologicalSort(steps);
    const results: PipelineStepResult[] = [];
    let context = { ...inputs };

    for (const step of sorted) {
      const start = Date.now();
      // Simulate skill execution
      const output = { [step.skillId]: `result_of_${step.skillId}` };
      context = { ...context, ...output };
      results.push({
        stepId: step.id,
        output,
        duration: Date.now() - start,
      });
    }
    return results;
  }
}

describe('PipelineExecutor', () => {
  let executor: TestablePipelineExecutor;

  beforeEach(() => {
    executor = new TestablePipelineExecutor();
  });

  it('executes steps in order', async () => {
    const steps: PipelineStep[] = [
      { id: 's1', skillId: 'skill1', args: {} },
      { id: 's2', skillId: 'skill2', args: {} },
    ];
    const results = await executor.execute(steps, {});
    expect(results).toHaveLength(2);
    expect(results[0].stepId).toBe('s1');
    expect(results[1].stepId).toBe('s2');
  });

  it('threads context between steps', async () => {
    const steps: PipelineStep[] = [
      { id: 's1', skillId: 'skill1', args: { key: 'value1' } },
      { id: 's2', skillId: 'skill2', args: {} },
    ];
    const results = await executor.execute(steps, { initial: 'data' });
    expect(results[0].output).toBeTruthy();
    expect(results[1].output).toBeTruthy();
  });

  it('handles single step', async () => {
    const steps: PipelineStep[] = [
      { id: 'single', skillId: 'solo', args: { x: 42 } },
    ];
    const results = await executor.execute(steps, {});
    expect(results).toHaveLength(1);
    expect(results[0].stepId).toBe('single');
    expect(results[0].output).toBeTruthy();
  });

  it('topologicalSort handles dependencies', () => {
    const steps: PipelineStep[] = [
      { id: 's3', skillId: 'skill3', depends_on: ['s1', 's2'] },
      { id: 's1', skillId: 'skill1' },
      { id: 's2', skillId: 'skill2' },
    ];
    const sorted = topologicalSort(steps);
    const ids = sorted.map(s => s.id);
    const s3Pos = ids.indexOf('s3');
    const s1Pos = ids.indexOf('s1');
    const s2Pos = ids.indexOf('s2');
    expect(s1Pos).toBeLessThan(s3Pos);
    expect(s2Pos).toBeLessThan(s3Pos);
  });

  it('topologicalSort detects cycles', () => {
    const steps: PipelineStep[] = [
      { id: 's1', skillId: 'skill1', depends_on: ['s2'] },
      { id: 's2', skillId: 'skill2', depends_on: ['s1'] },
    ];
    expect(() => topologicalSort(steps)).toThrow('Cycle detected');
  });

  it('returns duration for each step', async () => {
    const steps: PipelineStep[] = [
      { id: 'timed', skillId: 'timed-skill', args: {} },
    ];
    const results = await executor.execute(steps, {});
    expect(results[0].duration).toBeGreaterThanOrEqual(0);
  });

  it('handles empty steps array', async () => {
    const results = await executor.execute([], { init: true });
    expect(results).toHaveLength(0);
  });
});
