/**
 * Bus Service Export
 * V101: UnifiedMessageBus initialization and exports
 */

export { unifiedMessageBus } from './UnifiedMessageBus';
export { webChannelAdapter } from './adapters/WebChannelAdapter';
export { telegramChannelAdapter } from './adapters/TelegramChannelAdapter';
export { discordChannelAdapter } from './adapters/DiscordChannelAdapter';
export { botConfigManager } from './BotConfigManager';
export type { BotConfig, BotChannelConfig } from './BotConfigManager';
export { userIdentityResolver } from './UserIdentityResolver';
export type { Channel, RawMessage, UnifiedMessage, BusEvents } from './types';
export type { ChannelAdapter } from './ChannelAdapter';

// Re-export AgentExecutionBus (renamed from agentBus)
export { agentExecutionBus } from '../agents/AgentExecutionBus';