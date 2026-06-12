/**
 * classifyTool - Text classification tool
 * Classifies text content into categories using keyword matching
 */

import type { McpTool, ToolResult } from '../tool-registry.ts'

// Predefined categories with associated keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'technology': ['software', 'hardware', 'computer', 'digital', 'code', 'programming', 'algorithm', 'data', 'system', 'network', 'server', 'cloud', 'ai', 'machine learning', 'web', 'app', 'device'],
  'business': ['company', 'market', 'sales', 'revenue', 'profit', 'investment', 'stock', 'economy', 'finance', 'trade', 'corporate', 'startup', 'enterprise', 'management'],
  'science': ['research', 'experiment', 'hypothesis', 'theory', 'scientific', 'study', 'discovery', 'physics', 'chemistry', 'biology', 'laboratory', 'data', 'analysis'],
  'health': ['health', 'medical', 'doctor', 'hospital', 'disease', 'treatment', 'patient', 'medicine', 'wellness', 'fitness', 'healthcare', 'symptom', 'diagnosis'],
  'entertainment': ['movie', 'music', 'game', 'film', 'actor', 'celebrity', 'entertainment', 'show', 'concert', 'tv', 'streaming', 'video', 'drama', 'comedy'],
  'sports': ['sport', 'team', 'player', 'game', 'match', 'championship', 'tournament', 'score', 'league', 'football', 'basketball', 'soccer', 'tennis', 'athlete'],
  'education': ['school', 'university', 'student', 'teacher', 'course', 'learning', 'education', 'class', 'exam', 'degree', 'study', 'training', 'academic'],
  'politics': ['government', 'political', 'policy', 'election', 'vote', 'congress', 'parliament', 'law', 'regulation', 'democracy', 'politician', 'campaign'],
  'food': ['food', 'restaurant', 'recipe', 'cooking', 'meal', 'ingredient', 'chef', 'dish', 'cuisine', 'eat', 'dinner', 'lunch', 'breakfast'],
  'travel': ['travel', 'trip', 'destination', 'vacation', 'hotel', 'flight', 'tourism', 'airport', 'journey', 'visit', 'tourist', 'explore'],
}

// Default fallback category
const DEFAULT_CATEGORY = 'general'

function classifyText(text: string): string[] {
  const lowerText = text.toLowerCase()
  const matchedCategories: string[] = []
  const categoryScores: Map<string, number> = new Map()

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score++
      }
    }
    if (score > 0) {
      categoryScores.set(category, score)
    }
  }

  // Sort by score descending
  const sorted = Array.from(categoryScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category)

  return sorted.length > 0 ? sorted : [DEFAULT_CATEGORY]
}

/**
 * Classify text into categories
 * @param text - The text to classify
 * @param maxCategories - Maximum number of categories to return (default: 3)
 */
async function classifyHandler(args: {
  text: string
  maxCategories?: number
}): Promise<ToolResult> {
  try {
    const { text, maxCategories = 3 } = args

    if (!text || typeof text !== 'string') {
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Text is required' }) }],
        isError: true,
      }
    }

    if (maxCategories < 1 || maxCategories > 10) {
      return {
        content: [{ type: 'text', text: JSON.stringify({
          success: false,
          error: 'maxCategories must be between 1 and 10',
        }) }],
        isError: true,
      }
    }

    const categories = classifyText(text)
    const topCategories = categories.slice(0, maxCategories)

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          categories: topCategories,
          allCategories: categories,
          confidence: categories.length > 0 ? 'high' : 'low',
          textLength: text.length,
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

export const classifyTool: McpTool = {
  name: 'classify',
  description: 'Classify text content into categories based on keyword analysis',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text content to classify',
      },
      maxCategories: {
        type: 'number',
        description: 'Maximum number of categories to return (default: 3, max: 10)',
        default: 3,
      },
    },
    required: ['text'],
  },
  handler: classifyHandler,
}