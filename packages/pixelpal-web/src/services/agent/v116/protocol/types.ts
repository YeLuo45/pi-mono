import type { AgentId, AgentMessageType } from '../v114/types';

/**
 * V116 Agent Communication Protocol - Message Types
 * Standardized message format for all agent-to-agent communication
 */

// ============================================================================
// Core Protocol Types
// ============================================================================

export interface AgentProtocolMessage {
  id: string;
  type: AgentMessageTypeV116;
  from: AgentId;
  to: AgentId | 'broadcast';
  taskId: string;
  payload: unknown;
  timestamp: number;
  deadline?: number;       // Unix timestamp when this message expires
  retryCount: number;
  correlationId?: string;  // Links request to response
  headers?: Record<string, string>;
  status?: MessageStatus;
  errorReason?: string;
}

export type AgentMessageTypeV116 =
  | 'dispatch'    // MainAgent → SubAgent: new task
  | 'result'      // SubAgent → MainAgent: task result
  | 'error'       // SubAgent → MainAgent: task error
  | 'status'      // Any Agent: status change notification
  | 'heartbeat'   // Any Agent: alive check
  | 'ack'         // Any Agent: acknowledgment
  | 'retry'       // SubAgent → MainAgent: request retry
  | 'timeout'     // System: message timeout
  | 'cancel';     // MainAgent → SubAgent: cancel task

export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter' | 'cancelled';

export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
  maxRetries: number;         // Default: 3
  baseDelay: number;           // Initial delay in ms: 1000
  maxDelay: number;            // Max delay in ms: 30000
  backoffMultiplier: number;   // Exponential backoff: 2
  retryableErrors?: string[];  // Error types that should retry
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
};

// ============================================================================
// Message Queue Entry (SQLite)
// ============================================================================

export interface QueueEntry {
  id: string;
  message: AgentProtocolMessage;
  status: MessageStatus;
  priority: MessagePriority;
  createdAt: number;
  updatedAt: number;
  processAfter?: number;  // Don't process before this time
  attempts: number;
  lastError?: string;
  deadLetterReason?: string;
}

// ============================================================================
// Heartbeat & Health
// ============================================================================

export interface AgentHealthStatus {
  agentId: AgentId;
  status: 'healthy' | 'degraded' | 'unreachable';
  lastHeartbeat: number;
  consecutiveFailures: number;
  messageSuccessRate: number;  // 0-1
}

export interface HeartbeatMessage {
  agentId: AgentId;
  timestamp: number;
  load: number;       // 0-1, agent's current load
  capabilities: string[];
}

// ============================================================================
// Protocol Events (for EventBus)
// ============================================================================

export type ProtocolEventType =
  | 'protocol:message_sent'
  | 'protocol:message_received'
  | 'protocol:message_acknowledged'
  | 'protocol:message_timeout'
  | 'protocol:message_retried'
  | 'protocol:message_dead_lettered'
  | 'protocol:agent_heartbeat'
  | 'protocol:agent_unreachable'
  | 'protocol:queue_overflow';

export interface ProtocolEvent {
  type: ProtocolEventType;
  message?: AgentProtocolMessage;
  agentId?: AgentId;
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function createMessage(
  type: AgentMessageTypeV116,
  from: AgentId,
  to: AgentId | 'broadcast',
  taskId: string,
  payload: unknown,
  options?: Partial<AgentProtocolMessage>
): AgentProtocolMessage {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    type,
    from,
    to,
    taskId,
    payload,
    timestamp: now,
    retryCount: 0,
    deadline: options?.deadline ?? now + 30000, // Default 30s timeout
    ...options,
  };
}

export function createDispatch(
  from: AgentId,
  to: AgentId,
  taskId: string,
  payload: unknown,
  correlationId?: string
): AgentProtocolMessage {
  return createMessage('dispatch', from, to, taskId, payload, { correlationId });
}

export function createResult(
  from: AgentId,
  to: AgentId,
  taskId: string,
  payload: unknown,
  correlationId: string
): AgentProtocolMessage {
  return createMessage('result', from, to, taskId, payload, { correlationId });
}

export function createError(
  from: AgentId,
  to: AgentId,
  taskId: string,
  error: string,
  correlationId: string
): AgentProtocolMessage {
  return createMessage('error', from, to, taskId, { error }, { correlationId });
}

export function createHeartbeat(agentId: AgentId, load: number, capabilities: string[]): HeartbeatMessage {
  return {
    agentId,
    timestamp: Date.now(),
    load,
    capabilities,
  };
}

export function isMessageExpired(msg: AgentProtocolMessage): boolean {
  if (!msg.deadline) return false;
  return Date.now() > msg.deadline;
}

export function shouldRetry(msg: AgentProtocolMessage, config: RetryConfig): boolean {
  return msg.retryCount < config.maxRetries;
}

export function getNextRetryDelay(msg: AgentProtocolMessage, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffMultiplier, msg.retryCount);
  return Math.min(delay, config.maxDelay);
}