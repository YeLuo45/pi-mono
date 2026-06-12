/**
 * usePlanExecution hook — manages plan lifecycle with agentExecutor + planStore
 *
 * Responsibilities:
 * 1. Bridge planStore (Plan) ↔ agentExecutor (Task) execution model
 * 2. Wire up executor callbacks to update planStore step statuses
 * 3. Expose executePlan / startExecution / abortExecution to callers
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePlanStore } from '../stores/planStore';
import { agentExecutor } from '../services/agent/agentExecutor';
import type { TaskStep } from '../services/agent/types';

// Re-export planStore types for convenience
export type { Plan, PlanStep } from '../stores/planStore';

// Map a PlanStep from planStore to a TaskStep for agentExecutor
function planStepToTaskStep(planStep: ReturnType<typeof import('../stores/planStore').usePlanStore.getState>['currentPlan'] extends infer P ? P extends { steps: infer S } ? S extends Array<infer T> ? T : never : never : never, index: number): TaskStep {
  // We need to import properly — use the PlanStep type directly
  return {
    id: (planStep as { id: string }).id,
    taskId: '',
    index,
    description: (planStep as { description: string }).description,
    toolName: (planStep as { toolName: string }).toolName,
    toolArgs: (planStep as { arguments: Record<string, unknown> }).arguments,
    status: 'pending',
    retryCount: 0,
  };
}

interface UsePlanExecutionOptions {
  /** Called when a single step finishes */
  onStepComplete?: (index: number, step: unknown, result: string) => void;
  /** Called when the entire plan finishes */
  onPlanComplete?: (plan: unknown) => void;
  /** Called when the plan fails */
  onPlanFailed?: (plan: unknown, error: string) => void;
}

