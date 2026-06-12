/**
 * V123 Agent Sandbox Isolation - Type Definitions
 */

export type SandboxStatus = 'pending' | 'initializing' | 'active' | 'paused' | 'terminated' | 'error';
export type SandboxPermission = 'filesystem:read' | 'filesystem:write' | 'network:none' | 'network:limited' | 'network:full' | 'api:limited' | 'api:full';
export type ResourceLimit = { maxMemoryMB: number; maxCpuMs: number; maxExecutionMs: number };

export interface SandboxConfig {
  id?: string;
  name: string;
  description?: string;
  resourceLimit: ResourceLimit;
  permissions: SandboxPermission[];
  agentIds: string[];
  parentSandboxId?: string;
  metadata?: Record<string, unknown>;
}

export interface Sandbox {
  id: string;
  name: string;
  description: string;
  status: SandboxStatus;
  resourceLimit: ResourceLimit;
  permissions: SandboxPermission[];
  agentIds: string[];
  parentSandboxId?: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  metadata: Record<string, unknown>;
}

export interface SandboxMessage {
  id: string;
  sandboxId: string;
  type: 'execute' | 'result' | 'error' | 'status' | 'resource_update';
  payload: unknown;
  timestamp: number;
}

export interface ExecutionResult {
  sandboxId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
  resourceUsage: { memoryMB: number; cpuMs: number };
}

export interface SandboxSnapshot {
  sandboxId: string;
  status: SandboxStatus;
  variables: Record<string, unknown>;
  resourceUsage: { memoryMB: number; cpuMs: number; timestamp: number };
  createdAt: number;
}

export interface SecurityPolicy {
  allowedCapabilities: string[];
  deniedCapabilities: string[];
  resourceLimits: ResourceLimit;
  auditLog: boolean;
  maxConcurrentSandboxes: number;
}

export interface AuditEntry {
  sandboxId: string;
  action: string;
  resource?: string;
  timestamp: number;
  allowed: boolean;
}
