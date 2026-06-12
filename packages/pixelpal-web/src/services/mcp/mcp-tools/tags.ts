/**
 * tagsTool - Tag extraction and management tool
 * Extracts tags from text content and manages tag associations
 */

import type { McpTool, ToolResult } from '../tool-registry'

/**
 * Extract tags from text content
 * @param text - The text to extract tags from
 * @param maxTags - Maximum number of tags to extract (default: 10)
 */
async function tagsHandler(args: {
  text: string
  maxTags?: number
}): Promise<ToolResult> {
  try {
    const { text, maxTags = 10 } = args

    if (!text || typeof text !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Text is required' }) }],
        isError: true,
      }
    }

    // Simple tag extraction using common patterns
    // 1. Hashtags
    const hashtags = text.match(/#[a-zA-Z0-9_\u4e00-\u9fa5]+/g) || []

    // 2. Keywords: Chinese/English words that appear frequently
    const words = text.match(/[a-zA-Z]{3,}/g) || []
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []

    // Count word frequencies
    const wordCount = new Map<string, number>()
    for (const word of words) {
      const lower = word.toLowerCase()
      wordCount.set(lower, (wordCount.get(lower) || 0) + 1)
    }
    for (const word of chineseWords) {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    }

    // Sort by frequency and get top tags
    const sortedTags = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTags)
      .map(([word]) => word)

    // Combine hashtags (preserving case) with extracted keywords
    const allTags = [
      ...hashtags.map(t => t.substring(1)), // Remove # prefix
      ...sortedTags,
    ].slice(0, maxTags)

    // Remove duplicates while preserving order
    const uniqueTags = Array.from(new Set(allTags))

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          tags: uniqueTags,
          tagCount: uniqueTags.length,
          hashtags: hashtags.map(t => t.substring(1)),
          keywords: sortedTags,
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

export const tagsTool: McpTool = {
  name: 'tags',
  description: 'Extract tags from text content including hashtags and keywords',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text content to extract tags from',
      },
      maxTags: {
        type: 'number',
        description: 'Maximum number of tags to extract (default: 10)',
        default: 10,
      },
    },
    required: ['text'],
  },
  handler: tagsHandler,
}