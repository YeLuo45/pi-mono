/**
 * Chain Types
 * V108: Skill Chaining stub
 */

export interface ChainStep {
  id: string;
  name: string;
  skillId: string;
  input?: Record<string, unknown>;
}

export interface ChainDefinition {
  id: string;
  name: string;
  steps: ChainStep[];
  createdAt: number;
  updatedAt: number;
}

export interface ChainExecution {
  id: string;
  chainId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStepIndex: number;
  startedAt: number;
  completedAt?: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface ChainExecutor {
  execute(chain: ChainDefinition, initialInput: Record<string, unknown>): Promise<ChainExecution>;
}

export interface ChainRunner {
  run(chain: ChainDefinition, input: Record<string, unknown>): string;
  cancel(executionId: string): void;
}