// V83 AgentRegistry Service
// 可插拔Agent注册表

import type { Agent, AgentConfig, AgentRole } from '../../types/agent';
import { DEFAULT_AGENTS } from '../../types/agent';
import { eventBus } from './EventBus';

class AgentRegistryService {
  private agents: Map<string, Agent> = new Map();
  private configs: Map<string, AgentConfig> = new Map();

  constructor() {
    // Register default agents
    this.registerDefaults();
  }

  /**
   * Register default agents
   */
  private registerDefaults(): void {
    DEFAULT_AGENTS.forEach(config => {
      this.register(config);
    });
  }

  /**
   * Register a new agent configuration
   */
  register(config: AgentConfig): void {
    if (this.configs.has(config.id)) {
      console.warn(`[AgentRegistry] Agent ${config.id} already registered, overwriting`);
    }
    
    this.configs.set(config.id, config);
    
    // Create agent instance if not already exists
    if (!this.agents.has(config.id)) {
      const agent: Agent = {
        id: config.id,
        role: config.role,
        name: config.name,
        icon: config.icon,
        status: 'idle',
        messages: [],
        capabilities: config.capabilities,
      };
      this.agents.set(config.id, agent);
      
      // Emit creation event
      eventBus.emit('agent:created', { agentId: config.id, payload: agent });
    }
  }

  /**
   * Get an agent by ID
   */
  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get agent config by ID
   */
  getConfig(id: string): AgentConfig | undefined {
    return this.configs.get(id);
  }

  /**
   * Get all agents
   */
  list(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all agent configs
   */
  listConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get agents by role
   */
  getByRole(role: AgentRole): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.role === role);
  }

  /**
   * Update agent status
   */
  updateStatus(id: string, status: Agent['status'], currentTask?: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      const oldStatus = agent.status;
      agent.status = status;
      if (currentTask !== undefined) {
        agent.currentTask = currentTask;
      }
      
      eventBus.emit('agent:status_changed', { 
        agentId: id, 
        payload: { oldStatus, newStatus: status, currentTask } 
      });
    }
  }

  /**
   * Add a message to an agent
   */
  addMessage(agentId: string, message: Omit<Agent['messages'][0], 'id' | 'timestamp'>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      const msg = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      agent.messages.push(msg);
      
      eventBus.emit('agent:message', { agentId, payload: msg });
    }
  }

  /**
   * Unregister an agent
   */
  unregister(id: string): void {
    const agent = this.agents.get(id);
    if (agent) {
      this.agents.delete(id);
      this.configs.delete(id);
      eventBus.emit('agent:destroyed', { agentId: id, payload: agent });
    }
  }

  /**
   * Check if an agent is registered
   */
  has(id: string): boolean {
    return this.agents.has(id);
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear();
    this.configs.clear();
    // Re-register defaults
    this.registerDefaults();
  }
}

// Singleton export
export const agentRegistry = new AgentRegistryService();

export default agentRegistry;
