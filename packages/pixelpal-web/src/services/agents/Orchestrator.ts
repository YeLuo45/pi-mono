// V84 Orchestrator Service
// Intelligent task decomposition with keyword extraction, template matching, and dependency analysis

import type { DecomposedTask, DemoScenario, ExecutionResult } from '../../types/agent';
import { agentTaskDecomposer } from './TaskDecomposer';
import { criticEngine } from './CriticEngine';
import { eventBus } from './EventBus';

// Demo scenarios for the three use cases
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'demo_research',
    name: 'Research Report',
    description: 'Generate a comprehensive research report on a topic',
    icon: '📊',
    userRequest: '请帮我生成一份关于人工智能在医疗领域应用的研究报告，包括市场分析、技术现状和未来趋势',
  },
  {
    id: 'demo_code',
    name: 'Code Development',
    description: 'Develop a complete feature with planning, coding, and testing',
    icon: '💻',
    userRequest: '请帮我开发一个用户认证模块，包含登录、注册和密码重置功能，需要考虑安全性',
  },
  {
    id: 'demo_travel',
    name: 'Travel Planning',
    description: 'Plan a complete trip with itinerary and bookings',
    icon: '✈️',
    userRequest: '帮我规划一个7天的日本东京旅行，包括景点、餐厅推荐和酒店预订建议',
  },
];

// V84: Orchestrator State interface
export interface OrchestratorState {
  currentGoal: string;
  tasks: DecomposedTask[];
  executionResults: Map<string, ExecutionResult>;
  currentTaskIndex: number;
  isExecuting: boolean;
  isComplete: boolean;
}

class OrchestratorService {
  private state: OrchestratorState | null = null;
  private listeners: Array<(state: OrchestratorState) => void> = [];

  /**
   * Decompose a complex goal into sub-tasks
   */
  decompose(goal: string): DecomposedTask[] {
    // Emit decomposition start event
    eventBus.emit('orchestrator:task_split', {
      goal,
      timestamp: Date.now(),
    });

    const tasks = agentTaskDecomposer.decompose(goal);

    // Initialize state
    this.state = {
      currentGoal: goal,
      tasks,
      executionResults: new Map(),
      currentTaskIndex: 0,
      isExecuting: false,
      isComplete: false,
    };

    // Emit decomposition complete event
    eventBus.emit('orchestrator:task_split', {
      goal,
      tasks,
      timestamp: Date.now(),
    });

    this.notifyListeners();

    return tasks;
  }

  /**
   * Execute a specific task with critic review
   */
  async executeTask(taskId: string): Promise<ExecutionResult> {
    if (!this.state) {
      throw new Error('No active orchestration session');
    }

    const task = this.state.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Update task status
    task.status = 'in_progress';

    // Emit task start event
    eventBus.emit('task:status_changed', {
      taskId,
      payload: { status: 'in_progress' },
      timestamp: Date.now(),
    });

    // Simulate task execution (in real implementation, this would call actual agents)
    const output = await this.simulateExecution(task);

    // Create execution result
    const result = criticEngine.createExecutionResult(task, output, task.retryCount || 0);

    // Store result
    this.state.executionResults.set(taskId, result);

    // Update task with output
    task.output = output;

    // Handle critic review
    if (result.criticReview) {
      if (result.criticReview.approved) {
        task.status = 'completed';
        eventBus.emit('task:completed', {
          taskId,
          payload: result.criticReview,
          timestamp: Date.now(),
        });
      } else {
        // Task needs revision
        this.handleTaskRevision(task, result);
      }
    } else {
      task.status = 'completed';
    }

    this.notifyListeners();

    return result;
  }

  /**
   * Handle task revision based on critic feedback
   */
  private async handleTaskRevision(task: DecomposedTask, result: ExecutionResult): Promise<void> {
    if (!result.criticReview) return;

    // Check if we should retry
    if (criticEngine.shouldRetry(task, task.retryCount || 0)) {
      task.retryCount = (task.retryCount || 0) + 1;

      // Emit retry event
      eventBus.emit('critic:critique_generated', {
        taskId: task.id,
        payload: result.criticReview,
        timestamp: Date.now(),
      });

      // In real implementation, would re-execute with improvements
      // For demo, we auto-approve after 1 retry
      if (task.retryCount >= 1) {
        task.status = 'completed';
      }
    } else {
      // Max retries reached, mark as completed anyway for flow continuation
      task.status = 'completed';
    }
  }

