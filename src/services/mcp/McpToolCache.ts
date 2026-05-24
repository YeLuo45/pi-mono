/**
 * MCP Tool Cache - V164
 * TTL-based cache for external MCP tool discovery
 */

import { McpTool } from './types/mcp-client';

interface CacheEntry {
  tools: McpTool[];
  timestamp: number;
  ttl: number;
}

export class ToolCache {
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Get cached tools for an agent
   */
  get(agentId: string): McpTool[] | null {
    const entry = this.cache.get(agentId);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(agentId);
      return null;
    }

    return entry.tools;
  }

  /**
   * Set cached tools for an agent with TTL
   */
  set(agentId: string, tools: McpTool[], ttl: number): void {
    this.cache.set(agentId, {
      tools,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Invalidate cache for an agent
   */
  invalidate(agentId: string): void {
    this.cache.delete(agentId);
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; entries: Array<{ agentId: string; age: number }> } {
    const entries: Array<{ agentId: string; age: number }> = [];
    for (const [agentId, entry] of this.cache.entries()) {
      entries.push({
        agentId,
        age: Date.now() - entry.timestamp,
      });
    }
    return { size: this.cache.size, entries };
  }
}

// Singleton instance
let cacheInstance: ToolCache | null = null;

export function getToolCache(): ToolCache {
  if (!cacheInstance) {
    cacheInstance = new ToolCache();
  }
  return cacheInstance;
}