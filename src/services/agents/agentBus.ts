import type { AgentMessage } from './types'

type MessageHandler = (msg: AgentMessage) => void | Promise<void>

class AgentBus {
  private handlers = new Map<string, Set<MessageHandler>>()
  private agentQueues = new Map<string, AgentMessage[]>()
  private processing = new Set<string>()

  subscribe(agentId: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, new Set())
    }
    this.handlers.get(agentId)!.add(handler)
    return () => {
      this.handlers.get(agentId)?.delete(handler)
    }
  }

  async send(msg: AgentMessage): Promise<void> {
    if (!this.agentQueues.has(msg.to)) {
      this.agentQueues.set(msg.to, [])
    }
    this.agentQueues.get(msg.to)!.push(msg)
    this.processQueue(msg.to)
  }

  async broadcast(msg: Omit<AgentMessage, 'to'>): Promise<void> {
    const allAgents = Array.from(this.handlers.keys())
    await Promise.all(
      allAgents
        .filter(id => id !== msg.from)
        .map(id => this.send({ ...msg, to: id }))
    )
  }

  private async processQueue(agentId: string): Promise<void> {
    if (this.processing.has(agentId)) return
    this.processing.add(agentId)

    try {
      while (this.agentQueues.has(agentId) && this.agentQueues.get(agentId)!.length > 0) {
        const msg = this.agentQueues.get(agentId)!.shift()!
        const handlers = this.handlers.get(agentId)
        if (handlers) {
          await Promise.all(
            Array.from(handlers).map(h => {
              try {
                const result = h(msg)
                if (result instanceof Promise) return result.catch(console.warn)
              } catch (e) {
                console.warn(`[AgentBus] Handler error for ${agentId}:`, e)
              }
            })
          )
        }
      }
    } finally {
      this.processing.delete(agentId)
    }
  }
}

export const agentBus = new AgentBus()
