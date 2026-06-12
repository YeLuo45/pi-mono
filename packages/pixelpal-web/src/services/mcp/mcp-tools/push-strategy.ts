/**
 * pushStrategyTool - Strategy push notification tool
 * Pushes strategy updates or notifications to connected clients
 */

import type { McpTool, ToolResult } from '../tool-registry.ts'

/**
 * Push a strategy notification to clients
 * @param title - Strategy notification title
 * @param message - Strategy notification message
 * @param priority - Priority level (default: normal)
 */
async function pushStrategyHandler(args: {
  title: string
  message: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}): Promise<ToolResult> {
  try {
    const { title, message, priority = 'normal' } = args

    if (!title || typeof title !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Title is required' }) }],
        isError: true,
      }
    }

    if (!message || typeof message !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Message is required' }) }],
        isError: true,
      }
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent']
    if (!validPriorities.includes(priority)) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: false,
          error: `Invalid priority: ${priority}. Valid: ${validPriorities.join(', ')}`,
        }) }],
        isError: true,
      }
    }

    // Simulated push - in production would broadcast to SSE clients
    const notification = {
      id: `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'strategy',
      title,
      message,
      priority,
      timestamp: new Date().toISOString(),
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          notification,
          pushedAt: notification.timestamp,
        }, null, 2),
      }],
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error }) }],
      isError: true,
    }
  }
}

export const pushStrategyTool: McpTool = {
  name: 'pushStrategy',
  description: 'Push strategy notifications to connected clients with priority levels',
  inputSchema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Strategy notification title',
      },
      message: {
        type: 'string',
        description: 'Strategy notification message content',
      },
      priority: {
        type: 'string',
        description: 'Priority level (low, normal, high, urgent)',
        default: 'normal',
      },
    },
    required: ['title', 'message'],
  },
  handler: pushStrategyHandler,
}