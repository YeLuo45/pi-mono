/**
 * Loop Detection Module
 * V104: Loop Detection System
 */

export { LoopDetector } from './LoopDetector';
export type { LoopDetectionConfig, LoopDetectionResult } from './types';

// Default singleton instance
import { LoopDetector } from './LoopDetector';
const defaultConfig: LoopDetectionConfig = {
  enabled: true,
  maxIterations: 20,
  stallThreshold: 3,
  similarityThreshold: 0.85,
};
export const loopDetector = new LoopDetector(defaultConfig);