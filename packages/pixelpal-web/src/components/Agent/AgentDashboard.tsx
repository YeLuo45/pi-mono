import React, { useState, useEffect } from 'react';

interface AgentStatus {
  id: string;
  name: string;
  avatar?: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'unreachable';
  currentTask?: string;
  load: number;  // 0-1
  lastHeartbeat: number;
  type: 'main' | 'memory' | 'search' | 'tool' | 'persona';
}

interface AgentDashboardProps {
  agents: AgentStatus[];
  onAgentClick?: (agentId: string) => void;
}

const AGENT_COLORS = {
  main: '#4a9eff',
  memory: '#9b59b6',
  search: '#2ecc71',
  tool: '#e67e22',
  persona: '#e91e63',
};

const AGENT_ICONS = {
  main: '🎯',
  memory: '🧠',
  search: '🔍',
  tool: '🔧',
  persona: '🎭',
};

const STATUS_LABELS = {
  idle: { label: 'Idle', color: '#666' },
  running: { label: 'Running', color: '#4a9eff' },
  completed: { label: 'Done', color: '#2ecc71' },
  failed: { label: 'Failed', color: '#e74c3c' },
  unreachable: { label: 'Offline', color: '#999' },
};

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ agents, onAgentClick }) => {
  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        Agent Dashboard · {agents.length} agents
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {agents.map(agent => {
          const statusInfo = STATUS_LABELS[agent.status];
          const color = AGENT_COLORS[agent.type];
          return (
            <div
              key={agent.id}
              onClick={() => onAgentClick?.(agent.id)}
              style={{
                padding: '10px 12px',
                background: '#1a1a2e',
                border: `1px solid ${agent.status === 'running' ? color : '#333'}`,
                borderRadius: 6,
                cursor: 'pointer',
                opacity: agent.status === 'unreachable' ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{AGENT_ICONS[agent.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{agent.name}</div>
                  <div style={{ fontSize: 11, color: statusInfo.color }}>{statusInfo.label}</div>
                </div>
              </div>
              
              {agent.currentTask && (
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {agent.currentTask}
                </div>
              )}
              
              <div style={{ height: 4, background: '#333', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${agent.load * 100}%`,
                    height: '100%',
                    background: agent.status === 'running' ? color : '#555',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
                {agent.lastHeartbeat > 0 ? `heartbeat ${Math.round((Date.now() - agent.lastHeartbeat) / 1000)}s ago` : 'no heartbeat'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Mock data generator for preview
export function createMockAgents(): AgentStatus[] {
  return [
    { id: 'main', name: 'MainAgent', status: 'running', currentTask: 'Processing user request', load: 0.7, lastHeartbeat: Date.now() - 2000, type: 'main' },
    { id: 'memory', name: 'MemoryAgent', status: 'completed', currentTask: 'Retrieve context', load: 0.2, lastHeartbeat: Date.now() - 5000, type: 'memory' },
    { id: 'search', name: 'SearchAgent', status: 'idle', load: 0, lastHeartbeat: Date.now() - 10000, type: 'search' },
    { id: 'tool', name: 'ToolAgent', status: 'idle', load: 0, lastHeartbeat: Date.now() - 15000, type: 'tool' },
    { id: 'persona', name: 'PersonaAgent', status: 'completed', load: 0.1, lastHeartbeat: Date.now() - 3000, type: 'persona' },
  ];
}
