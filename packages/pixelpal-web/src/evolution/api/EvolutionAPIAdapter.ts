/**
 * V159: Evolution API Adapter
 * 
 * MCP tool adapter for the Evolution API.
 */

import type { EvolutionAPIClient } from './EvolutionAPIClient';

export interface MCPTool {
  description: string;
  inputSchema: Record<string, { type: string }>;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

export interface EvolutionMCPTools {
  'evolution-trigger': MCPTool;
  'evolution-health': MCPTool;
  'evolution-adapt': MCPTool;
}

export function createEvolutionMCPTools(apiUrl: string): EvolutionMCPTools {
  const client = new EvolutionAPIClient(apiUrl);

  return {
    'evolution-trigger': {
      description: 'Trigger evolution with full integration flow',
      inputSchema: { personalityId: { type: 'string' } },
      handler: async (input: Record<string, unknown>) => {
        return client.trigger(input.personalityId as string);
      }
    },
    'evolution-health': {
      description: 'Get integrated health status',
      inputSchema: { personalityId: { type: 'string' } },
      handler: async (input: Record<string, unknown>) => {
        return client.getHealth(input.personalityId as string);
      }
    },
    'evolution-adapt': {
      description: 'Adapt strategy based on analytics',
      inputSchema: { personalityId: { type: 'string' } },
      handler: async (input: Record<string, unknown>) => {
        return client.adapt(input.personalityId as string);
      }
    }
  };
}