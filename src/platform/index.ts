/**
 * Platform Services Index - V69 Cross-Platform Adapter Layer
 *
 * Provides unified interface for Web/Telegram/Feishu platforms
 */

export { PlatformAdapter, PlatformMessage, AgentState } from './PlatformAdapter'
export { agentEngine, createAgentEngine } from './agentEngine'
export { WebAdapter } from './WebAdapter'
export { TelegramAdapter } from './TelegramAdapter'
export { FeishuAdapter } from './FeishuAdapter'
