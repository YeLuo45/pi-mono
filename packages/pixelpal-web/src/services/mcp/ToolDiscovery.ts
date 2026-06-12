/**
 * Tool Discovery - Tool Discovery and Categorization
 * V165: Discovers and categorizes tools from external agent configs
 */

import { ExternalAgentConfig } from './McpClientBridge';

export interface DiscoveredTool {
  name: string;
  provider: string;
  version: string;
  category: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
}

// Internal storage for discovered tools
const discoveredToolsStore = new Map<string, DiscoveredTool>();

/**
 * Discover tools from an external agent config
 */
export async function discoverToolsFromAgentConfig(config: ExternalAgentConfig): Promise<DiscoveredTool[]> {
  if (!config.enabled) {
    return [];
  }

  // Simulate tool discovery based on agent capabilities
  const tools: DiscoveredTool[] = [];
  
  // Extract tools from endpoint or generate based on agent type
  const baseTool = {
    provider: config.name,
    version: '1.0.0',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  };

  // Generate standard tool types for any agent
  const standardTools = [
    { name: `${config.name}_analyze`, category: 'analysis', capabilities: ['analyze', 'process'] },
    { name: `${config.name}_query`, category: 'query', capabilities: ['query', 'search'] },
    { name: `${config.name}_execute`, category: 'execution', capabilities: ['execute', 'run'] },
  ];

  for (const tool of standardTools) {
    const discovered: DiscoveredTool = {
      name: tool.name,
      provider: baseTool.provider,
      version: baseTool.version,
      category: tool.category,
      capabilities: tool.capabilities,
      inputSchema: { ...baseTool.inputSchema },
    };
    tools.push(discovered);
    discoveredToolsStore.set(tool.name, discovered);
  }

  return tools;
}

/**
 * Get all discovered tools
 */
export function getDiscoveredTools(): DiscoveredTool[] {
  return Array.from(discoveredToolsStore.values());
}

/**
 * Categorize tools by category
 */
export function categorizeTools(tools: DiscoveredTool[]): Record<string, DiscoveredTool[]> {
  const categories: Record<string, DiscoveredTool[]> = {};
  
  for (const tool of tools) {
    if (!categories[tool.category]) {
      categories[tool.category] = [];
    }
    categories[tool.category].push(tool);
  }
  
  return categories;
}

/**
 * Search discovered tools by query
 */
export function searchDiscoveredTools(query: string): DiscoveredTool[] {
  const lowerQuery = query.toLowerCase();
  
  return Array.from(discoveredToolsStore.values()).filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.provider.toLowerCase().includes(lowerQuery) ||
    tool.category.toLowerCase().includes(lowerQuery) ||
    tool.capabilities.some(c => c.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Clear all discovered tools (for testing)
 */
export function clearDiscoveredTools(): void {
  discoveredToolsStore.clear();
}