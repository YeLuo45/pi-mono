/**
 * Tool Version - Version Management
 * V165: Manages tool versions and deprecation
 */

export interface ToolVersion {
  version: string;
  changelog: string;
  deprecated: boolean;
  releasedAt: string;
}

// Internal storage for tool versions
const toolVersionsStore = new Map<string, ToolVersion[]>();
const deprecatedToolsSet = new Set<string>();

/**
 * Register a new version for a tool
 */
export function registerToolVersion(tool: string, version: ToolVersion): void {
  if (!toolVersionsStore.has(tool)) {
    toolVersionsStore.set(tool, []);
  }
  
  const versions = toolVersionsStore.get(tool)!;
  
  // Check if version already exists, update if so
  const existingIndex = versions.findIndex(v => v.version === version.version);
  if (existingIndex >= 0) {
    versions[existingIndex] = version;
  } else {
    versions.push(version);
  }
  
  // Sort versions by release date (newest first)
  versions.sort((a, b) => 
    new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime()
  );
}

/**
 * Get all versions for a tool
 */
export function getToolVersions(tool: string): ToolVersion[] {
  return toolVersionsStore.get(tool) ?? [];
}

/**
 * Get the latest version for a tool
 */
export function getLatestVersion(tool: string): ToolVersion | undefined {
  const versions = getToolVersions(tool);
  return versions.length > 0 ? versions[0] : undefined;
}

/**
 * Deprecate a specific version of a tool
 */
export function deprecateTool(tool: string, version: string): void {
  const versions = toolVersionsStore.get(tool);
  if (versions) {
    const targetVersion = versions.find(v => v.version === version);
    if (targetVersion) {
      targetVersion.deprecated = true;
    }
  }
  deprecatedToolsSet.add(tool);
}

/**
 * Get all deprecated tools
 */
export function getDeprecatedTools(): string[] {
  return Array.from(deprecatedToolsSet);
}

/**
 * Check if a tool is deprecated
 */
export function isToolDeprecated(tool: string): boolean {
  return deprecatedToolsSet.has(tool);
}

/**
 * Clear all version data (for testing)
 */
export function clearAllVersions(): void {
  toolVersionsStore.clear();
  deprecatedToolsSet.clear();
}