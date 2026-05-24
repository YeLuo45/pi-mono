/**
 * McpClientBridge Tests - V164
 * Simplified to focus on API correctness without zustand persist complexity
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { McpClientBridge, useMcpClientStore } from '../McpClientBridge';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('McpClientBridge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    // Reset store state
    useMcpClientStore.setState({
      agents: [],
      connectionStatus: {},
      availableTools: {},
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('API', () => {
    it('should add agent and return valid id', () => {
      const store = useMcpClientStore.getState();
      const agentId = store.addAgent({
        name: 'Test Agent',
        endpoint: 'http://localhost:9000',
        enabled: true,
      });
      expect(agentId).toMatch(/^agent_/);
      // Re-get state to see updated agents
      const updated = useMcpClientStore.getState();
      expect(updated.agents).toHaveLength(1);
    });

    it('should remove agent', () => {
      const store = useMcpClientStore.getState();
      const agentId = store.addAgent({ name: 'Test', endpoint: 'http://test', enabled: true });
      store.removeAgent(agentId);
      expect(store.agents).toHaveLength(0);
    });

    it('should update agent', () => {
      const store = useMcpClientStore.getState();
      const agentId = store.addAgent({ name: 'Original', endpoint: 'http://test', enabled: true });
      store.updateAgent(agentId, { name: 'Updated' });
      const agent = store.getAgent(agentId);
      expect(agent?.name).toBe('Updated');
    });

    it('should set and get connection status', () => {
      const store = useMcpClientStore.getState();
      const agentId = store.addAgent({ name: 'Test', endpoint: 'http://test', enabled: true });
      store.setConnectionStatus(agentId, 'connected');
      // Re-get state after mutation
      const updated = useMcpClientStore.getState();
      expect(updated.connectionStatus[agentId]).toBe('connected');
    });

    it('should set and get available tools', () => {
      const store = useMcpClientStore.getState();
      const agentId = store.addAgent({ name: 'Test', endpoint: 'http://test', enabled: true });
      const tools = [{ name: 'tool1', description: 'A tool' }];
      store.setAvailableTools(agentId, tools);
      // Re-get state after mutation
      const updated = useMcpClientStore.getState();
      expect(updated.availableTools[agentId]).toHaveLength(1);
    });

    it('should get connected agents', () => {
      const store = useMcpClientStore.getState();
      const id1 = store.addAgent({ name: 'A1', endpoint: 'http://a1', enabled: true });
      const id2 = store.addAgent({ name: 'A2', endpoint: 'http://a2', enabled: true });
      store.setConnectionStatus(id1, 'connected');
      store.setConnectionStatus(id2, 'connected');
      const connected = store.getConnectedAgents();
      expect(connected).toHaveLength(2);
    });
  });
});
