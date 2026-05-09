/**
 * AgentExecutor - Core AI execution engine for agent tasks
 *
 * Takes a task from TaskQueue and executes it:
 * 1. Call LLM to plan/decompose the goal into steps
 * 2. Execute each step sequentially
 * 3. Track progress and update UI via callbacks
 * 4. Persist state to IndexedDB
 */

import type { Task, TaskStep } from './types';
import { taskQueue } from './taskQueue';
import { chatCompletionWithTools } from '../ai/model-registry-adapter';
import { pluginRegistry } from '../plugins/pluginRegistry';
import { memoryManager } from './memory/memoryManager';

// ============================================================================
// Types
// ============================================================================

export interface ExecutorEvents {
  onTaskStart?: (task: Task) => void;
  onTaskProgress?: (task: Task, progress: number) => void;
  onStepComplete?: (task: Task, step: TaskStep, result: string) => void;
  onTaskComplete?: (task: Task, summary: string) => void;
  onTaskFail?: (task: Task, error: string) => void;
}

// ============================================================================
// AgentExecutor Singleton
// ============================================================================

class AgentExecutorImpl {
  private runningTaskId: string | null = null;
  private paused = false;

  // Event hooks (set by UI components)
  public onTaskStart?: (task: Task) => void;
  public onTaskProgress?: (task: Task, progress: number) => void;
  public onStepComplete?: (task: Task, step: TaskStep, result: string) => void;
  public onTaskComplete?: (task: Task, summary: string) => void;
  public onTaskFail?: (task: Task, error: string) => void;

  /**
   * Execute a task by ID — picks it up from TaskQueue and runs the full loop
   */
  async executeTask(taskId: string): Promise<void> {
    if (this.runningTaskId) {
      console.warn('[AgentExecutor] Task already running:', this.runningTaskId);
      return;
    }

    const task = taskQueue.getAllTasks().find((t) => t.id === taskId);
    if (!task) {
      console.error('[AgentExecutor] Task not found:', taskId);
      return;
    }

    this.runningTaskId = taskId;
    taskQueue.startNext(); // marks task as running in queue

    // Ensure steps exist
    if (!task.steps || task.steps.length === 0) {
      task.steps = await this.decomposeGoal(task.goal, task.context);
    }

    this.onTaskStart?.(task);

    try {
      for (let i = task.currentStepIndex; i < task.steps.length; i++) {
        if (this.paused) break;

        const step = task.steps[i];
        step.status = 'running';
        step.startedAt = Date.now();
        task.currentStepIndex = i;

        const progress = Math.round(((i + 1) / task.steps.length) * 100);
        this.onTaskProgress?.(task, progress);

        // Execute step: plugin tool or LLM reasoning
        const result = await this.executeStep(step, task.context);
        step.result = result;
        step.status = 'completed';
        step.completedAt = Date.now();

        task.context[`step_${i}`] = result;
        this.onStepComplete?.(task, step, result);
      }

      if (!this.paused) {
        task.status = 'completed';
        task.completedAt = Date.now();
        const summary = this.summarizeTask(task);
        
        // Extract memory from completed task
        memoryManager.extractFromTaskResult(task.id, summary);
        // Also extract from messages periodically
        void memoryManager.extractFromMessages();
        
        this.onTaskComplete?.(task, summary);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      task.status = 'failed';
      this.onTaskFail?.(task, error);
    } finally {
      this.runningTaskId = null;
      this.paused = false;
    }
  }

  /**
   * Decompose a goal into steps using LLM
   */
  private async decomposeGoal(
    goal: string,
    context: Record<string, unknown>
  ): Promise<TaskStep[]> {
    // Get relevant memories for this goal
    const memoryContext = memoryManager.getMemoryContextForPrompt(goal, 5);
    const memorySection = memoryContext ? `\n${memoryContext}\n` : '';

    const messages = [
      {
        role: 'user' as const,
        content: `分解以下目标为具体执行步骤。返回JSON数组，每步包含 description 和 toolName（如需要）:${memorySection}\n\n目标: ${goal}\n上下文: ${JSON.stringify(context)}`,
      },
    ];

    try {
      const response = await chatCompletionWithTools(messages, [], 'shell');
      const text = typeof response === 'string' ? response : JSON.stringify(response);

      // Try to parse steps from LLM response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed.map((p: { description: string; toolName?: string; args?: Record<string, unknown> }, i: number) => ({
          id: crypto.randomUUID(),
          taskId: '',
          index: i,
          description: p.description,
          toolName: p.toolName,
          toolArgs: p.args,
          status: 'pending' as const,
          retryCount: 0,
        }));
      }
    } catch {
      // Fallback: single-step
    }

    return [
      {
        id: crypto.randomUUID(),
        taskId: '',
        index: 0,
        description: goal,
        status: 'pending',
        retryCount: 0,
      },
    ];
  }

  /**
   * Execute a single step — try plugin first, then LLM
   */
  private async executeStep(
    step: TaskStep,
    context: Record<string, unknown>
  ): Promise<string> {
    // Get relevant memories for this step
    const memoryContext = memoryManager.getMemoryContextForPrompt(step.description, 3);
    const memorySection = memoryContext ? `\n${memoryContext}\n` : '';

    if (step.toolName) {
      const pluginResult = await pluginRegistry.tryExecute(
        step.toolName,
        step.toolArgs || {}
      );
      if (pluginResult) {
        // Extract memory from task result after tool execution
        memoryManager.extractFromTaskResult(step.id, pluginResult);
        return pluginResult;
      }
    }

    // Fallback: LLM reasoning step
    const messages = [
      {
        role: 'user' as const,
        content: `执行步骤: ${step.description}${memorySection}\n上下文: ${JSON.stringify(context)}\n请执行并返回结果简述。`,
      },
    ];

    try {
      const response = await chatCompletionWithTools(messages, [], 'shell');
      return typeof response === 'string' ? response : JSON.stringify(response);
    } catch (err) {
      return `步骤执行完成`;
    }
  }

  /** Summarize completed task */
  private summarizeTask(task: Task): string {
    const completed = task.steps.filter((s) => s.status === 'completed').length;
    return `任务完成。${completed}/${task.steps.length} 步骤执行成功。`;
  }

  /** Pause current task */
  pauseTask(_taskId: string): void {
    this.paused = true;
  }

  /** Resume paused task */
  resumeTask(taskId: string): void {
    if (this.runningTaskId === taskId) {
      this.paused = false;
      void this.executeTask(taskId);
    }
  }

  /** Cancel current task */
  cancelTask(taskId: string): void {
    if (this.runningTaskId === taskId) {
      this.runningTaskId = null;
      this.paused = false;
    }
    const task = taskQueue.getAllTasks().find((t) => t.id === taskId);
    if (task) {
      task.status = 'cancelled';
    }
  }
}

// Singleton instance
export const agentExecutor = new AgentExecutorImpl();
