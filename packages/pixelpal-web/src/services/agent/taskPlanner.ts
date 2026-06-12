/**
 * Task Planner - ReAct (Reasoning + Acting) pattern implementation
 * 
 * Takes a user goal and decomposes it into executable steps using:
 * - Thought: Reasoning about what needs to be done
 * - Action: Tool/operation to perform
 * - Observation: Result that informs next steps
 */

import type { PlanResult, TaskStep, ReActThought, ToolDefinition, Task, ToolExecutionContext } from './types';
import { toolRegistry } from './toolRegistry';

// ============================================================================
// Planning Configuration
// ============================================================================

const MAX_PLANNING_ITERATIONS = 10;
const MAX_STEPS = 20;

// Keywords that indicate specific tool needs
const TOOL_KEYWORDS: Record<string, string[]> = {
  webSearch: ['search', 'find', 'look up', 'google', 'browse', 'web', 'online', 'internet'],
  reminder: ['remind', 'alarm', 'notify', 'schedule', 'remember to', 'tell me later'],
  knowledgeQuery: ['what is', 'who is', 'how to', 'why does', 'explain', 'definition', 'learned'],
  memoryRead: ['remember', 'past', 'previous', 'my', 'I told you', 'earlier', 'before'],
  memoryWrite: ['remember this', 'save', 'store', 'note', 'log', 'keep track'],
};

// ============================================================================
// Goal Classification
// ============================================================================

interface ClassifiedGoal {
  type: 'simple_response' | 'multi_step' | 'search_heavy' | 'memory_heavy' | 'unknown';
  confidence: number;
  suggestedTools: string[];
}

/**
 * Classify the goal type to determine planning strategy
 */
function classifyGoal(goal: string): ClassifiedGoal {
  const lowerGoal = goal.toLowerCase();
  const words = lowerGoal.split(/\s+/);
  
  let simpleResponse = 0;
  let multiStep = 0;
  let searchHeavy = 0;
  let memoryHeavy = 0;
  
  const suggestedTools: string[] = [];
  
  // Check for search-related keywords
  for (const [tool, keywords] of Object.entries(TOOL_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerGoal.includes(keyword)) {
        if (tool === 'webSearch') searchHeavy += 2;
        else if (tool === 'memoryRead') memoryHeavy += 2;
        else if (tool === 'memoryWrite') memoryHeavy += 1;
        else multiStep += 1;
        
        if (!suggestedTools.includes(tool)) {
          suggestedTools.push(tool);
        }
      }
    }
  }
  
  // Check for compound goals (multiple clauses)
  const connectors = ['and then', 'after that', 'also', 'plus', 'and', 'but also'];
  for (const conn of connectors) {
    if (lowerGoal.includes(conn)) {
      multiStep += 1;
    }
  }
  
  // Questions typically need knowledge/memory
  if (lowerGoal.startsWith('what') || lowerGoal.startsWith('who') || 
      lowerGoal.startsWith('how') || lowerGoal.startsWith('why')) {
    multiStep += 1;
    if (!suggestedTools.includes('knowledgeQuery')) {
      suggestedTools.push('knowledgeQuery');
    }
  }
  
  // Conditional logic suggests complex planning
  if (lowerGoal.includes('if ') || lowerGoal.includes('when ') || lowerGoal.includes('depending on')) {
    multiStep += 2;
  }
  
  // Calculate confidence scores
  const total = simpleResponse + multiStep + searchHeavy + memoryHeavy + 1;
  
  if (searchHeavy > multiStep && searchHeavy > memoryHeavy) {
    return { type: 'search_heavy', confidence: searchHeavy / total, suggestedTools };
  }
  if (memoryHeavy > multiStep && memoryHeavy > searchHeavy) {
    return { type: 'memory_heavy', confidence: memoryHeavy / total, suggestedTools };
  }
  if (multiStep > 2) {
    return { type: 'multi_step', confidence: multiStep / total, suggestedTools };
  }
  if (suggestedTools.length === 0) {
    return { type: 'simple_response', confidence: 0.5, suggestedTools: [] };
  }
  
  return { type: 'unknown', confidence: 0.3, suggestedTools };
}