export function usePlanExecution(options: UsePlanExecutionOptions = {}) {
  const {
    onStepComplete,
    onPlanComplete,
    onPlanFailed,
  } = options;

  const currentPlan = usePlanStore((s) => s.currentPlan);
  const planStatus = usePlanStore((s) => s.planStatus);
  const isExecuting = usePlanStore((s) => s.isExecuting);
  const currentStepIndex = usePlanStore((s) => s.currentStepIndex);
  const setCurrentPlan = usePlanStore((s) => s.setCurrentPlan);
  const setPlanStatus = usePlanStore((s) => s.setPlanStatus);
  const updateStepStatus = usePlanStore((s) => s.updateStepStatus);
  const setCurrentStepIndex = usePlanStore((s) => s.setCurrentStepIndex);
  const clearPlan = usePlanStore((s) => s.clearPlan);

  // Track running taskId so we can cancel it
  const runningTaskIdRef = useRef<string | null>(null);

  // Wire agentExecutor callbacks to planStore updates
  useEffect(() => {
    // Cast to any for now since types are complex
    agentExecutor.onStepComplete = (task: any, step: any, result: string) => {
      // Find matching step index in current plan
      const plan = usePlanStore.getState().currentPlan;
      if (!plan) return;
      const idx = plan.steps.findIndex((s) => s.id === step.id);
      if (idx !== -1) {
        updateStepStatus(idx, 'completed', result);
        onStepComplete?.(idx, step, result);
      }
    };

    agentExecutor.onTaskComplete = (task: any, summary: string) => {
      const plan = usePlanStore.getState().currentPlan;
      if (plan) {
        setPlanStatus('completed');
        onPlanComplete?.(plan);
      }
      runningTaskIdRef.current = null;
    };

    agentExecutor.onTaskFail = (task: any, error: string) => {
      const plan = usePlanStore.getState().currentPlan;
      if (plan) {
        setPlanStatus('failed');
        onPlanFailed?.(plan, error);
      }
      runningTaskIdRef.current = null;
    };

    agentExecutor.onTaskProgress = (task: any, progress: number) => {
      // Progress is 0-100; update current step index based on progress
      const plan = usePlanStore.getState().currentPlan;
      if (!plan) return;
      const stepIndex = Math.floor((progress / 100) * plan.steps.length);
      setCurrentStepIndex(Math.min(stepIndex, plan.steps.length - 1));
    };

    return () => {
      agentExecutor.onStepComplete = undefined;
      agentExecutor.onTaskComplete = undefined;
      agentExecutor.onTaskFail = undefined;
      agentExecutor.onTaskProgress = undefined;
    };
  }, [updateStepStatus, setPlanStatus, setCurrentStepIndex, onStepComplete, onPlanComplete, onPlanFailed]);

  /**
   * Begin execution of the current plan.
   * Converts plan steps to task steps and delegates to agentExecutor.
   */
  const startExecution = useCallback(async (): Promise<void> => {
    const plan = usePlanStore.getState().currentPlan;
    if (!plan) return;

    if (runningTaskIdRef.current) {
      console.warn('[usePlanExecution] Plan already running');
      return;
    }

    setPlanStatus('executing');
    setCurrentStepIndex(0);

    // Build a pseudo-task for agentExecutor
    // We create a temporary task object that mirrors what agentExecutor expects
    const taskId = plan.id;
    const taskSteps: TaskStep[] = plan.steps.map((step, i) => ({
      id: step.id,
      taskId,
      index: i,
      description: step.description,
      toolName: step.toolName,
      toolArgs: step.arguments,
      status: 'pending',
      retryCount: 0,
    }));

    // Override the running task id to trick agentExecutor into running our plan
    runningTaskIdRef.current = taskId;

    try {
      // agentExecutor.executeTask looks up the task in taskQueue.
      // Instead, we'll drive execution directly here for the plan.
      // We simulate the loop agentExecutor would do.
      for (let i = 0; i < taskSteps.length; i++) {
        const step = taskSteps[i];
        step.status = 'running';
        step.startedAt = Date.now();
        setCurrentStepIndex(i);
        updateStepStatus(i, 'running');

        try {
          // Execute via plugin or LLM reasoning (mirrors agentExecutor.executeStep)
          let result: string;

          if (step.toolName) {
            const { pluginRegistry } = await import('../services/plugins/pluginRegistry');
            const pluginResult = await pluginRegistry.tryExecute(step.toolName, step.toolArgs || {});
            result = pluginResult || '插件执行完成';
          } else {
            const { chatCompletionWithTools } = await import('../services/ai/model-registry-adapter');
            const messages = [
              { role: 'user' as const, content: `执行步骤: ${step.description}\n请执行并返回结果简述。` },
            ];
            const response = await chatCompletionWithTools(messages, []);
            result = typeof response === 'string' ? response : JSON.stringify(response);
          }

          step.result = result;
          step.status = 'completed';
          step.completedAt = Date.now();
          updateStepStatus(i, 'completed', result);
          onStepComplete?.(i, step, result);
        } catch (err) {
          step.status = 'failed';
          step.error = err instanceof Error ? err.message : String(err);
          updateStepStatus(i, 'failed', step.error);
          setPlanStatus('failed');
          onPlanFailed?.(plan, step.error);
          runningTaskIdRef.current = null;
          return;
        }
      }

      // All steps completed
      setPlanStatus('completed');
      onPlanComplete?.(plan);
    } finally {
      runningTaskIdRef.current = null;
    }
  }, [setPlanStatus, setCurrentStepIndex, updateStepStatus, onStepComplete, onPlanComplete, onPlanFailed]);

  /**
   * Execute a plan (alias for startExecution, for API compatibility)
   */
  const executePlan = useCallback(async (): Promise<void> => {
    await startExecution();
  }, [startExecution]);

  /**
   * Abort/cancel the currently running plan execution.
   */
  const abortExecution = useCallback(() => {
    if (runningTaskIdRef.current) {
      agentExecutor.cancelTask(runningTaskIdRef.current);
      runningTaskIdRef.current = null;
    }
    setPlanStatus('idle');
    // Reset all step statuses to pending
    const plan = usePlanStore.getState().currentPlan;
    if (plan) {
      plan.steps.forEach((step, i) => {
        updateStepStatus(i, 'pending');
      });
    }
    setCurrentStepIndex(0);
  }, [setPlanStatus, updateStepStatus, setCurrentStepIndex]);

  return {
    // Current plan state
    currentPlan,
    planStatus,
    isExecuting,
    currentStepIndex,

    // Actions
    executePlan,
    startExecution,
    abortExecution,

    // Helpers
    clearPlan,
  };
}
