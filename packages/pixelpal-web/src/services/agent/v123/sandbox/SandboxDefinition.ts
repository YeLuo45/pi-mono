/**
 * SandboxDefinition - Sandbox configuration and utilities
 */

import type { Sandbox, SandboxConfig, SandboxStatus } from '../types';

export function createSandboxConfig(data: Omit<SandboxConfig, 'id'>): SandboxConfig {
  return { ...data };
}

export function createSandbox(data: Omit<Sandbox, 'id' | 'createdAt' | 'updatedAt'>): Sandbox {
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getDefaultResourceLimit(): ResourceLimit {
  return {
    maxMemoryMB: 512,
    maxCpuMs: 5000,
    maxExecutionMs: 30000,
  };
}

export function getDefaultPermissions(): SandboxPermission[] {
  return ['filesystem:read', 'network:none', 'api:limited'];
}

export function validateSandboxConfig(config: SandboxConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name || config.name.trim().length < 1) {
    errors.push('Sandbox name is required');
  }

  if (config.resourceLimit.maxMemoryMB <= 0 || config.resourceLimit.maxMemoryMB > 4096) {
    errors.push('Memory limit must be between 1 and 4096 MB');
  }

  if (config.resourceLimit.maxExecutionMs <= 0 || config.resourceLimit.maxExecutionMs > 300000) {
    errors.push('Execution time limit must be between 1ms and 300s');
  }

  if (config.permissions.length === 0) {
    errors.push('At least one permission is required');
  }

  return { valid: errors.length === 0, errors };
}

export function canWriteFiles(sandbox: Sandbox): boolean {
  return sandbox.permissions.includes('filesystem:write');
}

export function hasNetworkAccess(sandbox: Sandbox): boolean {
  return sandbox.permissions.includes('network:limited') || sandbox.permissions.includes('network:full');
}

export function hasFullNetwork(sandbox: Sandbox): boolean {
  return sandbox.permissions.includes('network:full');
}
