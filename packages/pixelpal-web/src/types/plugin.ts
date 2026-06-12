// Plugin types for the V59 Plugin System
// These are separate from the existing PluginService types

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon: string;
  enabled: boolean;
  permissions: string[];
}

export interface PluginAction {
  id: string;
  name: string;
  params: string[];
  /** Returns a result string, throws on error */
  handler: (params: Record<string, string>) => Promise<string>;
}

export interface Plugin extends PluginManifest {
  actions: PluginAction[];
}

/** Stored plugin data in IndexedDB (actions are serialized — no function) */
export interface StoredPlugin {
  manifest: PluginManifest;
  actions: Omit<PluginAction, 'handler'>[];
  config: Record<string, unknown>;
}
