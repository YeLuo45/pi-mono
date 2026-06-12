/**
 * Task Decomposer - V33 Multi-Agent Collaboration System
 * 
 * Breaks down complex user requests into executable subtasks
 * with dependency tracking for parallel execution.
 */

import type { Subtask, PersonaRole, TaskType } from './types';

// ============================================================================
// Task Decomposition Prompt Templates
// ============================================================================

const DECOMPOSITION_PROMPT = `你是一个任务分解专家。将用户的复杂请求分解成可执行的子任务。

每个子任务需要指定：
- type: 任务类型
- params: 任务参数
- responsible: 负责角色
- description: 任务描述（50字以内）
- dependencies: 依赖的其他子任务ID（如果没有则为空数组）

支持的任务类型：
- memory_retrieval: 从记忆库检索相关信息
- emotion_analysis: 分析情绪数据
- advice_generation: 生成建议
- web_search: 网络搜索
- code_execution: 执行代码

支持的角色：
- MemoryExpert: 记忆专家，擅长检索和分析记忆
- EmotionAnalyst: 情感分析师，擅长情绪曲线分析
- Advisor: 建议生成器，擅长综合分析给出建议
- Researcher: 研究员，擅长信息搜集
- Coder: 程序员，擅长代码执行

规则：
- 子任务之间如果存在数据依赖，需明确标注 dependency
- 尽量并行化独立任务
- 每个子任务描述不超过50字
- 分析类任务由 EmotionAnalyst 负责
- 记忆类任务由 MemoryExpert 负责
- 建议类任务由 Advisor 负责`;

const ANALYSIS_TRIGGER_KEYWORDS = [
  '分析', '情绪', '心情', '感受', '分析一下', '看看',
  'emotion', 'feeling', 'mood', 'analyze',
];

const MEMORY_TRIGGER_KEYWORDS = [
  '记忆', '记得', '以前', '过去', '曾经', '历史',
  'memory', 'remember', 'past', 'history',
];

const ADVICE_TRIGGER_KEYWORDS = [
  '建议', '怎么办', '如何', '应该', '好不好',
  'advice', 'suggest', 'should', 'how to',
];

// ============================================================================
// Task Decomposer Implementation
// ============================================================================

export interface DecompositionResult {
  subtasks: Subtask[];
  reasoning: string;
  estimatedDuration: number;  // Estimated time in ms
}

/**
 * Decompose a user request into subtasks
 */
export class TaskDecomposer {
  private personaId: string;

  constructor(personaId: string = 'orchestrator') {
    this.personaId = personaId;
  }

  /**
   * Main decomposition method
   * Analyzes the request and generates subtasks
   */
  async decompose(userRequest: string): Promise<DecompositionResult> {
    const request = userRequest.toLowerCase().trim();
    
    // Detect task complexity and type
    const taskTypes = this.detectTaskTypes(request);
    const hasEmotionAnalysis = taskTypes.includes('emotion_analysis');
    const hasMemoryRetrieval = taskTypes.includes('memory_retrieval');
    const hasAdviceRequest = taskTypes.includes('advice_generation');
    
    const subtasks: Subtask[] = [];
    const now = Date.now();
    let taskCounter = 0;

    // Build subtask sequence based on detected types
    if (hasEmotionAnalysis) {
      // Emotion analysis typically needs memory data first
      if (hasMemoryRetrieval) {
        subtasks.push(this.createSubtask(
          `subtask_${++taskCounter}`,
          'memory_retrieval',
          '检索相关记忆数据',
          { timeRange: '7d', query: request },
          'MemoryExpert',
          []
        ));
        subtasks.push(this.createSubtask(
          `subtask_${++taskCounter}`,
          'emotion_analysis',
          '分析情绪数据',
          { dataSource: 'subtask_1', timeRange: '7d' },
          'EmotionAnalyst',
          ['subtask_1']
        ));
      } else {
        subtasks.push(this.createSubtask(
          `subtask_${++taskCounter}`,
          'emotion_analysis',
          '分析情绪数据',
          { timeRange: '7d' },
          'EmotionAnalyst',
          []
        ));
      }
      
      if (hasAdviceRequest) {
        const emotionTaskId = hasMemoryRetrieval ? 'subtask_2' : 'subtask_1';
        subtasks.push(this.createSubtask(
          `subtask_${++taskCounter}`,
          'advice_generation',
          '生成行动建议',
          { emotionData: emotionTaskId },
          'Advisor',
          [emotionTaskId]
        ));
      }
    } else if (hasMemoryRetrieval) {
      subtasks.push(this.createSubtask(
        `subtask_${++taskCounter}`,
        'memory_retrieval',
        '检索相关记忆',
        { timeRange: '30d', query: request },
        'MemoryExpert',
        []
      ));
      
      if (hasAdviceRequest) {
        subtasks.push(this.createSubtask(
          `subtask_${++taskCounter}`,
          'advice_generation',
          '生成建议',
          { memoryData: 'subtask_1' },
          'Advisor',
          ['subtask_1']
        ));
      }
    } else if (hasAdviceRequest) {
      // General advice - needs research first
      subtasks.push(this.createSubtask(
        `subtask_${++taskCounter}`,
        'web_search',
        '搜集相关信息',
        { query: request },
        'Researcher',
        []
      ));
      subtasks.push(this.createSubtask(
        `subtask_${++taskCounter}`,
        'advice_generation',
        '生成建议',
        { researchData: 'subtask_1' },
        'Advisor',
        ['subtask_1']
      ));
    } else {
      // Default: simple response task
      subtasks.push(this.createSubtask(
        `subtask_${++taskCounter}`,
        'memory_retrieval',
        '检索相关记忆',
        { query: request },
        'MemoryExpert',
        []
      ));
    }

    return {
      subtasks,
      reasoning: this.generateReasoning(taskTypes, subtasks.length),
      estimatedDuration: this.estimateDuration(subtasks),
    };
  }

