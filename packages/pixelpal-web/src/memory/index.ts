/**
 * V152: Dream Memory System - Index Export
 * 
 * Cross-session persistent memory with automatic summarization and
 * hot/warm/cold tiered layer management.
 */

// Core store
export { DreamMemoryStore, getDreamMemoryStore, type DreamMemory, type MemoryLayer, type CreateDreamMemoryInput, type UpdateDreamMemoryInput } from './DreamMemoryStore';

// Layer management
export { MemoryLayerManager, getMemoryLayerManager, type MemoryLayerConfig } from './MemoryLayer';

// Auto summarization
export { MemorySummarizer, getMemorySummarizer, type SummarizerConfig } from './MemorySummarizer';