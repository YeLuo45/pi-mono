/**
 * Tool Metadata - Enhanced Metadata Management
 * V165: Provides rich metadata for tool discovery and organization
 */

export interface ToolMetadata {
  name: string;
  description: string;
  provider: string;
  category: string;
  tags: string[];
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  version: string;
  deprecated: boolean;
}

// Internal storage for tool metadata
const metadataStore = new Map<string, ToolMetadata>();

/**
 * Set metadata for a tool
 */
export function setToolMetadata(tool: string, metadata: ToolMetadata): void {
  metadataStore.set(tool, { ...metadata, name: tool });
}

/**
 * Get metadata for a tool
 */
export function getToolMetadata(tool: string): ToolMetadata | undefined {
  return metadataStore.get(tool);
}

/**
 * Get all tools in a specific category
 */
export function getToolsByCategory(category: string): ToolMetadata[] {
  return Array.from(metadataStore.values()).filter(
    tool => tool.category.toLowerCase() === category.toLowerCase()
  );
}

/**
 * Get all tools with a specific tag
 */
export function getToolsByTag(tag: string): ToolMetadata[] {
  const lowerTag = tag.toLowerCase();
  return Array.from(metadataStore.values()).filter(
    tool => tool.tags.some(t => t.toLowerCase() === lowerTag)
  );
}

/**
 * Search tools by metadata query
 */
export function searchToolsByMetadata(query: string): ToolMetadata[] {
  const lowerQuery = query.toLowerCase();
  
  return Array.from(metadataStore.values()).filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery) ||
    tool.provider.toLowerCase().includes(lowerQuery) ||
    tool.category.toLowerCase().includes(lowerQuery) ||
    tool.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
    tool.capabilities.some(c => c.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get all unique categories
 */
export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const tool of metadataStore.values()) {
    categories.add(tool.category);
  }
  return Array.from(categories);
}

/**
 * Get all unique tags
 */
export function getAllTags(): string[] {
  const tags = new Set<string>();
  for (const tool of metadataStore.values()) {
    for (const tag of tool.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}

/**
 * Clear all metadata (for testing)
 */
export function clearAllMetadata(): void {
  metadataStore.clear();
}