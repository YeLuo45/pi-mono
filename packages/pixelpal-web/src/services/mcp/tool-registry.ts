/**
 * ToolRegistry - Central registry for MCP tools
 * @fileoverview V150: Tool discovery, registration, and execution
 */

/**
 * MCP Tool interface
 */
export interface McpTool {
  name: string
  description: string
  inputSchema?: Record<string, unknown>
  handler?: (args: Record<string, unknown>) => Promise<ToolResult>
  requiredRole?: 'reader' | 'operator' | 'admin'
}

/**
 * Tool result returned by handlers
 */
export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

export type { McpTool, ToolResult }

export interface ToolDescriptor {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiredRole?: 'reader' | 'operator' | 'admin'
}

export interface ToolFilter {
  type?: string
  role?: 'reader' | 'operator' | 'admin'
}

/**
 * ToolRegistry manages all MCP tools, supports discovery, registration, and execution
 */
export class ToolRegistry {
  private tools: Map<string, ToolDescriptor> = new Map()
  private handlers: Map<string, (args: Record<string, unknown>) => Promise<ToolResult>> = new Map()

  /**
   * Register a tool with the registry
   */
  register(tool: McpTool): void {
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
      requiredRole: tool.requiredRole,
    })
    if (tool.handler) {
      this.handlers.set(tool.name, tool.handler)
    }
  }

  /**
   * Unregister a tool by name
   */
  unregister(name: string): boolean {
    this.handlers.delete(name)
    return this.tools.delete(name)
  }

  /**
   * Get a tool descriptor by name
   */
  get(name: string): ToolDescriptor | undefined {
    return this.tools.get(name)
  }

  /**
   * List all registered tools
   */
  list(filter?: ToolFilter): ToolDescriptor[] {
    const tools = Array.from(this.tools.values())
    if (!filter) return tools
    return tools.filter(t => {
      if (filter.role && t.requiredRole && filter.role !== t.requiredRole) {
        return false
      }
      return true
    })
  }

  /**
   * Get tool definitions for LLM
   */
  getToolDefinitions(): { name: string; description: string; inputSchema: Record<string, unknown> }[] {
    return this.list().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }))
  }

  /**
   * Execute a tool by name with arguments
   */
  async execute(name: string, args: Record<string, unknown> = {}): Promise<ToolResult> {
    const handler = this.handlers.get(name)
    if (!handler) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: `Tool not found: ${name}` }) }],
        isError: true,
      }
    }

    try {
      return await handler(args)
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e)
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error }) }],
        isError: true,
      }
    }
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name)
  }

  /**
   * Get the count of registered tools
   */
  getCount(): number {
    return this.tools.size
  }

  /**
   * Clear all tools (for testing)
   */
  clear(): void {
    this.tools.clear()
    this.handlers.clear()
  }
}

// Singleton instance
let _instance: ToolRegistry | null = null

export function getRegistry(): ToolRegistry {
  if (!_instance) {
    _instance = new ToolRegistry()
  }
  return _instance
}

export function resetRegistry(): void {
  _instance = null
}