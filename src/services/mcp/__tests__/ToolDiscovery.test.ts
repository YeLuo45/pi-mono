/**
 * ToolDiscovery Tests
 * V165: Tests for tool discovery and categorization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  discoverToolsFromAgentConfig,
  getDiscoveredTools,
  categorizeTools,
  searchDiscoveredTools,
  clearDiscoveredTools,
  DiscoveredTool,
} from '../ToolDiscovery'
import { ExternalAgentConfig } from '../McpClientBridge'

describe('ToolDiscovery', () => {
  beforeEach(() => {
    clearDiscoveredTools()
  })

  afterEach(() => {
    clearDiscoveredTools()
  })

  describe('discoverToolsFromAgentConfig', () => {
    it('should discover tools from a valid agent config', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'TestAgent',
        endpoint: 'https://api.testagent.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      
      expect(tools.length).toBeGreaterThan(0)
      expect(tools[0].provider).toBe('TestAgent')
    })

    it('should return empty array for disabled agent', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'DisabledAgent',
        endpoint: 'https://api.disabled.com',
        enabled: false,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      
      expect(tools).toHaveLength(0)
    })

    it('should set correct provider name', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'MyCustomAgent',
        endpoint: 'https://api.custom.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      
      for (const tool of tools) {
        expect(tool.provider).toBe('MyCustomAgent')
      }
    })

    it('should generate tools with version 1.0.0', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'VersionedAgent',
        endpoint: 'https://api.versioned.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      
      for (const tool of tools) {
        expect(tool.version).toBe('1.0.0')
      }
    })

    it('should generate tools with different categories', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'MultiToolAgent',
        endpoint: 'https://api.multi.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      
      const categories = tools.map(t => t.category)
      expect(categories).toContain('analysis')
      expect(categories).toContain('query')
      expect(categories).toContain('execution')
    })

    it('should store discovered tools', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'StoreTestAgent',
        endpoint: 'https://api.store.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const stored = getDiscoveredTools()
      expect(stored.length).toBeGreaterThan(0)
    })

    it('should generate tools with capabilities', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'CapableAgent',
        endpoint: 'https://api.capable.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      
      for (const tool of tools) {
        expect(tool.capabilities.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getDiscoveredTools', () => {
    it('should return empty array when no tools discovered', () => {
      const tools = getDiscoveredTools()
      expect(tools).toHaveLength(0)
    })

    it('should return all discovered tools', async () => {
      const config1: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'Agent1',
        endpoint: 'https://api.agent1.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }
      const config2: ExternalAgentConfig = {
        id: 'agent-2',
        name: 'Agent2',
        endpoint: 'https://api.agent2.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config1)
      await discoverToolsFromAgentConfig(config2)
      
      const tools = getDiscoveredTools()
      expect(tools.length).toBeGreaterThanOrEqual(6) // 3 tools per agent
    })

    it('should return tools from multiple agents', async () => {
      const config1: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'FirstAgent',
        endpoint: 'https://api.first.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config1)
      
      const tools = getDiscoveredTools()
      const providers = new Set(tools.map(t => t.provider))
      expect(providers.has('FirstAgent')).toBe(true)
    })
  })

  describe('categorizeTools', () => {
    it('should categorize tools by category', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'CategorizeAgent',
        endpoint: 'https://api.cat.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const tools = await discoverToolsFromAgentConfig(config)
      const categories = categorizeTools(tools)
      
      expect(categories['analysis']).toBeDefined()
      expect(categories['query']).toBeDefined()
      expect(categories['execution']).toBeDefined()
    })

    it('should group multiple tools in same category', async () => {
      const tools: DiscoveredTool[] = [
        {
          name: 'tool1',
          provider: 'p1',
          version: '1.0.0',
          category: 'cat1',
          capabilities: ['c1'],
          inputSchema: {},
        },
        {
          name: 'tool2',
          provider: 'p1',
          version: '1.0.0',
          category: 'cat1',
          capabilities: ['c2'],
          inputSchema: {},
        },
        {
          name: 'tool3',
          provider: 'p1',
          version: '1.0.0',
          category: 'cat2',
          capabilities: ['c3'],
          inputSchema: {},
        },
      ]

      const categories = categorizeTools(tools)
      
      expect(categories['cat1']).toHaveLength(2)
      expect(categories['cat2']).toHaveLength(1)
    })

    it('should return empty object for empty array', () => {
      const categories = categorizeTools([])
      expect(Object.keys(categories)).toHaveLength(0)
    })

    it('should handle tools with unique categories', () => {
      const tools: DiscoveredTool[] = [
        {
          name: 'unique1',
          provider: 'p1',
          version: '1.0.0',
          category: 'alpha',
          capabilities: ['c1'],
          inputSchema: {},
        },
        {
          name: 'unique2',
          provider: 'p1',
          version: '1.0.0',
          category: 'beta',
          capabilities: ['c2'],
          inputSchema: {},
        },
      ]

      const categories = categorizeTools(tools)
      
      expect(Object.keys(categories)).toHaveLength(2)
      expect(categories['alpha']).toHaveLength(1)
      expect(categories['beta']).toHaveLength(1)
    })
  })

  describe('searchDiscoveredTools', () => {
    it('should return empty array when no tools match', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'SearchAgent',
        endpoint: 'https://api.search.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const results = searchDiscoveredTools('non-existent-query')
      expect(results).toHaveLength(0)
    })

    it('should search by tool name', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'NameSearchAgent',
        endpoint: 'https://api.name.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const results = searchDiscoveredTools('NameSearchAgent_analyze')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toContain('analyze')
    })

    it('should search by provider name', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'ProviderSearchTest',
        endpoint: 'https://api.provider.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const results = searchDiscoveredTools('ProviderSearchTest')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search by category', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'CategorySearchAgent',
        endpoint: 'https://api.catsearch.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const results = searchDiscoveredTools('analysis')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search by capability', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'CapabilityAgent',
        endpoint: 'https://api.capability.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const results = searchDiscoveredTools('execute')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should be case insensitive', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'CaseInsensitiveAgent',
        endpoint: 'https://api.case.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const upperResults = searchDiscoveredTools('ANALYZE')
      const lowerResults = searchDiscoveredTools('analyze')
      
      expect(upperResults.length).toBe(lowerResults.length)
    })

    it('should match partial strings', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'PartialMatchAgent',
        endpoint: 'https://api.partial.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      
      const results = searchDiscoveredTools('Partial')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('clearDiscoveredTools', () => {
    it('should clear all discovered tools', async () => {
      const config: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'ClearAgent',
        endpoint: 'https://api.clear.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config)
      clearDiscoveredTools()
      
      expect(getDiscoveredTools()).toHaveLength(0)
    })

    it('should clear tools from multiple agents', async () => {
      const config1: ExternalAgentConfig = {
        id: 'agent-1',
        name: 'MultiAgent1',
        endpoint: 'https://api.multi1.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }
      const config2: ExternalAgentConfig = {
        id: 'agent-2',
        name: 'MultiAgent2',
        endpoint: 'https://api.multi2.com',
        enabled: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      await discoverToolsFromAgentConfig(config1)
      await discoverToolsFromAgentConfig(config2)
      clearDiscoveredTools()
      
      expect(getDiscoveredTools()).toHaveLength(0)
    })
  })
})