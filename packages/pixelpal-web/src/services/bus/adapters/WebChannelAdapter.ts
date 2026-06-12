/**
 * WebChannelAdapter
 * V101: Web UI adapter implementing ChannelAdapter interface
 * Bridges existing Web UI (ChatPanel/ChatInput) to UnifiedMessageBus
 */

import type { Channel, RawMessage, UnifiedMessage } from '../types';
import type { ChannelAdapter } from '../ChannelAdapter';
import { useStore } from '../../../store';

export class WebChannelAdapter implements ChannelAdapter {
  readonly channel: Channel = 'web';

  /**
   * Convert Web UI input to RawMessage format
   * Called when user sends a message from Web UI
   */
  toAgentFormat(raw: unknown): RawMessage | null {
    if (!raw || typeof raw !== 'object') return null;

    const input = raw as { content?: string; userId?: string };

    if (!input.content || typeof input.content !== 'string') {
      return null;
    }

    return {
      channel: 'web',
      userId: input.userId || 'web_user_default',
      channelUserId: input.userId || 'web_user_default',
      content: input.content,
      timestamp: Date.now(),
    };
  }

  /**
   * Convert agent response to Web UI format
   * Currently just returns the content string for Web display
   */
  fromAgentResponse(msg: UnifiedMessage, response: string): unknown {
    return {
      id: msg.id,
      content: response,
      role: 'assistant',
      timestamp: Date.now(),
    };
  }

  /**
   * Send message to Web UI chat
   * This bridges the existing ChatPanel/ChatInput flow
   */
  async send(target: unknown, content: string): Promise<void> {
    // target is the message to send to the chat
    // For Web, we use the existing store's addMessage
    if (target && typeof target === 'object') {
      const msgObj = target as { role?: string; personaId?: string };
      useStore.getState().addMessage({
        role: msgObj.role || 'assistant',
        content,
        personaId: msgObj.personaId,
      });
    } else {
      // Fallback: add as assistant message with active persona
      const activePersonaId = useStore.getState().activePersonaId;
      useStore.getState().addMessage({
        role: 'assistant',
        content,
        personaId: activePersonaId,
      });
    }
  }
}

export const webChannelAdapter = new WebChannelAdapter();