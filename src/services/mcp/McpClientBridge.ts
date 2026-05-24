/**
 * MCP Client Bridge - V164
 * Connects pixel-pal-web as MCP Client to external MCP Servers
 * Enables consumption of external Agent tools
 */

import { McpClientConfig, McpTool, ToolCallResult, AgentConnectionStatus } from './types/mcp-client';
import { ToolCache } from './McpToolCache';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExternalAgentConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
  createdAt: string;
  lastConnectedAt?: string;
}

export interface McpClientState {
  agents: ExternalAgentConfig[];
  connectionStatus: Record<string, AgentConnectionStatus>;
  availableTools: Record<string, McpTool[]>;

  // Actions
  addAgent: (config: Omit<ExternalAgentConfig, 'id' | 'createdAt'>) => string;
  removeAgent: (agentId: string) => void;
  updateAgent: (agentId: string, updates: Partial<ExternalAgentConfig>) => void;
  setConnectionStatus: (agentId: string, status: AgentConnectionStatus) => void;
  setAvailableTools: (agentId: string, tools: McpTool[]) => void;
  getAgent: (agentId: string) => ExternalAgentConfig | undefined;
  getConnectedAgents: () => ExternalAgentConfig[];
}

const toolCache = new ToolCache();

export const useMcpClientStore = create<McpClientState>()(
  persist(
    (set, get) => ({
      agents: [],
      connectionStatus: {},
      availableTools: {},

      addAgent: (config) => {
        const id = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newAgent: ExternalAgentConfig = {
          ...config,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          agents: [...state.agents, newAgent],
          connectionStatus: { ...state.connectionStatus, [id]: 'disconnected' },
        }));
        return id;
      },

      removeAgent: (agentId) => {
        set((state) => {
          const { [agentId]: _cs, ...restCs } = state.connectionStatus;
          const { [agentId]: _tools, ...restTools } = state.availableTools;
          return {
            agents: state.agents.filter((a) => a.id !== agentId),
            connectionStatus: restCs,
            availableTools: restTools,
          };
        });
      },

      updateAgent: (agentId, updates) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === agentId ? { ...a, ...updates } : a
          ),
        }));
      },

      setConnectionStatus: (agentId, status) => {
        set((state) => ({
          connectionStatus: { ...state.connectionStatus, [agentId]: status },
        }));
      },

      setAvailableTools: (agentId, tools) => {
        set((state) => ({
          availableTools: { ...state.availableTools, [agentId]: tools },
        }));
      },

      getAgent: (agentId) => {
        return get().agents.find((a) => a.id === agentId);
      },

      getConnectedAgents: () => {
        return get().agents.filter((a) => {
          const status = get().connectionStatus[a.id];
          return status === 'connected';
        });
      },
    }),
    {
      name: 'mcp-client-store',
      partialize: (state) => ({
        agents: state.agents,
      }),
    }
  )
);

export class McpClientBridge {
  private store: McpClientState;

  constructor() {
    this.store = useMcpClientStore.getState();
  }

  /**
   * Connect to an external MCP Server
   */
  async connect(agentId: string): Promise<void> {
    const agent = this.store.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    this.store.setConnectionStatus(agentId, 'connecting');

    try {
      // Discover tools from the external MCP Server
      const tools = await this.discoverTools(agent);
      this.store.setAvailableTools(agentId, tools);
      this.store.setConnectionStatus(agentId, 'connected');
      this.store.updateAgent(agentId, { lastConnectedAt: new Date().toISOString() });
    } catch (error) {
      this.store.setConnectionStatus(agentId, 'error');
      throw error;
    }
  }

  /**
   * Disconnect from an external MCP Server
   */
  async disconnect(agentId: string): Promise<void> {
    this.store.setConnectionStatus(agentId, 'disconnected');
    this.store.setAvailableTools(agentId, []);
  }

  /**
   * Reconnect to an external MCP Server
   */
  async reconnect(agentId: string): Promise<void> {
    await this.disconnect(agentId);
    await this.connect(agentId);
  }

  /**
   * Discover tools from an external MCP Server
   */
  async discoverTools(agent: ExternalAgentConfig): Promise<McpTool[]> {
    // Check cache first
    const cached = toolCache.get(agent.id);
    if (cached) return cached;

    // Call the external MCP Server's tools/list endpoint
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (agent.apiKey) {
      headers['Authorization'] = `Bearer ${agent.apiKey}`;
    }

    try {
      const response = await fetch(`${agent.endpoint}/mcp/tools`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as { tools?: McpTool[]; result?: McpTool[] };
      const tools = data.tools ?? data.result ?? [];

      // Cache the tools with TTL
      toolCache.set(agent.id, tools, 5 * 60 * 1000); // 5 minutes TTL

      return tools;
    } catch (error) {
      // If fetch fails, try a simple endpoint check
      console.error(`Failed to discover tools from ${agent.endpoint}:`, error);
      return [];
    }
  }

  /**
   * List all available tools from a connected agent
   */
  async listTools(agentId: string): Promise<McpTool[]> {
    const agent = this.store.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    // Check cache first
    const cached = toolCache.get(agentId);
    if (cached) return cached;

    return this.store.availableTools[agentId] ?? [];
  }

  /**
   * Call a tool on an external MCP Server
   */
  async callTool(
    agentId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolCallResult> {
    const agent = this.store.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const status = this.store.connectionStatus[agentId];
    if (status !== 'connected') {
      throw new Error(`Agent ${agentId} is not connected (status: ${status})`);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (agent.apiKey) {
      headers['Authorization'] = `Bearer ${agent.apiKey}`;
    }

    const timeoutMs = 30000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${agent.endpoint}/mcp/tools/${encodeURIComponent(toolName)}/call`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ arguments: args }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json() as { result?: unknown; error?: string; content?: Array<{ type: string; text: string }> };

      if (data.error) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        result: data.result ?? data.content ?? null,
      };
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Tool call timed out' };
      }
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get connection status for all agents
   */
  getAllStatuses(): Record<string, AgentConnectionStatus> {
    return { ...this.store.connectionStatus };
  }

  /**
   * Get specific agent status
   */
  getAgentStatus(agentId: string): AgentConnectionStatus {
    return this.store.connectionStatus[agentId] ?? 'disconnected';
  }

  /**
   * Get all connected agents
   */
  getConnectedAgents(): ExternalAgentConfig[] {
    return this.store.getConnectedAgents();
  }

  /**
   * Subscribe to store changes
   */
  subscribe(listener: (state: McpClientState) => void): () => void {
    return useMcpClientStore.subscribe(listener);
  }
}

// Singleton instance
let bridgeInstance: McpClientBridge | null = null;

export function getMcpClientBridge(): McpClientBridge {
  if (!bridgeInstance) {
    bridgeInstance = new McpClientBridge();
  }
  return bridgeInstance;
}