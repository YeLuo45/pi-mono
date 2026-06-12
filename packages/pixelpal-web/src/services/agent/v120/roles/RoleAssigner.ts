/**
 * RoleAssigner - Dynamically assigns roles to agents based on task requirements
 */

import type { RoleDefinition, RoleAssignment, TaskRoleRequirement } from '../types';
import { RoleRegistry } from './RoleRegistry';
import { hasAllCapabilities } from './RoleDefinition';

export class RoleAssigner {
  private registry: RoleRegistry;
  private assignmentHistory: RoleAssignment[] = [];

  constructor(registry: RoleRegistry) {
    this.registry = registry;
  }

  assign(requirement: TaskRoleRequirement): RoleAssignment[] {
    const assignments: RoleAssignment[] = [];

    // Get matching roles sorted by priority
    let roles = this.registry.getByTaskType(requirement.taskType);

    // Filter by required capabilities
    if (requirement.requiredCapabilities.length > 0) {
      roles = roles.filter(role => hasAllCapabilities(role, requirement.requiredCapabilities));
    }

    // Handle forced agents
    if (requirement.forcedAgents && requirement.forcedAgents.length > 0) {
      for (const agentId of requirement.forcedAgents) {
        const role = roles.find(r => r.preferredAgents.includes(agentId)) || roles[0];
        if (role) {
          assignments.push(this.createAssignment(role, agentId, requirement.taskId, 1.0, 'forced'));
        }
      }
      return assignments;
    }

    // Exclude agents
    if (requirement.excludedAgents && requirement.excludedAgents.length > 0) {
      roles = roles.map(role => ({
        ...role,
        preferredAgents: role.preferredAgents.filter(a => !requirement.excludedAgents!.includes(a)),
      })).filter(role => role.preferredAgents.length > 0);
    }

    // Auto-assign based on priority
    for (const role of roles.slice(0, requirement.requiredCapabilities.length || 2)) {
      for (const agentId of role.preferredAgents.slice(0, 2)) {
        if (!assignments.some(a => a.agentId === agentId)) {
          assignments.push(this.createAssignment(
            role, agentId, requirement.taskId,
            this.calculateConfidence(role, agentId),
            `Role ${role.name} matched for task type ${requirement.taskType}`
          ));
          if (assignments.length >= (role.maxConcurrent || 2)) break;
        }
      }
    }

    // Store assignment history
    this.assignmentHistory.push(...assignments);

    return assignments;
  }

  getAssignmentHistory(taskId?: string, agentId?: string): RoleAssignment[] {
    let history = this.assignmentHistory;
    if (taskId) history = history.filter(a => a.taskId === taskId);
    if (agentId) history = history.filter(a => a.agentId === agentId);
    return history;
  }

  private createAssignment(
    role: RoleDefinition, agentId: string, taskId: string, confidence: number, reason: string
  ): RoleAssignment {
    return { roleId: role.id, agentId, taskId, confidence, reason, assignedAt: Date.now() };
  }

  private calculateConfidence(role: RoleDefinition, agentId: string): number {
    if (role.preferredAgents.includes(agentId)) return 0.9;
    return 0.5;  // Agent not preferred but capable
  }
}
