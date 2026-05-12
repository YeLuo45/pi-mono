// V84 Task Decomposer Service
// Intelligent task decomposition with keyword extraction, template matching, and dependency analysis

import type { DecomposedTask, TaskPriority, AgentRole } from '../../types/agent';

interface DecompositionKeywords {
  research: string[];
  code: string[];
  travel: string[];
  analysis: string[];
  creative: string[];
}

const DECOMPOSITION_KEYWORDS: DecompositionKeywords = {
  research: ['研究', '报告', '分析', '调查', '收集', '搜索', 'research', 'report', 'analyze', 'survey'],
  code: ['代码', '开发', '编程', '程序', '函数', 'class', 'code', 'develop', 'programming', 'function'],
  travel: ['旅行', '旅游', '行程', '酒店', '机票', '攻略', 'travel', 'trip', 'hotel', 'flight'],
  analysis: ['分析', '评估', '比较', '对比', '统计', 'analyze', 'evaluate', 'compare', 'statistics'],
  creative: ['创意', '设计', '头脑风暴', '想法', '建议', 'creative', 'design', 'brainstorm', 'idea'],
};

// Task templates for common scenarios
const TASK_TEMPLATES = {
  research_report: {
    name: 'Research Report',
    keywords: ['研究报告', 'research report', '市场分析', '行业报告'],
    taskStructure: [
      { title: 'Information Gathering', priority: 'high' as TaskPriority, requiredCapabilities: ['web_search', 'data_collection'], suggestedAgent: 'researcher' as AgentRole },
      { title: 'Data Analysis', priority: 'high' as TaskPriority, requiredCapabilities: ['analysis', 'statistics'], suggestedAgent: 'analyst' as AgentRole },
      { title: 'Report Writing', priority: 'medium' as TaskPriority, requiredCapabilities: ['writing', 'summarization'], suggestedAgent: 'writer' as AgentRole },
      { title: 'Review & Refine', priority: 'medium' as TaskPriority, requiredCapabilities: ['review', 'quality_check'], suggestedAgent: 'critic' as AgentRole },
    ],
  },
  code_development: {
    name: 'Code Development',
    keywords: ['写代码', '开发', '编程', 'code', 'develop', 'programming'],
    taskStructure: [
      { title: 'Requirements Analysis', priority: 'high' as TaskPriority, requiredCapabilities: ['analysis', 'planning'], suggestedAgent: 'planner' as AgentRole },
      { title: 'Code Implementation', priority: 'high' as TaskPriority, requiredCapabilities: ['coding', 'implementation'], suggestedAgent: 'executor' as AgentRole },
      { title: 'Testing', priority: 'high' as TaskPriority, requiredCapabilities: ['testing', 'validation'], suggestedAgent: 'critic' as AgentRole },
      { title: 'Code Review', priority: 'medium' as TaskPriority, requiredCapabilities: ['review', 'optimization'], suggestedAgent: 'critic' as AgentRole },
    ],
  },
  travel_planning: {
    name: 'Travel Planning',
    keywords: ['旅行', '旅游', '行程', 'travel', 'trip', 'planner'],
    taskStructure: [
      { title: 'Destination Research', priority: 'high' as TaskPriority, requiredCapabilities: ['research', 'information_gathering'], suggestedAgent: 'researcher' as AgentRole },
      { title: 'Itinerary Planning', priority: 'high' as TaskPriority, requiredCapabilities: ['planning', 'scheduling'], suggestedAgent: 'planner' as AgentRole },
      { title: 'Booking & Reservations', priority: 'medium' as TaskPriority, requiredCapabilities: ['api_calls', 'booking'], suggestedAgent: 'executor' as AgentRole },
      { title: 'Review & Optimize', priority: 'low' as TaskPriority, requiredCapabilities: ['review', 'optimization'], suggestedAgent: 'critic' as AgentRole },
    ],
  },
};

export class AgentTaskDecomposer {
  private templates: typeof TASK_TEMPLATES;

  constructor() {
    this.templates = TASK_TEMPLATES;
  }

