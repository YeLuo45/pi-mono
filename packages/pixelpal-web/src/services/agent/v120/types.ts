/**
 * V120 Dynamic Agent Role Switching - Type Definitions
 */

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  capabilities: string[];           // What this role can do
  preferredAgents: string[];        // Preferred agent IDs for this role
  compatibleTaskTypes: string[];    // Task types this role handles well
  priority: number;                 // 0-100, higher = preferred over others
  maxConcurrent: number;            // Max concurrent tasks for this role
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface RoleAssignment {
  roleId: string;
  agentId: string;
  taskId: string;
  confidence: number;               // 0-1 How well this agent fits the role
  reason: string;                   // Why this assignment was made
  assignedAt: number;
}

export interface RoleConfigUpdate {
  roleId: string;
  updates: Partial<Omit<RoleDefinition, 'id' | 'createdAt'>>;
  reason?: string;
}

export interface RoleUsageStats {
  roleId: string;
  totalAssignments: number;
  successfulAssignments: number;
  avgConfidence: number;
  avgDuration: number;              // ms
  loadDistribution: Map<string, number>;  // agentId -> assignment count
}

export interface TaskRoleRequirement {
  taskId: string;
  taskType: string;
  requiredCapabilities: string[];
  preferredRoles?: string[];
  forcedAgents?: string[];          // Force specific agents
  excludedAgents?: string[];        // Exclude specific agents
}
