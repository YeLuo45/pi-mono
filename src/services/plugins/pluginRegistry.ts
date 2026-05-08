/**
 * PluginRegistry — singleton that manages all plugins (preset + user-installed)
 *
 * Load order:
 *   1. Register preset plugins (always enabled, always available)
 *   2. Load user plugins from IndexedDB and register those that are enabled
 */

import type { Plugin } from '../../types/plugin';
import { presetPlugins } from './presetPlugins';
import * as pluginStorage from '../storage/pluginStorage';

class PluginRegistryImpl {
  private plugins = new Map<string, Plugin>();

  /** Load all plugins — call once at app startup */
  async loadPlugins(): Promise<void> {
    // 1. Register preset plugins (always)
    for (const plugin of presetPlugins) {
      this.plugins.set(plugin.id, plugin);
    }

    // 2. Load user-installed plugins from IndexedDB
    try {
      const userPlugins = await pluginStorage.getPlugins();
      for (const plugin of userPlugins) {
        if (plugin.enabled) {
          this.plugins.set(plugin.id, plugin);
        }
      }
    } catch (err) {
      console.error('[PluginRegistry] Failed to load user plugins:', err);
    }
  }

  getPlugin(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): Plugin[] {
    return this.getAllPlugins().filter((p) => p.enabled);
  }

  async enablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    plugin.enabled = true;
    this.plugins.set(id, plugin);

    // Persist if user-installed (not a preset)
    if (!presetPlugins.find((p) => p.id === id)) {
      await pluginStorage.setEnabled(id, true);
    }
  }

  async disablePlugin(id: string): Promise<void> {
    const plugin = this.plugins.get(id);
    if (!plugin) return;

    plugin.enabled = false;
    this.plugins.set(id, plugin);

    if (!presetPlugins.find((p) => p.id === id)) {
      await pluginStorage.setEnabled(id, false);
    }
  }

  /** Execute a plugin action by pluginId + actionId */
  async executeAction(
    pluginId: string,
    actionId: string,
    params: Record<string, string>
  ): Promise<string> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`[PluginRegistry] Plugin "${pluginId}" not found`);
    }

    if (!plugin.enabled) {
      throw new Error(`[PluginRegistry] Plugin "${pluginId}" is disabled`);
    }

    const action = plugin.actions.find((a) => a.id === actionId);
    if (!action) {
      throw new Error(`[PluginRegistry] Action "${actionId}" not found on plugin "${pluginId}"`);
    }

    try {
      return await action.handler(params);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`[PluginRegistry] Action "${actionId}" failed: ${msg}`);
    }
  }

  /**
   * Try to match a user message against all enabled plugin actions.
   * Returns { pluginId, actionId, params } if matched, null otherwise.
   * Simple keyword + regex matching for preset plugins.
   */
  matchAction(text: string): { pluginId: string; actionId: string; params: Record<string, string> } | null {
    const lower = text.toLowerCase();

    // weather-plugin: "天气", "weather", "温度", "气温"
    if (/天气|weather|温度|气温|下雨|晴|雨/.test(lower)) {
      // Extract city name (simple heuristic: after keywords like "北京天气" or "weather in")
      const cityMatch = text.match(/[:：]?\s*([^\s,，!?]{2,10})(?:\s|$|的|$)/);
      const city = cityMatch ? cityMatch[1].replace(/[的?？!！.,]/g, '') : '北京';
      return { pluginId: 'weather-plugin', actionId: 'getWeather', params: { city } };
    }

    // calc-plugin: contains math operators
    if (/^\s*[\d\+\-\*\/\(\)\.\s]+$/.test(text.trim())) {
      return { pluginId: 'calc-plugin', actionId: 'calculate', params: { expr: text.trim() } };
    }

    // translate-plugin: "翻译", "translate"
    if (/翻译|translate|译成/.test(lower)) {
      const fromMatch = text.match(/从\s*([\w\u4e00-\u9fa5]{2,10})/);
      const toMatch = text.match(/(?:到|成|为)\s*([\w\u4e00-\u9fa5]{2,10})/);
      const from = fromMatch ? fromMatch[1] : 'auto';
      const to = toMatch ? toMatch[1] : '中文';
      // Extract text to translate
      const txt = text.replace(/翻译|translate|译成/g, '').replace(/从\s*[\w\u4e00-\u9fa5]+/g, '').replace(/(?:到|成|为)\s*[\w\u4e00-\u9fa5]+/g, '').trim();
      return { pluginId: 'translate-plugin', actionId: 'translate', params: { text: txt || text, from, to } };
    }

    return null;
  }

  /** Execute a matching plugin action for the given user text. Returns result string or null. */
  async tryExecute(text: string): Promise<string | null> {
    const match = this.matchAction(text);
    if (!match) return null;

    try {
      const result = await this.executeAction(match.pluginId, match.actionId, match.params);
      return result;
    } catch (err) {
      console.warn('[PluginRegistry] tryExecute failed:', err);
      return null;
    }
  }
}

export const pluginRegistry = new PluginRegistryImpl();
