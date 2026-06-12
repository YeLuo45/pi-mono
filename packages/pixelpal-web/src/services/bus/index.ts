/**
 * Bus Service Export
 * V101: UnifiedMessageBus initialization and exports
 */

export { unifiedMessageBus } from './UnifiedMessageBus';
export { webChannelAdapter } from './adapters/WebChannelAdapter';
export { telegramChannelAdapter } from './adapters/TelegramChannelAdapter';
export { discordChannelAdapter } from './adapters/DiscordChannelAdapter';
export { whatsAppChannelAdapter } from './adapters/WhatsAppChannelAdapter';
export { feishuChannelAdapter } from './adapters/FeishuChannelAdapter';
export { slackChannelAdapter } from './adapters/SlackChannelAdapter';
export { dingTalkChannelAdapter } from './adapters/DingTalkChannelAdapter';
export { emailChannelAdapter } from './adapters/EmailChannelAdapter';
export { qqChannelAdapter } from './adapters/QQChannelAdapter';
export { botConfigManager } from './BotConfigManager';
export type { BotConfig, BotChannelConfig } from './BotConfigManager';
export { userIdentityResolver } from './UserIdentityResolver';
export type { Channel, RawMessage, UnifiedMessage, BusEvents } from './types';
export type { CheckpointData, ProgressState } from './checkpoint/types';
export type { ChannelAdapter } from './ChannelAdapter';

// Re-export AgentExecutionBus (renamed from agentBus)
export { agentExecutionBus } from '../agents/AgentExecutionBus';

// V104: Loop Detection exports
export { loopDetector } from './loop-detection';
export type { LoopDetectionConfig, LoopDetectionResult } from './loop-detection';

// V103: Plan Review Gate exports
export { planReviewGate, PlanReviewGate } from './plan-review';
export type { PlanReviewResult, ReviewConfig } from './plan-review';

// V105: Checkpoint + Progress Tracker exports
export { checkpointManager } from './checkpoint';
export { progressTracker } from './checkpoint';