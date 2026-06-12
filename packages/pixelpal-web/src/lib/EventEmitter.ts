/**
 * Minimal browser-compatible EventEmitter
 * Replaces 'events' Node.js package for browser builds
 */

type EventHandler = (...args: any[]) => void;

export class EventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event) || [];
    handlers.push(handler);
    this.events.set(event, handlers);
    return this;
  }

  once(event: string, handler: EventHandler): this {
    const onceHandler: EventHandler = (...args) => {
      handler(...args);
      this.off(event, onceHandler);
    };
    return this.on(event, onceHandler);
  }

  off(event: string, handler: EventHandler): this {
    const handlers = this.events.get(event) || [];
    this.events.set(event, handlers.filter(h => h !== handler));
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const handlers = this.events.get(event) || [];
    handlers.forEach(h => h(...args));
    return handlers.length > 0;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  listenerCount(event: string): number {
    return (this.events.get(event) || []).length;
  }
}
