/**
 * Memory Types for PixelPal Companion
 * 
 * Long-term memory system using IndexedDB for persistence.
 * Stores conversation summaries, user preferences, pet milestones, etc.
 */

export type MemoryEmotion = 'happy' | 'excited' | 'calm' | 'anxious' | 'angry' | 'sad' | 'exhausted' | 'unknown';

export interface MemoryEntry {
  id: string;
  type: MemoryType;
  content: string;
  importance: number;         // 0-100, dynamic score recalculated by algorithm
  importanceScore: number;    // Initial calculated score at creation (0-100)
  createdAt: number;          // Unix timestamp ms
  updatedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
  emotion?: MemoryEmotion;    // V29: Emotion tag for memory classification
  metadata?: Record<string, unknown>;
  personaId?: string;         // Persona that created this memory (optional for legacy)
}

export type MemoryType = 
  | 'conversation_summary'   // Summarized conversation topics
  | 'user_preference'        // User likes/dislikes, habits
  | 'pet_milestone'          // Pet reached a new state/achievement
  | 'interaction_log'        // Specific interaction record
  | 'fact'                   // Factual information about user
  | 'preference'             // User preference (shorter term)
  | 'routine'                // User daily/weekday routine
  | 'custom'                 // Custom memory entry
  | 'daily_summary'          // Daily conversation summary (V32)
  | 'weekly_summary'         // Weekly conversation summary (V32)
  | 'monthly_summary'        // Monthly conversation summary (V32)
  | 'important_event';       // Auto-tagged important messages (V32)

export interface MemoryQuery {
  type?: MemoryType;
  tags?: string[];
  emotion?: MemoryEmotion;     // V29: Filter by emotion
  emotions?: MemoryEmotion[];  // V29: Filter by multiple emotions
  minImportance?: number;
  maxImportance?: number;
  since?: number;            // Unix timestamp, filter by createdAt
  startDate?: number;        // Start date for date range filter (createdAt >= startDate)
  endDate?: number;          // End date for date range filter (createdAt <= endDate)
  keyword?: string;          // Keyword search in content
  personaId?: string;        // Filter by personaId
  limit?: number;
  offset?: number;
}

export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  oldestEntry: number | null;
  newestEntry: number | null;
  averageImportance: number;
}

export interface MemorySummary {
  recentTopics: string[];       // Last 5 conversation topics
  userPreferences: string[];    // Known user preferences
  petMilestones: string[];      // Milestone descriptions
  keyFacts: string[];           // Important facts about user
  lastUpdated: number;
}

// Memory importance thresholds (0-100 scale)
export const MEMORY_IMPORTANCE = {
  TRIVIAL: 10,
  LOW: 30,
  NORMAL: 50,
  IMPORTANT: 70,
  CRITICAL: 90,
} as const;

// Auto-summarize if access count exceeds this (for low-importance entries)
export const AUTO_SUMMARIZE_THRESHOLD = 10;

// Compress memory if it exceeds this many entries
export const MAX_MEMORY_ENTRIES = 500;

// Compress to keep this many entries per type
export const COMPRESS_KEEP_PER_TYPE = 50;
