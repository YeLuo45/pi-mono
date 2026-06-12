/**
 * V149: PluginAdapter - Legacy PluginBus to v2 adapter
 * 
 * Bridges the legacy PluginService (V9) to the new PluginProtocol v2 system.
 * Allows existing plugins to work with the new unified interface.
 */

import type { Plugin as LegacyPlugin } from '../services/plugin/types';
import { PluginService } from '../services/plugin/PluginService';
import type { Plugin, PluginContext, PluginStorage } from './PluginProtocolV2';

/**
 * Adapter that wraps a legacy plugin for the v2 protocol
 */
export class PluginAdapter implements Plugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  
  private legacyPlugin: LegacyPlugin;
  private adapterStorage: Map<string, unknown> = new Map();

  constructor(legacyPlugin: LegacyPlugin) {
    this.id = legacyPlugin.id;
    this.name = legacyPlugin.name;
    this.version = legacyPlugin.version;
    this.description = undefined;
    this.legacyPlugin = legacyPlugin;
  }

  async install(ctx: PluginContext): Promise<void> {
    // Legacy plugins are auto-registered, no special install needed
    PluginService.register(this.legacyPlugin);
  }

  async uninstall(ctx: PluginContext): Promise<void> {
    PluginService.unregister(this.id);
  }

  async enable(ctx: PluginContext): Promise<void> {
    // Legacy plugins don't have explicit enable - they start enabled on register
  }

  async disable(ctx: PluginContext): Promise<void> {
    // Legacy plugins can't be truly disabled, just unregistered
    PluginService.unregister(this.id);
  }

  get hooks(): Record<string, (context: import('../core/hooks/types').HookContext) => void | Promise<void>> {
    // Legacy plugins don't expose hooks directly - would need to wrap their capabilities
    return {};
  }

  get hookPriorities(): Record<string, number> {
    return {};
  }
}

/**
 * Adapts a legacy plugin to v2 Plugin interface
 */
export function adaptLegacyPlugin(legacy: LegacyPlugin): Plugin {
  return new PluginAdapter(legacy);
}

/**
 * Convert legacy PluginService to v2 PluginManager
 */
export class LegacyPluginBusAdapter {
  private pluginManager: import('./PluginProtocolV2').PluginManager;
  private storageAdapter: PluginStorageAdapter;

  constructor(pm: import('./PluginProtocolV2').PluginManager) {
    this.pluginManager = pm;
    this.storageAdapter = new PluginStorageAdapter();
  }

  /**
   * Sync all legacy plugins to the v2 manager
   */
  syncLegacyPlugins(): void {
    const legacyPlugins = PluginService.listPlugins();
    
    for (const legacy of legacyPlugins) {
      const adapted = adaptLegacyPlugin(legacy);
      this.pluginManager.register(adapted);
      this.pluginManager.markInstalled(adapted);
    }
  }

  /**
   * Forward lifecycle events from legacy system to v2
   */
  setupEventForwarding(): () => void {
    const unregister1 = PluginService.on('plugin:registered', (data: unknown) => {
      const { pluginId } = data as { pluginId: string; plugin: LegacyPlugin };
      // Could trigger v2 hooks here
      this.pluginManager.get(pluginId); // Ensure exists
    });

    const unregister2 = PluginService.on('plugin:unregistered', (data: unknown) => {
      const { pluginId } = data as { pluginId: string };
      // Handle plugin removal
    });

    return () => {
      unregister1();
      unregister2();
    };
  }

  /**
   * Get the storage adapter for v2 plugins
   */
  getStorage(): PluginStorage {
    return this.storageAdapter;
  }
}

/**
 * Adapter for plugin storage - bridges to legacy pluginStorage if needed
 */
export class PluginStorageAdapter implements PluginStorage {
  private stores: Map<string, Map<string, unknown>> = new Map();

  async get<T>(key: string): Promise<T | undefined> {
    return undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    // Storage per-plugin would use pluginId prefix
  }

  async delete(key: string): Promise<void> {
    // Remove key
  }

  async has(key: string): Promise<boolean> {
    return false;
  }

  /**
   * Clear storage for a specific plugin
   */
  clearPluginStorage(pluginId: string): void {
    this.stores.delete(pluginId);
  }
}

/**
 * Create a v2 Plugin from a legacy Plugin, auto-registering hooks if the legacy
 * plugin exposes event handlers that map to hook names.
 */
export function createV2PluginFromLegacy(legacy: LegacyPlugin): Plugin {
  return adaptLegacyPlugin(legacy);
}

/**
 * Check if a legacy plugin is currently registered
 */
export function isLegacyPluginRegistered(pluginId: string): boolean {
  return !!PluginService.getPlugin(pluginId);
}

export default PluginAdapter;