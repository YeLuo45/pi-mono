import type { ToolSpec } from './types';

export interface ToolRegistry {
  getInstance(): ToolRegistry;
  register(spec: ToolSpec, handler: (args: Record<string, unknown>) => Promise<unknown>): void;
  list(): string[];
}

class ToolRegistryImpl implements ToolRegistry {
  private static instance: ToolRegistryImpl;
  private tools: Map<string, { spec: ToolSpec; handler: (args: Record<string, unknown>) => Promise<unknown> }> = new Map();

  static getInstance(): ToolRegistryImpl {
    if (!ToolRegistryImpl.instance) {
      ToolRegistryImpl.instance = new ToolRegistryImpl();
    }
    return ToolRegistryImpl.instance;
  }

  register(spec: ToolSpec, handler: (args: Record<string, unknown>) => Promise<unknown>): void {
    this.tools.set(spec.name, { spec, handler });
  }

  list(): string[] {
    return Array.from(this.tools.keys());
  }
}

export const ToolRegistry = ToolRegistryImpl;
export type { ToolSpec } from './types';