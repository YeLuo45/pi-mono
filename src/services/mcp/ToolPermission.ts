/**
 * Tool Permission - Permission Control Layer
 * V165: Role-based access control for MCP tools
 */

export type ToolRole = 'admin' | 'agent' | 'user';

export interface ToolPermission {
  toolName: string;
  allowedRoles: ToolRole[];
  ownerOnly: boolean;
  requiresAuth: boolean;
}

// Internal storage for permissions
const permissionStore = new Map<string, ToolPermission>();

/**
 * Set permission for a tool
 */
export function setToolPermission(tool: string, permission: ToolPermission): void {
  permissionStore.set(tool, { ...permission, toolName: tool });
}

/**
 * Get permission for a tool
 */
export function getToolPermission(tool: string): ToolPermission | undefined {
  return permissionStore.get(tool);
}

/**
 * Check if a role has access to a tool
 * 
 * Access rules:
 * - If requiresAuth is false, access is granted (no auth needed)
 * - If ownerOnly is true, access is denied (owner-only tool)
 * - If role is in allowedRoles, access is granted
 * - Otherwise, access is denied
 */
export function checkToolAccess(tool: string, role: string): boolean {
  const permission = permissionStore.get(tool);
  
  if (!permission) {
    return false;
  }
  
  // If auth is not required, grant access
  if (!permission.requiresAuth) {
    return true;
  }
  
  // Owner-only tools deny all role-based access
  if (permission.ownerOnly) {
    return false;
  }
  
  // Check if role is in allowedRoles
  return permission.allowedRoles.includes(role as ToolRole);
}

/**
 * Clear permission for a tool
 */
export function clearToolPermission(tool: string): void {
  permissionStore.delete(tool);
}

/**
 * Get all tools accessible by a specific role
 */
export function getToolsByPermission(role: string): string[] {
  const tools: string[] = [];
  
  for (const [tool, permission] of permissionStore.entries()) {
    if (checkToolAccess(tool, role)) {
      tools.push(tool);
    }
  }
  
  return tools;
}

/**
 * Clear all permissions (for testing)
 */
export function clearAllPermissions(): void {
  permissionStore.clear();
}