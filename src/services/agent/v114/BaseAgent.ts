/**
 * BaseAgent - Abstract base class for all agent types
 * 
 * Provides:
 * - Agent lifecycle (init, start, pause, stop, destroy)
 * - Status management with state machine transitions
 * - Task execution context management
 * - Logging integration
 * - Event emission for status changes
 */

import type { AgentConfig, AgentStatus, AgentMetrics, AgentLogEntry, LogLevel } from './types';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected status: AgentStatus = 'idle';
  protected metrics: AgentMetrics = {
    tasksCompleted: 0,
    tasksFailed: 0,
    totalExecutionTime: 0,
    lastActiveAt: null,
    averageResponseTime: 0,
  };

  // Event handlers
  public onStatusChange?: (status: AgentStatus, prevStatus: AgentStatus) => void;
  public onLog?: (entry: AgentLogEntry) => void;
  public onTaskStart?: (taskId: string) => void;
  public onTaskComplete?: (taskId: string, result: unknown) => void;
  public onTaskFail?: (taskId: string, error: string) => void;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Lifecycle Methods
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    this.assertNotDestroyed();
    if (this.status !== 'idle') {
      this.log('warn', `initialize() called but status is ${this.status}, ignoring`);
      return;
    }
    this.setStatus('initializing');
    await this.onInitialize();
    this.setStatus('idle');
    this.log('info', `Agent ${this.config.id} initialized`);
  }

  async start(): Promise<void> {
    this.assertNotDestroyed();
    if (this.status !== 'idle' && this.status !== 'stopped') {
      throw new Error(`Cannot start agent from status ${this.status}`);
    }
    this.setStatus('running');
    this.metrics.lastActiveAt = Date.now();
    this.log('info', `Agent ${this.config.id} started`);
    await this.onStart();
  }

  async pause(): Promise<void> {
    this.assertNotDestroyed();
    if (this.status !== 'running') {
      throw new Error(`Cannot pause agent from status ${this.status}`);
    }
    this.setStatus('paused');
    this.log('info', `Agent ${this.config.id} paused`);
    await this.onPause();
  }

  async resume(): Promise<void> {
    this.assertNotDestroyed();
    if (this.status !== 'paused') {
      throw new Error(`Cannot resume agent from status ${this.status}`);
    }
    this.setStatus('running');
    this.metrics.lastActiveAt = Date.now();
    this.log('info', `Agent ${this.config.id} resumed`);
    await this.onResume();
  }

  async stop(): Promise<void> {
    this.assertNotDestroyed();
    if (this.status === 'stopping' || this.status === 'stopped') {
      return;
    }
    this.setStatus('stopping');
    this.log('info', `Agent ${this.config.id} stopping`);
    await this.onStop();
    this.setStatus('stopped');
    this.log('info', `Agent ${this.config.id} stopped`);
  }

  /** Override in subclass for cleanup */
  protected async onDestroy(): Promise<void> {}

  // --------------------------------------------------------------------------
  // Abstract Methods (to be implemented by subclasses)
  // --------------------------------------------------------------------------

  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onPause(): Promise<void>;
  protected abstract onResume(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract executeTask(task: import('./types').Task): Promise<void>;

  // --------------------------------------------------------------------------
  // Status & Metrics
  // --------------------------------------------------------------------------

  getStatus(): AgentStatus {
    return this.status;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  isRunning(): boolean {
    return this.status === 'running';
  }

  isIdle(): boolean {
    return this.status === 'idle' || this.status === 'stopped';
  }

  protected setStatus(newStatus: AgentStatus): void {
    if (this.status === newStatus) return;
    const prev = this.status;
    this.status = newStatus;
    this.onStatusChange?.(newStatus, prev);
  }

  // --------------------------------------------------------------------------
  // Task Execution Helpers
  // --------------------------------------------------------------------------

  protected recordTaskStart(): void {
    this.metrics.lastActiveAt = Date.now();
  }

  protected recordTaskComplete(executionTime: number): void {
    this.metrics.tasksCompleted++;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageResponseTime = 
      this.metrics.totalExecutionTime / this.metrics.tasksCompleted;
  }

  protected recordTaskFail(executionTime: number): void {
    this.metrics.tasksFailed++;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageResponseTime = 
      this.metrics.totalExecutionTime / (this.metrics.tasksCompleted + this.metrics.tasksFailed);
  }

  // --------------------------------------------------------------------------
  // Logging
  // --------------------------------------------------------------------------

  protected log(level: LogLevel, message: string, data?: unknown, taskId?: string, stepId?: string): void {
    const entry: AgentLogEntry = {
      id: crypto.randomUUID(),
      agentId: this.config.id,
      timestamp: Date.now(),
      level,
      message,
      taskId,
      stepId,
      data,
    };
    this.onLog?.(entry);
    
    // Also emit to console with agent prefix
    const prefix = `[${this.config.type}:${this.config.id}]`;
    switch (level) {
      case 'debug': console.debug(prefix, message, data ?? ''); break;
      case 'info': console.info(prefix, message, data ?? ''); break;
      case 'warn': console.warn(prefix, message, data ?? ''); break;
      case 'error': console.error(prefix, message, data ?? ''); break;
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private assertNotDestroyed(): void {
    if (this.status === 'stopped') {
      throw new Error(`Agent ${this.config.id} is destroyed and cannot perform operations`);
    }
  }

  get id(): string {
    return this.config.id;
  }

  get type(): import('./types').AgentType {
    return this.config.type;
  }
}