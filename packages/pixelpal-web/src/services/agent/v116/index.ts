/**
 * V116 Agent Communication Protocol
 * 
 * Standardized message format for agent-to-agent communication
 * with SQLite persistence, retry logic, and dead letter queue.
 */

// Re-export all protocol types
export * from './protocol/types';

// Main classes
export { MessageQueue } from './protocol/MessageQueue';
export { RetryHandler } from './protocol/RetryHandler';
export { DLQProcessor } from './protocol/DLQProcessor';
export type { DLQStats } from './protocol/DLQProcessor';
export type { RetrySchedule } from './protocol/RetryHandler';

// Protocol event types
export {
  type ProtocolEventType,
  type ProtocolEvent,
} from './protocol/types';

// Convenience creators
export {
  createMessage,
  createDispatch,
  createResult,
  createError,
  createHeartbeat,
  isMessageExpired,
  shouldRetry,
  getNextRetryDelay,
} from './protocol/types';

// Default retry configuration
export { DEFAULT_RETRY_CONFIG } from './protocol/types';