  /**
   * Extract keywords from user input
   */
  extractKeywords(input: string): string[] {
    const normalizedInput = input.toLowerCase();
    const keywords: string[] = [];

    for (const [category, words] of Object.entries(DECOMPOSITION_KEYWORDS)) {
      for (const word of words) {
        if (normalizedInput.includes(word.toLowerCase())) {
          keywords.push(category);
          break;
        }
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * Match user input against task templates
   */
  matchTemplate(input: string): keyof typeof TASK_TEMPLATES | null {
    const normalizedInput = input.toLowerCase();

    for (const [templateId, template] of Object.entries(TASK_TEMPLATES)) {
      for (const keyword of template.keywords) {
        if (normalizedInput.includes(keyword.toLowerCase())) {
          return templateId as keyof typeof TASK_TEMPLATES;
        }
      }
    }

    return null;
  }

  /**
   * Determine task priority based on keywords and context
   */
  determinePriority(keywords: string[]): TaskPriority {
    const highPriorityCategories = ['research', 'code', 'travel'];

    if (keywords.some(k => highPriorityCategories.includes(k))) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Suggest an agent role based on task requirements
   */
  suggestAgent(requiredCapabilities: string[]): AgentRole {
    const capabilityToAgent: Record<string, AgentRole> = {
      'web_search': 'executor',
      'data_collection': 'executor',
      'analysis': 'planner',
      'statistics': 'planner',
      'writing': 'creative',
      'summarization': 'creative',
      'review': 'critic',
      'quality_check': 'critic',
      'coding': 'executor',
      'implementation': 'executor',
      'testing': 'critic',
      'research': 'planner',
      'planning': 'planner',
      'scheduling': 'planner',
      'api_calls': 'executor',
      'booking': 'executor',
      'optimization': 'critic',
    };

    for (const cap of requiredCapabilities) {
      if (capabilityToAgent[cap]) {
        return capabilityToAgent[cap];
      }
    }

    return 'executor';
  }

  /**
   * Estimate task duration in milliseconds
   */
  estimateDuration(taskTitle: string, priority: TaskPriority): number {
    const baseDurations: Record<string, number> = {
      'Information Gathering': 5000,
      'Data Analysis': 4000,
      'Report Writing': 3000,
      'Review & Refine': 2000,
      'Requirements Analysis': 3000,
      'Code Implementation': 8000,
      'Testing': 4000,
      'Code Review': 3000,
      'Destination Research': 5000,
      'Itinerary Planning': 4000,
      'Booking & Reservations': 3000,
      'Review & Optimize': 2000,
    };

    const base = baseDurations[taskTitle] || 3000;
    const multiplier = priority === 'high' ? 1.0 : priority === 'medium' ? 0.8 : 0.5;

    return Math.round(base * multiplier);
  }

  /**
   * Decompose a complex goal into sub-tasks
   */
  decompose(goal: string): DecomposedTask[] {
    const keywords = this.extractKeywords(goal);
    const matchedTemplate = this.matchTemplate(goal);
    const priority = this.determinePriority(keywords);

    let tasks: DecomposedTask[] = [];

    if (matchedTemplate) {
      // Use template-based decomposition
      const template = this.templates[matchedTemplate];
      tasks = template.taskStructure.map((taskTemplate, index) => ({
        id: `task_${Date.now()}_${index}`,
        title: taskTemplate.title,
        description: `${taskTemplate.title} for: ${goal.substring(0, 50)}...`,
        status: 'pending' as const,
        priority: taskTemplate.priority,
        requiredCapabilities: taskTemplate.requiredCapabilities,
        suggestedAgent: taskTemplate.suggestedAgent,
        estimatedDuration: this.estimateDuration(taskTemplate.title, taskTemplate.priority),
        children: [],
        dependencies: index > 0 ? [`task_${Date.now()}_${index - 1}`] : [],
        input: goal,
      }));
    } else {
      // Fallback: generic decomposition
      tasks = this.genericDecompose(goal, priority);
    }

    return tasks;
  }

  /**
   * Generic decomposition for unmatched inputs
   */
  private genericDecompose(goal: string, priority: TaskPriority): DecomposedTask[] {
    return [
      {
        id: `task_${Date.now()}_0`,
        title: 'Understand Goal',
        description: `Analyze and understand: ${goal.substring(0, 50)}...`,
        status: 'pending',
        priority: 'high',
        requiredCapabilities: ['analysis', 'understanding'],
        suggestedAgent: 'orchestrator',
        estimatedDuration: 2000,
        children: [],
        input: goal,
      },
      {
        id: `task_${Date.now()}_1`,
        title: 'Plan Execution',
        description: 'Create execution plan',
        status: 'pending',
        priority: 'high',
        requiredCapabilities: ['planning', 'coordination'],
        suggestedAgent: 'planner',
        estimatedDuration: 3000,
        children: [],
        dependencies: [`task_${Date.now()}_0`],
      },
      {
        id: `task_${Date.now()}_2`,
        title: 'Execute Actions',
        description: 'Perform the planned actions',
        status: 'pending',
        priority: priority,
        requiredCapabilities: ['execution', 'tool_usage'],
        suggestedAgent: 'executor',
        estimatedDuration: 5000,
        children: [],
        dependencies: [`task_${Date.now()}_1`],
      },
      {
        id: `task_${Date.now()}_3`,
        title: 'Review Results',
        description: 'Review and validate output',
        status: 'pending',
        priority: 'medium',
        requiredCapabilities: ['review', 'validation'],
        suggestedAgent: 'critic',
        estimatedDuration: 2000,
        children: [],
        dependencies: [`task_${Date.now()}_2`],
      },
    ];
  }

  /**
   * Analyze dependencies between tasks
   */
  analyzeDependencies(tasks: DecomposedTask[]): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();

    for (const task of tasks) {
      if (task.dependencies) {
        dependencyMap.set(task.id, task.dependencies);
      }
    }

    return dependencyMap;
  }

  /**
   * Get topological order for execution
   */
  getExecutionOrder(tasks: DecomposedTask[]): DecomposedTask[][] {
    const levels: DecomposedTask[][] = [];
    const assigned = new Set<string>();

    const getReadyTasks = (): DecomposedTask[] => {
      return tasks.filter(task => {
        if (assigned.has(task.id)) return false;
        if (!task.dependencies || task.dependencies.length === 0) return true;
        return task.dependencies.every(depId => assigned.has(depId));
      });
    };

    while (assigned.size < tasks.length) {
      const readyTasks = getReadyTasks();
      if (readyTasks.length === 0) break;
      levels.push(readyTasks);
      readyTasks.forEach(t => assigned.add(t.id));
    }

    return levels;
  }
}

// Singleton export
export const agentTaskDecomposer = new AgentTaskDecomposer();

export default agentTaskDecomposer;
