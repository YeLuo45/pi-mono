/**
 * ToolRegistry and MCP Tools Tests
 * V150: Tests for ToolRegistry, summarizeTool, tagsTool, translateTool, pushStrategyTool, classifyTool, costTool
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ToolRegistry, getRegistry, resetRegistry } from '../tool-registry'
import { summarizeTool } from '../mcp-tools/summarize'
import { tagsTool } from '../mcp-tools/tags'
import { translateTool } from '../mcp-tools/translate'
import { pushStrategyTool } from '../mcp-tools/push-strategy'
import { classifyTool } from '../mcp-tools/classify'
import { costTool } from '../mcp-tools/cost'

describe('ToolRegistry', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
  })

  describe('register/unregister', () => {
    it('should register a tool', () => {
      expect(registry.has('summarize')).toBe(false)
      registry.register(summarizeTool)
      expect(registry.has('summarize')).toBe(true)
    })

    it('should unregister a tool', () => {
      registry.register(summarizeTool)
      expect(registry.has('summarize')).toBe(true)
      registry.unregister('summarize')
      expect(registry.has('summarize')).toBe(false)
    })

    it('should get tool descriptor', () => {
      registry.register(summarizeTool)
      const tool = registry.get('summarize')
      expect(tool).toBeDefined()
      expect(tool?.name).toBe('summarize')
      expect(tool?.description).toBe('Summarize long text content into concise summaries')
    })
  })

  describe('list', () => {
    it('should list all registered tools', () => {
      registry.register(summarizeTool)
      registry.register(tagsTool)
      registry.register(translateTool)

      const tools = registry.list()
      expect(tools.length).toBe(3)
      const names = tools.map(t => t.name).sort()
      expect(names).toEqual(['summarize', 'tags', 'translate'].sort())
    })
  })

  describe('execute', () => {
    it('should execute summarize tool', async () => {
      registry.register(summarizeTool)
      const result = await registry.execute('summarize', {
        text: 'This is a long text that should be summarized. It contains multiple sentences to test the summarization functionality.',
        maxLength: 50,
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
      expect(parsed.summary).toBeDefined()
      expect(parsed.originalLength).toBeGreaterThan(0)
    })

    it('should return error for unknown tool', async () => {
      const result = await registry.execute('unknown-tool', {})
      expect(result.isError).toBe(true)
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(false)
      expect(parsed.error).toContain('Tool not found')
    })
  })

  describe('getToolDefinitions', () => {
    it('should return tool definitions for LLM', () => {
      registry.register(summarizeTool)
      registry.register(tagsTool)

      const defs = registry.getToolDefinitions()
      expect(defs.length).toBe(2)
      expect(defs[0]).toHaveProperty('name')
      expect(defs[0]).toHaveProperty('description')
      expect(defs[0]).toHaveProperty('inputSchema')
    })
  })

  describe('singleton', () => {
    it('should return same instance', () => {
      const reg1 = getRegistry()
      const reg2 = getRegistry()
      expect(reg1).toBe(reg2)
    })

    it('should reset and create new instance', () => {
      const reg1 = getRegistry()
      resetRegistry()
      const reg2 = getRegistry()
      expect(reg1).not.toBe(reg2)
    })
  })
})

describe('summarizeTool', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(summarizeTool)
  })

  it('should summarize text', async () => {
    const result = await summarizeTool.handler!({
      text: 'This is a test. This is another sentence. And a third one for good measure.',
      maxLength: 50,
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.summary).toBeDefined()
    expect(parsed.originalLength).toBeGreaterThan(0)
  })

  it('should require text parameter', async () => {
    const result = await summarizeTool.handler!({})
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Text is required')
  })

  it('should handle empty text', async () => {
    const result = await summarizeTool.handler!({ text: '' })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
  })

  it('should respect maxLength', async () => {
    const longText = 'This is a very long text that contains many words and should be truncated according to the maxLength parameter that was specified.'
    const result = await summarizeTool.handler!({ text: longText, maxLength: 30 })

    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.summaryLength).toBeLessThanOrEqual(30 + 10) // Allow some tolerance for sentence boundary
  })
})

describe('tagsTool', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(tagsTool)
  })

  it('should extract tags from text', async () => {
    const result = await tagsTool.handler!({
      text: 'Hello world hello world goodbye world',
      maxTags: 5,
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.tags).toBeDefined()
    expect(parsed.tagCount).toBeGreaterThan(0)
  })

  it('should extract hashtags', async () => {
    const result = await tagsTool.handler!({
      text: 'Check out #JavaScript and #TypeScript for #programming',
      maxTags: 10,
    })

    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.hashtags).toContain('JavaScript')
    expect(parsed.hashtags).toContain('TypeScript')
    expect(parsed.hashtags).toContain('programming')
  })

  it('should require text parameter', async () => {
    const result = await tagsTool.handler!({})
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Text is required')
  })

  it('should limit tags by maxTags', async () => {
    const result = await tagsTool.handler!({
      text: 'a b c d e f g h i j k l m n o p q r s t u v w x y z a b c d e f g h i j',
      maxTags: 3,
    })

    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.tagCount).toBeLessThanOrEqual(3)
  })
})

describe('translateTool', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(translateTool)
  })

  it('should translate text to Chinese', async () => {
    const result = await translateTool.handler!({
      text: 'hello',
      targetLang: 'zh',
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.original).toBe('hello')
    expect(parsed.translated).toBeDefined()
    expect(parsed.targetLang).toBe('Chinese')
  })

  it('should translate using demo dictionary', async () => {
    const result = await translateTool.handler!({
      text: 'thank you',
      targetLang: 'ja',
    })

    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.translated).toBe('ありがとう')
  })

  it('should require text parameter', async () => {
    const result = await translateTool.handler!({
      targetLang: 'zh',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Text is required')
  })

  it('should require targetLang parameter', async () => {
    const result = await translateTool.handler!({
      text: 'hello',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Target language is required')
  })

  it('should reject unsupported languages', async () => {
    const result = await translateTool.handler!({
      text: 'hello',
      targetLang: 'unsupported',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('Unsupported target language')
  })

  it('should support multiple target languages', async () => {
    const languages = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es']
    for (const lang of languages) {
      const result = await translateTool.handler!({
        text: 'hello',
        targetLang: lang,
      })
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.success).toBe(true)
    }
  })
})

describe('Integration: All tools together', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(summarizeTool)
    registry.register(tagsTool)
    registry.register(translateTool)
    registry.register(pushStrategyTool)
    registry.register(classifyTool)
    registry.register(costTool)
  })

  it('should register and execute all tools', async () => {
    const tools = registry.list()
    expect(tools.length).toBe(6)

    const summarizeResult = await registry.execute('summarize', {
      text: 'This is a test sentence for summarization.',
    })
    expect(JSON.parse(summarizeResult.content[0].text).success).toBe(true)

    const tagsResult = await registry.execute('tags', {
      text: 'Testing tags with #javascript and #typescript',
    })
    expect(JSON.parse(tagsResult.content[0].text).success).toBe(true)

    const translateResult = await registry.execute('translate', {
      text: 'hello',
      targetLang: 'zh',
    })
    expect(JSON.parse(translateResult.content[0].text).success).toBe(true)

    const pushResult = await registry.execute('pushStrategy', {
      title: 'Test Strategy',
      message: 'This is a test notification',
    })
    expect(JSON.parse(pushResult.content[0].text).success).toBe(true)

    const classifyResult = await registry.execute('classify', {
      text: 'The weather today is sunny with some clouds.',
    })
    expect(JSON.parse(classifyResult.content[0].text).success).toBe(true)

    const costResult = await registry.execute('cost', {
      operationType: 'api_call',
      quantity: 100,
    })
    expect(JSON.parse(costResult.content[0].text).success).toBe(true)
  })
})

describe('pushStrategyTool', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(pushStrategyTool)
  })

  it('should push a strategy notification', async () => {
    const result = await pushStrategyTool.handler!({
      title: 'Market Update',
      message: 'Stock prices are rising',
      priority: 'high',
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.notification).toBeDefined()
    expect(parsed.notification.title).toBe('Market Update')
    expect(parsed.notification.priority).toBe('high')
  })

  it('should require title parameter', async () => {
    const result = await pushStrategyTool.handler!({
      message: 'Test message',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Title is required')
  })

  it('should require message parameter', async () => {
    const result = await pushStrategyTool.handler!({
      title: 'Test Title',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Message is required')
  })

  it('should accept valid priority levels', async () => {
    const priorities = ['low', 'normal', 'high', 'urgent']
    for (const priority of priorities) {
      const result = await pushStrategyTool.handler!({
        title: 'Test',
        message: 'Test message',
        priority: priority as 'low' | 'normal' | 'high' | 'urgent',
      })
      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed.notification.priority).toBe(priority)
    }
  })

  it('should reject invalid priority', async () => {
    const result = await pushStrategyTool.handler!({
      title: 'Test',
      message: 'Test message',
      priority: 'invalid',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('Invalid priority')
  })
})

describe('classifyTool', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(classifyTool)
  })

  it('should classify technology text', async () => {
    const result = await classifyTool.handler!({
      text: 'The new software algorithm processes data efficiently using machine learning techniques.',
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.categories).toContain('technology')
  })

  it('should classify business text', async () => {
    const result = await classifyTool.handler!({
      text: 'The company reported strong quarterly revenue and stock prices surged after the investment announcement.',
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.categories).toContain('business')
  })

  it('should require text parameter', async () => {
    const result = await classifyTool.handler!({})
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Text is required')
  })

  it('should respect maxCategories parameter', async () => {
    const result = await classifyTool.handler!({
      text: 'Technology business software internet',
      maxCategories: 2,
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.categories.length).toBeLessThanOrEqual(2)
  })

  it('should reject invalid maxCategories', async () => {
    const result = await classifyTool.handler!({
      text: 'Some text',
      maxCategories: 15,
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('maxCategories must be between 1 and 10')
  })
})

describe('costTool', () => {
  let registry: ToolRegistry

  beforeEach(() => {
    resetRegistry()
    registry = getRegistry()
    registry.clear()
    registry.register(costTool)
  })

  it('should estimate API call cost', async () => {
    const result = await costTool.handler!({
      operationType: 'api_call',
      quantity: 1000,
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.estimatedCost).toBe(1.0) // 1000 * 0.001
    expect(parsed.currency).toBe('USD')
  })

  it('should estimate storage cost', async () => {
    const result = await costTool.handler!({
      operationType: 'storage_gb',
      quantity: 100,
    })

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(true)
    expect(parsed.estimatedCost).toBe(2.3) // 100 * 0.023
  })

  it('should require operationType parameter', async () => {
    const result = await costTool.handler!({
      quantity: 100,
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toBe('Operation type is required')
  })

  it('should require quantity parameter', async () => {
    const result = await costTool.handler!({
      operationType: 'api_call',
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('Quantity must be a non-negative number')
  })

  it('should reject negative quantity', async () => {
    const result = await costTool.handler!({
      operationType: 'api_call',
      quantity: -10,
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
  })

  it('should apply complexity multiplier', async () => {
    const simpleResult = await costTool.handler!({
      operationType: 'api_call',
      quantity: 100,
      complexity: 'simple',
    })
    const complexResult = await costTool.handler!({
      operationType: 'api_call',
      quantity: 100,
      complexity: 'complex',
    })

    const simpleParsed = JSON.parse(simpleResult.content[0].text)
    const complexParsed = JSON.parse(complexResult.content[0].text)
    // Unit costs: simple=0.001, complex=0.1, api_call=0.001
    expect(simpleParsed.estimatedCost).toBe(0.1)
    expect(complexParsed.estimatedCost).toBe(10.0)
  })

  it('should reject unknown operation type', async () => {
    const result = await costTool.handler!({
      operationType: 'unknown_operation',
      quantity: 100,
    })
    expect(result.isError).toBe(true)
    const parsed = JSON.parse(result.content[0].text)
    expect(parsed.success).toBe(false)
    expect(parsed.error).toContain('Unknown operation type')
  })
})