/**
 * V149: Plugin Protocol v2 - Unified plugin interface
 * 
 * Provides a consistent interface for plugins with lifecycle management:
 * - install/uninstall/enable/disable
 * - Hook registration
 * - Persistent state
 */

import type { HookFn, HookContext } from '../core/hooks/types';

/**
 * Context provided to plugins during lifecycle operations
 */
export interface PluginContext {
  /** Plugin ID being operated on */
  pluginId: string;
  /** Plugin version */
  version: string;
  /** Timestamp of operation */
  timestamp: number;
  /** Storage for plugin-specific data */
  storage: PluginStorage;
}

/**
 * Key-value storage interface for plugins
 */
export interface PluginStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * Plugin metadata for registry display
 */
export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  tags?: string[];
}

/**
 * V2 Plugin interface - all plugins should implement this
 */
export interface Plugin {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Semantic version */
  version: string;
  /** Optional description */
  description?: string;
  
  /** Called when plugin is first installed */
  install?(ctx: PluginContext): Promise<void>;
  /** Called when plugin is uninstalled */
  uninstall?(ctx: PluginContext): Promise<void>;
  /** Called when plugin is enabled (can be called after install) */
  enable?(ctx: PluginContext): Promise<void>;
  /** Called when plugin is disabled */
  disable?(ctx: PluginContext): Promise<void>;
  
  /** Hooks provided by this plugin - map of hook name to handler */
  hooks?: Record<string, HookFn>;
  
  /** Default hook priorities for this plugin's hooks */
  hookPriorities?: Record<string, number>;
}

/**
 * Installed plugin record in registry
 */
export interface InstalledPlugin {
  metadata: PluginMetadata;
  enabled: boolean;
  installedAt: number;
  lastEnabledAt?: number;
}

/**
 * Plugin manager handles registration and lifecycle
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private installed: Map<string, InstalledPlugin> = new Map();

  /**
   * Register a plugin with the manager
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginManager] Plugin "${plugin.id}" already registered, skipping.`);
      return;
    }
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Unregister a plugin (must be disabled first)
   */
  unregister(pluginId: string): boolean {
    if (this.installed.get(pluginId)?.enabled) {
      console.warn(`[PluginManager] Cannot unregister enabled plugin "${pluginId}". Disable first.`);
      return false;
    }
    return this.plugins.delete(pluginId);
  }

  /**
   * Get a registered plugin
   */
  get(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * List all registered plugins
   */
  listPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * List installed plugin records
   */
  listInstalled(): InstalledPlugin[] {
    return Array.from(this.installed.values());
  }

  /**
   * Check if a plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    return this.installed.has(pluginId);
  }

  /**
   * Check if a plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    return this.installed.get(pluginId)?.enabled ?? false;
  }

  /**
   * Mark a plugin as installed
   */
  markInstalled(plugin: Plugin): void {
    this.installed.set(plugin.id, {
      metadata: {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
      },
      enabled: false,
      installedAt: Date.now(),
    });
  }

  /**
   * Mark a plugin as uninstalled
   */
  markUninstalled(pluginId: string): void {
    this.installed.delete(pluginId);
  }

  /**
   * Enable an installed plugin
   */
  async enable(pluginId: string, storage: PluginStorage): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const installed = this.installed.get(pluginId);
    
    if (!plugin || !installed) {
      throw new Error(`[PluginManager] Plugin "${pluginId}" not found`);
    }

    if (installed.enabled) {
      console.warn(`[PluginManager] Plugin "${pluginId}" already enabled`);
      return;
    }

    const ctx: PluginContext = {
      pluginId,
      version: plugin.version,
      timestamp: Date.now(),
      storage,
    };

    await plugin.enable?.(ctx);
    installed.enabled = true;
    installed.lastEnabledAt = Date.now();
  }

  /**
   * Disable an installed plugin
   */
  async disable(pluginId: string, storage: PluginStorage): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const installed = this.installed.get(pluginId);
    
    if (!plugin || !installed) {
      throw new Error(`[PluginManager] Plugin "${pluginId}" not found`);
    }

    if (!installed.enabled) {
      console.warn(`[PluginManager] Plugin "${pluginId}" already disabled`);
      return;
    }

    const ctx: PluginContext = {
      pluginId,
      version: plugin.version,
      timestamp: Date.now(),
      storage,
    };

    await plugin.disable?.(ctx);
    installed.enabled = false;
  }

  /**
   * Install a plugin (register + initial enable)
   */
  async install(plugin: Plugin, storage: PluginStorage): Promise<void> {
    this.register(plugin);
    this.markInstalled(plugin);

    const ctx: PluginContext = {
      pluginId: plugin.id,
      version: plugin.version,
      timestamp: Date.now(),
      storage,
    };

    await plugin.install?.(ctx);
    await this.enable(plugin.id, storage);
  }

  /**
   * Uninstall a plugin (disable + unregister)
   */
  async uninstall(pluginId: string, storage: PluginStorage): Promise<void> {
    const installed = this.installed.get(pluginId);
    
    if (installed?.enabled) {
      await this.disable(pluginId, storage);
    }

    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      const ctx: PluginContext = {
        pluginId,
        version: plugin.version,
        timestamp: Date.now(),
        storage,
      };
      await plugin.uninstall?.(ctx);
    }

    this.unregister(pluginId);
    this.markUninstalled(pluginId);
  }
}

// Singleton instance
export const pluginManager = new PluginManager();

export default PluginManager;