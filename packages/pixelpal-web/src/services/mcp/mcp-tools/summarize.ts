/**
 * summarizeTool - Text summarization tool
 * Summarizes long text content into concise summaries
 */

import type { McpTool, ToolResult } from '../tool-registry'

/**
 * Summarize text content
 * @param text - The text to summarize
 * @param maxLength - Maximum length of summary (default: 200 chars)
 */
async function summarizeHandler(args: {
  text: string
  maxLength?: number
}): Promise<ToolResult> {
  try {
    const { text, maxLength = 200 } = args

    if (!text || typeof text !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Text is required' }) }],
        isError: true,
      }
    }

    // Simple extractive summarization: get first few sentences until maxLength
    const sentences = text.match(/[^.!?。]+[.!?。]+/g) || [text]
    let summary = ''
    let currentLength = 0

    for (const sentence of sentences) {
      if (currentLength + sentence.length > maxLength) {
        break
      }
      summary += sentence
      currentLength += sentence.length
    }

    // If no sentences found, truncate directly
    if (!summary && text.length > maxLength) {
      summary = text.substring(0, maxLength) + '...'
    } else if (!summary) {
      summary = text
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          summary: summary.trim(),
          originalLength: text.length,
          summaryLength: summary.length,
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

export const summarizeTool: McpTool = {
  name: 'summarize',
  description: 'Summarize long text content into concise summaries',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text content to summarize',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum length of summary (default: 200 characters)',
        default: 200,
      },
    },
    required: ['text'],
  },
  handler: summarizeHandler,
}