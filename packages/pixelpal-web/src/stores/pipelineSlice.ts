/**
 * V147: Pipeline Store — Zustand slice for pipeline state management
 *
 * Manages active pipeline, persistence to wa-sqlite, and Redux-free state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Pipeline, PipelineStage, RoleType } from '../services/orchestrator/RolePipeline';
import {
  createPipeline,
  startPipeline,
  startStage,
  completeStage,
  failStage,
  advancePipeline,
  resetPipeline,
  serializePipeline,
  deserializePipeline,
} from '../services/orchestrator/RolePipeline';

export interface PipelineSliceState {
  // All known pipelines (keyed by id)
  pipelines: Record<string, Pipeline>;

  // Active pipeline id
  activePipelineId: string | null;

  // UI state
  isRunning: boolean;
  error: string | null;
}

interface PipelineSliceActions {
  // Pipeline lifecycle
  createPipeline: (id?: string) => Pipeline;
  startPipeline: (id: string) => void;
  startStage: (id: string, stageIndex: number) => void;
  completeStage: (id: string, stageIndex: number, output: unknown) => void;
  failStage: (id: string, stageIndex: number, error: string) => void;
  advancePipeline: (id: string) => void;
  resetPipeline: (id: string) => void;
  removePipeline: (id: string) => void;

  // Active pipeline helpers
  setActivePipeline: (id: string | null) => void;
  getActivePipeline: () => Pipeline | null;
  getPipeline: (id: string) => Pipeline | null;
  getPipelinesByStatus: (status: Pipeline['status']) => Pipeline[];

  // Persistence
  loadPipeline: (json: string) => Pipeline | null;
  exportPipeline: (id: string) => string | null;

  // Errors
  clearError: () => void;
}

export type PipelineStore = PipelineSliceState & PipelineSliceActions;

export const usePipelineStore = create<PipelineStore>()(
  persist(
    (set, get) => ({
      pipelines: {},
      activePipelineId: null,
      isRunning: false,
      error: null,

      createPipeline: (id?: string) => {
        const pipeline = createPipeline(id);
        set((state) => ({
          pipelines: { ...state.pipelines, [pipeline.id]: pipeline },
          activePipelineId: pipeline.id,
          isRunning: false,
          error: null,
        }));
        return pipeline;
      },

      startPipeline: (id: string) => {
        set((state) => {
          const pipeline = state.pipelines[id];
          if (!pipeline) return state;
          const updated = startPipeline(pipeline);
          return {
            pipelines: { ...state.pipelines, [id]: updated },
            isRunning: true,
          };
        });
      },

      startStage: (id: string, stageIndex: number) => {
        set((state) => {
          const pipeline = state.pipelines[id];
          if (!pipeline) return state;
          const updated = startStage(pipeline, stageIndex);
          return { pipelines: { ...state.pipelines, [id]: updated } };
        });
      },

      completeStage: (id: string, stageIndex: number, output: unknown) => {
        set((state) => {
          const pipeline = state.pipelines[id];
          if (!pipeline) return state;
          const updated = completeStage(pipeline, stageIndex, output);
          const isTerminal = updated.status === 'completed' || updated.status === 'failed';
          return {
            pipelines: { ...state.pipelines, [id]: updated },
            ...(isTerminal ? { isRunning: false } : {}),
          };
        });
      },

      failStage: (id: string, stageIndex: number, error: string) => {
        set((state) => {
          const pipeline = state.pipelines[id];
          if (!pipeline) return state;
          const updated = failStage(pipeline, stageIndex, error);
          return {
            pipelines: { ...state.pipelines, [id]: updated },
            isRunning: false,
            error: error,
          };
        });
      },

      advancePipeline: (id: string) => {
        set((state) => {
          const pipeline = state.pipelines[id];
          if (!pipeline) return state;
          const updated = advancePipeline(pipeline);
          return { pipelines: { ...state.pipelines, [id]: updated } };
        });
      },

      resetPipeline: (id: string) => {
        set((state) => {
          const pipeline = state.pipelines[id];
          if (!pipeline) return state;
          const updated = resetPipeline(pipeline);
          return {
            pipelines: { ...state.pipelines, [id]: updated },
            isRunning: false,
            error: null,
          };
        });
      },

      removePipeline: (id: string) => {
        set((state) => {
          const { [id]: _, ...rest } = state.pipelines;
          return {
            pipelines: rest,
            activePipelineId: state.activePipelineId === id ? null : state.activePipelineId,
          };
        });
      },

      setActivePipeline: (id: string | null) => {
        set({ activePipelineId: id });
      },

      getActivePipeline: () => {
        const { activePipelineId, pipelines } = get();
        if (!activePipelineId) return null;
        return pipelines[activePipelineId] ?? null;
      },

      getPipeline: (id: string) => {
        return get().pipelines[id] ?? null;
      },

      getPipelinesByStatus: (status: Pipeline['status']) => {
        return Object.values(get().pipelines).filter((p) => p.status === status);
      },

      loadPipeline: (json: string) => {
        try {
          const pipeline = deserializePipeline(json);
          set((state) => ({
            pipelines: { ...state.pipelines, [pipeline.id]: pipeline },
            activePipelineId: pipeline.id,
          }));
          return pipeline;
        } catch {
          return null;
        }
      },

      exportPipeline: (id: string) => {
        const pipeline = get().pipelines[id];
        if (!pipeline) return null;
        return serializePipeline(pipeline);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'pixelpal-pipelines',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        pipelines: state.pipelines,
        activePipelineId: state.activePipelineId,
      }),
    }
  )
);

/**
 * Selector helpers
 */
export const selectActivePipeline = (state: PipelineStore): Pipeline | null =>
  state.activePipelineId ? state.pipelines[state.activePipelineId] ?? null : null;

export const selectPipelinesByRole = (state: PipelineStore, role: RoleType): PipelineStage[] =>
  Object.values(state.pipelines)
    .flatMap((p) => p.stages)
    .filter((s) => s.role === role);

export const selectRunningPipelines = (state: PipelineStore): Pipeline[] =>
  Object.values(state.pipelines).filter((p) => p.status === 'running');