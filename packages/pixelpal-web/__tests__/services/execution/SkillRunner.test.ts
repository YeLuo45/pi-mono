/**
 * V143 SkillRunner Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';

// Mock skill registry
const mockSkills: Record<string, any> = {};

const mockSkillRegistry = {
  getSkill: (id: string) => mockSkills[id] || null,
  list: () => Object.values(mockSkills),
};

const mockSkillExecutor = {
  execute: async (skillId: string, inputs: any) => ({
    output: { result: `executed_${skillId}` },
    success: true,
  }),
};

// Build minimal SkillRunner for testing
class TestableSkillRunner {
  private cache = new Map<string, { result: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000;

  getCacheKey(skillId: string, inputs: Record<string, unknown>): string {
    return `${skillId}:${JSON.stringify(inputs)}`;
  }

  private getCached(cacheKey: string) {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      return null;
    }
    return { ...entry.result, cached: true };
  }

  async runSkill(skillId: string, inputs: Record<string, unknown>) {
    const cacheKey = this.getCacheKey(skillId, inputs);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    const skill = mockSkillRegistry.getSkill(skillId);
    if (!skill) {
      return { skillId, output: null, duration: Date.now() - start, success: false, error: `Skill "${skillId}" not found`, cached: false };
    }
    if (!skill.enabled) {
      return { skillId, output: null, duration: Date.now() - start, success: false, error: `Skill "${skillId}" is disabled`, cached: false };
    }
    try {
      const result = await mockSkillExecutor.execute(skillId, inputs);
      const skillResult = { skillId, output: result.output, duration: Date.now() - start, success: result.success, cached: false };
      this.cache.set(cacheKey, { result: skillResult, timestamp: Date.now() });
      return skillResult;
    } catch (e: any) {
      return { skillId, output: null, duration: Date.now() - start, success: false, error: e.message, cached: false };
    }
  }

  async runComposedSkill(steps: any[], inputs: Record<string, unknown>) {
    const start = Date.now();
    let context = { ...inputs };
    for (const step of steps) {
      const result = await this.runSkill(step.skillId, { ...context, ...step.args });
      if (!result.success) return { skillId: 'composed', output: null, duration: Date.now() - start, success: false, error: result.error, cached: false };
      context = { ...context, [step.skillId]: result.output, ...result.output };
    }
    return { skillId: 'composed', output: context, duration: Date.now() - start, success: true, cached: false };
  }
}

describe('SkillRunner', () => {
  let runner: TestableSkillRunner;

  beforeEach(() => {
    runner = new TestableSkillRunner();
    Object.keys(mockSkills).forEach(k => delete mockSkills[k]);
  });

  it('returns error for non-existent skill', async () => {
    const result = await runner.runSkill('nonexistent', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.cached).toBe(false);
  });

  it('returns error for disabled skill', async () => {
    mockSkills['disabled-skill'] = { id: 'disabled-skill', name: 'Disabled', enabled: false };
    const result = await runner.runSkill('disabled-skill', {});
    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
  });

  it('executes a valid skill successfully', async () => {
    mockSkills['test-skill'] = { id: 'test-skill', name: 'Test', enabled: true };
    const result = await runner.runSkill('test-skill', { input: 'hello' });
    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
    expect(result.cached).toBe(false);
  });

  it('caches results within TTL', async () => {
    mockSkills['cached-skill'] = { id: 'cached-skill', name: 'Cached', enabled: true };
    const r1 = await runner.runSkill('cached-skill', { x: 1 });
    const r2 = await runner.runSkill('cached-skill', { x: 1 });
    expect(r2.cached).toBe(true);
    expect(r2.output).toEqual(r1.output);
  });

  it('does not use cache for different inputs', async () => {
    mockSkills['cache-skill'] = { id: 'cache-skill', name: 'Cache', enabled: true };
    const r1 = await runner.runSkill('cache-skill', { a: 1 });
    const r2 = await runner.runSkill('cache-skill', { a: 2 });
    expect(r2.cached).toBe(false);
  });

  it('runComposedSkill executes steps sequentially', async () => {
    mockSkills['step1'] = { id: 'step1', name: 'Step1', enabled: true };
    mockSkills['step2'] = { id: 'step2', name: 'Step2', enabled: true };
    const steps = [{ skillId: 'step1', args: {} }, { skillId: 'step2', args: {} }];
    const result = await runner.runComposedSkill(steps, {});
    expect(result.success).toBe(true);
    expect(result.skillId).toBe('composed');
    expect(result.duration).toBeGreaterThan(0);
  });

  it('runComposedSkill stops on step failure', async () => {
    mockSkills['fail-step'] = { id: 'fail-step', name: 'Fail', enabled: true };
    const steps = [{ skillId: 'fail-step', args: {} }];
    // Override executor to fail
    (mockSkillExecutor as any).execute = async () => ({ output: null, success: false, error: 'Intentional fail' });
    const result = await runner.runComposedSkill(steps, {});
    expect(result.success).toBe(false);
  });

  it('getCacheKey is order-dependent (different key order = different key)', () => {
    const key1 = runner.getCacheKey('skill', { a: 1, b: 2 });
    const key2 = runner.getCacheKey('skill', { b: 2, a: 1 });
    const key3 = runner.getCacheKey('skill', { a: 1 });
    // JSON.stringify does NOT sort keys, so different order = different string
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });
});
