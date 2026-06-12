/**
 * V147: Role Orchestrator — Manager→Coder→Reviewer Pipeline Dispatcher
 *
 * Orchestrates the three-role pipeline:
 * - Manager: breaks down task, assigns coding sub-tasks
 * - Coder: implements code based on manager's plan
 * - Reviewer: reviews and approves/rejects coder output
 *
 * Each role is invoked as an async function. The orchestrator manages
 * stage transitions, error handling, and output passing between stages.
 */

import type { Pipeline, PipelineStage, RoleType, StageStatus } from './RolePipeline';
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
  PipelineMachine,
} from './RolePipeline';

/**
 * Input for the Manager role.
 */
export interface ManagerInput {
  task: string;
  context?: Record<string, unknown>;
}

/**
 * Output from the Manager role — assigns coding sub-tasks to Coder.
 */
export interface ManagerOutput {
  plan: string;
  codingTasks: string[];
  acceptanceCriteria: string[];
}

/**
 * Input for the Coder role.
 */
export interface CoderInput {
  tasks: string[];
  plan: string;
  context?: Record<string, unknown>;
}

/**
 * Output from the Coder role.
 */
export interface CoderOutput {
  code: string;
  filesModified: string[];
  testsAdded: string[];
}

/**
 * Input for the Reviewer role.
 */
export interface ReviewerInput {
  code: string;
  plan: string;
  acceptanceCriteria: string[];
  filesModified: string[];
}

/**
 * Output from the Reviewer role.
 */
export interface ReviewerOutput {
  approved: boolean;
  comments: string[];
  requiredChanges?: string[];
}

export type RoleInput = ManagerInput | CoderInput | ReviewerInput;
export type RoleOutput = ManagerOutput | CoderOutput | ReviewerOutput;

/**
 * Signature for a role executor function.
 */
export type RoleExecutor<In extends RoleInput, Out extends RoleOutput> = (
  input: In,
  stage: PipelineStage
) => Promise<Out>;

/**
 * Role executor map — each role maps to its executor function.
 */
export interface RoleExecutors {
  manager: RoleExecutor<ManagerInput, ManagerOutput>;
  coder: RoleExecutor<CoderInput, CoderOutput>;
  reviewer: RoleExecutor<ReviewerInput, ReviewerOutput>;
}

/**
 * Progress callback for stage lifecycle events.
 */
export type ProgressCallback = (
  pipeline: Pipeline,
  stage: PipelineStage,
  event: 'started' | 'completed' | 'failed'
) => void | Promise<void>;

/**
 * Options for the RoleOrchestrator.
 */
export interface RoleOrchestratorOptions {
  executors: RoleExecutors;
  onProgress?: ProgressCallback;
  autoAdvance?: boolean;
}

const ROLE_ORDER: RoleType[] = ['manager', 'coder', 'reviewer'];

/**
 * RoleOrchestrator — manages the full Manager→Coder→Reviewer pipeline lifecycle.
 */
export class RoleOrchestrator {
  private machine: PipelineMachine;
  private executors: RoleExecutors;
  private onProgress?: ProgressCallback;
  private autoAdvance: boolean;

  constructor(options: RoleOrchestratorOptions) {
    this.executors = options.executors;
    this.onProgress = options.onProgress;
    this.autoAdvance = options.autoAdvance ?? true;
    this.machine = new PipelineMachine(createPipeline());
  }

  /**
   * Current pipeline state.
   */
  get pipeline(): Pipeline {
    return this.machine.state;
  }

  /**
   * Start the pipeline (mark as running, begin Manager stage).
   */
  async start(initialInput: ManagerInput): Promise<Pipeline> {
    if (this.machine.state.status !== 'pending') {
      throw new Error('Pipeline already started');
    }
    this.machine.start();
    return this.runCurrentStage(initialInput);
  }

  /**
   * Resume a persisted pipeline and continue execution.
   */
  async resume(pipeline: Pipeline, resumeInput: RoleInput): Promise<Pipeline> {
    this.machine = new PipelineMachine(pipeline);
    if (pipeline.status === 'pending') {
      return this.start(resumeInput as ManagerInput);
    }
    if (pipeline.status === 'completed' || pipeline.status === 'failed') {
      return pipeline;
    }
    return this.runCurrentStage(resumeInput);
  }

  /**
   * Advance to next stage manually (when autoAdvance is false).
   */
  async advance(nextInput: RoleInput): Promise<Pipeline> {
    this.machine.advance();
    return this.runCurrentStage(nextInput);
  }

