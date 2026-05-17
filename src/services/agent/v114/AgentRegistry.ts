/**
 * AgentRegistry - Global singleton registry for all agents
 * 
 * Responsibilities:
 * - Register and unregister agents
 * - Provide agent lookup by ID and type
 * - Manage agent lifecycle
 * - Emit agent-related events
 */

import type { AgentType, AgentConfig, AgentStatus } from './types';
import { BaseAgent } from './BaseAgent';
import { MainAgent } from './MainAgent';
import { MemoryAgent } from './MemoryAgent';
import { SearchAgent } from './SearchAgent';
import { ToolAgent } from './ToolAgent';
import { PersonaAgent } from './PersonaAgent';

type AgentEventType = 'agent:registered' | 'agent:unregistered' | 'agent:statusChanged' | 'agent:error';

interface AgentEvent {
  type: AgentEventType;
  agentId: string;
  data?: unknown;
}

type AgentEventHandler = (event: AgentEvent) => void;

export class AgentRegistry {
  private static instance: AgentRegistry;
  
  private agents: Map<string, BaseAgent> = new Map();
  private eventHandlers: Map<AgentEventType, Set<AgentEventHandler>> = new Map();
  private defaultAgentConfigs: Map<AgentType, Omit<AgentConfig, 'id'>> = new Map([
    ['main', { name: 'Main Agent', type: 'main', description: 'Primary orchestration agent', enabled: true }],
    ['memory', { name: 'Memory Agent', type: 'memory', description: 'Long-term memory and context', enabled: true }],
    ['search', { name: 'Search Agent', type: 'search', description: 'Web and content search', enabled: true }],
    ['tool', { name: 'Tool Agent', type: 'tool', description: 'Tool execution', enabled: true }],
  ]);

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  // --------------------------------------------------------------------------
  // Agent Registration
  // --------------------------------------------------------------------------

  /**
   * Register a new agent
   */
  registerAgent(agent: BaseAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent already registered: ${agent.id}`);
    }

    this.agents.set(agent.id, agent);
    
    // Subscribe to agent events
    agent.onStatusChange = (newStatus, prevStatus) => {
      this.emit({
        type: 'agent:statusChanged',
        agentId: agent.id,
        data: { newStatus, prevStatus },
      });
    };

    agent.onLog = (entry) => {
      // Forward agent logs to registry (can be consumed by AgentLogPanel)
      this.emit({
        type: 'agent:error',
        agentId: agent.id,
        data: entry,
      });
    };

    this.emit({ type: 'agent:registered', agentId: agent.id });
    agent.log('info', `Registered with AgentRegistry`);
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      console.warn(`[AgentRegistry] Agent not found: ${agentId}`);
      return;
    }

    await agent.stop();
    this.agents.delete(agentId);
    this.emit({ type: 'agent:unregistered', agentId });
  }

  /**
   * Create and register a new agent from config
   */
  async createAgent(config: AgentConfig): Promise<BaseAgent> {
    let agent: BaseAgent;

    switch (config.type) {
      case 'main':
        agent = new MainAgent(config);
        break;
      case 'memory':
        agent = new MemoryAgent(config);
        break;
      case 'search':
        agent = new SearchAgent(config);
        break;
      case 'tool':
        agent = new ToolAgent(config);
        break;
      case 'persona':
        if (!config.personaId) {
          throw new Error('PersonaAgent requires personaId');
        }
        agent = new PersonaAgent(config);
        break;
      default:
        throw new Error(`Unknown agent type: ${config.type}`);
    }

    await agent.initialize();
    this.registerAgent(agent);
    return agent;
  }

  /**
   * Create the default set of system agents
   */
  async createDefaultAgents(): Promise<void> {
    const types: AgentType[] = ['main', 'memory', 'search', 'tool'];
    
    for (const type of types) {
      const defaultConfig = this.defaultAgentConfigs.get(type);
      if (!defaultConfig) continue;

      const config: AgentConfig = {
        ...defaultConfig,
        id: `system:${type}`,
      };

      try {
        await this.createAgent(config);
      } catch (error) {
        console.error(`[AgentRegistry] Failed to create default ${type} agent:`, error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Agent Lookup
  // --------------------------------------------------------------------------

  /**
   * Get an agent by ID
   */
  getAgent(id: string): BaseAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type: AgentType): BaseAgent[] {
    return this.getAllAgents().filter((agent) => agent.type === type);
  }

  /**
   * Get the main system agent
   */
  getMainAgent(): MainAgent | undefined {
    return this.getAgent('system:main') as MainAgent | undefined;
  }

  /**
   * Get the memory system agent
   */
  getMemoryAgent(): MemoryAgent | undefined {
    return this.getAgent('system:memory') as MemoryAgent | undefined;
  }

  /**
   * Get the search system agent
   */
  getSearchAgent(): SearchAgent | undefined {
    return this.getAgent('system:search') as SearchAgent | undefined;
  }

  /**
   * Get the tool system agent
   */
  getToolAgent(): ToolAgent | undefined {
    return this.getAgent('system:tool') as ToolAgent | undefined;
  }

  /**
   * Get agents by type (typed)
   */
  getAgentByType(type: AgentType): BaseAgent | undefined {
    const agents = this.getAgentsByType(type);
    return agents[0];
  }

  // --------------------------------------------------------------------------
  // Lifecycle Management
  // --------------------------------------------------------------------------

  /**
   * Start all enabled agents
   */
  async startAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      if (agent.getConfig().enabled && agent.isIdle()) {
        try {
          await agent.start();
        } catch (error) {
          console.error(`[AgentRegistry] Failed to start agent ${agent.id}:`, error);
        }
      }
    }
  }

  /**
   * Stop all agents
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.agents.values()).map((agent) =>
      agent.stop().catch((error) => {
        console.error(`[AgentRegistry] Failed to stop agent ${agent.id}:`, error);
      })
    );
    await Promise.allSettled(stopPromises);
  }

  /**
   * Initialize all agents
   */
  async initializeAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      try {
        await agent.initialize();
      } catch (error) {
        console.error(`[AgentRegistry] Failed to initialize agent ${agent.id}:`, error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Event System
  // --------------------------------------------------------------------------

  /**
   * Subscribe to agent events
   */
  on(eventType: AgentEventType, handler: AgentEventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler);
    };
  }

  private emit(event: AgentEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          console.error(`[AgentRegistry] Event handler error:`, error);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Registry Stats
  // --------------------------------------------------------------------------

  getStats(): { totalAgents: number; runningAgents: number; agentsByType: Record<AgentType, number> } {
    const agents = this.getAllAgents();
    const byType: Record<AgentType, number> = { main: 0, memory: 0, search: 0, tool: 0, persona: 0 };
    
    for (const agent of agents) {
      byType[agent.type]++;
    }

    return {
      totalAgents: agents.length,
      runningAgents: agents.filter((a) => a.isRunning()).length,
      agentsByType: byType,
    };
  }
}