/**
 * Bus Event Types
 * V101: UnifiedMessageBus for multi-channel support
 */

export type Channel = 'web' | 'telegram' | 'discord' | 'email' | 'qq' | 'feishu' | 'dingtalk' | 'slack';

export interface RawMessage {
  channel: Channel;
  userId: string;
  channelUserId: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface UnifiedMessage {
  id: string;
  channel: Channel;
  userId: string;
  content: string;
  timestamp: number;
  sessionId: string;
  direction: 'inbound' | 'outbound';
  metadata?: Record<string, unknown>;
}

export interface BusEvents {
  'message:received': UnifiedMessage;
  'message:sent': UnifiedMessage;
  'message:delivered': { messageId: string; channel: Channel };
  'user:identified': { userId: string; channel: Channel };
  'channel:connected': { channel: Channel };
  'channel:disconnected': { channel: Channel };
  // V103: Plan Review Gate events
  'plan_review:approved': { score: number; feedback: string; retryCount: number };
  'plan_review:rejected': { score: number; feedback: string; retryCount: number };
  // V104: Loop Detection events
  'loop:max_iterations_reached': { maxIterations: number };
  'loop:stall_detected': { stallThreshold: number; consecutiveCount: number };
  // V105: Checkpoint + Progress Tracker events
  'checkpoint:saved': { sessionId: string };
  'checkpoint:loaded': { sessionId: string; checkpoint: CheckpointData };
  'checkpoint:cleared': { sessionId: string };
  'progress:updated': ProgressState;
  'progress:completed': ProgressState;
  // V106: Provider Abstraction events
  'provider:registered': { providerId: string; name: string };
  'provider:unregistered': { providerId: string };
  'provider:switched': { fromProviderId: string; toProviderId: string };
  // V108: Skill Chaining events
  'chain:started': { chainId: string; executionId: string };
  'chain:step-completed': { chainId: string; executionId: string; stepIndex: number; stepId: string };
  'chain:completed': { chainId: string; executionId: string };
  'chain:failed': { chainId: string; executionId: string; error: string };
}