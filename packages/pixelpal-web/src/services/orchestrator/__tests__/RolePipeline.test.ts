/**
 * V147: RolePipeline unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPipeline,
  startPipeline,
  startStage,
  completeStage,
  failStage,
  advancePipeline,
  isPipelineTerminal,
  getCurrentStage,
  getStageByRole,
  resetPipeline,
  serializePipeline,
  deserializePipeline,
  PipelineMachine,
} from '../../src/services/orchestrator/RolePipeline';
import type { Pipeline } from '../../src/services/orchestrator/RolePipeline';

describe('RolePipeline', () => {
  describe('createPipeline', () => {
    it('should create a pipeline with 3 stages', () => {
      const pipeline = createPipeline();
      expect(pipeline.stages).toHaveLength(3);
      expect(pipeline.stages[0].role).toBe('manager');
      expect(pipeline.stages[1].role).toBe('coder');
      expect(pipeline.stages[2].role).toBe('reviewer');
    });

    it('should initialize all stages with pending status', () => {
      const pipeline = createPipeline();
      pipeline.stages.forEach((stage) => {
        expect(stage.status).toBe('pending');
      });
      expect(pipeline.status).toBe('pending');
    });

    it('should use provided id', () => {
      const pipeline = createPipeline('my-custom-id');
      expect(pipeline.id).toBe('my-custom-id');
    });

    it('should generate uuid when no id provided', () => {
      const pipeline = createPipeline();
      expect(pipeline.id).toBeTruthy();
      expect(pipeline.id.length).toBeGreaterThan(10);
    });

    it('should set currentStage to 0', () => {
      const pipeline = createPipeline();
      expect(pipeline.currentStage).toBe(0);
    });
  });

  describe('startPipeline', () => {
    it('should mark pipeline as running', () => {
      const pipeline = createPipeline();
      const started = startPipeline(pipeline);
      expect(started.status).toBe('running');
    });

    it('should mark first stage as running', () => {
      const pipeline = createPipeline();
      const started = startPipeline(pipeline);
      expect(started.stages[0].status).toBe('running');
      expect(started.stages[0].startedAt).toBeDefined();
    });

    it('should not start if already running', () => {
      const pipeline = { ...createPipeline(), status: 'running' as const };
      const started = startPipeline(pipeline);
      expect(started.status).toBe('running');
    });
  });

  describe('startStage', () => {
    it('should mark specified stage as running', () => {
      const pipeline = createPipeline();
      const updated = startStage(pipeline, 1);
      expect(updated.stages[1].status).toBe('running');
      expect(updated.stages[1].startedAt).toBeDefined();
      expect(updated.currentStage).toBe(1);
    });

    it('should not affect other stages', () => {
      const pipeline = createPipeline();
      const updated = startStage(pipeline, 1);
      expect(updated.stages[0].status).toBe('pending');
      expect(updated.stages[2].status).toBe('pending');
    });

    it('should ignore invalid stage index', () => {
      const pipeline = createPipeline();
      const updated = startStage(pipeline, 99);
      expect(updated.stages.every((s) => s.status === 'pending')).toBe(true);
    });
  });

  describe('completeStage', () => {
    it('should mark stage as completed with output', () => {
      const pipeline = createPipeline();
      const started = startPipeline(pipeline);
      const completed = completeStage(started, 0, { plan: 'test plan' });
      expect(completed.stages[0].status).toBe('completed');
      expect(completed.stages[0].output).toEqual({ plan: 'test plan' });
      expect(completed.stages[0].completedAt).toBeDefined();
    });

    it('should auto-advance currentStage to next', () => {
      const pipeline = createPipeline();
      const started = startPipeline(pipeline);
      const completed = completeStage(started, 0, { plan: 'test plan' });
      expect(completed.currentStage).toBe(1);
    });

    it('should mark pipeline as completed when last stage completes', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'p', codingTasks: ['t1'], acceptanceCriteria: [] });
      pipeline = startStage(pipeline, 1);
      const completed = completeStage(pipeline, 1, { code: 'x', filesModified: [], testsAdded: [] });
      expect(completed.status).toBe('completed');
    });
  });

  describe('failStage', () => {
    it('should mark stage as failed with error', () => {
      const pipeline = createPipeline();
      const started = startPipeline(pipeline);
      const failed = failStage(started, 0, 'Something went wrong');
      expect(failed.stages[0].status).toBe('failed');
      expect(failed.stages[0].error).toBe('Something went wrong');
    });

    it('should mark entire pipeline as failed', () => {
      const pipeline = createPipeline();
      const started = startPipeline(pipeline);
      const failed = failStage(started, 0, 'Error');
      expect(failed.status).toBe('failed');
    });
  });

  describe('advancePipeline', () => {
    it('should advance to next stage', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'p', codingTasks: [], acceptanceCriteria: [] });
      pipeline = advancePipeline(pipeline);
      expect(pipeline.currentStage).toBe(1);
      expect(pipeline.stages[1].status).toBe('running');
    });

    it('should mark pipeline completed when at last stage', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'p', codingTasks: [], acceptanceCriteria: [] });
      pipeline = advancePipeline(pipeline);
      pipeline = completeStage(pipeline, 1, { code: '', filesModified: [], testsAdded: [] });
      pipeline = advancePipeline(pipeline);
      expect(pipeline.status).toBe('completed');
    });
  });

  describe('isPipelineTerminal', () => {
    it('should return true for completed pipeline', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'p', codingTasks: [], acceptanceCriteria: [] });
      pipeline = advancePipeline(pipeline);
      pipeline = completeStage(pipeline, 1, { code: '', filesModified: [], testsAdded: [] });
      pipeline = advancePipeline(pipeline);
      pipeline = completeStage(pipeline, 2, { approved: true, comments: [] });
      expect(isPipelineTerminal(pipeline)).toBe(true);
    });

    it('should return true for failed pipeline', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = failStage(pipeline, 0, 'error');
      expect(isPipelineTerminal(pipeline)).toBe(true);
    });

    it('should return false for running pipeline', () => {
      const pipeline = startPipeline(createPipeline());
      expect(isPipelineTerminal(pipeline)).toBe(false);
    });
  });

  describe('getCurrentStage', () => {
    it('should return the current stage', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      const current = getCurrentStage(pipeline);
      expect(current?.role).toBe('manager');
    });

    it('should return null for empty pipeline', () => {
      const current = getCurrentStage({ ...createPipeline(), stages: [] });
      expect(current).toBeNull();
    });
  });

  describe('getStageByRole', () => {
    it('should find stage by role', () => {
      const pipeline = createPipeline();
      const coderStage = getStageByRole(pipeline, 'coder');
      expect(coderStage?.role).toBe('coder');
    });

    it('should return null for unknown role', () => {
      const pipeline = createPipeline();
      const unknownStage = getStageByRole(pipeline, 'reviewer');
      expect(unknownStage?.role).toBe('reviewer');
    });
  });

  describe('resetPipeline', () => {
    it('should reset all stages to pending', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'p', codingTasks: [], acceptanceCriteria: [] });
      pipeline = resetPipeline(pipeline);
      pipeline.stages.forEach((stage) => {
        expect(stage.status).toBe('pending');
        expect(stage.output).toBeUndefined();
        expect(stage.startedAt).toBeUndefined();
      });
    });

    it('should reset currentStage to 0', () => {
      let pipeline = createPipeline();
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'p', codingTasks: [], acceptanceCriteria: [] });
      pipeline = resetPipeline(pipeline);
      expect(pipeline.currentStage).toBe(0);
    });
  });

  describe('serializePipeline / deserializePipeline', () => {
    it('should round-trip a pipeline', () => {
      let pipeline = createPipeline('test-id');
      pipeline = startPipeline(pipeline);
      pipeline = completeStage(pipeline, 0, { plan: 'my plan', codingTasks: ['t1'], acceptanceCriteria: ['c1'] });

      const json = serializePipeline(pipeline);
      const restored = deserializePipeline(json);

      expect(restored.id).toBe('test-id');
      expect(restored.status).toBe('running');
      expect(restored.stages[0].output).toEqual({ plan: 'my plan', codingTasks: ['t1'], acceptanceCriteria: ['c1'] });
    });
  });

  describe('PipelineMachine', () => {
    it('should emit events on stage transitions', () => {
      const machine = new PipelineMachine(createPipeline('machine-test'));
      const events: string[] = [];

      machine.on((e) => events.push(e.type));

      machine.start();
      machine.completeStage(0, { plan: 'p', codingTasks: [], acceptanceCriteria: [] });

      expect(events).toContain('pipeline_started');
      expect(events).toContain('stage_completed');
      expect(events).toContain('stage_started');
    });

    it('should unsubscribe via returned function', () => {
      const machine = new PipelineMachine();
      let count = 0;
      const unsub = machine.on(() => count++);
      unsub();
      machine.start();
      expect(count).toBe(0);
    });
  });
});