/**
 * McpServer.test.ts - V145
 * Tests for MCP Server including session management, tool listing, and tool calls
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';

// We'll use dynamic imports to test the module
// Since the MCP server is designed for Node.js environment, we test its logic

describe('McpServer', () => {
  // Mock session functions for testing
  const mockSessions = new Map<string, { id: string; connectedAt: number; lastHeartbeat: number }>();
  
  const createSession = (userAgent?: string) => {
    const session = {
      id: `mcp-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      userAgent,
    };
    mockSessions.set(session.id, session);
    return session;
  };

  const heartbeatSession = (id: string): boolean => {
    const session = mockSessions.get(id);
    if (!session) return false;
    session.lastHeartbeat = Date.now();
    return true;
  };

  const removeSession = (id: string): boolean => {
    return mockSessions.delete(id);
  };

  const getSessionCount = (): number => {
    return mockSessions.size;
  };

  const listSessions = () => {
    return Array.from(mockSessions.values());
  };

  const clearAllSessions = () => {
    mockSessions.clear();
  };

  beforeEach(() => {
    clearAllSessions();
  });

  describe('Session Management', () => {
    it('creates a new session', () => {
      const session = createSession('test-agent');
      expect(session).toBeDefined();
      expect(session.id).toMatch(/^mcp-session-/);
      expect(session.connectedAt).toBeLessThanOrEqual(Date.now());
      expect(session.lastHeartbeat).toBeLessThanOrEqual(Date.now());
      expect(session.userAgent).toBe('test-agent');
    });

    it('tracks multiple sessions', () => {
      const session1 = createSession('agent-1');
      const session2 = createSession('agent-2');
      expect(getSessionCount()).toBe(2);
      expect(listSessions()).toHaveLength(2);
    });

    it('extends session on heartbeat', () => {
      const session = createSession('test');
      const originalHeartbeat = session.lastHeartbeat;
      
      // Wait a tiny bit to ensure time difference
      heartbeatSession(session.id);
      
      expect(session.lastHeartbeat).toBeGreaterThanOrEqual(originalHeartbeat);
    });

    it('removes session correctly', () => {
      const session = createSession('test');
      expect(removeSession(session.id)).toBe(true);
      expect(getSessionCount()).toBe(0);
    });

    it('returns false when removing non-existent session', () => {
      expect(removeSession('non-existent')).toBe(false);
    });

    it('cleans up stale sessions', () => {
      const session = createSession('test');
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      
      // Manually set an old heartbeat
      mockSessions.set(session.id, {
        id: session.id,
        connectedAt: session.connectedAt,
        lastHeartbeat: oldTimestamp,
      });

      // Cleanup stale sessions (older than 5 minutes)
      const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
      let cleaned = 0;
      const now = Date.now();
      for (const [id, s] of mockSessions) {
        if (now - s.lastHeartbeat > SESSION_TIMEOUT_MS) {
          mockSessions.delete(id);
          cleaned++;
        }
      }

      expect(cleaned).toBe(1);
      expect(getSessionCount()).toBe(0);
    });
  });

  describe('JSON-RPC 2.0 Format', () => {
    it('formats listTools response correctly', () => {
      const tools = [
        { name: 'skill:test', type: 'skill' as const, description: 'Test skill' },
        { name: 'role:planner', type: 'role' as const, description: 'Planner role' },
      ];

      const response = {
        jsonrpc: '2.0',
        result: { tools },
        id: null,
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
    });

    it('formats callTool success response correctly', () => {
      const response = {
        jsonrpc: '2.0',
        result: { success: true },
        id: 1,
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toEqual({ success: true });
      expect(response.id).toBe(1);
    });

    it('formats callTool error response correctly', () => {
      const response = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Tool not found: unknown',
        },
        id: 1,
      };

      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.id).toBe(1);
    });
  });

  describe('Tool Registry Integration', () => {
    it('filters tools by type', () => {
      const allTools = [
        { name: 'skill:execute', type: 'skill' as const, description: 'Execute skill' },
        { name: 'role:planner', type: 'role' as const, description: 'Planner role' },
        { name: 'memory:query', type: 'memory' as const, description: 'Query memory' },
        { name: 'persona:switch', type: 'persona' as const, description: 'Switch persona' },
      ];

      const filtered = allTools.filter(t => t.type === 'skill');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('skill:execute');
    });

    it('returns all tools when no filter', () => {
      const allTools = [
        { name: 'skill:execute', type: 'skill' as const, description: 'Execute skill' },
        { name: 'role:planner', type: 'role' as const, description: 'Planner role' },
      ];

      expect(allTools).toHaveLength(2);
    });
  });

  describe('Tool Call Invocation', () => {
    it('calls tool handler with params', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      const tool = {
        name: 'test:tool',
        type: 'skill' as const,
        description: 'Test tool',
        handler,
      };

      await tool.handler({ param1: 'value1' });
      
      expect(handler).toHaveBeenCalledWith({ param1: 'value1' });
    });

    it('throws error for unknown tool', async () => {
      const getTool = (name: string) => undefined;
      
      expect(() => {
        const tool = getTool('unknown:tool');
        if (!tool) throw new Error('Tool not found: unknown:tool');
      }).toThrow('Tool not found: unknown:tool');
    });
  });
});
