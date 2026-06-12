/**
 * V147: Role Pipeline State Machine
 *
 * Manages pipeline stages with states: pending → running → completed | failed
 * Supports Manager → Coder → Reviewer workflow pattern.
 */

export type RoleType = 'manager' | 'coder' | 'reviewer';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface PipelineStage {
  id: string;
  role: RoleType;
  status: StageStatus;
  input: unknown;
  output: unknown;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Pipeline {
  id: string;
  stages: PipelineStage[];
  currentStage: number;
  status: PipelineStatus;
  createdAt: number;
  updatedAt: number;
}

export interface PipelineEvent {
  pipelineId: string;
  stageId: string;
  type: 'stage_started' | 'stage_completed' | 'stage_failed' | 'pipeline_started' | 'pipeline_completed' | 'pipeline_failed';
  timestamp: number;
  data?: unknown;
}

type PipelineListener = (event: PipelineEvent) => void;

const DEFAULT_STAGES: RoleType[] = ['manager', 'coder', 'reviewer'];

/**
 * Create a new pipeline with default Manager→Coder→Reviewer stages.
 */
export function createPipeline(id?: string): Pipeline {
  const now = Date.now();
  return {
    id: id ?? crypto.randomUUID(),
    stages: DEFAULT_STAGES.map((role, index) => ({
      id: crypto.randomUUID(),
      role,
      status: 'pending' as StageStatus,
      input: undefined,
      output: undefined,
      ...(index === 0 ? { startedAt: now } : {}),
    })),
    currentStage: 0,
    status: 'pending' as PipelineStatus,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Start a pipeline (mark first stage as running).
 */
export function startPipeline(pipeline: Pipeline): Pipeline {
  if (pipeline.status !== 'pending') return pipeline;
  const stages = pipeline.stages.map((stage, i) =>
    i === 0
      ? { ...stage, status: 'running' as StageStatus, startedAt: Date.now() }
      : stage
  );
  return {
    ...pipeline,
    stages,
    status: 'running' as PipelineStatus,
    updatedAt: Date.now(),
  };
}

/**
 * Start a specific stage by index.
 */
export function startStage(pipeline: Pipeline, stageIndex: number): Pipeline {
  if (stageIndex < 0 || stageIndex >= pipeline.stages.length) return pipeline;
  const stages = pipeline.stages.map((stage, i) =>
    i === stageIndex
      ? { ...stage, status: 'running' as StageStatus, startedAt: Date.now() }
      : stage
  );
  return {
    ...pipeline,
    stages,
    currentStage: stageIndex,
    status: 'running' as PipelineStatus,
    updatedAt: Date.now(),
  };
}

/**
 * Complete a stage with output.
 */
export function completeStage(pipeline: Pipeline, stageIndex: number, output: unknown): Pipeline {
  if (stageIndex < 0 || stageIndex >= pipeline.stages.length) return pipeline;
  const stages = pipeline.stages.map((stage, i) =>
    i === stageIndex
      ? { ...stage, status: 'completed' as StageStatus, output, completedAt: Date.now() }
      : stage
  );

  // Auto-advance to next stage if not at the end
  const nextStage = stageIndex + 1;
  const isLastStage = nextStage >= pipeline.stages.length;

  return {
    ...pipeline,
    stages,
    currentStage: isLastStage ? pipeline.currentStage : nextStage,
    status: isLastStage ? 'completed' : pipeline.status,
    updatedAt: Date.now(),
  };
}

/**
 * Mark a stage as failed with an error message.
 */
export function failStage(pipeline: Pipeline, stageIndex: number, error: string): Pipeline {
  if (stageIndex < 0 || stageIndex >= pipeline.stages.length) return pipeline;
  const stages = pipeline.stages.map((stage, i) =>
    i === stageIndex
      ? { ...stage, status: 'failed' as StageStatus, error, completedAt: Date.now() }
      : stage
  );
  return {
    ...pipeline,
    stages,
    status: 'failed',
    updatedAt: Date.now(),
  };
}

/**
 * Advance pipeline to the next stage.
 */
export function advancePipeline(pipeline: Pipeline): Pipeline {
  const nextStage = pipeline.currentStage + 1;
  if (nextStage >= pipeline.stages.length) {
    return { ...pipeline, status: 'completed', updatedAt: Date.now() };
  }
  return startStage(pipeline, nextStage);
}

/**
 * Check if pipeline is in a terminal state.
 */
export function isPipelineTerminal(pipeline: Pipeline): boolean {
  return pipeline.status === 'completed' || pipeline.status === 'failed';
}

/**
 * Get the current running stage.
 */
export function getCurrentStage(pipeline: Pipeline): PipelineStage | null {
  return pipeline.stages[pipeline.currentStage] ?? null;
}

/**
 * Get stage by role.
 */
export function getStageByRole(pipeline: Pipeline, role: RoleType): PipelineStage | null {
  return pipeline.stages.find((s) => s.role === role) ?? null;
}

/**
 * Reset a pipeline back to pending state.
 */
export function resetPipeline(pipeline: Pipeline): Pipeline {
  return {
    ...pipeline,
    stages: pipeline.stages.map((stage) => ({
      ...stage,
      status: 'pending' as StageStatus,
      input: undefined,
      output: undefined,
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
    })),
    currentStage: 0,
    status: 'pending' as PipelineStatus,
    updatedAt: Date.now(),
  };
}

/**
 * Serialize pipeline to JSON string.
 */
export function serializePipeline(pipeline: Pipeline): string {
  return JSON.stringify(pipeline);
}

/**
 * Deserialize pipeline from JSON string.
 */
export function deserializePipeline(json: string): Pipeline {
  return JSON.parse(json) as Pipeline;
}

/**
 * Pipeline State Machine — event emitter mixin
 */
export class PipelineMachine {
  private pipeline: Pipeline;
  private listeners: Set<PipelineListener> = new Set();

  constructor(pipeline?: Pipeline) {
    this.pipeline = pipeline ?? createPipeline();
  }

  get state(): Pipeline {
    return this.pipeline;
  }

  start(): PipelineMachine {
    this.pipeline = startPipeline(this.pipeline);
    this.emit({ pipelineId: this.pipeline.id, stageId: this.pipeline.stages[0].id, type: 'pipeline_started', timestamp: Date.now() });
    return this;
  }

  startStage(index: number): PipelineMachine {
    const prev = this.pipeline.stages[index];
    this.pipeline = startStage(this.pipeline, index);
    if (prev.status !== 'running') {
      this.emit({ pipelineId: this.pipeline.id, stageId: this.pipeline.stages[index].id, type: 'stage_started', timestamp: Date.now() });
    }
    return this;
  }

  completeStage(index: number, output: unknown): PipelineMachine {
    this.pipeline = completeStage(this.pipeline, index, output);
    const stage = this.pipeline.stages[index];
    this.emit({ pipelineId: this.pipeline.id, stageId: stage.id, type: 'stage_completed', timestamp: Date.now(), data: output });
    if (this.pipeline.status === 'completed') {
      this.emit({ pipelineId: this.pipeline.id, stageId: stage.id, type: 'pipeline_completed', timestamp: Date.now() });
    }
    return this;
  }

  failStage(index: number, error: string): PipelineMachine {
    this.pipeline = failStage(this.pipeline, index, error);
    const stage = this.pipeline.stages[index];
    this.emit({ pipelineId: this.pipeline.id, stageId: stage.id, type: 'stage_failed', timestamp: Date.now(), data: error });
    this.emit({ pipelineId: this.pipeline.id, stageId: stage.id, type: 'pipeline_failed', timestamp: Date.now() });
    return this;
  }

  advance(): PipelineMachine {
    this.pipeline = advancePipeline(this.pipeline);
    return this;
  }

  reset(): PipelineMachine {
    this.pipeline = resetPipeline(this.pipeline);
    return this;
  }

  isTerminal(): boolean {
    return isPipelineTerminal(this.pipeline);
  }

  on(listener: PipelineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: PipelineEvent): void {
    this.listeners.forEach((l) => l(event));
  }
}