  /**
   * Simulate task execution (placeholder for real agent calls)
   */
  private async simulateExecution(task: DecomposedTask): Promise<string> {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    // Generate simulated output based on task type
    const outputs: Record<string, string[]> = {
      'Understand Goal': [
        '已理解您的需求。将任务分解为以下步骤：\n1. 信息收集\n2. 分析处理\n3. 结果汇总',
      ],
      'Plan Execution': [
        '执行计划已创建：\n• 阶段1: 数据收集 (2分钟)\n• 阶段2: 分析处理 (3分钟)\n• 阶段3: 结果验证 (1分钟)',
      ],
      'Execute Actions': [
        '✓ 行动执行完成\n\n已完成的操作：\n- 检索相关信息\n- 进行数据处理\n- 生成初步结果',
      ],
      'Review Results': [
        '✓ 审查通过\n\n结果质量评估：\n- 完整性: 9/10\n- 准确性: 8/10\n- 相关性: 9/10\n\n无重大问题，可以继续下一步',
      ],
      'Information Gathering': [
        '📊 信息收集完成\n\n发现的关键信息：\n1. AI在医疗影像诊断中的应用已成熟\n2. 药物研发是当前最大增长领域\n3. 市场规模预计年增40%',
      ],
      'Data Analysis': [
        '📈 数据分析完成\n\n关键发现：\n• 技术成熟度: 中高水平\n• 市场渗透率: 约15%\n• 主要玩家: 大型科技公司和医疗设备商',
      ],
      'Report Writing': [
        '📝 研究报告已完成\n\n报告包含：\n1. 执行摘要\n2. 市场现状分析\n3. 技术发展趋势\n4. 未来展望与建议',
      ],
      'Requirements Analysis': [
        '📋 需求分析完成\n\n功能需求：\n• 用户注册与登录\n• 密码安全验证\n• 找回密码流程\n• Session管理',
      ],
      'Code Implementation': [
        '💻 代码实现完成\n\n已实现的模块：\n• UserService (用户服务)\n• AuthController (认证控制器)\n• JWT Token管理\n• 密码加密存储',
      ],
      'Testing': [
        '🧪 测试完成\n\n测试结果：\n✓ 单元测试: 全部通过 (42个)\n✓ 集成测试: 全部通过 (12个)\n✓ 安全测试: 通过',
      ],
      'Code Review': [
        '🔍 代码审查完成\n\n审查意见：\n• 代码结构良好\n• 建议增加错误处理\n• 安全性符合要求',
      ],
      'Destination Research': [
        '🗼 目的地研究完成\n\n推荐景点：\n1. 浅草寺 - 传统文化体验\n2. 新宿 - 现代都市风貌\n3. 涩谷 - 时尚购物区',
      ],
      'Itinerary Planning': [
        '📅 行程规划完成\n\n7天行程安排：\nDay1-2: 东京市区\nDay3-4: 镰仓一日游\nDay5-6: 富士山周边\nDay7: 购物与返程',
      ],
      'Booking & Reservations': [
        '🏨 预订建议\n\n推荐酒店：\n• 新宿格拉斯丽酒店 (¥800/晚)\n• 东京王子花园塔 (¥1200/晚)\n\n可在线预订',
      ],
    };

    const defaultOutputs = [
      '任务执行完成。\n\n执行摘要：\n- 已完成所需操作\n- 结果符合预期\n- 建议进入下一步骤',
    ];

    const taskOutputs = outputs[task.title] || defaultOutputs;
    return taskOutputs[Math.floor(Math.random() * taskOutputs.length)];
  }

  /**
   * Execute all tasks in order
   */
  async executeAllTasks(): Promise<ExecutionResult[]> {
    if (!this.state) {
      throw new Error('No active orchestration session');
    }

    this.state.isExecuting = true;
    this.notifyListeners();

    const results: ExecutionResult[] = [];
    const executionOrder = agentTaskDecomposer.getExecutionOrder(this.state.tasks);

    for (const taskLevel of executionOrder) {
      // Execute tasks in parallel at each level
      const levelPromises = taskLevel.map(task => this.executeTask(task.id));
      const levelResults = await Promise.all(levelPromises);
      results.push(...levelResults);
    }

    this.state.isExecuting = false;
    this.state.isComplete = true;
    this.notifyListeners();

    return results;
  }

  /**
   * Get current orchestration state
   */
  getState(): OrchestratorState | null {
    return this.state;
  }

  /**
   * Get all tasks
   */
  getTasks(): DecomposedTask[] {
    return this.state?.tasks || [];
  }

  /**
   * Get execution results
   */
  getExecutionResults(): ExecutionResult[] {
    if (!this.state) return [];
    return Array.from(this.state.executionResults.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): DecomposedTask | undefined {
    return this.state?.tasks.find(t => t.id === taskId);
  }

  /**
   * Get execution result for a task
   */
  getResult(taskId: string): ExecutionResult | undefined {
    return this.state?.executionResults.get(taskId);
  }

  /**
   * Aggregate final results from all tasks
   */
  aggregateResults(): string {
    if (!this.state || this.state.executionResults.size === 0) {
      return 'No results to aggregate';
    }

    const summaries: string[] = ['📋 任务执行汇总\n'];

    for (const task of this.state.tasks) {
      const result = this.state.executionResults.get(task.id);
      if (result) {
        const status = result.criticReview?.approved ? '✓' : '⚠';
        summaries.push(`${status} ${task.title}`);
        if (task.output) {
          summaries.push(`   ${task.output.split('\n')[0]}`);
        }
      }
    }

    const approvedCount = Array.from(this.state.executionResults.values())
      .filter(r => r.criticReview?.approved).length;
    const totalCount = this.state.executionResults.size;

    summaries.push(`\n📊 总体评分: ${approvedCount}/${totalCount} 任务通过Critic审查`);

    return summaries.join('\n');
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: OrchestratorState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    if (this.state) {
      this.listeners.forEach(listener => listener(this.state!));
    }
  }

  /**
   * Reset orchestrator state
   */
  reset(): void {
    this.state = null;
    this.notifyListeners();
  }

  /**
   * Get demo scenarios
   */
  getDemoScenarios(): DemoScenario[] {
    return DEMO_SCENARIOS;
  }
}

// Singleton export
export const orchestratorService = new OrchestratorService();

export default orchestratorService;
