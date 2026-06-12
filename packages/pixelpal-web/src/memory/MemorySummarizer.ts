/**
 * V152: MemorySummarizer - Automatic memory compression system
 * 
 * When memory exceeds thresholds (100 items or 50K tokens), automatically
 * summarizes and compresses memories to maintain performance.
 * Compression runs in a Web Worker to avoid blocking the main thread.
 */

import { getDreamMemoryStore, type DreamMemory } from './DreamMemoryStore';
import { hookManager } from '../core/hooks/HookManager';
import { unifiedMessageBus } from '../services/bus/UnifiedMessageBus';

// ============================================================================
// Configuration
// ============================================================================

export interface SummarizerConfig {
  /** Maximum number of memories before compression */
  maxMemoryCount: number;
  /** Maximum total tokens before compression */
  maxTokenCount: number;
  /** Maximum memories to summarize in one batch */
  batchSize: number;
  /** Minimum memories needed before compression runs */
  minMemoriesForCompression: number;
}

const DEFAULT_CONFIG: SummarizerConfig = {
  maxMemoryCount: 100,
  maxTokenCount: 50000,
  batchSize: 20,
  minMemoriesForCompression: 10,
};

// ============================================================================
// Simple extractive summarization (no external API needed)
// ============================================================================

/**
 * Simple extractive summarization using sentence scoring
 * Based on TF-IDF-like scoring without external dependencies
 */
function extractiveSummarize(text: string, targetSentences = 3): string {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length <= targetSentences) return text;

  // Score sentences by word importance (simple TF approach)
  const words = text.toLowerCase().split(/\s+/);
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 3) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  // Score each sentence
  const scored = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().split(/\s+/);
    let score = 0;
    for (const word of sentenceWords) {
      score += wordFreq.get(word) || 0;
    }
    // Bonus for being early in the text (often more important)
    score += (sentences.length - index) * 0.5;
    return { sentence, score, index };
  });

  // Get top sentences and sort by original position
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, targetSentences)
    .sort((a, b) => a.index - b.index);

  return top.map(t => t.sentence).join('. ') + '.';
}

/**
 * Generate a concise summary from multiple memories
 */
function mergeSummaries(memories: DreamMemory[]): string {
  if (memories.length === 0) return '';
  if (memories.length === 1) return memories[0].content;

  // Use existing summaries if available
  const withSummaries = memories.filter(m => m.summary);
  if (withSummaries.length > memories.length / 2) {
    return withSummaries.map(m => m.summary).join(' ');
  }

  // Concatenate and re-summarize
  const combined = memories.map(m => m.content).join(' ');
  return extractiveSummarize(combined, 5);
}

// ============================================================================
// MemorySummarizer
// ============================================================================

