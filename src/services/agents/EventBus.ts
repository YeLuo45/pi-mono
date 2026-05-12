// V83 Multi-Agent EventBus Service
// Agent间事件总线，基于EventEmitter3

import EventEmitter3 from 'eventemitter3';
import type { AgentEvent, AgentEventType } from '../../types/agent';

type EventListener = (event: AgentEvent) => void | Promise<void>;

class AgentEventBus {
  private emitter: EventEmitter3;
  private static instance: AgentEventBus;

  private constructor() {
    this.emitter = new EventEmitter3();
  }

  static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }

  /**
   * Subscribe to an agent event
   */
  on(type: AgentEventType, listener: EventListener): () => void {
    this.emitter.on(type, listener);
    return () => this.emitter.off(type, listener);
  }

  /**
   * Subscribe to an event only once
   */
  once(type: AgentEventType, listener: EventListener): void {
    this.emitter.once(type, listener);
  }

  /**
   * Unsubscribe from an agent event
   */
  off(type: AgentEventType, listener: EventListener): void {
    this.emitter.off(type, listener);
  }

  /**
   * Emit an agent event
   */
  emit(type: AgentEventType, payload?: Omit<AgentEvent, 'type' | 'timestamp'>): void {
    const event: AgentEvent = {
      type,
      timestamp: Date.now(),
      ...payload,
    };
    this.emitter.emit(type, event);
  }

  /**
   * Subscribe to all events matching a pattern
   */
  onAny(listener: (type: AgentEventType, event: AgentEvent) => void): () => void {
    this.emitter.on('*', listener as any);
    return () => this.emitter.off('*', listener as any);
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(type?: AgentEventType): void {
    if (type) {
      this.emitter.removeAllListeners(type);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(type: AgentEventType): number {
    return this.emitter.listenerCount(type);
  }

  /**
   * Check if there are listeners for a specific event
   */
  hasListeners(type: AgentEventType): boolean {
    return this.emitter.hasListeners(type);
  }
}

// Singleton export
export const eventBus = AgentEventBus.getInstance();

export default eventBus;
