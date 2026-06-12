// Plugin Registry — registers all built-in plugins
import { PluginService } from '../services/plugin/PluginService';
import { todoPlugin } from '../services/plugin/TodoPlugin';
import { calendarPlugin } from '../services/plugin/CalendarPlugin';
import { emailPlugin } from '../services/plugin/EmailPlugin';
import { WeatherPlugin } from '../services/plugin/WeatherPlugin';
import { NewsPlugin } from '../services/plugin/NewsPlugin';
import { telegramPlugin } from '../services/plugin/TelegramPlugin';
import { WebhookService } from '../services/webhook/WebhookService';

// V149: Plugin Protocol v2 exports
export { PluginManager, pluginManager } from './PluginProtocolV2';
export { PluginAdapter, LegacyPluginBusAdapter, adaptLegacyPlugin } from './PluginAdapter';
export type { Plugin, PluginContext, PluginStorage, PluginMetadata, InstalledPlugin } from './PluginProtocolV2';

// All available plugins (built-in + optional)
export const ALL_PLUGINS = [
  todoPlugin,
  calendarPlugin,
  emailPlugin,
  WeatherPlugin,
  NewsPlugin,
  telegramPlugin,
];

// Plugin IDs that are pre-installed (always registered)
export const BUILTIN_PLUGIN_IDS = ['todo', 'calendar', 'email', 'telegram'];

export function registerBuiltinPlugins(): void {
  PluginService.register(todoPlugin);
  PluginService.register(calendarPlugin);
  PluginService.register(emailPlugin);
  PluginService.register(telegramPlugin);
}

export async function registerOptionalPlugins(): Promise<void> {
  const installed = getInstalledPluginIds();
  for (const plugin of ALL_PLUGINS) {
    if (installed.includes(plugin.id) && !BUILTIN_PLUGIN_IDS.includes(plugin.id)) {
      PluginService.register(plugin);
    }
  }
  // Init webhook service
  await WebhookService.init();
}

export function installPlugin(pluginId: string): void {
  const plugin = ALL_PLUGINS.find((p) => p.id === pluginId);
  if (!plugin) return;
  if (!PluginService.getPlugin(pluginId)) {
    PluginService.register(plugin);
  }
  const installed = getInstalledPluginIds();
  if (!installed.includes(pluginId)) {
    localStorage.setItem('pixelpal_installed_plugins', JSON.stringify([...installed, pluginId]));
  }
}

export function uninstallPlugin(pluginId: string): void {
  if (BUILTIN_PLUGIN_IDS.includes(pluginId)) return;
  PluginService.unregister(pluginId);
  const installed = getInstalledPluginIds().filter((id) => id !== pluginId);
  localStorage.setItem('pixelpal_installed_plugins', JSON.stringify(installed));
}

export function getInstalledPluginIds(): string[] {
  try {
    const stored = localStorage.getItem('pixelpal_installed_plugins');
    if (stored) return JSON.parse(stored);
  } catch {}
  return BUILTIN_PLUGIN_IDS;
}

export function isPluginInstalled(pluginId: string): boolean {
  return getInstalledPluginIds().includes(pluginId);
}

export { PluginService } from '../services/plugin/PluginService';
export { PluginPanel } from '../components/Plugin/PluginPanel';
