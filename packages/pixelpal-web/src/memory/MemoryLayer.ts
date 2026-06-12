/**
 * V152: MemoryLayer - Hot/Warm/Cold tiered memory management
 * 
 * Implements automatic tier classification based on access frequency
 * and recency. Memories are promoted/demoted between layers based on
 * access patterns.
 */

import { getDreamMemoryStore, type DreamMemory, type MemoryLayer } from './DreamMemoryStore';
import { hookManager } from '../core/hooks/HookManager';
import { unifiedMessageBus } from '../services/bus/UnifiedMessageBus';

// ============================================================================
// Configuration
// ============================================================================

export interface MemoryLayerConfig {
  /** Maximum items in hot layer */
  hotMaxSize: number;
  /** Maximum items in warm layer */
  warmMaxSize: number;
  /** Access count threshold to promote from warm to hot */
  hotPromotionThreshold: number;
  /** Days without access before demoting from hot to warm */
  hotDemotionDays: number;
  /** Days without access before demoting from warm to cold */
  warmDemotionDays: number;
  /** Minimum access count to be considered for hot layer */
  hotMinAccessCount: number;
}

const DEFAULT_CONFIG: MemoryLayerConfig = {
  hotMaxSize: 30,
  warmMaxSize: 200,
  hotPromotionThreshold: 5,
  hotDemotionDays: 7,
  warmDemotionDays: 30,
  hotMinAccessCount: 3,
};

// ============================================================================
// MemoryLayer Manager
// ============================================================================

export class MemoryLayerManager {
  private store: ReturnType<typeof getDreamMemoryStore>;
  private config: MemoryLayerConfig;
  private isRunning: boolean = false;
  private maintenanceInterval: number | null = null;

