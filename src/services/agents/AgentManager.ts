// V83 AgentManager Service
// 管理Agent生命周期，协调多Agent

import type { Agent, AgentRole, Task, AgentMessage } from '../../types/agent';
import { agentRegistry } from './AgentRegistry';
import { eventBus } from './EventBus';
import { taskScheduler } from './TaskScheduler';

class AgentManagerService {
  private initialized = false;

  /**
   * Initialize the agent system
   */
  initialize(): void {
    if (this.initialized) return;
    
    // Agent registry is already initialized with defaults
    this.initialized = true;
    console.log('[AgentManager] Initialized with', agentRegistry.list().length, 'agents');
  }

  /**
   * Create a custom agent
   */
  createAgent(config: {
    id: string;
    role: AgentRole;
    name: string;
    icon: string;
    capabilities?: string[];
  }): Agent {
    const capabilities = config.capabilities || this.getDefaultCapabilities(config.role);
    
    agentRegistry.register({
      id: config.id,
      role: config.role,
      name: config.name,
      icon: config.icon,
      capabilities,
    });

    const agent = agentRegistry.get(config.id)!;
    eventBus.emit('agent:created', { agentId: config.id, payload: agent });
    
    return agent;
  }

  /**
   * Get default capabilities for a role
   */
  private getDefaultCapabilities(role: AgentRole): string[] {
    switch (role) {
      case 'orchestrator':
        return ['task_decomposition', 'intent_understanding', 'coordination'];
      case 'planner':
        return ['planning', 'feasibility_assessment', 'resource_allocation'];
      case 'executor':
        return ['tool_execution', 'api_calls', 'code_generation'];
      case 'critic':
        return ['result_review', 'improvement_suggestion', 'quality_assessment'];
      case 'creative':
        return ['brainstorming', 'idea_generation', 'creative_writing'];
      default:
        return [];
    }
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return agentRegistry.list();
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return agentRegistry.get(id);
  }

  /**
   * Get agents by role
   */
  getAgentsByRole(role: AgentRole): Agent[] {
    return agentRegistry.getByRole(role);
  }

  /**
   * Send message between agents
   */
  sendMessage(fromId: string, toId: string, content: string, type: AgentMessage['type']): void {
    const message: Omit<AgentMessage, 'id' | 'timestamp'> = {
      agentId: fromId,
      type,
      content,
    };
    
    agentRegistry.addMessage(toId, message);
  }

  /**
   * Broadcast message from an agent
   */
  broadcast(agentId: string, content: string, type: AgentMessage['type']): void {
    const agents = this.getAgents();
    const message: Omit<AgentMessage, 'id' | 'timestamp'> = {
      agentId,
      type,
      content,
    };

    agents.forEach(agent => {
      if (agent.id !== agentId) {
        agentRegistry.addMessage(agent.id, message);
      }
    });
  }

  /**
   * Assign task to agent
   */
  assignTask(task: Task, agentId: string): Promise<void> {
    task.assignedAgent = agentId;
    agentRegistry.updateStatus(agentId, 'running', task.id);
    eventBus.emit('task:assigned', { taskId: task.id, agentId, payload: task });

    return taskScheduler.schedule(task, async () => {
      // Execute the task - in real implementation this would call the agent's execution logic
      agentRegistry.addMessage(agentId, {
        agentId,
        type: 'action',
        content: `Executing task: ${task.title}`,
      });
      
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 100));
      
      agentRegistry.updateStatus(agentId, 'idle');
    });
  }

  /**
   * Create and coordinate multi-agent task
   */
  async coordinateTask(userInput: string): Promise<{
    orchestratorTask: Task;
    subTasks: Task[];
  }> {
    // Create main task
    const orchestratorTask: Task = {
      id: `task_${Date.now()}`,
      title: 'Orchestrate Request',
      description: userInput,
      status: 'pending',
      children: [],
    };

    // Create sub-tasks based on the request
    const subTasks: Task[] = [
      {
        id: `task_${Date.now()}_planning`,
        title: 'Plan Execution',
        description: 'Create execution plan',
        status: 'pending',
        parentTaskId: orchestratorTask.id,
        children: [],
      },
      {
        id: `task_${Date.now()}_execution`,
        title: 'Execute Actions',
        description: 'Execute planned actions',
        status: 'pending',
        parentTaskId: orchestratorTask.id,
        children: [],
      },
      {
        id: `task_${Date.now()}_review`,
        title: 'Review Results',
        description: 'Review and critique results',
        status: 'pending',
        parentTaskId: orchestratorTask.id,
        children: [],
      },
    ];

    orchestratorTask.children = subTasks.map(t => t.id);

    // Assign tasks to agents
    await this.assignTask(orchestratorTask, 'orchestrator');
    await this.assignTask(subTasks[0], 'planner');
    await this.assignTask(subTasks[1], 'executor');
    await this.assignTask(subTasks[2], 'critic');

    return { orchestratorTask, subTasks };
  }

  /**
   * Destroy an agent
   */
  destroyAgent(id: string): void {
    agentRegistry.unregister(id);
  }

  /**
   * Update agent status
   */
  setAgentStatus(id: string, status: Agent['status'], currentTask?: string): void {
    agentRegistry.updateStatus(id, status, currentTask);
  }

  /**
   * Get agent messages
   */
  getAgentMessages(agentId: string): AgentMessage[] {
    const agent = agentRegistry.get(agentId);
    return agent?.messages || [];
  }

  /**
   * Clear agent messages
   */
  clearAgentMessages(agentId: string): void {
    const agent = agentRegistry.get(agentId);
    if (agent) {
      agent.messages = [];
    }
  }

  /**
   * Shutdown the agent system
   */
  shutdown(): void {
    taskScheduler.clear();
    eventBus.removeAllListeners();
    this.initialized = false;
  }
}

// Singleton export
export const agentManager = new AgentManagerService();

export default agentManager;
