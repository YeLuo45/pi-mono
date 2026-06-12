/**
 * Checkpoint Types
 * V105: Checkpoint + Progress Tracker
 */

export interface CheckpointData {
  sessionId: string;
  planText: string;
  stepIndex: number;
  totalSteps: number;
  agentState: Record<string, unknown>;
  timestamp: number;
}

export interface ProgressState {
  current: number;
  total: number;
  label: string;
  percent: number;
}