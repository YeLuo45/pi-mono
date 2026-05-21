export interface ToolContext {
  task_id: string;
  session_id: string;
  timestamp: number;
  models: Record<string, string>;
}

export interface ToolCallLog {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  duration_ms: number;
  timestamp: number;
  success: boolean;
  error: string | null;
  task_id?: string;
}

export interface ToolResult {
  success: boolean;
  result: unknown;
  error: string | null;
  duration_ms: number;
}

export interface ToolSpec {
  name: string;
  description: string;
  category: 'agent' | 'system' | 'custom' | 'skill';
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  timeout_ms: number;
  retryable: boolean;
}
export type {}