// ============================================================================
// Step Generation
// ============================================================================

/**
 * Generate steps from classified goal
 */
function generateStepsFromClassification(
  goal: string,
  classification: ClassifiedGoal,
  context: Record<string, unknown>
): Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[] {
  const steps: Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[] = [];
  
  switch (classification.type) {
    case 'search_heavy':
      // Step 1: Search for relevant information
      steps.push({
        index: 0,
        description: `Search the web for information related to: "${goal}"`,
        toolName: 'webSearch',
        toolArgs: { query: goal },
      });
      // Step 2: Process and present findings
      steps.push({
        index: 1,
        description: 'Process search results and provide a comprehensive answer',
        toolName: undefined,
        toolArgs: { reasoning: 'Process and synthesize web search results' },
      });
      break;
      
    case 'memory_heavy':
      // Step 1: Query relevant memories
      steps.push({
        index: 0,
        description: 'Retrieve relevant memories and context',
        toolName: 'memoryRead',
        toolArgs: { query: goal, limit: 5 },
      });
      // Step 2: Store new memory if needed
      if (classification.suggestedTools.includes('memoryWrite')) {
        steps.push({
          index: 1,
          description: 'Store important information to memory',
          toolName: 'memoryWrite',
          toolArgs: { content: goal, tags: ['user_goal'] },
        });
        steps.push({
          index: 2,
          description: 'Provide answer based on memory context',
          toolName: undefined,
          toolArgs: { reasoning: 'Use retrieved memories to inform response' },
        });
      } else {
        steps.push({
          index: 1,
          description: 'Provide answer based on memory context',
          toolName: undefined,
          toolArgs: { reasoning: 'Use retrieved memories to inform response' },
        });
      }
      break;
      
    case 'multi_step':
      // Break down compound goals
      const subGoals = parseCompoundGoal(goal);
      subGoals.forEach((subGoal, idx) => {
        const subClassification = classifyGoal(subGoal);
        steps.push({
          index: idx,
          description: subGoal,
          toolName: subClassification.suggestedTools[0],
          toolArgs: { query: subGoal, ...context },
        });
      });
      break;
      
    case 'simple_response':
    case 'unknown':
    default:
      // Try to match to a specific tool or create a response step
      if (classification.suggestedTools.length > 0) {
        steps.push({
          index: 0,
          description: `Execute: ${classification.suggestedTools[0]}`,
          toolName: classification.suggestedTools[0],
          toolArgs: { query: goal, ...context },
        });
      } else {
        // No specific tool needed, just respond
        steps.push({
          index: 0,
          description: `Process user request: "${goal}"`,
          toolName: undefined,
          toolArgs: { reasoning: 'No tool required, provide direct response' },
        });
      }
      break;
  }
  
  return steps;
}

/**
 * Parse compound goals into sub-goals
 */
