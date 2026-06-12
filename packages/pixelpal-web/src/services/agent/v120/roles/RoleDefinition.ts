/**
 * RoleDefinition - Individual role definition with capabilities
 */

import type { RoleDefinition } from '../types';

export function createRoleDefinition(
  partial: Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt'>
): RoleDefinition {
  return {
    ...partial,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function updateRoleDefinition(
  role: RoleDefinition,
  updates: Partial<Omit<RoleDefinition, 'id' | 'createdAt'>>
): RoleDefinition {
  return {
    ...role,
    ...updates,
    updatedAt: Date.now(),
  };
}

export function matchesTaskType(role: RoleDefinition, taskType: string): boolean {
  return role.compatibleTaskTypes.includes(taskType) || 
         role.compatibleTaskTypes.includes('*');  // Wildcard matches all
}

export function hasCapability(role: RoleDefinition, capability: string): boolean {
  return role.capabilities.includes(capability) || role.capabilities.includes('*');
}

export function hasAllCapabilities(role: RoleDefinition, capabilities: string[]): boolean {
  return capabilities.every(cap => hasCapability(role, cap));
}
