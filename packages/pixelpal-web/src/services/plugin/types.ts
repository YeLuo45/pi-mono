// Plugin System V9 Types

export type PluginCapability =
  | { type: 'panel' }
  | { type: 'ai_tool'; name: string }
  | { type: 'trigger'; event: string };

export interface Plugin {
  id: string;
  name: string;
  version: string;
  icon?: string; // emoji
  panel?: React.ComponentType<{ pluginId: string }>;
  capabilities: PluginCapability[];
  configSchema?: Record<string, unknown>;
  // Lifecycle
  onInit?: () => void | Promise<void>;
  onDestroy?: () => void | Promise<void>;
}

export interface PluginStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface PluginRegistration {
  plugin: Plugin;
  storage: PluginStorage;
}

export type AppPanel = 'chat' | 'calendar' | 'tasks' | 'document' | 'knowledge' | 'email' | 'writing' | 'settings' | 'team';
