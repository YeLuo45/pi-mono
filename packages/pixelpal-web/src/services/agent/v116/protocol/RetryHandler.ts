import type { AgentProtocolMessage, RetryConfig, DEFAULT_RETRY_CONFIG } from './types';
import { shouldRetry, getNextRetryDelay } from './types';

/**
 * RetryHandler - Handles message retry logic with exponential backoff
 * 
 * Features:
 * - Configurable retry policy (max retries, backoff, etc.)
 * - Automatic scheduling of retries
 * - Retry attempt tracking per message
 * - Jitter support to prevent thundering herd
 */

export interface RetrySchedule {
  messageId: string;
  nextRetryAt: number;
  attempt: number;
}

export class RetryHandler {
  private config: RetryConfig;
  private pendingRetries: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private schedule: Map<string, RetrySchedule> = new Map();
  private onRetry?: (message: AgentProtocolMessage, attempt: number) => void;
  private onExhausted?: (message: AgentProtocolMessage) => void;

  constructor(
    config: Partial<RetryConfig> = {},
    callbacks?: {
      onRetry?: (message: AgentProtocolMessage, attempt: number) => void;
      onExhausted?: (message: AgentProtocolMessage) => void;
    }
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.onRetry = callbacks?.onRetry;
    this.onExhausted = callbacks?.onExhausted;
  }

  /**
   * Schedule a retry for a message
   * Returns false if retries are exhausted
   */
  scheduleRetry(message: AgentProtocolMessage): boolean {
    if (!shouldRetry(message, this.config)) {
      this.onExhausted?.(message);
      return false;
    }

    // Cancel any existing retry for this message
    this.cancelRetry(message.id);

    const delay = getNextRetryDelay(message, this.config);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    const actualDelay = Math.max(0, delay + jitter);

    const schedule: RetrySchedule = {
      messageId: message.id,
      nextRetryAt: Date.now() + actualDelay,
      attempt: message.retryCount + 1,
    };

    this.schedule.set(message.id, schedule);

    const timer = setTimeout(() => {
      this.pendingRetries.delete(message.id);
      this.schedule.delete(message.id);
      this.onRetry?.(message, schedule.attempt);
    }, actualDelay);

    this.pendingRetries.set(message.id, timer);
    return true;
  }

  /**
   * Cancel a scheduled retry
   */
  cancelRetry(messageId: string): void {
    const existing = this.pendingRetries.get(messageId);
    if (existing) {
      clearTimeout(existing);
      this.pendingRetries.delete(messageId);
      this.schedule.delete(messageId);
    }
  }

  /**
   * Cancel all scheduled retries
   */
  cancelAll(): void {
    for (const timer of this.pendingRetries.values()) {
      clearTimeout(timer);
    }
    this.pendingRetries.clear();
    this.schedule.clear();
  }

  /**
   * Get pending retry schedule for a message
   */
  getSchedule(messageId: string): RetrySchedule | undefined {
    return this.schedule.get(messageId);
  }

  /**
   * Get all pending retry schedules
   */
  getAllSchedules(): RetrySchedule[] {
    return Array.from(this.schedule.values());
  }

  /**
   * Check if a message has retries remaining
   */
  hasRetriesRemaining(message: AgentProtocolMessage): boolean {
    return shouldRetry(message, this.config);
  }

  /**
   * Get current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Update retry configuration dynamically
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Calculate delay for next retry without scheduling it
   */
  peekNextDelay(message: AgentProtocolMessage): number {
    return getNextRetryDelay(message, this.config);
  }

  /**
   * Get number of retries remaining for a message
   */
  getRetriesRemaining(message: AgentProtocolMessage): number {
    return Math.max(0, this.config.maxRetries - message.retryCount);
  }
}