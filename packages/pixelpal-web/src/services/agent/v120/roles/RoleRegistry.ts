/**
 * RoleRegistry - Central registry for all role definitions
 */

import type { RoleDefinition } from '../types';
import { createRoleDefinition, matchesTaskType } from './RoleDefinition';

const DEFAULT_ROLES: Omit<RoleDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Coordinator',
    description: 'Orchestrates multi-agent workflows, breaks down complex tasks',
    capabilities: ['orchestration', 'task_decomposition', 'agent_coordination'],
    preferredAgents: ['MainAgent'],
    compatibleTaskTypes: ['complex', 'multi_step', 'orchestrated'],
    priority: 100,
    maxConcurrent: 1,
    isActive: true,
  },
  {
    name: 'Executor',
    description: 'Executes concrete tasks, runs code, performs actions',
    capabilities: ['execution', 'code_generation', 'tool_use'],
    preferredAgents: ['MainAgent'],
    compatibleTaskTypes: ['action', 'code', 'build'],
    priority: 80,
    maxConcurrent: 3,
    isActive: true,
  },
  {
    name: 'Critic',
    description: 'Reviews outputs, identifies issues, suggests improvements',
    capabilities: ['review', 'critique', 'quality_assurance'],
    preferredAgents: ['MemoryAgent'],
    compatibleTaskTypes: ['review', 'analysis', 'evaluation'],
    priority: 60,
    maxConcurrent: 2,
    isActive: true,
  },
  {
    name: 'Researcher',
    description: 'Searches, retrieves, and synthesizes information',
    capabilities: ['search', 'retrieval', 'synthesis'],
    preferredAgents: ['SearchAgent'],
    compatibleTaskTypes: ['research', 'search', 'lookup'],
    priority: 70,
    maxConcurrent: 2,
    isActive: true,
  },
  {
    name: 'Summarizer',
    description: 'Condenses long content into concise summaries',
    capabilities: ['summarization', 'condensation', 'extraction'],
    preferredAgents: ['MemoryAgent'],
    compatibleTaskTypes: ['summary', 'digest', 'condense'],
    priority: 50,
    maxConcurrent: 3,
    isActive: true,
  },
];

export class RoleRegistry {
  private roles: Map<string, RoleDefinition> = new Map();

  constructor() {
    // Initialize with default roles
    for (const roleData of DEFAULT_ROLES) {
      const role = createRoleDefinition(roleData);
      this.roles.set(role.id, role);
    }
  }

  register(role: RoleDefinition): string {
    this.roles.set(role.id, role);
    return role.id;
  }

  unregister(roleId: string): boolean {
    return this.roles.delete(roleId);
  }

  get(roleId: string): RoleDefinition | undefined {
    return this.roles.get(roleId);
  }

  getByName(name: string): RoleDefinition | undefined {
    for (const role of this.roles.values()) {
      if (role.name.toLowerCase() === name.toLowerCase()) {
        return role;
      }
    }
    return undefined;
  }

  getAll(): RoleDefinition[] {
    return Array.from(this.roles.values()).filter(r => r.isActive);
  }

  getByTaskType(taskType: string): RoleDefinition[] {
    return Array.from(this.roles.values())
      .filter(r => r.isActive && matchesTaskType(r, taskType))
      .sort((a, b) => b.priority - a.priority);
  }

  update(roleId: string, updates: Partial<RoleDefinition>): boolean {
    const role = this.roles.get(roleId);
    if (!role) return false;
    this.roles.set(roleId, { ...role, ...updates, updatedAt: Date.now() });
    return true;
  }

  exportRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  importRoles(roles: RoleDefinition[]): { added: number; updated: number } {
    let added = 0, updated = 0;
    for (const role of roles) {
      const existing = this.roles.get(role.id);
      if (existing) {
        this.roles.set(role.id, role);
        updated++;
      } else {
        this.roles.set(role.id, role);
        added++;
      }
    }
    return { added, updated };
  }
}
