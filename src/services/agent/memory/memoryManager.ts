/**
 * MemoryManager - Singleton manager for agent memory context
 * 
 * Coordinates memory extraction from messages and task results,
 * providing a unified interface for memory context during agent execution.
 */

import type { Message } from '../../../types';
import { createMemoryContext, type MemoryContext, type MemoryEntry } from './MemoryContext';
import { extractMemoriesFromMessages, extractMemoryFromTaskResult } from './messageHistoryMemory';
import { loadMessages } from '../../storage/messageStorage';
import { initMemoryStore, saveMemoryEntry, loadMemoryEntries, clearMemoryEntries } from '../../storage/memoryStorage';

// ============================================================================
// MemoryManager Singleton
// ============================================================================

class MemoryManagerImpl {
  private context: MemoryContext | null = null;
  private messageCount = 0;
  private extractionThreshold = 10; // Extract memories every 10 messages
  private persistenceEnabled = false;

  /**
   * Enable cross-session persistence via IndexedDB
   */
  async enablePersistence(): Promise<void> {
    await initMemoryStore();
    const entries = await loadMemoryEntries();
    if (this.context) {
      for (const entry of entries) {
        this.context.entries.push(entry);
      }
    }
    this.persistenceEnabled = true;
  }

  /**
   * Initialize memory manager with a session ID
   */
  init(sessionId: string): void {
    this.context = createMemoryContext(sessionId);
    this.messageCount = 0;
  }

  /**
   * Get the current memory context
   */
  getContext(): MemoryContext {
    if (!this.context) {
      // Auto-initialize with a default session ID
      this.init(crypto.randomUUID());
    }
    return this.context;
  }

  /**
   * Extract memories from messages and add to memory context
   * Called periodically during conversation
   */
  async extractFromMessages(messages?: Message[]): Promise<void> {
    if (!this.context) return;

    try {
      // Load messages from storage if not provided
      const msgs = messages || await loadMessages();
      const newMessageCount = msgs.length;

      // Check if we've crossed the extraction threshold
      if (newMessageCount - this.messageCount < this.extractionThreshold && this.messageCount > 0) {
        return;
      }

      this.messageCount = newMessageCount;

      // Extract memories from recent messages
      const memories = extractMemoriesFromMessages(msgs);
      
      // Add each memory to context (skip if already exists)
      const existingContents = new Set(
        this.context.entries.map(e => e.content.toLowerCase().slice(0, 50))
      );

      for (const memory of memories) {
        const hash = memory.content.toLowerCase().slice(0, 50);
        if (!existingContents.has(hash)) {
          // Create full entry with id and createdAt
          const fullEntry: MemoryEntry = {
            ...memory,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
          };
          this.context.entries.push(fullEntry);
          existingContents.add(hash);
          
          // Persist if enabled
          if (this.persistenceEnabled) {
            await saveMemoryEntry(fullEntry);
          }
        }
      }
    } catch (err) {
      console.warn('[MemoryManager] Failed to extract from messages:', err);
    }
  }

  /**
   * Extract and store memory from a completed task result
   */
  extractFromTaskResult(taskId: string, result: string): void {
    if (!this.context) return;

    try {
      const memory = extractMemoryFromTaskResult(taskId, result);
      this.context.add(memory);
    } catch (err) {
      console.warn('[MemoryManager] Failed to extract from task result:', err);
    }
  }

  /**
   * Get formatted memory context for LLM prompt injection
   */
  getMemoryContextForPrompt(query: string, limit = 5): string {
    if (!this.context) return '';

    const relevant = this.context.getRelevant(query, limit);
    if (relevant.length === 0) return '';

    const lines = relevant.map(entry => `${entry.content}`);
    return `当前对话记忆：\n${lines.join('\n')}`;
  }

  /**
   * Get memory statistics for UI display
   */
  getStats(): { count: number; preview: string | null } {
    if (!this.context) return { count: 0, preview: null };

    const count = this.context.entries.length;
    const latest = this.context.entries[this.context.entries.length - 1];

    return {
      count,
      preview: latest ? latest.content.slice(0, 50) + (latest.content.length > 50 ? '...' : '') : null,
    };
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.context?.clear();
    this.messageCount = 0;
  }

  /**
   * Clear all memories and persistent storage
   */
  async clearPersistence(): Promise<void> {
    this.clear();
    if (this.persistenceEnabled) {
      await clearMemoryEntries();
    }
  }

  /**
   * Check if persistence is enabled
   */
  isPersistenceEnabled(): boolean {
    return this.persistenceEnabled;
  }
}

// Singleton instance
export const memoryManager = new MemoryManagerImpl();
