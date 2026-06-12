# PRD: PixelPal V165 — MCP Tool Ecosystem Phase 1

## 1. Project Overview

- **Project**: pixel-pal-web (PRJ-20260420-002)
- **Version**: V165
- **Direction**: A (MCP Tool Ecosystem)
- **Proposal ID**: P-20260530-057
- **Date**: 2026-05-30
- **Status**: approved_for_dev

## 2. Motivation

V164 delivered MCP Client Bridge for connecting to external MCP Servers. The current `McpToolRegistry.ts` is a simple in-memory registry missing critical features for a production tool ecosystem:

1. **No Permission Control** — Any agent can call any tool without access control
2. **No Tool Discovery** — Tools must be manually registered, no auto-discovery
3. **No Version Management** — Tool updates cannot be tracked or rolled back
4. **No Tool Metadata** — Limited information about tool capabilities

## 3. Goals

Extend V164 MCP Client Bridge into a full **Tool Ecosystem** with:

| Feature | Description |
|---------|-------------|
| PermissionControl | Per-tool access control (owner/role-based) |
| Tool Discovery API | Auto-discover tools from connected agents |
| Version Management | Track tool versions, changelog, deprecation |
| Enhanced Metadata | Tags, categories, provider, capability flags |

## 4. Technical Specification

### 4.1 New Components

```
src/services/mcp/
├── ToolPermission.ts        # NEW: Permission control layer
├── ToolDiscovery.ts         # NEW: Auto-discovery from agents
├── ToolVersion.ts           # NEW: Version management
├── ToolMetadata.ts          # NEW: Enhanced metadata
├── McpToolRegistry.ts       # ENHANCED: Integrate all new features
└── __tests__/
    ├── ToolPermission.test.ts
    ├── ToolDiscovery.test.ts
    ├── ToolVersion.test.ts
    └── ToolMetadata.test.ts
```

### 4.2 ToolPermission

```typescript
interface ToolPermission {
  toolName: string;
  allowedRoles: ('admin' | 'agent' | 'user')[];
  ownerOnly: boolean;
  requiresAuth: boolean;
}

// Core functions
export function setToolPermission(tool: string, permission: ToolPermission): void;
export function getToolPermission(tool: string): ToolPermission | undefined;
export function checkToolAccess(tool: string, role: string): boolean;
export function clearToolPermission(tool: string): void;
```

### 4.3 ToolDiscovery

```typescript
interface DiscoveredTool {
  name: string;
  provider: string;
  version: string;
  category: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
}

// Core functions
export async function discoverToolsFromAgent(agentId: string): Promise<DiscoveredTool[]>;
export function getDiscoveredTools(): DiscoveredTool[];
export function categorizeTools(tools: DiscoveredTool[]): Record<string, DiscoveredTool[]>;
export function searchTools(query: string): DiscoveredTool[];
```

### 4.4 ToolVersion

```typescript
interface ToolVersion {
  version: string;
  changelog: string;
  deprecated: boolean;
  releasedAt: string;
}

// Core functions
export function registerToolVersion(tool: string, version: ToolVersion): void;
export function getToolVersions(tool: string): ToolVersion[];
export function getLatestVersion(tool: string): ToolVersion | undefined;
export function deprecateTool(tool: string, version: string): void;
```

### 4.5 ToolMetadata

```typescript
interface ToolMetadata {
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

// Core functions
export function setToolMetadata(tool: string, metadata: ToolMetadata): void;
export function getToolMetadata(tool: string): ToolMetadata | undefined;
export function getToolsByCategory(category: string): ToolMetadata[];
export function getToolsByTag(tag: string): ToolMetadata[];
export function searchToolsByMetadata(query: string): ToolMetadata[];
```

### 4.6 Enhanced McpToolRegistry Integration

The existing registry functions will be enhanced to integrate with new layers:

| Existing Function | Enhancement |
|------------------|-------------|
| `registerTool()` | Auto-set default permission (admin only) |
| `getTool()` | Return tool with metadata + version |
| `listTools()` | Filter by category, tag, deprecated status |
| `callTool()` | Check permission before execution |

## 5. Testing Requirements

- **Coverage Target**: ≥95%
- **Pass Rate**: 100%
- **Test Location**: `src/services/mcp/__tests__/`
- **Test Files**:
  - `ToolPermission.test.ts`
  - `ToolDiscovery.test.ts`
  - `ToolVersion.test.ts`
  - `ToolMetadata.test.ts`

## 6. Acceptance Criteria

- [ ] `ToolPermission` — CRUD operations work correctly with role-based access
- [ ] `ToolDiscovery` — Can discover tools from agent configs
- [ ] `ToolVersion` — Version registration and deprecation work
- [ ] `ToolMetadata` — Metadata CRUD with category/tag filtering
- [ ] Integration with existing `McpClientBridge` store
- [ ] All tests pass with ≥95% coverage
- [ ] `npm run build` succeeds
- [ ] No new console errors

## 7. Out of Scope

- UI components (handled in future iterations)
- Tool execution sandboxing
- Third-party tool marketplace