  /**
   * Detect which task types are relevant to the request
   */
  private detectTaskTypes(request: string): TaskType[] {
    const types: TaskType[] = [];
    
    // Check for emotion analysis triggers
    if (ANALYSIS_TRIGGER_KEYWORDS.some(kw => request.includes(kw))) {
      types.push('emotion_analysis');
    }
    
    // Check for memory retrieval triggers
    if (MEMORY_TRIGGER_KEYWORDS.some(kw => request.includes(kw))) {
      types.push('memory_retrieval');
    }
    
    // Check for advice generation triggers
    if (ADVICE_TRIGGER_KEYWORDS.some(kw => request.includes(kw))) {
      types.push('advice_generation');
    }

    // If no specific type detected, default to memory retrieval
    if (types.length === 0) {
      types.push('memory_retrieval');
    }

    return types;
  }

  /**
   * Create a subtask object
   */
  private createSubtask(
    id: string,
    type: TaskType,
    description: string,
    params: Record<string, unknown>,
    responsible: PersonaRole,
    dependencies: string[]
  ): Subtask {
    return {
      id,
      type,
      description,
      params,
      responsible,
      status: 'pending',
      dependencies,
      createdAt: Date.now(),
    };
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(taskTypes: TaskType[], subtaskCount: number): string {
    if (taskTypes.includes('emotion_analysis')) {
      return `检测到情感分析需求。将先检索记忆数据，然后进行情绪分析，最后生成建议。共${subtaskCount}个子任务。`;
    }
    if (taskTypes.includes('memory_retrieval')) {
      return `检测到记忆检索需求。将检索相关记忆并综合分析。共${subtaskCount}个子任务。`;
    }
    if (taskTypes.includes('advice_generation')) {
      return `检测到建议生成需求。将先收集信息，然后生成建议。共${subtaskCount}个子任务。`;
    }
    return `通用任务分解。共${subtaskCount}个子任务。`;
  }

  /**
   * Estimate total duration based on subtasks
   */
  private estimateDuration(subtasks: Subtask[]): number {
    // Base time per subtask: 3 seconds
    // Add dependency wait time
    const baseTime = subtasks.length * 3000;
    
    // Add penalty for dependencies (parallel tasks reduce time)
    const maxDepth = this.calculateMaxDepth(subtasks);
    const dependencyPenalty = maxDepth * 2000;
    
    return baseTime + dependencyPenalty;
  }

  /**
   * Calculate maximum dependency depth
   */
  private calculateMaxDepth(subtasks: Subtask[]): number {
    const depthMap = new Map<string, number>();
    
    const getDepth = (subtask: Subtask): number => {
      if (depthMap.has(subtask.id)) {
        return depthMap.get(subtask.id)!;
      }
      
      if (subtask.dependencies.length === 0) {
        depthMap.set(subtask.id, 0);
        return 0;
      }
      
      let maxParentDepth = 0;
      for (const depId of subtask.dependencies) {
        const parent = subtasks.find(s => s.id === depId);
        if (parent) {
          maxParentDepth = Math.max(maxParentDepth, getDepth(parent));
        }
      }
      
      const depth = maxParentDepth + 1;
      depthMap.set(subtask.id, depth);
      return depth;
    };
    
    let maxDepth = 0;
    for (const subtask of subtasks) {
      maxDepth = Math.max(maxDepth, getDepth(subtask));
    }
    
    return maxDepth;
  }

  /**
   * Validate subtask dependencies (no cycles)
   */
  validateDependencies(subtasks: Subtask[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for orphaned dependencies
    const taskIds = new Set(subtasks.map(s => s.id));
    for (const subtask of subtasks) {
      for (const depId of subtask.dependencies) {
        if (!taskIds.has(depId)) {
          errors.push(`Task ${subtask.id} depends on non-existent task ${depId}`);
        }
      }
    }
    
    // Check for cycles (simple DFS)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (taskId: string, path: string[]): boolean => {
      if (recursionStack.has(taskId)) {
        errors.push(`Cycle detected: ${path.join(' -> ')} -> ${taskId}`);
        return true;
      }
      if (visited.has(taskId)) return false;
      
      visited.add(taskId);
      recursionStack.add(taskId);
      
      const task = subtasks.find(s => s.id === taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (hasCycle(depId, [...path, taskId])) {
            return true;
          }
        }
      }
      
      recursionStack.delete(taskId);
      return false;
    };
    
    for (const subtask of subtasks) {
      hasCycle(subtask.id, []);
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Get topological order for task execution
   */
  getExecutionOrder(subtasks: Subtask[]): Subtask[][] {
    const levels: Subtask[][] = [];
    const assigned = new Set<string>();
    
    const getReadyTasks = (): Subtask[] => {
      return subtasks.filter(task => {
        if (assigned.has(task.id)) return false;
        // All dependencies must be assigned
        return task.dependencies.every(depId => assigned.has(depId));
      });
    };
    
    while (assigned.size < subtasks.length) {
      const readyTasks = getReadyTasks();
      if (readyTasks.length === 0) {
        // Should not happen if validateDependencies passed
        break;
      }
      levels.push(readyTasks);
      readyTasks.forEach(t => assigned.add(t.id));
    }
    
    return levels;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTaskDecomposer(personaId?: string): TaskDecomposer {
  return new TaskDecomposer(personaId);
}