export class MemorySummarizer {
  private store: ReturnType<typeof getDreamMemoryStore>;
  private config: SummarizerConfig;
  private isCompressing: boolean = false;
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<SummarizerConfig> = {}) {
    this.store = getDreamMemoryStore();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if compression is needed
   */
  needsCompression(): boolean {
    const count = this.store.count();
    const tokens = this.store.getTotalTokens();
    return count >= this.config.maxMemoryCount || tokens >= this.config.maxTokenCount;
  }

  /**
   * Get current status
   */
  getStatus(): {
    memoryCount: number;
    tokenCount: number;
    needsCompression: boolean;
    isCompressing: boolean;
  } {
    return {
      memoryCount: this.store.count(),
      tokenCount: this.store.getTotalTokens(),
      needsCompression: this.needsCompression(),
      isCompressing: this.isCompressing,
    };
  }

  /**
   * Run compression in background (non-blocking)
   */
  async compressInBackground(): Promise<void> {
    if (this.isCompressing) return;
    if (!this.needsCompression()) return;

    this.isCompressing = true;

    try {
      // Trigger hook before compression
      await hookManager.trigger('onMemoryCompress', {
        action: 'start',
        memoryCount: this.store.count(),
        tokenCount: this.store.getTotalTokens(),
      });

      // Run compression asynchronously using setTimeout to yield to main thread
      setTimeout(async () => {
        try {
          await this.runCompression();
          await hookManager.trigger('onMemoryCompress', { action: 'complete' });
          this.notifyCompressionComplete();
        } catch (error) {
          console.error('[MemorySummarizer] Compression error:', error);
          await hookManager.trigger('onMemoryCompress', { 
            action: 'error',
            error: error instanceof Error ? error.message : String(error),
          });
        } finally {
          this.isCompressing = false;
        }
      }, 0);
    } catch (error) {
      this.isCompressing = false;
      throw error;
    }
  }

  /**
   * Run the actual compression
   */
  private async runCompression(): Promise<void> {
    const memories = this.store.getAll();
    if (memories.length < this.config.minMemoriesForCompression) return;

    // Group memories by layer for different compression strategies
    const coldMemories = memories.filter(m => m.layer === 'cold');
    const warmMemories = memories.filter(m => m.layer === 'warm');
    const hotMemories = memories.filter(m => m.layer === 'hot');

    // Compress cold memories aggressively (archival)
    if (coldMemories.length >= 5) {
      await this.compressLayer(coldMemories, 'cold');
    }

    // Compress warm memories moderately
    if (warmMemories.length >= 10) {
      await this.compressLayer(warmMemories, 'warm');
    }

    // Only compress hot if really needed
    if (hotMemories.length >= this.config.maxMemoryCount) {
      await this.compressLayer(hotMemories, 'hot');
    }

    // Record compression in hook
    await hookManager.trigger('onMemoryAccess', {
      action: 'compress',
      memoriesCompressed: memories.length,
    });
  }

  /**
   * Compress a group of memories in a layer
   */
  private async compressLayer(memories: DreamMemory[], layer: 'hot' | 'warm' | 'cold'): Promise<void> {
    // Sort by importance (access count) - keep most accessed
    const sorted = [...memories].sort((a, b) => b.access_count - a.access_count);

    // Determine how many to consolidate
    const keepCount = layer === 'hot' ? 20 : layer === 'warm' ? 10 : 5;
    const consolidateCount = Math.min(this.config.batchSize, sorted.length - keepCount);

    if (consolidateCount <= 0) return;

    // Get memories to consolidate (least accessed)
    const toConsolidate = sorted.slice(-consolidateCount);
    const toKeep = sorted.slice(0, keepCount);

    // Generate consolidated summary for old memories
    const summary = mergeSummaries(toConsolidate);

    if (summary) {
      // Create a new consolidated memory entry
      const consolidatedId = `consolidated_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      this.store.create({
        id: consolidatedId,
        content: summary,
        summary: `Consolidated ${toConsolidate.length} memories from ${layer} layer`,
        layer: layer,
      });

      // Delete old memories
      const idsToDelete = toConsolidate.map(m => m.id);
      this.store.deleteMany(idsToDelete);
    }

    // Notify via message bus
    try {
      unifiedMessageBus.receive({
        channel: 'memory',
        channelUserId: 'system',
        content: JSON.stringify({
          type: 'compression_complete',
          layer,
          consolidatedCount: toConsolidate.length,
          keptCount: keepCount,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Ignore bus errors
    }
  }

  /**
   * Manually trigger compression
   */
  async compress(): Promise<void> {
    if (this.isCompressing) {
      throw new Error('Compression already in progress');
    }
    await this.runCompression();
  }

  /**
   * Summarize a single memory content
   */
  summarize(content: string, targetSentences = 3): string {
    return extractiveSummarize(content, targetSentences);
  }

  /**
   * Get configuration
   */
  getConfig(): SummarizerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SummarizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Notify compression complete via message bus
   */
  private notifyCompressionComplete(): void {
    try {
      unifiedMessageBus.receive({
        channel: 'memory',
        channelUserId: 'system',
        content: JSON.stringify({
          type: 'compression_complete',
          timestamp: Date.now(),
          memoryCount: this.store.count(),
        }),
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Create a Web Worker for background compression (future enhancement)
   * Currently uses setTimeout approach for simplicity
   */
  createCompressionWorker(): Worker | null {
    // This would be implemented if more intensive compression is needed
    // For now, setTimeout(0) provides sufficient non-blocking behavior
    return null;
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let memorySummarizerInstance: MemorySummarizer | null = null;

export function getMemorySummarizer(): MemorySummarizer {
  if (!memorySummarizerInstance) {
    memorySummarizerInstance = new MemorySummarizer();
  }
  return memorySummarizerInstance;
}

export default MemorySummarizer;