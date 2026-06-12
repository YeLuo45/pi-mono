/**
 * UnifiedPluginService — V68统一插件服务
 * 
 * 合并两套插件系统：
 * - 新系统：src/services/plugin/PluginService (todo/calendar/email等)
 * - 旧系统：src/services/plugins/pluginRegistry (weather/calc/translator)
 * 
 * @deprecated V68后请使用 unifiedPluginService
 */

import { PluginService } from '../plugin/PluginService';
import { pluginRegistry } from './pluginRegistry';
import type { ToolDefinition } from '../agent/types';

// 统一工具接口（兼容新旧两套格式）
export interface Tool {
  name: string;
  description: string;
  params: ToolDefinition['parameters'];
  /** 执行函数 */
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

interface PluginConfig {
  id: string;
  name: string;
  description: string;
  actions?: Array<{
    id: string;
    name: string;
    params: string[];
    handler: (params: Record<string, string>) => Promise<string>;
  }>;
  capabilities?: Array<{ type: 'ai_tool'; name: string }>;
}

class UnifiedPluginService {
  private pluginService: typeof PluginService;
  private registry: typeof pluginRegistry;

  constructor() {
    this.pluginService = PluginService;
    this.registry = pluginRegistry;
  }

  /**
   * 执行工具（兼容旧接口）
   * 优先从旧系统(registry)查找，再从新系统(PluginService)查找
   */
  async execute(toolName: string, params: unknown): Promise<unknown> {
    // 1. 先从旧系统 registry 查找（presetPlugins: weather/calc/translator）
    const oldResult = await this.registry.tryExecute(toolName as string);
    if (oldResult !== null) {
      return oldResult;
    }

    // 2. 从新系统 PluginService 查找
    // 新系统的工具调用格式是 callTool(pluginId, toolName, args)
    // 需要解析 toolName 格式: "pluginId:toolName"
    if (typeof toolName === 'string' && toolName.includes(':')) {
      const [pluginId, tool] = toolName.split(':');
      try {
        return await this.pluginService.callTool(pluginId, tool, params);
      } catch {
        // not found in new system either
      }
    }

    // 3. 尝试从新系统的 AI tools 列表匹配
    const aiTools = this.pluginService.getAITools();
    const matchedTool = aiTools.find(t => t.toolName === toolName);
    if (matchedTool) {
      return this.pluginService.callTool(matchedTool.pluginId, matchedTool.toolName, params);
    }

    return undefined;
  }

  /**
   * 通过ID执行（新系统格式）
   */
  async executeById(pluginId: string, toolName: string, params: unknown): Promise<unknown> {
    return this.pluginService.callTool(pluginId, toolName, params);
  }

  /**
   * 注册插件（兼容两套格式）
   */
  register(config: PluginConfig): void {
    // 如果有 actions，说明是旧格式，转为新系统注册
    if (config.actions && config.actions.length > 0) {
      // 旧格式插件暂不支持注册到新系统，只打印警告
      console.warn('[UnifiedPluginService] Legacy plugin format not supported for registration, use new format');
      return;
    }

    // 新格式插件应该直接用 PluginService.register()
    // 这里标记为 deprecated，推荐直接用 PluginService
    console.warn('[UnifiedPluginService] Use PluginService.register() directly for new format plugins');
  }

  /**
   * 获取所有工具（合并去重）
   */
  getAllTools(): ToolDefinition[] {
    const seen = new Map<string, ToolDefinition>();

    // 1. 从旧系统 registry 获取 presetPlugins
    const oldPlugins = this.registry.getAllPlugins();
    for (const plugin of oldPlugins) {
      for (const action of plugin.actions) {
        const toolName = `${plugin.id}:${action.id}`;
        if (!seen.has(toolName)) {
          seen.set(toolName, {
            name: toolName,
            description: `${plugin.name} - ${action.name}`,
            parameters: action.params.map(p => ({
              name: p,
              type: 'string' as const,
              description: '',
              required: true,
            })),
            execute: async (args) => {
              return this.registry.executeAction(plugin.id, action.id, args as Record<string, string>);
            },
          });
        }
      }
    }

    // 2. 从新系统 PluginService 获取 AI tools
    const aiTools = this.pluginService.getAITools();
    for (const tool of aiTools) {
      const toolName = `${tool.pluginId}:${tool.toolName}`;
      if (!seen.has(toolName)) {
        seen.set(toolName, {
          name: toolName,
          description: `${tool.pluginName} - ${tool.toolName}`,
          parameters: [],
          execute: async (args) => {
            return this.pluginService.callTool(tool.pluginId, tool.toolName, args);
          },
        });
      }
    }

    return Array.from(seen.values());
  }

  /**
   * 兼容旧接口
   */
  getAvailableTools(): ToolDefinition[] {
    return this.getAllTools();
  }

  /**
   * 获取工具列表（简化格式，用于AI选择）
   */
  getToolList(): Array<{ pluginId: string; pluginName: string; toolName: string }> {
    return this.pluginService.getAITools();
  }

  /**
   * 获取已注册插件列表（新系统）
   */
  listPlugins() {
    return this.pluginService.listPlugins();
  }

  /**
   * 检查插件是否已安装
   */
  hasPlugin(pluginId: string): boolean {
    return this.pluginService.getPlugin(pluginId) !== undefined;
  }
}

export const unifiedPluginService = new UnifiedPluginService();
