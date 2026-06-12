/**
 * PixelPal Agent Types - Core type definitions for the Agent framework
 * 
 * Architecture: User Goal → AgentCore → TaskPlanner → TaskQueue → Tools → Memory → Proactive Reporting
 */

// ============================================================================
// Task & Step Types
// ============================================================================

export type TaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface TaskStep {
  id: string;
  taskId: string;
  index: number;                    // Execution order (0-based)
  description: string;             // Human-readable description
  toolName?: string;               // Tool to invoke
  toolArgs?: Record<string, unknown>; // Arguments for the tool
  status: StepStatus;
  result?: unknown;               // Tool execution result
  error?: string;                  // Error message if failed
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
}

export interface Task {
  id: string;
  goal: string;                   // Original user goal/objective
  status: TaskStatus;
  priority: TaskPriority;
  steps: TaskStep[];              // Ordered execution plan
  currentStepIndex: number;       // Index of currently executing step
  context: Record<string, unknown>; // Shared context across steps
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;                 // Task-level error message
  progress: number;               // 0-100 progress percentage
  result?: unknown;               // Final task result
  personaId?: string;             // Associated persona
}

// ============================================================================
// Agent Message Types
// ============================================================================

export type AgentMessageType = 
  | 'goal_received'
  | 'planning'
  | 'step_starting'
  | 'step_completed'
  | 'step_failed'
  | 'tool_execution'
  | 'memory_query'
  | 'memory_store'
  | 'task_completed'
  | 'task_failed'
  | 'progress_update'
  | 'proactive_report'
  | 'error'
  | 'status';

export interface AgentMessage {
  id: string;
  type: AgentMessageType;
  taskId?: string;
  stepId?: string;
  content: string;                // Human-readable message
  data?: unknown;                 // Structured data payload
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tool System Types
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];    // JSON Schema parameters
  execute: ToolExecutor;          // Actual execution function
  retryable?: boolean;            // Can this tool retry on failure?
  timeout?: number;               // Max execution time in ms
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
}

export type ToolExecutor = (
  args: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolResult>;

export interface ToolExecutionContext {
  taskId: string;
  stepId: string;
  personaId?: string;
  userId?: string;
  conversationHistory: AgentMessage[];
  memoryContext?: MemoryContext;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Memory Context (for tools)
// ============================================================================

export interface MemoryContext {
  recentMemories?: Array<{
    id: string;
    type: string;
    content: string;
    importance: number;
  }>;
  relevantFacts?: string[];
  userPreferences?: string[];
}

// ============================================================================
// Task Planning Types (ReAct Pattern)
// ============================================================================

export interface PlanResult {
  steps: Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[];
  reasoning: string;              // Why these steps were chosen
  estimatedSteps: number;
}

export interface ReActThought {
  thought: string;                // Reasoning about current state
  action: string;                 // Tool name to use
  actionInput: Record<string, unknown>; // Tool arguments
  observation?: string;           // Result of previous action
}

// ============================================================================
// Agent State (for store)
// ============================================================================

export interface AgentState {
  // Task management
  activeTasks: Task[];
  completedTasks: Task[];
  failedTasks: Task[];
  
  // Message stream
  messages: AgentMessage[];
  
  // Status
  isAgentActive: boolean;
  currentTaskId: string | null;
  
  // Memory context
  memoryContext: MemoryContext;
  
  // Settings
  maxConcurrentTasks: number;
  enableProactiveReporting: boolean;
}

export interface AgentActions {
  // Task management
  createTask: (goal: string, options?: Partial<CreateTaskOptions>) => Task;
  startTask: (taskId: string) => Promise<void>;
  pauseTask: (taskId: string) => void;
  resumeTask: (taskId: string) => Promise<void>;
  cancelTask: (taskId: string) => void;
  completeTask: (taskId: string, result?: unknown) => void;
  failTask: (taskId: string, error: string) => void;
  
  // Step management
  startStep: (taskId: string, stepIndex: number) => void;
  completeStep: (taskId: string, stepIndex: number, result: unknown) => void;
  failStep: (taskId: string, stepIndex: number, error: string) => void;
  
  // Message management
  addMessage: (message: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  clearMessages: (taskId?: string) => void;
  
  // Memory context
  setMemoryContext: (context: MemoryContext) => void;
  
  // Task planning (ReAct)
  planTask: (goal: string, context?: Record<string, unknown>) => Promise<PlanResult>;
  
  // Tool execution
  executeStep: (taskId: string, step: TaskStep) => Promise<void>;
  registerTool: (tool: ToolDefinition) => void;
  unregisterTool: (name: string) => void;
}

export interface CreateTaskOptions {
  priority: TaskPriority;
  personaId?: string;
  context: Record<string, unknown>;
}

// ============================================================================
// Event Types (for proactive reporting)
// ============================================================================

export interface ProactiveReport {
  type: 'progress' | 'milestone' | 'warning' | 'completion';
  taskId: string;
  message: string;
  data?: unknown;
  timestamp: number;
}

// ============================================================================
// Emotion Context Types (for EmotionBehaviorEngine integration)
// ============================================================================

export interface EmotionContext {
  detected: boolean
  emotion: string | null
  confidence: number
  recommendedAction: {
    type: 'comfort' | 'encourage' | 'calm' | 'activate' | 'focus_suggest' | 'none'
    message: string
  } | null
  triggered: boolean
}

// ============================================================================
// Scene Context Types (for SceneAwarenessEngine integration)
// ============================================================================

export interface SceneContext {
  detected: boolean
  timeScene: string | null
  isWeekend: boolean
  userState: string | null
  sceneResponse: {
    type: 'suggest' | 'offer_help' | 'remind' | 'adapt' | 'none'
    message: string
    suggestedAction?: string
  } | null
  triggered: boolean
}
