// V100 Self-Improving Agent Workflow Types

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentType: string;
  totalTasks: number;
  successRate: number;
  avgResponseTime: number;
  selfOptimizationScore: number;
  commonFailurePatterns: string[];
  lastOptimized: string;
  rank: number;
}

export interface OptimizationSuggestion {
  id: string;
  agentId: string;
  agentName: string;
  type: 'add_retry' | 'improve_prompt' | 'add_critic' | 'change_workflow' | 'switch_model';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  autoApplicable: boolean;
}

export interface AgentTaskTrace {
  id: string;
  agentId: string;
  taskType: string;
  success: boolean;
  responseTime: number;
  timestamp: string;
  errorMessage?: string;
}

export type OptimizationType = OptimizationSuggestion['type'];
export type ImpactLevel = OptimizationSuggestion['impact'];