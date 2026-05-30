/**
 * ToolMetadata Tests
 * V165: Tests for enhanced metadata management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  setToolMetadata,
  getToolMetadata,
  getToolsByCategory,
  getToolsByTag,
  searchToolsByMetadata,
  getAllCategories,
  getAllTags,
  clearAllMetadata,
  ToolMetadata,
} from '../ToolMetadata'

describe('ToolMetadata', () => {
  beforeEach(() => {
    clearAllMetadata()
  })

  afterEach(() => {
    clearAllMetadata()
  })

  describe('setToolMetadata & getToolMetadata', () => {
    it('should set and get metadata for a tool', () => {
      const metadata: ToolMetadata = {
        name: 'test-tool',
        description: 'A test tool',
        provider: 'TestProvider',
        category: 'testing',
        tags: ['test', 'demo'],
        capabilities: ['execute', 'query'],
        inputSchema: { type: 'object' },
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('test-tool', metadata)
      const result = getToolMetadata('test-tool')

      expect(result).toBeDefined()
      expect(result?.name).toBe('test-tool')
      expect(result?.description).toBe('A test tool')
      expect(result?.provider).toBe('TestProvider')
      expect(result?.category).toBe('testing')
      expect(result?.tags).toContain('test')
      expect(result?.capabilities).toContain('execute')
    })

    it('should return undefined for non-existent tool', () => {
      const result = getToolMetadata('non-existent')
      expect(result).toBeUndefined()
    })

    it('should overwrite existing metadata', () => {
      const meta1: ToolMetadata = {
        name: 'update-tool',
        description: 'Original description',
        provider: 'Provider1',
        category: 'cat1',
        tags: ['tag1'],
        capabilities: ['cap1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta2: ToolMetadata = {
        name: 'update-tool',
        description: 'Updated description',
        provider: 'Provider2',
        category: 'cat2',
        tags: ['tag2'],
        capabilities: ['cap2'],
        inputSchema: {},
        version: '2.0.0',
        deprecated: true,
      }

      setToolMetadata('update-tool', meta1)
      setToolMetadata('update-tool', meta2)
      const result = getToolMetadata('update-tool')

      expect(result?.description).toBe('Updated description')
      expect(result?.provider).toBe('Provider2')
      expect(result?.version).toBe('2.0.0')
      expect(result?.deprecated).toBe(true)
    })

    it('should handle complex inputSchema', () => {
      const metadata: ToolMetadata = {
        name: 'complex-tool',
        description: 'Tool with complex schema',
        provider: 'ComplexProvider',
        category: 'processing',
        tags: ['advanced'],
        capabilities: ['process'],
        inputSchema: {
          type: 'object',
          properties: {
            input: { type: 'string' },
            options: { type: 'object' },
          },
          required: ['input'],
        },
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('complex-tool', metadata)
      const result = getToolMetadata('complex-tool')

      expect(result?.inputSchema).toHaveProperty('properties')
      expect(result?.inputSchema).toHaveProperty('required')
    })
  })

  describe('getToolsByCategory', () => {
    it('should return tools in a specific category', () => {
      const meta1: ToolMetadata = {
        name: 'tool1',
        description: 'Tool 1',
        provider: 'p1',
        category: 'analysis',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta2: ToolMetadata = {
        name: 'tool2',
        description: 'Tool 2',
        provider: 'p1',
        category: 'execution',
        tags: ['t2'],
        capabilities: ['c2'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta3: ToolMetadata = {
        name: 'tool3',
        description: 'Tool 3',
        provider: 'p1',
        category: 'analysis',
        tags: ['t3'],
        capabilities: ['c3'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('tool1', meta1)
      setToolMetadata('tool2', meta2)
      setToolMetadata('tool3', meta3)

      const analysisTools = getToolsByCategory('analysis')
      expect(analysisTools).toHaveLength(2)
      expect(analysisTools.map(t => t.name)).toContain('tool1')
      expect(analysisTools.map(t => t.name)).toContain('tool3')
    })

    it('should return empty array for non-existent category', () => {
      const meta: ToolMetadata = {
        name: 'tool1',
        description: 'Tool 1',
        provider: 'p1',
        category: 'existing',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('tool1', meta)

      const result = getToolsByCategory('non-existent')
      expect(result).toHaveLength(0)
    })

    it('should be case insensitive', () => {
      const meta: ToolMetadata = {
        name: 'case-tool',
        description: 'Case test',
        provider: 'p1',
        category: 'TestCategory',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('case-tool', meta)

      expect(getToolsByCategory('testcategory')).toHaveLength(1)
      expect(getToolsByCategory('TESTCATEGORY')).toHaveLength(1)
    })
  })

  describe('getToolsByTag', () => {
    it('should return tools with a specific tag', () => {
      const meta1: ToolMetadata = {
        name: 'tagged-tool1',
        description: 'Tool with tag',
        provider: 'p1',
        category: 'cat1',
        tags: ['javascript', 'web'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta2: ToolMetadata = {
        name: 'tagged-tool2',
        description: 'Another tool with tag',
        provider: 'p1',
        category: 'cat2',
        tags: ['javascript', 'node'],
        capabilities: ['c2'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta3: ToolMetadata = {
        name: 'untagged-tool',
        description: 'Tool without tag',
        provider: 'p1',
        category: 'cat3',
        tags: ['python'],
        capabilities: ['c3'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('tagged-tool1', meta1)
      setToolMetadata('tagged-tool2', meta2)
      setToolMetadata('untagged-tool', meta3)

      const jsTools = getToolsByTag('javascript')
      expect(jsTools).toHaveLength(2)
      expect(jsTools.map(t => t.name)).toContain('tagged-tool1')
      expect(jsTools.map(t => t.name)).toContain('tagged-tool2')
    })

    it('should be case insensitive', () => {
      const meta: ToolMetadata = {
        name: 'case-tag-tool',
        description: 'Case tag test',
        provider: 'p1',
        category: 'cat1',
        tags: ['TypeScript'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('case-tag-tool', meta)

      expect(getToolsByTag('typescript')).toHaveLength(1)
      expect(getToolsByTag('TYPESCRIPT')).toHaveLength(1)
    })

    it('should return empty array for non-existent tag', () => {
      const result = getToolsByTag('non-existent-tag')
      expect(result).toHaveLength(0)
    })
  })

  describe('searchToolsByMetadata', () => {
    it('should search by tool name', () => {
      const meta: ToolMetadata = {
        name: 'searchable-tool',
        description: 'A searchable tool',
        provider: 'p1',
        category: 'cat1',
        tags: ['search'],
        capabilities: ['search'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('searchable-tool', meta)

      const results = searchToolsByMetadata('searchable')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('searchable-tool')
    })

    it('should search by description', () => {
      const meta: ToolMetadata = {
        name: 'desc-tool',
        description: 'This tool does amazing data processing',
        provider: 'p1',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('desc-tool', meta)

      const results = searchToolsByMetadata('data processing')
      expect(results).toHaveLength(1)
    })

    it('should search by provider', () => {
      const meta: ToolMetadata = {
        name: 'provider-tool',
        description: 'Test',
        provider: 'AwesomeProvider',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('provider-tool', meta)

      const results = searchToolsByMetadata('AwesomeProvider')
      expect(results).toHaveLength(1)
    })

    it('should search by category', () => {
      const meta: ToolMetadata = {
        name: 'cat-tool',
        description: 'Test',
        provider: 'p1',
        category: 'machine-learning',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('cat-tool', meta)

      const results = searchToolsByMetadata('machine-learning')
      expect(results).toHaveLength(1)
    })

    it('should search by tag', () => {
      const meta: ToolMetadata = {
        name: 'tag-search-tool',
        description: 'Test',
        provider: 'p1',
        category: 'cat1',
        tags: ['machine-learning', 'ai'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('tag-search-tool', meta)

      const results = searchToolsByMetadata('machine-learning')
      expect(results).toHaveLength(1)
    })

    it('should search by capability', () => {
      const meta: ToolMetadata = {
        name: 'capability-tool',
        description: 'Test',
        provider: 'p1',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['analyze', 'visualize'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('capability-tool', meta)

      const results = searchToolsByMetadata('visualize')
      expect(results).toHaveLength(1)
    })

    it('should return empty array for no matches', () => {
      const meta: ToolMetadata = {
        name: 'nomatch-tool',
        description: 'Test tool',
        provider: 'p1',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('nomatch-tool', meta)

      const results = searchToolsByMetadata('xyz123none')
      expect(results).toHaveLength(0)
    })

    it('should be case insensitive', () => {
      const meta: ToolMetadata = {
        name: 'CaseSearchTool',
        description: 'Case sensitive test',
        provider: 'p1',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('CaseSearchTool', meta)

      expect(searchToolsByMetadata('case')).toHaveLength(1)
      expect(searchToolsByMetadata('CASE')).toHaveLength(1)
    })

    it('should match partial strings', () => {
      const meta: ToolMetadata = {
        name: 'partial-match-tool',
        description: 'Test',
        provider: 'p1',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('partial-match-tool', meta)

      const results = searchToolsByMetadata('partial')
      expect(results).toHaveLength(1)
    })
  })

  describe('getAllCategories', () => {
    it('should return unique categories', () => {
      const meta1: ToolMetadata = {
        name: 'tool1',
        description: 'Test',
        provider: 'p1',
        category: 'analysis',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta2: ToolMetadata = {
        name: 'tool2',
        description: 'Test',
        provider: 'p1',
        category: 'execution',
        tags: ['t2'],
        capabilities: ['c2'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta3: ToolMetadata = {
        name: 'tool3',
        description: 'Test',
        provider: 'p1',
        category: 'analysis',
        tags: ['t3'],
        capabilities: ['c3'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('tool1', meta1)
      setToolMetadata('tool2', meta2)
      setToolMetadata('tool3', meta3)

      const categories = getAllCategories()
      expect(categories).toHaveLength(2)
      expect(categories).toContain('analysis')
      expect(categories).toContain('execution')
    })

    it('should return empty array when no tools exist', () => {
      const categories = getAllCategories()
      expect(categories).toHaveLength(0)
    })
  })

  describe('getAllTags', () => {
    it('should return unique tags', () => {
      const meta1: ToolMetadata = {
        name: 'tool1',
        description: 'Test',
        provider: 'p1',
        category: 'cat1',
        tags: ['javascript', 'web'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta2: ToolMetadata = {
        name: 'tool2',
        description: 'Test',
        provider: 'p1',
        category: 'cat2',
        tags: ['javascript', 'node'],
        capabilities: ['c2'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }
      const meta3: ToolMetadata = {
        name: 'tool3',
        description: 'Test',
        provider: 'p1',
        category: 'cat3',
        tags: ['python'],
        capabilities: ['c3'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('tool1', meta1)
      setToolMetadata('tool2', meta2)
      setToolMetadata('tool3', meta3)

      const tags = getAllTags()
      expect(tags).toHaveLength(4) // javascript, web, node, python
      expect(tags).toContain('javascript')
      expect(tags).toContain('web')
      expect(tags).toContain('node')
      expect(tags).toContain('python')
    })

    it('should return empty array when no tools exist', () => {
      const tags = getAllTags()
      expect(tags).toHaveLength(0)
    })
  })

  describe('clearAllMetadata', () => {
    it('should clear all metadata', () => {
      const meta: ToolMetadata = {
        name: 'clear-tool',
        description: 'Test',
        provider: 'p1',
        category: 'cat1',
        tags: ['t1'],
        capabilities: ['c1'],
        inputSchema: {},
        version: '1.0.0',
        deprecated: false,
      }

      setToolMetadata('clear-tool', meta)
      clearAllMetadata()

      expect(getToolMetadata('clear-tool')).toBeUndefined()
      expect(getAllCategories()).toHaveLength(0)
      expect(getAllTags()).toHaveLength(0)
    })

    it('should clear metadata from multiple tools', () => {
      const meta1: ToolMetadata = { name: 'tool1', description: 'Test1', provider: 'p1', category: 'c1', tags: ['t1'], capabilities: ['c1'], inputSchema: {}, version: '1.0.0', deprecated: false }
      const meta2: ToolMetadata = { name: 'tool2', description: 'Test2', provider: 'p1', category: 'c2', tags: ['t2'], capabilities: ['c2'], inputSchema: {}, version: '1.0.0', deprecated: false }

      setToolMetadata('tool1', meta1)
      setToolMetadata('tool2', meta2)
      clearAllMetadata()

      expect(getToolMetadata('tool1')).toBeUndefined()
      expect(getToolMetadata('tool2')).toBeUndefined()
    })
  })
})