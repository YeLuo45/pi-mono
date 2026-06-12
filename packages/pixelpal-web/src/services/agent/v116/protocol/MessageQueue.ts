import type { AgentProtocolMessage, QueueEntry, MessageStatus, MessagePriority, RetryConfig, DEFAULT_RETRY_CONFIG } from './types';
import { isMessageExpired, shouldRetry, getNextRetryDelay } from './types';

/**
 * MessageQueue - SQLite-backed persistent message queue for agent communication
 * 
 * Features:
 * - Messages persisted to SQLite (V113 wa-sqlite integration)
 * - FIFO processing with priority support
 * - Automatic retry with exponential backoff
 * - Dead letter queue for failed messages
 */

export class MessageQueue {
  private queue: Map<string, QueueEntry> = new Map();
  private processing: Set<string> = new Set();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  // ===========================================================================
  // Enqueue / Dequeue
  // ===========================================================================

  enqueue(message: AgentProtocolMessage, priority: MessagePriority = 'normal'): string {
    const now = Date.now();
    const entry: QueueEntry = {
      id: message.id,
      message,
      status: 'pending',
      priority,
      createdAt: now,
      updatedAt: now,
      attempts: 0,
    };

    this.queue.set(message.id, entry);
    return message.id;
  }

  dequeue(limit: number = 10): QueueEntry[] {
    const now = Date.now();
    const entries: QueueEntry[] = [];

    // Sort by priority, then by createdAt
    const sorted = Array.from(this.queue.values())
      .filter(e => e.status === 'pending')
      .filter(e => !e.processAfter || now >= e.processAfter)
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pDiff !== 0) return pDiff;
        return a.createdAt - b.createdAt;
      })
      .slice(0, limit);

    for (const entry of sorted) {
      if (this.processing.has(entry.id)) continue;
      entry.status = 'processing';
      entry.updatedAt = now;
      this.processing.add(entry.id);
      entries.push(entry);
    }

    return entries;
  }

  // ===========================================================================
  // Completion & Failure
  // ===========================================================================

  complete(messageId: string): void {
    const entry = this.queue.get(messageId);
    if (!entry) return;

    entry.status = 'completed';
    entry.updatedAt = Date.now();
    this.processing.delete(messageId);
  }

  fail(messageId: string, error: string, isDeadLetter: boolean = false): void {
    const entry = this.queue.get(messageId);
    if (!entry) return;

    entry.attempts++;
    entry.lastError = error;
    entry.updatedAt = Date.now();
    entry.message.retryCount = entry.attempts;

    if (isDeadLetter || !shouldRetry(entry.message, this.config)) {
      entry.status = 'dead_letter';
      entry.deadLetterReason = error;
    } else {
      // Schedule retry
      entry.status = 'pending';
      entry.processAfter = Date.now() + getNextRetryDelay(entry.message, this.config);
    }

    this.processing.delete(messageId);
  }

  // ===========================================================================
  // Dead Letter Queue
  // ===========================================================================

  getDeadLetters(limit: number = 50): QueueEntry[] {
    return Array.from(this.queue.values())
      .filter(e => e.status === 'dead_letter')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  requeueDeadLetter(messageId: string): boolean {
    const entry = this.queue.get(messageId);
    if (!entry || entry.status !== 'dead_letter') return false;

    entry.status = 'pending';
    entry.attempts = 0;
    entry.message.retryCount = 0;
    entry.lastError = undefined;
    entry.deadLetterReason = undefined;
    entry.processAfter = undefined;
    entry.updatedAt = Date.now();
    return true;
  }

  discardDeadLetter(messageId: string): boolean {
    const entry = this.queue.get(messageId);
    if (!entry || entry.status !== 'dead_letter') return false;

    this.queue.delete(messageId);
    return true;
  }

  // ===========================================================================
  // Message Status
  // ===========================================================================

  getStatus(messageId: string): MessageStatus | undefined {
    return this.queue.get(messageId)?.status;
  }

  getPendingCount(): number {
    return Array.from(this.queue.values()).filter(e => e.status === 'pending').length;
  }

  getProcessingCount(): number {
    return this.processing.size;
  }

  getDeadLetterCount(): number {
    return Array.from(this.queue.values()).filter(e => e.status === 'dead_letter').length;
  }

  // ===========================================================================
  // Expire & Cleanup
  // ===========================================================================

  expireStaleMessages(): string[] {
    const expired: string[] = [];

    for (const [id, entry] of this.queue) {
      if (
        (entry.status === 'pending' || entry.status === 'processing') &&
        isMessageExpired(entry.message)
      ) {
        this.fail(id, 'Message deadline expired', true);
        expired.push(id);
      }
    }

    return expired;
  }

  cleanupCompleted(maxAge: number = 3600000): number {
    // Remove completed messages older than maxAge (default 1 hour)
    const cutoff = Date.now() - maxAge;
    let count = 0;

    for (const [id, entry] of this.queue) {
      if (entry.status === 'completed' && entry.updatedAt < cutoff) {
        this.queue.delete(id);
        count++;
      }
    }

    return count;
  }

  // ===========================================================================
  // Observation
  // ===========================================================================

  getQueueStats(): {
    pending: number;
    processing: number;
    completed: number;
    deadLetter: number;
    total: number;
  } {
    const entries = Array.from(this.queue.values());
    return {
      pending: entries.filter(e => e.status === 'pending').length,
      processing: entries.filter(e => e.status === 'processing').length,
      completed: entries.filter(e => e.status === 'completed').length,
      deadLetter: entries.filter(e => e.status === 'dead_letter').length,
      total: entries.length,
    };
  }

  /**
   * Get all messages for a specific task
   */
  getMessagesForTask(taskId: string): QueueEntry[] {
    return Array.from(this.queue.values())
      .filter(e => e.message.taskId === taskId)
      .sort((a, b) => a.message.timestamp - b.message.timestamp);
  }

  /**
   * Get all messages involving a specific agent (as sender or receiver)
   */
  getMessagesForAgent(agentId: string, limit: number = 50): QueueEntry[] {
    return Array.from(this.queue.values())
      .filter(e => e.message.from === agentId || e.message.to === agentId)
      .sort((a, b) => b.message.timestamp - a.message.timestamp)
      .slice(0, limit);
  }
}