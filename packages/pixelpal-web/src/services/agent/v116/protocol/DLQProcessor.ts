import type { AgentProtocolMessage, QueueEntry } from './types';
import { shouldRetry } from './types';

/**
 * DLQProcessor - Dead Letter Queue processor for failed agent messages
 * 
 * Responsibilities:
 * - Track messages that failed after all retries
 * - Provide UI-friendly listing of dead letters
 * - Support requeue (retry from failed point) or discard
 * - Emit events for monitoring/alerting
 */

export interface DLQStats {
  totalDeadLetters: number;
  oldestDeadLetter: number | null;   // Timestamp
  newestDeadLetter: number | null;
  byAgent: Map<string, number>;       // Count per target agent
  byErrorType: Map<string, number>;   // Count per error type
}

export class DLQProcessor {
  private deadLetters: Map<string, QueueEntry> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  // ===========================================================================
  // Add / Remove
  // ===========================================================================

  /**
   * Add a failed message to the dead letter queue
   */
  add(entry: QueueEntry): void {
    if (this.deadLetters.size >= this.maxSize) {
      // Remove oldest entry
      const oldest = this.findOldest();
      if (oldest) this.deadLetters.delete(oldest);
    }
    this.deadLetters.set(entry.id, entry);
  }

  /**
   * Requeue a dead letter for retry
   * Returns the message if successful, null if not found or not requeueable
   */
  requeue(messageId: string): AgentProtocolMessage | null {
    const entry = this.deadLetters.get(messageId);
    if (!entry) return null;

    // Reset retry count and mark for reprocessing
    entry.message.retryCount = 0;
    entry.status = 'pending';
    entry.lastError = undefined;
    entry.deadLetterReason = undefined;
    entry.updatedAt = Date.now();

    this.deadLetters.delete(messageId);
    return entry.message;
  }

  /**
   * Discard a dead letter permanently
   */
  discard(messageId: string): boolean {
    return this.deadLetters.delete(messageId);
  }

  /**
   * Discard all dead letters
   */
  discardAll(): number {
    const count = this.deadLetters.size;
    this.deadLetters.clear();
    return count;
  }

  // ===========================================================================
  // Query
  // ===========================================================================

  /**
   * Get all dead letters, sorted by timestamp (newest first)
   */
  getAll(limit: number = 50, offset: number = 0): QueueEntry[] {
    return Array.from(this.deadLetters.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(offset, offset + limit);
  }

  /**
   * Get dead letters for a specific agent (as recipient)
   */
  getForAgent(agentId: string, limit: number = 50): QueueEntry[] {
    return Array.from(this.deadLetters.values())
      .filter(e => e.message.to === agentId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * Get a specific dead letter by ID
   */
  get(messageId: string): QueueEntry | undefined {
    return this.deadLetters.get(messageId);
  }

  /**
   * Get count of dead letters
   */
  size(): number {
    return this.deadLetters.size;
  }

  /**
   * Check if a message is in the DLQ
   */
  has(messageId: string): boolean {
    return this.deadLetters.has(messageId);
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStats(): DLQStats {
    const entries = Array.from(this.deadLetters.values());
    const timestamps = entries.map(e => e.updatedAt).sort((a, b) => a - b);

    const byAgent = new Map<string, number>();
    const byErrorType = new Map<string, number>();

    for (const entry of entries) {
      const agentId = entry.message.to;
      byAgent.set(agentId, (byAgent.get(agentId) || 0) + 1);

      const errorType = this.extractErrorType(entry.lastError || entry.deadLetterReason || 'UNKNOWN');
      byErrorType.set(errorType, (byErrorType.get(errorType) || 0) + 1);
    }

    return {
      totalDeadLetters: entries.length,
      oldestDeadLetter: timestamps[0] || null,
      newestDeadLetter: timestamps[timestamps.length - 1] || null,
      byAgent,
      byErrorType,
    };
  }

  private findOldest(): string | null {
    let oldest: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.deadLetters) {
      if (entry.updatedAt < oldestTime) {
        oldestTime = entry.updatedAt;
        oldest = id;
      }
    }

    return oldest;
  }

  private extractErrorType(error: string): string {
    if (error.includes('timeout') || error.includes('TIMEOUT')) return 'TIMEOUT';
    if (error.includes('network') || error.includes('NETWORK')) return 'NETWORK';
    if (error.includes('not found') || error.includes('404')) return 'NOT_FOUND';
    if (error.includes('unauthorized') || error.includes('401')) return 'AUTH';
    if (error.includes('rate limit') || error.includes('429')) return 'RATE_LIMIT';
    if (error.includes('deadline')) return 'DEADLINE_EXPIRED';
    return 'OTHER';
  }

  // ===========================================================================
  // Monitoring
  // ===========================================================================

  /**
   * Get DLQ size as percentage of max capacity
   */
  getCapacityPercent(): number {
    return (this.deadLetters.size / this.maxSize) * 100;
  }

  /**
   * Check if DLQ is near capacity (>= 80%)
   */
  isNearCapacity(): boolean {
    return this.getCapacityPercent() >= 80;
  }

  /**
   * Get recent DLQ entries (last hour)
   */
  getRecent(limit: number = 10): QueueEntry[] {
    const oneHourAgo = Date.now() - 3600000;
    return Array.from(this.deadLetters.values())
      .filter(e => e.updatedAt >= oneHourAgo)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  /**
   * Clear entries older than maxAge
   */
  prune(maxAge: number = 86400000): number {
    // Default: 24 hours
    const cutoff = Date.now() - maxAge;
    let count = 0;

    for (const [id, entry] of this.deadLetters) {
      if (entry.updatedAt < cutoff) {
        this.deadLetters.delete(id);
        count++;
      }
    }

    return count;
  }
}