  constructor(config: Partial<MemoryLayerConfig> = {}) {
    this.store = getDreamMemoryStore();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start automatic layer maintenance
   */
  startMaintenance(intervalMs = 60000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.maintenanceInterval = window.setInterval(() => {
      this.runMaintenance().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop automatic layer maintenance
   */
  stopMaintenance(): void {
    if (this.maintenanceInterval !== null) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    this.isRunning = false;
  }

  /**
   * Run a single maintenance cycle
   */
  async runMaintenance(): Promise<void> {
    await this.promoteHotCandidates();
    await this.demoteOldMemories();
    await this.enforceLayerLimits();
  }

  /**
   * Promote frequently accessed memories to hot layer
   */
  private async promoteHotCandidates(): Promise<void> {
    // Get warm memories with high access count
    const warmMemories = this.store.queryByLayer('warm');
    const candidates = warmMemories.filter(m => 
      m.access_count >= this.config.hotPromotionThreshold
    );

    if (candidates.length === 0) return;

    // Get current hot count
    const hotCount = this.store.countByLayer('hot');
    const availableSlots = Math.max(0, this.config.hotMaxSize - hotCount);

    if (availableSlots === 0) return;

    // Promote top candidates (highest access count first)
    const toPromote = candidates
      .sort((a, b) => b.access_count - a.access_count)
      .slice(0, availableSlots);

    for (const memory of toPromote) {
      this.store.update(memory.id, { layer: 'hot' });
      this.notifyLayerChange(memory.id, 'warm', 'hot');
    }

    // Trigger hook
    await hookManager.trigger('onMemoryLayerChange', {
      action: 'promote',
      memories: toPromote.map(m => m.id),
      fromLayer: 'warm',
      toLayer: 'hot',
    });
  }

  /**
   * Demote memories that haven't been accessed recently
   */
  private async demoteOldMemories(): Promise<void> {
    const now = Date.now();
    const hotDemotionMs = this.config.hotDemotionDays * 24 * 60 * 60 * 1000;
    const warmDemotionMs = this.config.warmDemotionDays * 24 * 60 * 60 * 1000;

    // Check hot memories for demotion to warm
    const hotMemories = this.store.queryByLayer('hot');
    for (const memory of hotMemories) {
      if (!memory.last_access) continue;
      if (now - memory.last_access > hotDemotionMs) {
        this.store.update(memory.id, { layer: 'warm' });
        this.notifyLayerChange(memory.id, 'hot', 'warm');
      }
    }

    // Check warm memories for demotion to cold
    const warmMemories = this.store.queryByLayer('warm');
    for (const memory of warmMemories) {
      if (!memory.last_access) continue;
      if (now - memory.last_access > warmDemotionMs) {
        this.store.update(memory.id, { layer: 'cold' });
        this.notifyLayerChange(memory.id, 'warm', 'cold');
      }
    }
  }

  /**
   * Enforce layer size limits by demoting least important memories
   */
  private async enforceLayerLimits(): Promise<void> {
    // Enforce hot layer limit
    let hotCount = this.store.countByLayer('hot');
    if (hotCount > this.config.hotMaxSize) {
      const excess = hotCount - this.config.hotMaxSize;
      const hotMemories = this.store.queryByLayer('hot');
      const toDemote = hotMemories
        .sort((a, b) => {
          // Demote least accessed first, then oldest
          if (a.access_count !== b.access_count) {
            return a.access_count - b.access_count;
          }
          return (a.last_access || 0) - (b.last_access || 0);
        })
        .slice(0, excess);

      for (const memory of toDemote) {
        this.store.update(memory.id, { layer: 'warm' });
        this.notifyLayerChange(memory.id, 'hot', 'warm');
      }
    }

    // Enforce warm layer limit
    let warmCount = this.store.countByLayer('warm');
    if (warmCount > this.config.warmMaxSize) {
      const excess = warmCount - this.config.warmMaxSize;
      const warmMemories = this.store.queryByLayer('warm');
      const toDemote = warmMemories
        .sort((a, b) => {
          // Demote oldest first
          return (a.last_access || a.created_at) - (b.last_access || b.created_at);
        })
        .slice(0, excess);

      for (const memory of toDemote) {
        this.store.update(memory.id, { layer: 'cold' });
        this.notifyLayerChange(memory.id, 'warm', 'cold');
      }
    }
  }

  /**
   * Manually set memory layer
   */
  setLayer(memoryId: string, layer: MemoryLayer): boolean {
    const memory = this.store.getReadOnly(memoryId);
    if (!memory) return false;

    const oldLayer = memory.layer;
    const updated = this.store.update(memoryId, { layer });
    if (updated) {
      this.notifyLayerChange(memoryId, oldLayer, layer);
    }
    return updated !== null;
  }

  /**
   * Get memories in a specific layer
   */
  getByLayer(layer: MemoryLayer): DreamMemory[] {
    return this.store.queryByLayer(layer);
  }

  /**
   * Get hot memories (frequently accessed recent memories)
   */
  getHot(): DreamMemory[] {
    return this.store.queryByLayer('hot');
  }

  /**
   * Get warm memories (regular access pattern)
   */
  getWarm(): DreamMemory[] {
    return this.store.queryByLayer('warm');
  }

  /**
   * Get cold memories (infrequently accessed, archived)
   */
  getCold(): DreamMemory[] {
    return this.store.queryByLayer('cold');
  }

  /**
   * Get layer statistics
   */
  getStats(): { hot: number; warm: number; cold: number; total: number } {
    return {
      hot: this.store.countByLayer('hot'),
      warm: this.store.countByLayer('warm'),
      cold: this.store.countByLayer('cold'),
      total: this.store.count(),
    };
  }

  /**
   * Notify about layer change via message bus
   */
  private notifyLayerChange(memoryId: string, from: MemoryLayer, to: MemoryLayer): void {
    try {
      unifiedMessageBus.receive({
        channel: 'memory',
        channelUserId: 'system',
        content: JSON.stringify({
          type: 'layer_change',
          memoryId,
          from,
          to,
          timestamp: Date.now(),
        }),
      });
    } catch {
      // Ignore bus errors
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MemoryLayerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryLayerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let memoryLayerManagerInstance: MemoryLayerManager | null = null;

export function getMemoryLayerManager(): MemoryLayerManager {
  if (!memoryLayerManagerInstance) {
    memoryLayerManagerInstance = new MemoryLayerManager();
  }
  return memoryLayerManagerInstance;
}

export default MemoryLayerManager;