/**
 * @deprecated V68后请使用 unifiedPluginService
 */
// PluginService — singleton registry + event bus + tool invocation
import type { Plugin, PluginRegistration } from './types';
import { createPluginStorage } from './pluginStorage';

type EventHandler = (data: unknown) => void;

class PluginServiceImpl {
  private plugins = new Map<string, PluginRegistration>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private toolHandlers = new Map<string, Map<string, (args: unknown) => Promise<unknown>>>();

  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginService] Plugin "${plugin.id}" already registered, skipping.`);
      return;
    }

    const storage = createPluginStorage(plugin.id);
    this.plugins.set(plugin.id, { plugin, storage });

    // Call lifecycle hook
    const initResult = plugin.onInit?.();
    if (initResult?.catch) {
      initResult.catch((err: unknown) => {
        console.error(`[PluginService] Plugin "${plugin.id}" onInit failed:`, err);
      });
    }

    this.emit('plugin:registered', { pluginId: plugin.id, plugin });
  }

  unregister(pluginId: string): void {
    const reg = this.plugins.get(pluginId);
    if (!reg) return;

    const destroyResult = reg.plugin.onDestroy?.();
    if (destroyResult?.catch) {
      destroyResult.catch((err: unknown) => {
        console.error(`[PluginService] Plugin "${pluginId}" onDestroy failed:`, err);
      });
    }

    this.toolHandlers.delete(pluginId);
    this.plugins.delete(pluginId);
    this.emit('plugin:unregistered', { pluginId });
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id)?.plugin;
  }

  getRegistration(id: string): PluginRegistration | undefined {
    return this.plugins.get(id);
  }

  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).map((r) => r.plugin);
  }

  // Register a tool implementation for a plugin
  registerTool(pluginId: string, toolName: string, handler: (args: unknown) => Promise<unknown>): void {
    if (!this.toolHandlers.has(pluginId)) {
      this.toolHandlers.set(pluginId, new Map());
    }
    this.toolHandlers.get(pluginId)!.set(toolName, handler);
  }

  // AI tool invocation — returns undefined if tool not found
  async callTool(pluginId: string, toolName: string, args: unknown): Promise<unknown> {
    const handler = this.toolHandlers.get(pluginId)?.get(toolName);
    if (!handler) {
      throw new Error(`[PluginService] Tool "${toolName}" not found on plugin "${pluginId}"`);
    }
    return handler(args);
  }

  // --- Event system ---
  emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[PluginService] Event handler error for "${event}":`, err);
        }
      }
    }
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  off(event: string, handler: EventHandler): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  // Check if a plugin has a specific capability
  hasCapability(pluginId: string, capabilityType: string): boolean {
    const plugin = this.getPlugin(pluginId);
    if (!plugin) return false;
    return plugin.capabilities.some((c) => c.type === capabilityType);
  }

  // Get all plugins that expose a panel
  getPanelPlugins(): Plugin[] {
    return this.listPlugins().filter((p) =>
      p.capabilities.some((c) => c.type === 'panel')
    );
  }

  // Get all AI tool capabilities across all plugins
  getAITools(): Array<{ pluginId: string; pluginName: string; toolName: string }> {
    const tools: Array<{ pluginId: string; pluginName: string; toolName: string }> = [];
    for (const { plugin } of this.plugins.values()) {
      for (const cap of plugin.capabilities) {
        if (cap.type === 'ai_tool') {
          tools.push({ pluginId: plugin.id, pluginName: plugin.name, toolName: cap.name });
        }
      }
    }
    return tools;
  }
}

export const PluginService = new PluginServiceImpl();
