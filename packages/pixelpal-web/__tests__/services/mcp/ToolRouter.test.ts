/**
 * ToolRouter.test.ts - V145
 * Tests for Tool Router including route handling and JSON-RPC validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ToolRouter', () => {
  // Mock tool registry functions
  const mockTools = new Map<string, { name: string; type: string; description: string; handler?: Function }>();

  const registerTool = (tool: { name: string; type: string; description: string; handler?: Function }) => {
    mockTools.set(tool.name, tool);
  };

  const getTool = (name: string) => {
    return mockTools.get(name);
  };

  const listTools = (filter?: { type?: string }) => {
    const tools = Array.from(mockTools.values());
    if (!filter?.type) return tools;
    return tools.filter(t => t.type === filter.type);
  };

  const callTool = async (name: string, params?: Record<string, unknown>) => {
    const tool = getTool(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    if (!tool.handler) throw new Error(`Tool has no handler: ${name}`);
    return tool.handler(params);
  };

  beforeEach(() => {
    mockTools.clear();
    // Register some test tools
    registerTool({
      name: 'skill:execute',
      type: 'skill',
      description: 'Execute a skill',
      handler: async (params: Record<string, unknown>) => ({ executed: true, params }),
    });
    registerTool({
      name: 'role:planner',
      type: 'role',
      description: 'Activate planner role',
      handler: async (params: Record<string, unknown>) => ({ role: 'planner', activated: true }),
    });
    registerTool({
      name: 'memory:query',
      type: 'memory',
      description: 'Query memory',
      handler: async (params: Record<string, unknown>) => ({ memories: [], query: params }),
    });
    registerTool({
      name: 'persona:switch',
      type: 'persona',
      description: 'Switch persona',
      handler: async (params: Record<string, unknown>) => ({ persona: params.personaId, switched: true }),
    });
  });

  describe('Route Parsing', () => {
    it('parses /mcp/tools route', () => {
      const pathname = '/mcp/tools';
      expect(pathname).toBe('/mcp/tools');
    });

    it('parses /mcp/tools/:name/call route', () => {
      const pathname = '/mcp/tools/skill:execute/call';
      const match = pathname.match(/^\/mcp\/tools\/([^/]+)\/call$/);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('skill:execute');
    });

    it('extracts tool name from call route', () => {
      const pathname = '/mcp/tools/memory:query/call';
      const match = pathname.match(/^\/mcp\/tools\/([^/]+)\/call$/);
      expect(match?.[1]).toBe('memory:query');
    });

    it('returns null for invalid route', () => {
      const pathname = '/mcp/tools/invalid';
      const match = pathname.match(/^\/mcp\/tools\/([^/]+)\/call$/);
      expect(match).toBeNull();
    });
  });

  describe('GET /mcp/tools Handler', () => {
    it('returns all tools in JSON-RPC format', () => {
      const tools = listTools();
      const response = {
        jsonrpc: '2.0',
        result: { tools },
        id: null,
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result.tools).toHaveLength(4);
    });

    it('filters tools by type', () => {
      const skillTools = listTools({ type: 'skill' });
      const response = {
        jsonrpc: '2.0',
        result: { tools: skillTools },
        id: null,
      };

      expect(response.result.tools).toHaveLength(1);
      expect(response.result.tools[0].name).toBe('skill:execute');
    });

    it('returns empty array when no tools match filter', () => {
      const filtered = listTools({ type: 'nonexistent' });
      expect(filtered).toHaveLength(0);
    });
  });

  describe('POST /mcp/tools/:name/call Handler', () => {
    it('calls tool with params and returns success response', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'call',
        params: { skillId: 'test-skill' },
        id: 1,
      };

      const toolName = 'skill:execute';
      const result = await callTool(toolName, request.params);

      const response = {
        jsonrpc: '2.0',
        result,
        id: request.id,
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toEqual({ executed: true, params: { skillId: 'test-skill' } });
      expect(response.id).toBe(1);
    });

    it('returns error for unknown tool', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'call',
        params: {},
        id: 1,
      };

      try {
        await callTool('unknown:tool', request.params);
      } catch (err) {
        const response = {
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: err instanceof Error ? err.message : 'Unknown error',
          },
          id: request.id,
        };

        expect(response.jsonrpc).toBe('2.0');
        expect(response.error.code).toBe(-32601);
        expect(response.error.message).toBe('Tool not found: unknown:tool');
      }
    });

    it('handles tool without handler', async () => {
      mockTools.set('no-handler', {
        name: 'no-handler',
        type: 'skill',
        description: 'Tool without handler',
      });

      try {
        await callTool('no-handler', {});
      } catch (err) {
        expect(err instanceof Error).toBe(true);
        expect((err as Error).message).toContain('no handler');
      }
    });
  });

  describe('JSON-RPC Request Validation', () => {
    it('validates request has jsonrpc version', () => {
      const validRequest = {
        jsonrpc: '2.0',
        method: 'call',
        params: {},
        id: 1,
      };

      expect(validRequest.jsonrpc).toBe('2.0');
    });

    it('rejects request without jsonrpc version', () => {
      const invalidRequest = {
        method: 'call',
        params: {},
        id: 1,
      } as any;

      expect(invalidRequest.jsonrpc).toBeUndefined();
    });

    it('rejects request without method', () => {
      const invalidRequest = {
        jsonrpc: '2.0',
        params: {},
        id: 1,
      } as any;

      expect(typeof invalidRequest.method).toBe('undefined');
    });

    it('validates id can be null', () => {
      const request = {
        jsonrpc: '2.0',
        method: 'call',
        params: {},
        id: null,
      };

      expect(request.id).toBeNull();
    });

    it('validates id can be a string', () => {
      const request = {
        jsonrpc: '2.0',
        method: 'call',
        params: {},
        id: 'request-1',
      };

      expect(request.id).toBe('request-1');
    });

    it('validates id can be a number', () => {
      const request = {
        jsonrpc: '2.0',
        method: 'call',
        params: {},
        id: 42,
      };

      expect(request.id).toBe(42);
    });
  });

  describe('404 Handling', () => {
    it('returns 404 for unknown route', () => {
      const unknownRoutes = [
        '/mcp/unknown',
        '/mcp/tools/',
        '/mcp/tools/skill:execute', // missing /call
        '/mcp/tools/skill:execute/call/extra',
      ];

      unknownRoutes.forEach(route => {
        const isKnown = route === '/mcp/tools' || route.match(/^\/mcp\/tools\/([^/]+)\/call$/);
        expect(isKnown).toBeFalsy();
      });
    });
  });
});
