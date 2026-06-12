/**
 * Loop Detection Types
 * V104: Loop Detection System for preventing infinite loops
 */

/**
 * Configuration for loop detection
 */
export interface LoopDetectionConfig {
  enabled: boolean;
  maxIterations: number;      // Default 20 (consistent with nanobot)
  stallThreshold: number;      // Number of consecutive identical responses to trigger stall (default 3)
  similarityThreshold: number; // Response similarity threshold 0-1 (default 0.85)
}

/**
 * Result of a loop detection check
 */
export interface LoopDetectionResult {
  shouldContinue: boolean;    // true = continue execution
  isMaxIterations: boolean;    // true = reached iteration limit
  isStalled: boolean;          // true = stall detected
  iterationCount: number;
  feedback: string;            // Reason for interruption
}