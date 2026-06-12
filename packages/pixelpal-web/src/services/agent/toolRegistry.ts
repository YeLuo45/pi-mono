/**
 * Tool Registry - Central registry for all agent tools
 * 
 * Tools are registered by name and can be executed by the task planner.
 * Each tool has a defined interface and execution handler.
 */

import type { ToolDefinition, ToolExecutor, ToolResult, ToolExecutionContext } from './types';

// ============================================================================
// Registry
// ============================================================================

class ToolRegistryClass {
  private tools: Map<string, ToolDefinition> = new Map();
  private defaultTimeout: number = 30000; // 30 seconds default
  
  // ============================================================================
  // Registration
  // ============================================================================
  
  /**
   * Register a new tool
   */
  register(definition: ToolDefinition): void {
    if (this.tools.has(definition.name)) {
      console.warn(`[ToolRegistry] Tool "${definition.name}" already registered, overwriting`);
    }
    
    this.tools.set(definition.name, {
      ...definition,
      retryable: definition.retryable ?? true,
      timeout: definition.timeout ?? this.defaultTimeout,
    });
    
    console.log(`[ToolRegistry] Registered tool: ${definition.name}`);
  }
  
  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const deleted = this.tools.delete(name);
    if (deleted) {
      console.log(`[ToolRegistry] Unregistered tool: ${name}`);
    }
    return deleted;
  }
  
  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * Get a tool definition
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Get all registered tool names
   */
  list(): string[] {
    return Array.from(this.tools.keys());
  }
  
  /**
   * Get all tool definitions
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
  
  // ============================================================================
  // Execution
  // ============================================================================
  
  /**
   * Execute a tool by name
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool "${name}" not found`,
      };
    }
    
    console.log(`[ToolRegistry] Executing tool: ${name}`, { args, context: { taskId: context.taskId, stepId: context.stepId } });
    
    const startTime = Date.now();
    
    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(
        tool.execute,
        args,
        context,
        tool.timeout || this.defaultTimeout
      );
      
      const duration = Date.now() - startTime;
      console.log(`[ToolRegistry] Tool "${name}" completed in ${duration}ms`);
      
      return {
        success: true,
        data: result.data,
        metadata: {
          duration,
          toolName: name,
          ...result.metadata,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      console.error(`[ToolRegistry] Tool "${name}" failed after ${duration}ms:`, errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          duration,
          toolName: name,
        },
      };
    }
  }
  
  /**
   * Execute tool with timeout
   */
  private async executeWithTimeout(
    executor: ToolExecutor,
    args: Record<string, unknown>,
    context: ToolExecutionContext,
    timeoutMs: number
  ): Promise<ToolResult> {
    return Promise.race([
      executor(args, context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Tool execution timed out after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);
  }
  
  // ============================================================================
  // Configuration
  // ============================================================================
  
  /**
   * Set default timeout for all tools
   */
  setDefaultTimeout(timeoutMs: number): void {
    this.defaultTimeout = timeoutMs;
    console.log(`[ToolRegistry] Default timeout set to ${timeoutMs}ms`);
  }
  
  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
    console.log(`[ToolRegistry] Cleared all tools`);
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const toolRegistry = new ToolRegistryClass();
