/**
 * MCP Client Types - V164
 */

export type AgentConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface McpTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readable?: boolean;
    destructive?: boolean;
    idempotent?: boolean;
  };
}

export interface ToolCallResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface McpClientConfig {
  endpoint: string;
  apiKey?: string;
  timeout?: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  status: AgentConnectionStatus;
  toolCount: number;
  lastConnected?: string;
}