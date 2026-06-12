/**
 * PlatformAdapter - Unified interface for cross-platform messaging
 *
 * V69: New platform abstraction layer for Web/Telegram/Feishu adapters
 */

export interface PlatformMessage {
  id: string
  from: string
  text: string
  timestamp: number
  platform?: 'web' | 'telegram' | 'feishu'
  chatId?: string
}

export interface AgentState {
  runningTaskId: string | null
  taskCount: number
  memoryCount: number
}

export interface PlatformAdapter {
  platform: 'web' | 'telegram' | 'feishu'
  sendMessage(text: string): Promise<void>
  onMessage(handler: (msg: PlatformMessage) => void): void
  renderAgentState(state: AgentState): void
  getUserId(): string
  getUsername(): string
}
