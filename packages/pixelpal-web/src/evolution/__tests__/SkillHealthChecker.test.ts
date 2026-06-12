/**
 * V155: SkillHealthChecker + TimeoutController + CircuitBreaker tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { skillHealthChecker } from '../SkillHealthChecker';
import { EvolutionTimeoutController } from '../EvolutionTimeoutController';
import { CircuitBreaker } from '../CircuitBreaker';

// NOTE: These tests operate on module-level state, so we need to isolate tests
// by resetting state as needed.

describe('SkillHealthChecker', () => {
  beforeEach(() => {
    // Reset all skills to clean state
    const allSkills = skillHealthChecker.getAllStatus();
    for (const skillId of allSkills.keys()) {
      skillHealthChecker.reset(skillId);
    }
  });

  it('初始状态为 healthy', () => {
    const status = skillHealthChecker.check('test-skill');
    expect(status.status).toBe('healthy');
    expect(status.consecutiveFailures).toBe(0);
  });

  it('recordSuccess 后 consecutiveFailures 重置', () => {
    skillHealthChecker.recordFailure('s1', 'err');
    skillHealthChecker.recordFailure('s1', 'err');
    skillHealthChecker.recordSuccess('s1', 100);
    const s = skillHealthChecker.check('s1');
    expect(s.consecutiveFailures).toBe(0);
    expect(s.successRate).toBeGreaterThan(0);
  });

  it('recordFailure 后 consecutiveFailures 增加', () => {
    skillHealthChecker.recordFailure('s1', 'err');
    skillHealthChecker.recordFailure('s1', 'err');
    const s = skillHealthChecker.check('s1');
    expect(s.consecutiveFailures).toBe(2);
  });

  it('consecutiveFailures >= 3 时 isDegraded', () => {
    for (let i = 0; i < 3; i++) skillHealthChecker.recordFailure('s1', 'err');
    expect(skillHealthChecker.isDegraded('s1')).toBe(true);
  });

  it('consecutiveFailures >= 5 时 isUnhealthy', () => {
    for (let i = 0; i < 5; i++) skillHealthChecker.recordFailure('s1', 'err');
    expect(skillHealthChecker.isUnhealthy('s1')).toBe(true);
  });

  it('reset 后状态恢复 healthy', () => {
    for (let i = 0; i < 5; i++) skillHealthChecker.recordFailure('s1', 'err');
    skillHealthChecker.reset('s1');
    const s = skillHealthChecker.check('s1');
    expect(s.status).toBe('healthy');
  });

  it('getUnhealthySkills 返回熔断列表', () => {
    for (let i = 0; i < 5; i++) skillHealthChecker.recordFailure('bad', 'err');
    const unhealthy = skillHealthChecker.getUnhealthySkills();
    expect(unhealthy).toContain('bad');
  });

  it('多 skill 独立计数', () => {
    skillHealthChecker.recordFailure('s1', 'err');
    skillHealthChecker.recordFailure('s2', 'err');
    expect(skillHealthChecker.check('s1').consecutiveFailures).toBe(1);
    expect(skillHealthChecker.check('s2').consecutiveFailures).toBe(1);
  });
});

describe('EvolutionTimeoutController', () => {
  it('正常任务在时限内完成', async () => {
    const ctrl = new EvolutionTimeoutController();
    const result = await ctrl.withTimeout(() => Promise.resolve('ok'), 5000);
    expect(result).toBe('ok');
  });

  it('超时时抛出 TimeoutError', async () => {
    const ctrl = new EvolutionTimeoutController();
    await expect(
      ctrl.withTimeout(() => new Promise((r) => setTimeout(r, 10000)), 100)
    ).rejects.toThrow();
  });

  it('重试次数不超过 maxRetries', async () => {
    const ctrl = new EvolutionTimeoutController();
    let attempts = 0;
    await expect(
      ctrl.withRetry(
        () => {
          attempts++;
          throw new Error('fail');
        },
        {
          maxRetries: 3,
          retryDelayMs: 10,
          patternAnalysisMs: 100,
          strategyOptimizationMs: 100,
          skillCrystallizationMs: 100,
        }
      )
    ).rejects.toThrow();
    expect(attempts).toBe(4); // initial + 3 retries
  });
});

describe('CircuitBreaker', () => {
  it('初始 state 为 closed', () => {
    const cb = new CircuitBreaker();
    expect(cb.state).toBe('closed');
  });

  it('failureThreshold 次失败后 state 变为 open', () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) cb.recordFailure();
    expect(cb.state).toBe('open');
  });

  it('recoveryTimeout 后尝试半开', () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) cb.recordFailure();
    cb.lastFailureTime = Date.now() - 70000; // 70s ago
    expect(cb.canExecute()).toBe(true);
    expect(cb.getState()).toBe('half-open');
  });

  it('半开成功3次后 state 变为 closed', () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) cb.recordFailure();
    // Move time forward to trigger recovery
    cb.lastFailureTime = Date.now() - 70000;
    cb.canExecute(); // enters half-open
    
    // Simulate 3 successful requests in half-open state
    cb.recordSuccess();
    expect(cb.getState()).toBe('half-open');
    cb.recordSuccess();
    expect(cb.getState()).toBe('half-open');
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
  });

  it('半开状态失败后重新打开', () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 5; i++) cb.recordFailure();
    cb.lastFailureTime = Date.now() - 70000;
    cb.canExecute(); // enters half-open
    
    cb.recordFailure(); // should immediately open
    expect(cb.getState()).toBe('open');
  });
});