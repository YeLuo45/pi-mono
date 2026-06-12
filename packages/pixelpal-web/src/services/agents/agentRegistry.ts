import { AgentType, type AgentConfig } from './types'

class AgentRegistry {
  private agents = new Map<string, AgentConfig>()

  register(config: AgentConfig): void {
    this.agents.set(config.id, config)
  }

  get(id: string): AgentConfig | undefined {
    return this.agents.get(id)
  }

  getByType(type: AgentType): AgentConfig[] {
    return Array.from(this.agents.values()).filter(a => a.type === type)
  }

  list(): AgentConfig[] {
    return Array.from(this.agents.values())
  }

  unregister(id: string): void {
    this.agents.delete(id)
  }
}

export const agentRegistry = new AgentRegistry()

// Re-export agentBus so other modules can import both from here
export { agentBus } from './agentBus'
