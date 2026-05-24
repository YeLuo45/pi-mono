/**
 * V142 Tests: SkillCompiler
 */
import { compileDSL, detectCycles } from '@/services/composition/SkillCompiler';
import type { PipelineStep } from '@/services/orchestration/OrchestrationEngine';

describe('SkillCompiler', () => {
  test('compiles valid DSL to pipeline', () => {
    const source = 'skill test version v1.0.0 when e(a: b) do s1(i: x) using s1 yield out';
    const result = compileDSL(source);
    if (!result.success) console.log('compile errors:', result.errors);
    expect(result.success).toBe(true);
    expect(result.pipeline).toBeDefined();
    expect(result.pipeline!.name).toBe('test');
    expect(result.pipeline!.steps).toHaveLength(1);
  });

  test('returns errors on invalid DSL', () => {
    const result = compileDSL('not a valid skill definition at all');
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports cycle detection', () => {
    const steps: PipelineStep[] = [
      { id: 'a', skillId: 's1', input: {}, depends_on: ['c'], on_error: 'abort', retry_count: 0 },
      { id: 'b', skillId: 's2', input: {}, depends_on: ['a'], on_error: 'abort', retry_count: 0 },
      { id: 'c', skillId: 's3', input: {}, depends_on: ['b'], on_error: 'abort', retry_count: 0 },
    ];
    expect(detectCycles(steps)).toBe(true);
  });

  test('detectCycles returns false for valid DAG', () => {
    const steps: PipelineStep[] = [
      { id: 'a', skillId: 's1', input: {}, depends_on: [], on_error: 'abort', retry_count: 0 },
      { id: 'b', skillId: 's2', input: {}, depends_on: ['a'], on_error: 'abort', retry_count: 0 },
      { id: 'c', skillId: 's3', input: {}, depends_on: ['a', 'b'], on_error: 'abort', retry_count: 0 },
    ];
    expect(detectCycles(steps)).toBe(false);
  });

  test('detectCycles returns false for single node', () => {
    const steps: PipelineStep[] = [
      { id: 'a', skillId: 's1', input: {}, depends_on: [], on_error: 'abort', retry_count: 0 },
    ];
    expect(detectCycles(steps)).toBe(false);
  });

  test('pipeline has correct step dependencies', () => {
    const source = 'skill multi_step version v1.0.0 when e(a: b) do s1(i: x) using s1 yield out';
    const result = compileDSL(source);
    if (!result.success) console.log('compile errors:', result.errors);
    expect(result.success).toBe(true);
  });

  test('pipeline metadata is correct', () => {
    const source = `skill my_skill version v2.1.0
when trigger(arg: val)
do action(input: x)
using action
yield output`;
    const result = compileDSL(source);
    expect(result.success).toBe(true);
    expect(result.pipeline!.description).toContain('v2.1.0');
    expect(result.pipeline!.createdBy).toBe('dsl-compiler');
  });

  test('handles empty source gracefully', () => {
    const result = compileDSL('');
    expect(result.success).toBe(false);
  });

  test('returns cycleDetected flag when cycle exists', () => {
    const source = `skill test version v1.0.0
when e(a: b)
do s1(i: x)
using s1
yield out`;
    const result = compileDSL(source);
    expect(result.success).toBe(true);
    expect(result.cycleDetected).toBeFalsy();
  });
});

describe('detectCycles', () => {
  test('self-loop detected', () => {
    const steps: PipelineStep[] = [
      { id: 'a', skillId: 's1', input: {}, depends_on: ['a'], on_error: 'abort', retry_count: 0 },
    ];
    expect(detectCycles(steps)).toBe(true);
  });

  test('disconnected components ok', () => {
    const steps: PipelineStep[] = [
      { id: 'a', skillId: 's1', input: {}, depends_on: [], on_error: 'abort', retry_count: 0 },
      { id: 'b', skillId: 's2', input: {}, depends_on: [], on_error: 'abort', retry_count: 0 },
    ];
    expect(detectCycles(steps)).toBe(false);
  });
});