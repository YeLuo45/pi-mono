/**
 * ToolAgent - Tool registration and execution agent
 * 
 * Responsibilities:
 * - Register and manage available tools
 * - Execute tools with proper context and error handling
 * - Handle tool timeouts and retries
 * - Track tool usage metrics
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, AgentToolDefinition, AgentExecutionContext, Task } from './types';

interface ToolExecutionRecord {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration: number;
  timestamp: number;
}

export class ToolAgent extends BaseAgent {
  private tools: Map<string, AgentToolDefinition> = new Map();
  private executionLog: ToolExecutionRecord[] = [];
  private readonly MAX_LOG_SIZE = 1000;

  constructor(config: AgentConfig) {
    super(config);
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'ToolAgent initializing');
    this.registerBuiltinTools();
    this.log('info', `ToolAgent initialized with ${this.tools.size} tools`);
  }

  protected async onStart(): Promise<void> {
    this.log('info', 'ToolAgent started');
  }

  protected async onPause(): Promise<void> {
    this.log('info', 'ToolAgent paused');
  }

  protected async onResume(): Promise<void> {
    this.log('info', 'ToolAgent resumed');
  }

  protected async onStop(): Promise<void> {
    this.log('info', 'ToolAgent stopped');
  }

  protected async executeTask(task: Task): Promise<void> {
    this.log('info', `ToolAgent executing task: ${task.goal}`);
  }

  // --------------------------------------------------------------------------
  // Tool Management
  // --------------------------------------------------------------------------

  /**
   * Register a new tool
   */
  registerTool(tool: AgentToolDefinition): void {
    if (this.tools.has(tool.name)) {
      this.log('warn', `Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    this.log('info', `Registered tool: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const existed = this.tools.has(name);
    if (existed) {
      this.tools.delete(name);
      this.log('info', `Unregistered tool: ${name}`);
    }
    return existed;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): AgentToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tool names
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  // --------------------------------------------------------------------------
  // Tool Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a tool by name with arguments
   */
  async executeTool(name: string, args: Record<string, unknown>, context?: Partial<AgentExecutionContext>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    this.assertRunning();
    const startTime = Date.now();

    this.log('info', `Executing tool: ${name}`, { args });

    try {
      const fullContext: AgentExecutionContext = {
        agentId: this.config.id,
        taskId: context?.taskId ?? '',
        stepId: context?.stepId ?? '',
        personaId: context?.personaId,
        messages: context?.messages ?? [],
        memory: context?.memory,
      };

      let result: unknown;
      
      if (tool.timeout && tool.timeout > 0) {
        result = await this.executeWithTimeout(tool.execute, args, fullContext, tool.timeout);
      } else {
        result = await tool.execute(args, fullContext);
      }

      const duration = Date.now() - startTime;
      this.logExecution(name, args, result, undefined, duration);
      this.recordTaskComplete(duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Tool execution failed: ${name}`, { error: errorMsg, duration });
      this.logExecution(name, args, undefined, errorMsg, duration);
      this.recordTaskFail(duration);
      throw error;
    }
  }

  private async executeWithTimeout(
    fn: (args: Record<string, unknown>, context: AgentExecutionContext) => Promise<unknown>,
    args: Record<string, unknown>,
    context: AgentExecutionContext,
    timeoutMs: number
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn(args, context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private logExecution(
    toolName: string,
    args: Record<string, unknown>,
    result: unknown | undefined,
    error: string | undefined,
    duration: number
  ): void {
    const record: ToolExecutionRecord = {
      toolName,
      args,
      result,
      error,
      duration,
      timestamp: Date.now(),
    };

    this.executionLog.push(record);
    if (this.executionLog.length > this.MAX_LOG_SIZE) {
      this.executionLog.shift();
    }
  }

  // --------------------------------------------------------------------------
  // Built-in Tools
  // --------------------------------------------------------------------------

  private registerBuiltinTools(): void {
    // Reason tool - simple response
    this.registerTool({
      name: 'reason',
      description: 'Process a prompt and return a reasoned response',
      parameters: { prompt: { type: 'string', description: 'The prompt to reason about' } },
      execute: async (args) => {
        return { reasoning: `Processed: ${args.prompt}`, timestamp: Date.now() };
      },
    });

    // Memory search tool
    this.registerTool({
      name: 'memory_search',
      description: 'Search long-term memory for relevant information',
      parameters: { query: { type: 'string', description: 'Search query' } },
      execute: async (args) => {
        return { results: [], query: args.query, timestamp: Date.now() };
      },
    });

    // Web search tool
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: { query: { type: 'string', description: 'Search query' } },
      execute: async (args) => {
        return { results: [], query: args.query, timestamp: Date.now() };
      },
    });

    // Generic tool executor
    this.registerTool({
      name: 'tool_execute',
      description: 'Execute a generic task',
      parameters: { task: { type: 'string', description: 'Task description' } },
      execute: async (args) => {
        return { executed: args.task, timestamp: Date.now() };
      },
    });

    this.log('debug', `Registered ${this.tools.size} built-in tools`);
  }

  // --------------------------------------------------------------------------
  // Execution Log & Stats
  // --------------------------------------------------------------------------

  getExecutionLog(limit = 100): ToolExecutionRecord[] {
    return this.executionLog.slice(-limit);
  }

  getToolStats(): { totalExecutions: number; successCount: number; failureCount: number; averageDuration: number } {
    const total = this.executionLog.length;
    const failures = this.executionLog.filter((r) => r.error).length;
    const totalDuration = this.executionLog.reduce((sum, r) => sum + r.duration, 0);
    return {
      totalExecutions: total,
      successCount: total - failures,
      failureCount: failures,
      averageDuration: total > 0 ? totalDuration / total : 0,
    };
  }
}