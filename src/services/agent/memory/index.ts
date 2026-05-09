/**
 * Agent Memory Module - Context enhancement for PixelPal Agent
 * 
 * Exports:
 * - MemoryContext: Core memory interface and implementation
 * - MemoryManager: Singleton manager for coordinating memory
 * - messageHistoryMemory: Utilities for extracting memories from messages
 */

export { createMemoryContext, type MemoryContext, type MemoryEntry, type MemoryEntryType, type MemoryImportance } from './MemoryContext';
export { memoryManager } from './memoryManager';
export { extractMemoriesFromMessages, extractMemoryFromTaskResult } from './messageHistoryMemory';
