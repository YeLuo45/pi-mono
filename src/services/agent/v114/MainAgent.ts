/**
 * MainAgent - Primary orchestration agent
 * 
 * Responsibilities:
 * - Receive and decompose user goals into sub-tasks
 * - Delegate to sub-agents (MemoryAgent, SearchAgent, ToolAgent, PersonaAgent)
 * - Coordinate multi-agent collaboration
 * - Maintain overall task context and progress
 * - Report results back to user
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, Task, AgentMessage } from './types';
import { AgentRegistry } from './AgentRegistry';

export class MainAgent extends BaseAgent {
  private subAgentIds: string[] = [];
  private activeTasks: Map<string, Task> = new Map();
  private messageHistory: AgentMessage[] = [];

  constructor(config: AgentConfig) {
    super(config);
  }

  protected async onInitialize(): Promise<void> {
    // Main agent doesn't need heavy initialization
    this.log('info', 'MainAgent initialized');
  }

  protected async onStart(): Promise<void> {
    this.log('info', 'MainAgent started');
  }

  protected async onPause(): Promise<void> {
    this.log('info', 'MainAgent paused');
  }

  protected async onResume(): Promise<void> {
    this.log('info', 'MainAgent resumed');
  }

  protected async onStop(): Promise<void> {
    this.log('info', 'MainAgent stopping, cancelling active tasks');
    for (const [taskId, task] of this.activeTasks) {
      if (task.status === 'running') {
        task.status = 'cancelled';
        this.activeTasks.delete(taskId);
      }
    }
  }

  /**
   * Main entry point: process a user goal and decompose into sub-tasks
   */
  async processGoal(goal: string, context?: Record<string, unknown>): Promise<void> {
    this.assertRunning();
    this.recordTaskStart();

    this.log('info', `Processing goal: ${goal}`, context);
    this.onTaskStart?.(goal);

    try {
      // Step 1: Decompose goal into steps
      const steps = this.decomposeGoal(goal);
      
      // Step 2: Create task
      const task: Task = {
        id: crypto.randomUUID(),
        goal,
        status: 'running',
        priority: 'normal',
        steps,
        currentStepIndex: 0,
        context: context ?? {},
        createdAt: Date.now(),
        progress: 0,
      };
      this.activeTasks.set(task.id, task);

      // Step 3: Execute each step
      for (let i = 0; i < steps.length; i++) {
        task.currentStepIndex = i;
        task.progress = Math.round(((i) / steps.length) * 100);

        const step = steps[i];
        this.log('info', `Executing step ${i + 1}/${steps.length}: ${step.description}`);

        await this.executeStep(step);

        task.progress = Math.round(((i + 1) / steps.length) * 100);
      }

      task.status = 'completed';
      task.progress = 100;
      this.recordTaskComplete(Date.now() - task.createdAt);
      this.onTaskComplete?.(task.id, { goal, stepsExecuted: steps.length });

      this.log('info', `Goal completed: ${goal}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Goal failed: ${goal}`, { error: errorMsg });
      this.recordTaskFail(Date.now() - (this.activeTasks.get(goal)?.createdAt ?? Date.now()));
      this.onTaskFail?.(goal, errorMsg);
      throw error;
    }
  }

  /**
   * Decompose a high-level goal into executable steps
   * Subclasses or configuration can provide custom decomposition logic
   */
  protected decomposeGoal(goal: string): Omit<Task['steps'][0], 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[] {
    // Simple keyword-based decomposition
    // In production this would call an LLM for smarter decomposition
    const steps: Array<{ description: string; toolName?: string; toolArgs?: Record<string, unknown> }> = [];

    const lowerGoal = goal.toLowerCase();

    // Check if we need memory
    if (lowerGoal.includes('remember') || lowerGoal.includes('recall') || lowerGoal.includes('what') || lowerGoal.includes('previous')) {
      steps.push({
        description: 'Query memory for relevant information',
        toolName: 'memory_search',
        toolArgs: { query: goal },
      });
    }

    // Check if we need search
    if (lowerGoal.includes('search') || lowerGoal.includes('find') || lowerGoal.includes('look up') || lowerGoal.includes('google')) {
      steps.push({
        description: 'Search the web for information',
        toolName: 'web_search',
        toolArgs: { query: goal },
      });
    }

    // Check if we need a tool
    if (lowerGoal.includes('send') || lowerGoal.includes('create') || lowerGoal.includes('calculate') || lowerGoal.includes('generate')) {
      steps.push({
        description: 'Execute appropriate tool',
        toolName: 'tool_execute',
        toolArgs: { task: goal },
      });
    }

    // If no specific steps identified, treat as general reasoning
    if (steps.length === 0) {
      steps.push({
        description: 'Process and respond to user request',
        toolName: 'reason',
        toolArgs: { prompt: goal },
      });
    }

    return steps.map((s, idx) => ({
      ...s,
      index: idx,
    }));
  }

  protected async executeStep(step: { description: string; toolName?: string; toolArgs?: Record<string, unknown> }): Promise<void> {
    if (!step.toolName) return;

    this.log('info', `Executing step: ${step.description}`, { tool: step.toolName, args: step.toolArgs });

    // Find the appropriate sub-agent for this tool
    const registry = AgentRegistry.getInstance();
    const toolAgent = registry.getAgentByType('tool');
    
    if (!toolAgent) {
      this.log('warn', `ToolAgent not found, skipping tool execution`);
      return;
    }

    const result = await (toolAgent as import('./types').unknown as { executeTool(name: string, args: Record<string, unknown>): Promise<unknown> }).executeTool(step.toolName, step.toolArgs ?? {});
    this.log('info', `Step tool result:`, result);
  }

  /**
   * Register sub-agents that this MainAgent can delegate to
   */
  registerSubAgent(agentId: string): void {
    if (!this.subAgentIds.includes(agentId)) {
      this.subAgentIds.push(agentId);
      this.log('info', `Registered sub-agent: ${agentId}`);
    }
  }

  unregisterSubAgent(agentId: string): void {
    this.subAgentIds = this.subAgentIds.filter(id => id !== agentId);
    this.log('info', `Unregistered sub-agent: ${agentId}`);
  }

  getSubAgents(): string[] {
    return [...this.subAgentIds];
  }

  getActiveTasks(): Task[] {
    return Array.from(this.activeTasks.values());
  }

  private assertRunning(): void {
    if (!this.isRunning()) {
      throw new Error(`Agent ${this.config.id} is not running (status: ${this.status})`);
    }
  }
}