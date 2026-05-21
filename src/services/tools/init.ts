/**
 * Tool Server Initialization — registers existing system tools with the ToolRegistry
 */

import { ToolRegistry } from './registry';
import { ToolSpec } from './registry';
import { agentExecutor } from '../agent/agentExecutor';
import { pluginRegistry } from '../plugins/pluginRegistry';

function registerAgentTools() {
  const spec: ToolSpec = {
    name: 'agent_execute',
    description: 'Execute an agent task by task ID through the agentExecutor',
    category: 'agent',
    input_schema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The ID of the task to execute' },
      },
      required: ['taskId'],
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    timeout_ms: 120000,
    retryable: true,
  };

  ToolRegistry.getInstance().register(spec, async (args) => {
    const taskId = args.taskId as string;
    const start = Date.now();
    try {
      await agentExecutor.executeTask(taskId);
      return { success: true, result: null, error: null, duration_ms: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, result: null, error: msg, duration_ms: Date.now() - start };
    }
  });
}

function registerSkillTools() {
  const spec: ToolSpec = {
    name: 'plugin_execute',
    description: 'Execute a plugin action by pluginId and actionId',
    category: 'skill',
    input_schema: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'Plugin identifier' },
        actionId: { type: 'string', description: 'Action identifier within the plugin' },
        params: { type: 'object', description: 'Parameters for the action', additionalProperties: { type: 'string' } },
      },
      required: ['pluginId', 'actionId'],
    },
    output_schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
    timeout_ms: 30000,
    retryable: false,
  };

  ToolRegistry.getInstance().register(spec, async (args) => {
    const { pluginId, actionId, params = {} } = args as {
      pluginId: string;
      actionId: string;
      params: Record<string, string>;
    };
    const start = Date.now();
    try {
      const result = await pluginRegistry.executeAction(pluginId, actionId, params);
      return { success: true, result, error: null, duration_ms: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, result: null, error: msg, duration_ms: Date.now() - start };
    }
  });
}

export async function initToolRegistry(): Promise<void> {
  registerAgentTools();
  registerSkillTools();
}
