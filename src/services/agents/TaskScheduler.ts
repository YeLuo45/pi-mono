// V83 TaskScheduler Service
// 任务调度（并行/串行/依赖）

import type { Task, ScheduleMode } from '../../types/agent';
import { eventBus } from './EventBus';

interface ScheduledTask extends Task {
  execute: () => Promise<void>;
  resolve?: (value: void) => void;
  reject?: (error: Error) => void;
}

type TaskExecuteFn = () => Promise<void>;

class TaskSchedulerService {
  private pendingTasks: Map<string, ScheduledTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private completedTasks: Map<string, boolean> = new Map();
  private taskQueue: ScheduledTask[] = [];
  private maxConcurrent = 3;
  private isProcessing = false;

  /**
   * Schedule a task for execution
   */
  schedule(task: Task, executeFn: TaskExecuteFn): Promise<void> {
    return new Promise((resolve, reject) => {
      const scheduledTask: ScheduledTask = {
        ...task,
        execute: async () => {
          try {
            await executeFn();
            this.completedTasks.set(task.id, true);
            eventBus.emit('task:completed', { taskId: task.id });
            resolve();
          } catch (error) {
            eventBus.emit('task:failed', { taskId: task.id, payload: error });
            reject(error as Error);
          } finally {
            this.runningTasks.delete(task.id);
            this.pendingTasks.delete(task.id);
            this.processNext();
          }
        },
      };

      this.pendingTasks.set(task.id, scheduledTask);
      eventBus.emit('task:created', { taskId: task.id, payload: task });
      
      this.taskQueue.push(scheduledTask);
      this.processNext();
    });
  }

  /**
   * Execute tasks in parallel mode
   */
  async parallel(tasks: Array<{ task: Task; execute: TaskExecuteFn }>): Promise<void[]> {
    const promises = tasks.map(({ task, execute }) => this.schedule(task, execute));
    return Promise.all(promises);
  }

  /**
   * Execute tasks in sequential mode
   */
  async sequential(tasks: Array<{ task: Task; execute: TaskExecuteFn }>): Promise<void> {
    for (const { task, execute } of tasks) {
      await this.schedule(task, execute);
    }
  }

  /**
   * Execute tasks with dependency resolution
   */
  async dependency(tasks: Array<{ task: Task; execute: TaskExecuteFn }>): Promise<void> {
    const taskMap = new Map(tasks.map(({ task }) => [task.id, task]));
    const taskFns = new Map(tasks.map(({ task, execute }) => [task.id, execute]));
    const completedDeps = new Set<string>();

    const executeWithDeps = async (task: Task): Promise<void> => {
      // Wait for dependencies
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (!completedDeps.has(depId)) {
            // Wait for dependency to complete
            await new Promise<void>((resolve) => {
              const checkComplete = () => {
                if (completedDeps.has(depId)) {
                  eventBus.off('task:completed', checkComplete);
                  resolve();
                }
              };
              eventBus.on('task:completed', checkComplete);
              // Timeout after 30 seconds
              setTimeout(resolve, 30000);
            });
          }
        }
      }

      // Execute the task
      await this.schedule(task, taskFns.get(task.id)!);
      completedDeps.add(task.id);
    };

    // Process tasks in order
    for (const { task } of tasks) {
      await executeWithDeps(task);
    }
  }

  /**
   * Process the next task in the queue
   */
  private processNext(): void {
    if (this.isProcessing) return;
    if (this.runningTasks.size >= this.maxConcurrent) return;

    const nextTask = this.taskQueue.find(
      t => !this.runningTasks.has(t.id) && !this.completedTasks.has(t.id)
    );

    if (nextTask) {
      this.isProcessing = true;
      this.runningTasks.add(nextTask.id);
      eventBus.emit('task:status_changed', { 
        taskId: nextTask.id, 
        payload: { status: 'in_progress', assignedAgent: nextTask.assignedAgent } 
      });
      
      nextTask.execute()
        .finally(() => {
          this.isProcessing = false;
          this.processNext();
        });
    }
  }

  /**
   * Get pending tasks
   */
  getPending(): Task[] {
    return Array.from(this.pendingTasks.values());
  }

  /**
   * Get running tasks
   */
  getRunning(): Task[] {
    return Array.from(this.pendingTasks.values()).filter(t => this.runningTasks.has(t.id));
  }

  /**
   * Get completed task IDs
   */
  getCompleted(): string[] {
    return Array.from(this.completedTasks.entries())
      .filter(([, success]) => success)
      .map(([id]) => id);
  }

  /**
   * Cancel a task
   */
  cancel(taskId: string): boolean {
    const task = this.pendingTasks.get(taskId);
    if (task && !this.runningTasks.has(taskId)) {
      this.pendingTasks.delete(taskId);
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);
      return true;
    }
    return false;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.pendingTasks.clear();
    this.runningTasks.clear();
    this.completedTasks.clear();
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * Set max concurrent tasks
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, Math.min(max, 10));
  }
}

// Singleton export
export const taskScheduler = new TaskSchedulerService();

export default taskScheduler;
