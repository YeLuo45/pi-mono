/**
 * V149: Hook System Types
 * 
 * Core types for priority-ordered hook registry and dispatcher.
 */

/**
 * Context passed to hook handlers when triggered.
 */
export interface HookContext {
  /** Name of the hook being triggered */
  hookName: string;
  /** Timestamp when trigger was called */
  timestamp: number;
  /** Optional data payload passed to handlers */
  data?: unknown;
  /** Source identifier (e.g., plugin ID, component name) */
  source?: string;
}

/**
 * Hook function signature - handlers receive context and may return void or Promise<void>
 */
export type HookFn = (context: HookContext) => void | Promise<void>;

/**
 * Hook definition with metadata for registry management.
 */
export interface HookDefinition {
  /** Unique identifier for this hook registration */
  id: string;
  /** Human-readable name for the hook */
  name: string;
  /** Execution priority - higher numbers execute first (default: 0) */
  priority: number;
  /** The actual hook function to execute */
  fn: HookFn;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Whether this hook is currently enabled */
  enabled: boolean;
}

/**
 * Event data for hook lifecycle events
 */
export interface HookLifecycleEvent {
  hookId: string;
  hookName: string;
  action: 'registered' | 'unregistered' | 'triggered' | 'error';
  timestamp: number;
  error?: Error;
}

/**
 * Filter options for listing hooks
 */
export interface HookFilter {
  /** Filter by hook name */
  name?: string;
  /** Filter by enabled status */
  enabled?: boolean;
  /** Filter by source/plugin */
  source?: string;
}