  /**
   * Get current stage.
   */
  getCurrentStage(): PipelineStage | null {
    return getCurrentStage(this.machine.state);
  }

  /**
   * Get stage by role.
   */
  getStageByRole(role: RoleType): PipelineStage | null {
    return getStageByRole(this.machine.state, role);
  }

  /**
   * Check if pipeline has reached a terminal state.
   */
  isTerminal(): boolean {
    return this.machine.isTerminal();
  }

  /**
   * Reset pipeline to initial state.
   */
  reset(): void {
    this.machine.reset();
  }

  /**
   * Run the current stage using the appropriate executor.
   */
  private async runCurrentStage(input: RoleInput): Promise<Pipeline> {
    const state = this.machine.state;
    if (isPipelineTerminal(state)) return state;

    const stageIndex = state.currentStage;
    const stage = state.stages[stageIndex];
    if (!stage) return state;

    const executor = this.executors[stage.role];
    if (!executor) {
      this.machine.failStage(stageIndex, `No executor found for role: ${stage.role}`);
      return this.machine.state;
    }

    try {
      this.machine.startStage(stageIndex);
      await this.notifyProgress('started', stage);

      const output = await executor(input as any, stage);
      this.machine.completeStage(stageIndex, output);
      await this.notifyProgress('completed', this.machine.state.stages[stageIndex]);

      if (this.autoAdvance && !this.machine.isTerminal()) {
        const nextInput = this.buildNextInput(output);
        this.machine.advance();
        return this.runCurrentStage(nextInput);
      }

      return this.machine.state;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.machine.failStage(stageIndex, errorMessage);
      await this.notifyProgress('failed', this.machine.state.stages[stageIndex]);
      return this.machine.state;
    }
  }

  /**
   * Build input for next stage based on current stage output.
   */
  private buildNextInput(currentOutput: RoleOutput): RoleInput {
    const state = this.machine.state;
    const nextStageIndex = state.currentStage + 1;
    if (nextStageIndex >= state.stages.length) {
      return {} as RoleInput;
    }

    const nextRole = state.stages[nextStageIndex].role;

    if (nextRole === 'coder' && 'codingTasks' in currentOutput) {
      return {
        tasks: (currentOutput as ManagerOutput).codingTasks,
        plan: (currentOutput as ManagerOutput).plan,
      } as CoderInput;
    }

    if (nextRole === 'reviewer' && 'code' in currentOutput) {
      const co = currentOutput as CoderOutput;
      const mo = this.getManagerOutput();
      return {
        code: co.code,
        plan: mo?.plan ?? '',
        acceptanceCriteria: mo?.acceptanceCriteria ?? [],
        filesModified: co.filesModified,
      } as ReviewerInput;
    }

    return {} as RoleInput;
  }

  private getManagerOutput(): ManagerOutput | null {
    const managerStage = getStageByRole(this.machine.state, 'manager');
    if (!managerStage || managerStage.status !== 'completed') return null;
    return managerStage.output as ManagerOutput;
  }

  private async notifyProgress(
    event: 'started' | 'completed' | 'failed',
    stage: PipelineStage
  ): Promise<void> {
    if (this.onProgress) {
      await this.onProgress(this.machine.state, stage, event);
    }
  }

  /**
   * Subscribe to pipeline events.
   */
  onStageEvent(
    callback: (event: 'stage_started' | 'stage_completed' | 'stage_failed' | 'pipeline_started' | 'pipeline_completed' | 'pipeline_failed', stage: PipelineStage, pipeline: Pipeline) => void
  ): () => void {
    return this.machine.on((e) => {
      const stage = this.machine.state.stages.find((s) => s.id === e.stageId);
      if (stage) callback(e.type as any, stage, this.machine.state);
    });
  }
}

/**
 * Simple progress tracker that accumulates stage outputs.
 */
export class SimpleProgressTracker {
  private events: Array<{
    role: RoleType;
    status: StageStatus;
    output?: unknown;
    error?: string;
    timestamp: number;
  }> = [];

  track(
    pipeline: Pipeline,
    stage: PipelineStage,
    event: 'started' | 'completed' | 'failed'
  ): void {
    this.events.push({
      role: stage.role,
      status: event === 'started' ? 'running' : event === 'completed' ? 'completed' : 'failed',
      output: event === 'completed' ? stage.output : undefined,
      error: event === 'failed' ? stage.error : undefined,
      timestamp: Date.now(),
    });
  }

  getEvents() {
    return [...this.events];
  }

  getLastOutput(role: RoleType): RoleOutput | undefined {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      if (e.role === role && e.output) return e.output as RoleOutput;
    }
    return undefined;
  }
}