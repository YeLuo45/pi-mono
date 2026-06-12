/**
 * Task Queue - Priority-based task queue with execution state management
 * 
 * Features:
 * - Priority queuing (urgent > high > normal > low)
 * - FIFO within same priority
 * - Task state transitions: pending → running → completed/failed
 * - Progress tracking per task
 */

import type { Task, TaskStep, TaskStatus, TaskPriority } from './types';

// ============================================================================
// Queue Item
// ============================================================================

interface QueueItem {
  task: Task;
  enqueuedAt: number;
  priority: TaskPriority;
}

type TaskFilter = (task: Task) => boolean;

// ============================================================================
// TaskQueue Class
// ============================================================================

export class TaskQueue {
  private queue: QueueItem[] = [];
  private runningTaskId: string | null = null;
  private maxConcurrent: number = 1;
  
  // Event callbacks
  public onTaskStart?: (task: Task) => void;
  public onTaskComplete?: (task: Task) => void;
  public onTaskFail?: (task: Task, error: string) => void;
  public onTaskProgress?: (task: Task, progress: number) => void;
  
  constructor(maxConcurrent = 1) {
    this.maxConcurrent = maxConcurrent;
  }
  
  // ============================================================================
  // Queue Management
  // ============================================================================
  
  /**
   * Add a task to the queue with priority
   */
  enqueue(task: Task, priority: TaskPriority = 'normal'): void {
    const item: QueueItem = {
      task,
      enqueuedAt: Date.now(),
      priority,
    };
    
    // Find insertion position based on priority
    const priorityOrder: Record<TaskPriority, number> = {
      urgent: 0,
      high: 1,
      normal: 2,
      low: 3,
    };
    
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const existingPriority = priorityOrder[this.queue[i].priority];
      const newPriority = priorityOrder[priority];
      
      if (newPriority < existingPriority || 
          (newPriority === existingPriority && item.enqueuedAt < this.queue[i].enqueuedAt)) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, item);
    console.log(`[TaskQueue] Enqueued task "${task.id}" with priority ${priority}. Queue size: ${this.queue.length}`);
  }
  
  /**
   * Remove a task from the queue (before execution)
   */
  dequeue(taskId: string): Task | null {
    const index = this.queue.findIndex(item => item.task.id === taskId);
    if (index !== -1) {
      const [item] = this.queue.splice(index, 1);
      console.log(`[TaskQueue] Dequeued task "${taskId}". Queue size: ${this.queue.length}`);
      return item.task;
    }
    return null;
  }
  
  /**
   * Get next task to execute (does not remove from queue)
   */
  peek(): Task | null {
    if (this.queue.length === 0) return null;
    return this.queue[0].task;
  }
  
  /**
   * Get task by ID
   */
  getTask(taskId: string): Task | null {
    // Check queue
    const queued = this.queue.find(item => item.task.id === taskId);
    if (queued) return queued.task;
    
    // Check if running
    if (this.runningTaskId === taskId && this.queue.length > 0) {
      return this.queue[0].task;
    }
    
    return null;
  }
  
  /**
   * Update a task in the queue
   */
  updateTask(taskId: string, updates: Partial<Task>): boolean {
    const item = this.queue.find(item => item.task.id === taskId);
    if (item) {
      item.task = { ...item.task, ...updates };
      return true;
    }
    return false;
  }
  
  /**
   * Remove completed/failed tasks from queue
   */
  cleanup(completedTaskId?: string): void {
    if (completedTaskId) {
      // Remove specific completed task
      const index = this.queue.findIndex(item => item.task.id === completedTaskId);
      if (index !== -1) {
        this.queue.splice(index, 1);
      }
    }
    
    // Remove all completed/failed/cancelled tasks
    this.queue = this.queue.filter(item => {
      const status = item.task.status;
      return status === 'pending' || status === 'running' || status === 'paused';
    });
    
    console.log(`[TaskQueue] Cleanup complete. Queue size: ${this.queue.length}`);
  }
  
  // ============================================================================
  // Execution Management
  // ============================================================================
  
  /**
   * Start executing the next task in queue
   */
  startNext(): Task | null {
    if (this.runningTaskId !== null) {
      console.log(`[TaskQueue] Task "${this.runningTaskId}" already running`);
      return null;
    }
    
    if (this.queue.length === 0) {
      console.log(`[TaskQueue] Queue is empty`);
      return null;
    }
    
    const item = this.queue[0];
    if (item.task.status !== 'pending' && item.task.status !== 'paused') {
      console.log(`[TaskQueue] Next task "${item.task.id}" is not executable (status: ${item.task.status})`);
      return null;
    }
    
    // Mark as running
    item.task.status = 'running';
    item.task.startedAt = Date.now();
    this.runningTaskId = item.task.id;
    
    console.log(`[TaskQueue] Starting task "${item.task.id}"`);
    this.onTaskStart?.(item.task);
    
    return item.task;
  }
  
  /**
   * Mark current running task as complete
   */
  completeCurrent(result?: unknown): Task | null {
    if (!this.runningTaskId) return null;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return null;
    
    item.task.status = 'completed';
    item.task.completedAt = Date.now();
    item.task.result = result;
    item.task.progress = 100;
    
    console.log(`[TaskQueue] Task "${item.task.id}" completed`);
    
    const completedTask = { ...item.task };
    this.runningTaskId = null;
    
    // Remove from queue
    this.queue.shift();
    
    this.onTaskComplete?.(completedTask);
    
    return completedTask;
  }
  
  /**
   * Mark current running task as failed
   */
  failCurrent(error: string): Task | null {
    if (!this.runningTaskId) return null;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return null;
    
    item.task.status = 'failed';
    item.task.completedAt = Date.now();
    item.task.error = error;
    
    console.log(`[TaskQueue] Task "${item.task.id}" failed: ${error}`);
    
    const failedTask = { ...item.task };
    this.runningTaskId = null;
    
    // Remove from queue
    this.queue.shift();
    
    this.onTaskFail?.(failedTask, error);
    
    return failedTask;
  }
  
  /**
   * Pause the current running task
   */
  pauseCurrent(): Task | null {
    if (!this.runningTaskId) return null;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return null;
    
    item.task.status = 'paused';
    console.log(`[TaskQueue] Task "${item.task.id}" paused`);
    
    const pausedTask = { ...item.task };
    this.runningTaskId = null;
    
    this.onTaskProgress?.(pausedTask, pausedTask.progress);
    
    return pausedTask;
  }
  
  /**
   * Resume a paused task
   */
  resume(taskId: string): boolean {
    const item = this.queue.find(item => item.task.id === taskId);
    if (!item || item.task.status !== 'paused') {
      return false;
    }
    
    item.task.status = 'running';
    item.task.startedAt = item.task.startedAt || Date.now();
    this.runningTaskId = taskId;
    
    console.log(`[TaskQueue] Task "${taskId}" resumed`);
    this.onTaskStart?.(item.task);
    
    return true;
  }
  
  // ============================================================================
  // Step Management
  // ============================================================================
  
  /**
   * Move to next step in current task
   */
  advanceStep(): boolean {
    if (!this.runningTaskId) return false;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return false;
    
    const { task } = item;
    const nextIndex = task.currentStepIndex + 1;
    
    if (nextIndex >= task.steps.length) {
      // All steps complete
      return true;
    }
    
    // Mark current step as complete if not already
    const currentStep = task.steps[task.currentStepIndex];
    if (currentStep && currentStep.status !== 'completed') {
      currentStep.status = 'completed';
      currentStep.completedAt = Date.now();
    }
    
    task.currentStepIndex = nextIndex;
    task.progress = Math.round((nextIndex / task.steps.length) * 100);
    
    console.log(`[TaskQueue] Task "${task.id}" advanced to step ${nextIndex}/${task.steps.length}`);
    this.onTaskProgress?.(task, task.progress);
    
    return true;
  }
  
  /**
   * Get current step for running task
   */
  getCurrentStep(): TaskStep | null {
    if (!this.runningTaskId) return null;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return null;
    
    const { task } = item;
    if (task.currentStepIndex >= task.steps.length) return null;
    
    return task.steps[task.currentStepIndex];
  }
  
  /**
   * Update step result
   */
  updateStepResult(stepId: string, result: unknown): boolean {
    if (!this.runningTaskId) return false;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return false;
    
    const step = item.task.steps.find(s => s.id === stepId);
    if (step) {
      step.result = result;
      return true;
    }
    
    return false;
  }
  
  /**
   * Mark step as failed
   */
  failStep(stepId: string, error: string): boolean {
    if (!this.runningTaskId) return false;
    
    const item = this.queue.find(item => item.task.id === this.runningTaskId);
    if (!item) return false;
    
    const step = item.task.steps.find(s => s.id === stepId);
    if (step) {
      step.status = 'failed';
      step.error = error;
      step.completedAt = Date.now();
      return true;
    }
    
    return false;
  }
  
  // ============================================================================
  // Query Methods
  // ============================================================================
  
  /**
   * Get all tasks matching a filter
   */
  filter(predicate: TaskFilter): Task[] {
    return this.queue.map(item => item.task).filter(predicate);
  }
  
  /**
   * Get all tasks in queue (including running)
   */
  getAllTasks(): Task[] {
    return this.queue.map(item => item.task);
  }
  
  /**
   * Get tasks by status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.filter(task => task.status === status);
  }
  
  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
  
  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.queue.length === 0;
  }
  
  /**
   * Check if a task is currently running
   */
  isRunning(): boolean {
    return this.runningTaskId !== null;
  }
  
  /**
   * Get current running task ID
   */
  getRunningTaskId(): string | null {
    return this.runningTaskId;
  }
  
  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    running: number;
    paused: number;
    completed: number;
    failed: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      running: 0,
      paused: 0,
      completed: 0,
      failed: 0,
    };
    
    for (const item of this.queue) {
      stats[item.task.status]++;
    }
    
    return stats;
  }
  
  /**
   * Clear the entire queue
   */
  clear(): void {
    if (this.runningTaskId) {
      console.log(`[TaskQueue] Warning: Clearing queue while task "${this.runningTaskId}" is running`);
    }
    
    this.queue = [];
    this.runningTaskId = null;
    console.log(`[TaskQueue] Queue cleared`);
  }
  
  /**
   * Change priority of a queued task
   */
  reprioritize(taskId: string, newPriority: TaskPriority): boolean {
    const item = this.queue.find(item => item.task.id === taskId);
    if (!item) return false;
    
    // Remove and re-enqueue with new priority
    const task = this.dequeue(taskId);
    if (task) {
      this.enqueue(task, newPriority);
      return true;
    }
    
    return false;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export const taskQueue = new TaskQueue();