function parseCompoundGoal(goal: string): string[] {
  // Split on common connectors while preserving the connectors and what follows
  const parts: string[] = [];
  let current = goal;
  
  const patterns = [
    /,\s*then\s+/i,
    /\s+and\s+then\s+/i,
    /\s+after\s+that\s+/i,
    /,\s*also\s+/i,
    /,\s*plus\s+/i,
    /\s+and\s+(?=remember|remind|search|find|look)/i,
  ];
  
  for (const pattern of patterns) {
    const split = current.split(pattern);
    if (split.length > 1) {
      // Found a split point
      const remaining = split.slice(1).join('');
      // Recursively parse the remaining part
      const subParts = parseCompoundGoal(remaining);
      return [split[0], ...subParts];
    }
  }
  
  // Also check for conjunctions between independent clauses
  const conjunctions = /\s+(?:and|but|also)\s+(?=[A-Z])/i;
  const conjSplit = current.split(conjunctions);
  if (conjSplit.length > 1) {
    return conjSplit.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  return [current.trim()];
}

// ============================================================================
// ReAct Planning Loop
// ============================================================================

/**
 * Main ReAct planning function
 * Implements the Reasoning + Acting loop:
 * 1. Thought: Analyze current state and determine what to do
 * 2. Action: Select and execute a tool
 * 3. Observation: Get result that informs next step
 * 4. Repeat until goal is achieved or max iterations reached
 */
export async function planTask(
  goal: string,
  context: Record<string, unknown> = {}
): Promise<PlanResult> {
  const thoughts: ReActThought[] = [];
  let currentGoal = goal;
  let iterations = 0;
  
  console.log(`[TaskPlanner] Planning for goal: "${goal}"`);
  
  // Initial classification
  const classification = classifyGoal(currentGoal);
  console.log(`[TaskPlanner] Classified as: ${classification.type} (confidence: ${classification.confidence.toFixed(2)})`);
  
  // Generate initial steps based on classification
  let steps = generateStepsFromClassification(currentGoal, classification, context);
  
  // ReAct refinement loop
  while (iterations < MAX_PLANNING_ITERATIONS && steps.length < MAX_STEPS) {
    iterations++;
    
    const lastThought: ReActThought = {
      thought: `Analyzing goal "${currentGoal}"`,
      action: 'classify',
      actionInput: { goal: currentGoal },
    };
    
    // Check if we need additional tools based on context
    const needsAdditionalTool = checkContextForTools(context);
    if (needsAdditionalTool && !steps.some(s => s.toolName === needsAdditionalTool)) {
      const toolDef = toolRegistry.get(needsAdditionalTool);
      if (toolDef) {
        lastThought.thought = `Context suggests ${needsAdditionalTool} would be helpful`;
        lastThought.action = needsAdditionalTool;
        lastThought.actionInput = { context };
        
        steps.push({
          index: steps.length,
          description: `Use ${needsAdditionalTool} based on context`,
          toolName: needsAdditionalTool,
          toolArgs: { context },
        });
      }
    }
    
    thoughts.push(lastThought);
    
    // Check if goal seems complete
    if (isGoalAchieved(currentGoal, steps)) {
      console.log(`[TaskPlanner] Goal appears achievable in ${steps.length} steps`);
      break;
    }
    
    // Try to add more context-aware steps
    const additionalSteps = inferAdditionalSteps(currentGoal, steps, context);
    if (additionalSteps.length > 0) {
      steps = [...steps, ...additionalSteps];
    }
  }
  
  const reasoning = buildReasoningText(thoughts, classification);
  
  console.log(`[TaskPlanner] Generated ${steps.length} steps:`, steps.map(s => s.description).join(' → '));
  
  return {
    steps,
    reasoning,
    estimatedSteps: steps.length,
  };
}

/**
 * Check if context hints at additional tool needs
 */
function checkContextForTools(context: Record<string, unknown>): string | null {
  if (!context || Object.keys(context).length === 0) return null;
  
  // Check for time-related context
  if (context.time || context.datetime || context.scheduledTime) {
    return 'reminder';
  }
  
  // Check for knowledge gaps
  if (context.knowledgeGaps || context.unknownFacts) {
    return 'knowledgeQuery';
  }
  
  // Check for memory needs
  if (context.needsMemoryContext || context.priorConversations) {
    return 'memoryRead';
  }
  
  return null;
}

/**
 * Infer additional steps based on current state
 */
function inferAdditionalSteps(
  goal: string,
  existingSteps: Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[],
  context: Record<string, unknown>
): Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[] {
  const additional: Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[] = [];
  const existingTools = existingSteps.map(s => s.toolName).filter(Boolean);
  
  // If we're doing a search but not storing to memory, might want to store key findings
  if (existingTools.includes('webSearch') && !existingTools.includes('memoryWrite')) {
    const lowerGoal = goal.toLowerCase();
    if (lowerGoal.includes('remember') || lowerGoal.includes('save') || lowerGoal.includes('learn')) {
      additional.push({
        index: existingSteps.length,
        description: 'Save important findings to memory',
        toolName: 'memoryWrite',
        toolArgs: { tags: ['web_search_result', 'research'] },
      });
    }
  }
  
  // If reading memory, add a step to synthesize with current goal
  if (existingTools.includes('memoryRead') && !existingTools.includes('knowledgeQuery')) {
    additional.push({
      index: existingSteps.length,
      description: 'Synthesize memory context with current request',
      toolName: undefined,
      toolArgs: { reasoning: 'Combine memory context with new information' },
    });
  }
  
  return additional;
}

/**
 * Check if the current steps appear sufficient to achieve the goal
 */
function isGoalAchieved(
  goal: string,
  steps: Omit<TaskStep, 'id' | 'taskId' | 'status' | 'result' | 'error' | 'startedAt' | 'completedAt' | 'retryCount'>[]
): boolean {
  const lowerGoal = goal.toLowerCase();
  
  // Simple response goals are usually achieved in 1 step
  if (steps.length === 1) return true;
  
  // Check if goal mentions storing/saving - we should have memoryWrite
  if (lowerGoal.includes('remember') || lowerGoal.includes('save') || lowerGoal.includes('store')) {
    if (!steps.some(s => s.toolName === 'memoryWrite')) {
      return false;
    }
  }
  
  // Check if goal mentions searching/finding - we should have webSearch
  if (lowerGoal.includes('find') || lowerGoal.includes('search') || lowerGoal.includes('look up')) {
    if (!steps.some(s => s.toolName === 'webSearch')) {
      return false;
    }
  }
  
  // Check if goal mentions time/reminders - we should have reminder
  if (lowerGoal.includes('remind') || lowerGoal.includes('later') || lowerGoal.includes('schedule')) {
    if (!steps.some(s => s.toolName === 'reminder')) {
      return false;
    }
  }
  
  // If we have 3+ steps, likely covering complex goal
  if (steps.length >= 3) return true;
  
  return steps.length >= 1;
}

/**
 * Build human-readable reasoning text
 */
function buildReasoningText(thoughts: ReActThought[], classification: ClassifiedGoal): string {
  const lines: string[] = [];
  
  lines.push(`Goal classified as "${classification.type}" with ${(classification.confidence * 100).toFixed(0)}% confidence.`);
  
  if (classification.suggestedTools.length > 0) {
    lines.push(`Identified potential tools: ${classification.suggestedTools.join(', ')}.`);
  }
  
  lines.push(`ReAct analysis completed in ${thoughts.length} iterations.`);
  
  return lines.join(' ');
}

// ============================================================================
// Step Validation
// ============================================================================

/**
 * Validate that a step is properly formed and executable
 */
export function validateStep(step: Partial<TaskStep>): { valid: boolean; error?: string } {
  if (!step.description || step.description.trim().length === 0) {
    return { valid: false, error: 'Step description is required' };
  }
  
  if (step.toolName !== undefined) {
    const tool = toolRegistry.get(step.toolName);
    if (!tool) {
      return { valid: false, error: `Tool "${step.toolName}" is not registered` };
    }
    
    // Validate required parameters
    if (tool.parameters) {
      for (const param of tool.parameters) {
        if (param.required && (step.toolArgs === undefined || step.toolArgs[param.name] === undefined)) {
          return { valid: false, error: `Tool "${step.toolName}" requires parameter "${param.name}"` };
        }
      }
    }
  }
  
  return { valid: true };
}

// ============================================================================
// Task Creation & Execution (V20 Agent Chat Integration)
// ============================================================================

/**
 * Goal-oriented intent detection patterns
 * Matches: "帮我X" "规划X" "完成X" "帮我整理X" "帮我查一下" etc.
 */
const GOAL_PATTERNS: RegExp[] = [
  /^帮我[做些些]/,
  /^帮我整理/,
  /^帮我查一下/,
  /^帮我搜索/,
  /^帮我规划/,
  /^帮我完成/,
  /^帮我处理/,
  /^帮我解决/,
  /^帮我安排/,
  /^帮我找到/,
  /^帮我创建/,
  /^帮我生成/,
  /^帮我写/,
  /^帮我分析/,
  /^帮我总结/,
  /^帮我执行/,
  /^帮我开始/,
  /^请帮我/,
  /^帮我/,
  /规划/,
  /完成.+/,
  /^做.+\/计划/,
  /^制定.+\/计划/,
  /^开始.+\/任务/,
  /^执行.+\/任务/,
];

export function isGoalOriented(text: string): boolean {
  const trimmed = text.trim();
  return GOAL_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Create a task from a user goal string
 * Returns the created Task object with steps
 */
export async function createTaskFromGoal(
  goal: string,
  options: {
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    personaId?: string;
  } = {}
): Promise<Task> {
  const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  // Plan the task using ReAct pattern
  const plan = await planTask(goal, { personaId: options.personaId });
  
  // Create task steps with full properties
  const steps: TaskStep[] = plan.steps.map((step, index) => ({
    id: `step_${taskId}_${index}`,
    taskId,
    index,
    description: step.description,
    toolName: step.toolName,
    toolArgs: step.toolArgs,
    status: 'pending' as const,
    retryCount: 0,
  }));

  const task: Task = {
    id: taskId,
    goal,
    status: 'pending',
    priority: options.priority || 'normal',
    steps,
    currentStepIndex: 0,
    context: {
      createdFrom: 'chat',
      reasoning: plan.reasoning,
      personaId: options.personaId,
    },
    createdAt: Date.now(),
    progress: 0,
    personaId: options.personaId,
  };

  console.log(`[TaskPlanner] Created task "${taskId}" for goal: "${goal}"`);
  console.log(`[TaskPlanner] Task has ${steps.length} steps:`, steps.map(s => s.description).join(' → '));

  return task;
}

/**
 * Execute a task and return a report when done/failed
 * Calls onProgress for each step completion
 * Calls onComplete when done, onFail when error
 */
export async function executeTask(
  task: Task,
  callbacks: {
    onProgress?: (task: Task, stepIndex: number, stepDescription: string) => void;
    onComplete?: (task: Task, result: unknown) => void;
    onFail?: (task: Task, error: string) => void;
  } = {}
): Promise<void> {
  console.log(`[TaskPlanner] Executing task "${task.id}": ${task.goal}`);
  
  task.status = 'running';
  task.startedAt = Date.now();

  const toolContext: ToolExecutionContext = {
    taskId: task.id,
    stepId: '',
    personaId: task.personaId,
    conversationHistory: [],
  };

  try {
    for (let i = task.currentStepIndex; i < task.steps.length; i++) {
      const step = task.steps[i];
      step.status = 'running';
      step.startedAt = Date.now();
      task.currentStepIndex = i;

      console.log(`[TaskPlanner] Step ${i + 1}/${task.steps.length}: ${step.description}`);

      callbacks.onProgress?.(task, i, step.description);

      // Execute tool if specified
      if (step.toolName) {
        const toolResult = await toolRegistry.execute(
          step.toolName,
          step.toolArgs || {},
          { ...toolContext, stepId: step.id }
        );

        if (toolResult.success) {
          step.status = 'completed';
          step.result = toolResult.data;
          step.completedAt = Date.now();
        } else {
          step.status = 'failed';
          step.error = toolResult.error;
          step.completedAt = Date.now();
          throw new Error(`Step "${step.description}" failed: ${toolResult.error}`);
        }
      } else {
        // No tool, mark as completed directly
        step.status = 'completed';
        step.completedAt = Date.now();
      }

      task.progress = Math.round(((i + 1) / task.steps.length) * 100);
    }

    // All steps completed
    task.status = 'completed';
    task.completedAt = Date.now();
    task.progress = 100;

    console.log(`[TaskPlanner] Task "${task.id}" completed successfully`);
    callbacks.onComplete?.(task, task.result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    task.status = 'failed';
    task.error = errorMessage;
    task.completedAt = Date.now();

    console.error(`[TaskPlanner] Task "${task.id}" failed:`, errorMessage);
    callbacks.onFail?.(task, errorMessage);
  }
}
