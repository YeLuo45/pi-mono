/**
 * agentPlatformHook - Platform adapter registry for agent operations
 *
 * Provides a centralized way for AgentExecutor to access the current platform adapter
 * for sending emotional responses and other platform-specific operations.
 */

import type { PlatformAdapter } from './PlatformAdapter'

let currentAdapter: PlatformAdapter | null = null

/**
 * Set the current platform adapter
 */
export function setCurrentPlatformAdapter(adapter: PlatformAdapter): void {
  currentAdapter = adapter
}

/**
 * Get the current platform adapter
 */
export function getCurrentPlatformAdapter(): PlatformAdapter | null {
  return currentAdapter
}
