/**
 * V147: RoleOrchestrator unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RoleOrchestrator,
  SimpleProgressTracker,
} from '../../src/services/orchestrator/RoleOrchestrator';
import type {
  ManagerInput,
  ManagerOutput,
  CoderInput,
  CoderOutput,
  ReviewerInput,
  ReviewerOutput,
} from '../../src/services/orchestrator/RoleOrchestrator';
import type { Pipeline } from '../../src/services/orchestrator/RolePipeline';

describe('RoleOrchestrator', () => {
  describe('constructor', () => {
    it('should create orchestrator with a pending pipeline', () => {
      const orch = new RoleOrchestrator({
        executors: {
          manager: vi.fn(),
          coder: vi.fn(),
          reviewer: vi.fn(),
        },
      });
      expect(orch.pipeline.status).toBe('pending');
      expect(orch.pipeline.stages).toHaveLength(3);
    });

    it('should throw if executors are missing', () => {
      expect(() =>
        new RoleOrchestrator({
          // @ts-expect-error — intentionally incomplete
          executors: { manager: vi.fn() },
        })
      ).toThrow();
    });
  });

  describe('start', () => {
    it('should run manager stage first', async () => {
      const managerExecutor = vi.fn().mockResolvedValue({
        plan: 'Build a feature',
        codingTasks: ['implement feature'],
        acceptanceCriteria: ['feature works'],
      } as ManagerOutput);

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: vi.fn(),
          reviewer: vi.fn(),
        },
      });

      await orch.start({ task: 'Build something' });

      expect(managerExecutor).toHaveBeenCalled();
      expect(orch.pipeline.stages[0].status).toBe('completed');
    });

    it('should not start if already started', async () => {
      const managerExecutor = vi.fn().mockResolvedValue({
        plan: 'p',
        codingTasks: [],
        acceptanceCriteria: [],
      } as ManagerOutput);

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: vi.fn(),
          reviewer: vi.fn(),
        },
      });

      await orch.start({ task: 'Build something' });
      await expect(orch.start({ task: 'Build again' })).rejects.toThrow();
    });

    it('should auto-advance to coder stage', async () => {
      const managerExecutor = vi.fn().mockResolvedValue({
        plan: 'Build feature',
        codingTasks: ['write code'],
        acceptanceCriteria: ['it compiles'],
      } as ManagerOutput);

      const coderExecutor = vi.fn().mockResolvedValue({
        code: 'console.log("hi")',
        filesModified: ['index.ts'],
        testsAdded: [],
      } as CoderOutput);

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: coderExecutor,
          reviewer: vi.fn(),
        },
      });

      await orch.start({ task: 'Build feature' });

      expect(coderExecutor).toHaveBeenCalled();
      expect(orch.pipeline.stages[1].status).toBe('completed');
    });
  });

  describe('advance', () => {
    it('should advance to next stage without auto-advance', async () => {
      const managerExecutor = vi.fn().mockResolvedValue({
        plan: 'Build feature',
        codingTasks: ['write code'],
        acceptanceCriteria: ['it compiles'],
      } as ManagerOutput);

      const coderExecutor = vi.fn().mockResolvedValue({
        code: 'console.log("hi")',
        filesModified: ['index.ts'],
        testsAdded: [],
      } as CoderOutput);

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: coderExecutor,
          reviewer: vi.fn(),
        },
        autoAdvance: false,
      });

      await orch.start({ task: 'Build feature' });
      expect(orch.pipeline.currentStage).toBe(0);

      // Manually advance
      await orch.advance({
        tasks: ['write code'],
        plan: 'Build feature',
      } as CoderInput);

      expect(orch.pipeline.stages[1].status).toBe('running');
      expect(orch.pipeline.currentStage).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should mark stage as failed when executor throws', async () => {
      const managerExecutor = vi.fn().mockRejectedValue(new Error('LLM unavailable'));

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: vi.fn(),
          reviewer: vi.fn(),
        },
      });

      await orch.start({ task: 'Build feature' });

      expect(orch.pipeline.stages[0].status).toBe('failed');
      expect(orch.pipeline.stages[0].error).toBe('LLM unavailable');
      expect(orch.pipeline.status).toBe('failed');
    });

    it('should continue to next stage when auto-advance is true but executor throws', async () => {
      const managerExecutor = vi.fn().mockResolvedValue({
        plan: 'p',
        codingTasks: ['t1'],
        acceptanceCriteria: [],
      } as ManagerOutput);

      const coderExecutor = vi.fn().mockRejectedValue(new Error('compiler error'));

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: coderExecutor,
          reviewer: vi.fn(),
        },
        autoAdvance: true,
      });

      await orch.start({ task: 'Build feature' });

      // manager completes → auto-advance → coder runs and fails
      expect(orch.pipeline.stages[1].status).toBe('failed');
      expect(orch.pipeline.status).toBe('failed');
    });
  });

  describe('reset', () => {
    it('should reset pipeline to pending', async () => {
      const managerExecutor = vi.fn().mockResolvedValue({
        plan: 'p',
        codingTasks: [],
        acceptanceCriteria: [],
      } as ManagerOutput);

      const orch = new RoleOrchestrator({
        executors: {
          manager: managerExecutor,
          coder: vi.fn(),
          reviewer: vi.fn(),
        },
      });

      await orch.start({ task: 'Build something' });
      expect(orch.pipeline.status).toBe('running');

      orch.reset();
      expect(orch.pipeline.status).toBe('pending');
      expect(orch.pipeline.stages.every((s) => s.status === 'pending')).toBe(true);
    });
  });

  describe('getStageByRole', () => {
    it('should retrieve stage by role', () => {
      const orch = new RoleOrchestrator({
        executors: {
          manager: vi.fn(),
          coder: vi.fn(),
          reviewer: vi.fn(),
        },
      });

      const coderStage = orch.getStageByRole('coder');
      expect(coderStage?.role).toBe('coder');
    });
  });

  describe('SimpleProgressTracker', () => {
    it('should track events', () => {
      const tracker = new SimpleProgressTracker();
      const { pipeline, stages } = createMockPipeline();

      tracker.track(pipeline, stages[0], 'started');
      tracker.track(pipeline, stages[0], 'completed');

      const events = tracker.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0].status).toBe('running');
      expect(events[1].status).toBe('completed');
    });

    it('should get last output by role', () => {
      const tracker = new SimpleProgressTracker();
      const { pipeline, stages } = createMockPipeline();

      tracker.track(pipeline, stages[0], 'completed');

      const lastOutput = tracker.getLastOutput('manager');
      expect(lastOutput).toEqual({ plan: 'Build X', codingTasks: [], acceptanceCriteria: [] });
    });
  });
});

function createMockPipeline() {
  const stages = [
    {
      id: 's1',
      role: 'manager' as const,
      status: 'completed' as const,
      input: undefined,
      output: { plan: 'Build X', codingTasks: [], acceptanceCriteria: [] },
    },
    { id: 's2', role: 'coder' as const, status: 'pending' as const, input: undefined, output: undefined },
    { id: 's3', role: 'reviewer' as const, status: 'pending' as const, input: undefined, output: undefined },
  ];
  const pipeline = {
    id: 'test-pipeline',
    stages,
    currentStage: 1,
    status: 'running' as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  return { pipeline, stages };
}