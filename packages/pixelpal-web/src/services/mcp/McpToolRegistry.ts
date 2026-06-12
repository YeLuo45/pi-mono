/**
 * MCP Tool Registry - V128
 * Central registry for all MCP tools (skills, roles, memory, persona)
 * Extended in V145 for JSON-RPC 2.0 format support
 */

// Tool type definitions
export type ToolType = 'skill' | 'role' | 'memory' | 'persona';

export interface Tool {
  name: string;
  type: ToolType;
  description: string;
  inputSchema?: Record<string, unknown>;
  handler?: (...args: unknown[]) => Promise<unknown>;
}

export interface ToolFilter {
  type?: ToolType;
}

// V145: JSON-RPC 2.0 tool representation
export interface JsonRpcTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Internal registry storage
const _tools: Map<string, Tool> = new Map();

/**
 * Register a tool with the registry
 */
export function registerTool(tool: Tool): void {
  _tools.set(tool.name, tool);
}

/**
 * Unregister a tool by name
 */
export function unregisterTool(name: string): boolean {
  return _tools.delete(name);
}

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return _tools.get(name);
}

/**
 * List all registered tools, optionally filtered by type
 */
export function listTools(filter?: ToolFilter): Tool[] {
  const tools = Array.from(_tools.values());
  if (!filter?.type) return tools;
  return tools.filter((t) => t.type === filter.type);
}

/**
 * V145: List tools in JSON-RPC 2.0 format
 * Returns tools in the format expected by MCP clients
 */
export function listToolsJsonRpc(filter?: ToolFilter): JsonRpcTool[] {
  const tools = listTools(filter);
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema || {
      type: 'object',
      properties: {},
    },
  }));
}

/**
 * V145: Call a tool by name with JSON-RPC params
 */
export async function callTool(name: string, params?: Record<string, unknown>): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`Tool not found: ${name}`);
  }
  if (!tool.handler) {
    throw new Error(`Tool has no handler: ${name}`);
  }
  return tool.handler(params || {});
}

/**
 * Get the count of registered tools
 */
export function getToolCount(): number {
  return _tools.size;
}

/**
 * Clear all tools (mainly for testing)
 */
export function clearTools(): void {
  _tools.clear();
}
