/**
 * MCP Panel - V145
 * UI Panel showing connected clients, tool list, and call log
 */

import React, { useState, useEffect } from 'react';
import { Box } from '../ui/Box';
import { MyTypography, MyPaper , MySwitch as Switch, MyTab as Tab } from '../MUI替代';
import { useTranslation } from 'react-i18next';
import { NetworkIcon, TerminalIcon, ListIcon, TimeIcon } from '../ui/muiIconMap';

interface CallLogEntry {
  id: string;
  timestamp: number;
  toolName: string;
  params: Record<string, unknown>;
  result?: unknown;
  error?: string;
  duration?: number;
}

interface McpPanelProps {
  // Optional: external tool list override
  tools?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

export const McpPanel: React.FC<McpPanelProps> = ({ tools: externalTools }) => {
  const { t } = useTranslation();
  const [connectedClients, setConnectedClients] = useState(0);
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);
  const [serverStatus, setServerStatus] = useState<'stopped' | 'running'>('stopped');
  const [selectedTab, setSelectedTab] = useState<'clients' | 'tools' | 'logs'>('clients');

  // Poll server status periodically when running
  useEffect(() => {
    const interval = setInterval(() => {
      // In a real implementation, this would query the MCP server status
      // For now, we'll just show placeholder data
    }, 5000);
    return () => clearInterval(interval);
  }, [serverStatus]);

  // Built-in tools (placeholder - would come from MCP server in production)
  const defaultTools: McpPanelProps['tools'] = [
    { name: 'skill:skill-manager:execute', type: 'skill', description: 'Execute a registered skill' },
    { name: 'role:planner:activate', type: 'role', description: 'Activate a planning role' },
    { name: 'memory:query', type: 'memory', description: 'Query the memory store' },
    { name: 'memory:remember', type: 'memory', description: 'Store a memory' },
    { name: 'persona:switch', type: 'persona', description: 'Switch active persona' },
  ];

  const displayTools = externalTools || defaultTools;

  const addCallLogEntry = (entry: Omit<CallLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: CallLogEntry = {
      ...entry,
      id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setCallLog((prev) => [newEntry, ...prev].slice(0, 100)); // Keep last 100 entries
  };

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        bgcolor: '#08090a',
      }}
    >
      {/* Header */}
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <NetworkIcon size={18} />
        <MyTypography variant="subtitle2" css={{ fontWeight: 600 }}>
          MCP Tool Bridge
        </MyTypography>
        <Box
          css={{
            ml: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            bgcolor: serverStatus === 'running' ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)',
          }}
        >
          <Box
            css={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: serverStatus === 'running' ? '#4caf50' : '#666',
            }}
          />
          <MyTypography variant="caption" css={{ color: '#aaa', fontSize: 10 }}>
            {serverStatus === 'running' ? 'Running' : 'Stopped'}
          </MyTypography>
        </Box>
      </Box>

      {/* Tab Navigation */}
      <Box
        css={{
          display: 'flex',
          gap: 0.5,
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {(['clients', 'tools', 'logs'] as const).map((tab) => (
          <Box
            key={tab}
            component="button"
            onClick={() => setSelectedTab(tab)}
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              border: 'none',
              cursor: 'pointer',
              bgcolor: selectedTab === tab ? 'rgba(155,127,212,0.2)' : 'transparent',
              color: selectedTab === tab ? '#9b7fd4' : '#888',
              fontSize: 12,
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: selectedTab === tab ? 'rgba(155,127,212,0.2)' : 'rgba(255,255,255,0.05)',
              },
            }}
          >
            {tab === 'clients' && <NetworkIcon size={14} />}
            {tab === 'tools' && <ListIcon size={14} />}
            {tab === 'logs' && <TerminalIcon size={14} />}
            {t(`mcp.tabs.${tab}`)}
          </Box>
        ))}
      </Box>

      {/* Content */}
      <Box css={{ flex: 1, overflow: 'auto', p: 2 }}>
        {/* Clients Tab */}
        {selectedTab === 'clients' && (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.03)',
              }}
            >
              <NetworkIcon size={24} css={{ color: '#9b7fd4' }} />
              <Box css={{ flex: 1 }}>
                <MyTypography variant="body2" css={{ color: '#fff', fontWeight: 500 }}>
                  {t('mcp.connectedClients')}
                </MyTypography>
                <MyTypography variant="caption" css={{ color: '#666' }}>
                  {t('mcp.connectedClientsDesc')}
                </MyTypography>
              </Box>
              <MyTypography
                variant="h4"
                css={{
                  color: '#9b7fd4',
                  fontWeight: 700,
                  fontSize: 32,
                  fontFamily: 'monospace',
                }}
              >
                {connectedClients}
              </MyTypography>
            </Box>

            <Box
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.03)',
              }}
            >
              <TimeIcon size={24} css={{ color: '#666' }} />
              <Box css={{ flex: 1 }}>
                <MyTypography variant="body2" css={{ color: '#fff', fontWeight: 500 }}>
                  {t('mcp.serverUptime')}
                </MyTypography>
                <MyTypography variant="caption" css={{ color: '#666' }}>
                  {t('mcp.serverUptimeDesc')}
                </MyTypography>
              </Box>
              <MyTypography
                variant="body2"
                css={{ color: '#fff', fontFamily: 'monospace' }}
              >
                --
              </MyTypography>
            </Box>
          </Box>
        )}

        {/* Tools Tab */}
        {selectedTab === 'tools' && (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {displayTools.map((tool) => (
              <Box
                key={tool.name}
                css={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Box css={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box
                    css={{
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 0.5,
                      bgcolor:
                        tool.type === 'skill'
                          ? 'rgba(76,175,80,0.2)'
                          : tool.type === 'role'
                          ? 'rgba(33,150,243,0.2)'
                          : tool.type === 'memory'
                          ? 'rgba(255,152,0,0.2)'
                          : 'rgba(155,127,212,0.2)',
                      fontSize: 10,
                      fontWeight: 600,
                      color:
                        tool.type === 'skill'
                          ? '#4caf50'
                          : tool.type === 'role'
                          ? '#2196f3'
                          : tool.type === 'memory'
                          ? '#ff9800'
                          : '#9b7fd4',
                    }}
                  >
                    {tool.type.toUpperCase()}
                  </Box>
                  <MyTypography
                    variant="body2"
                    css={{ color: '#fff', fontWeight: 500, fontFamily: 'monospace', fontSize: 11 }}
                  >
                    {tool.name}
                  </MyTypography>
                </Box>
                <MyTypography variant="caption" css={{ color: '#888' }}>
                  {tool.description}
                </MyTypography>
              </Box>
            ))}
          </Box>
        )}

        {/* Logs Tab */}
        {selectedTab === 'logs' && (
          <Box css={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {callLog.length === 0 ? (
              <Box
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  py: 4,
                  color: '#666',
                }}
              >
                <TerminalIcon size={32} css={{ mb: 1, opacity: 0.5 }} />
                <MyTypography variant="body2" css={{ color: '#666' }}>
                  {t('mcp.noLogs')}
                </MyTypography>
              </Box>
            ) : (
              callLog.map((entry) => (
                <Box
                  key={entry.id}
                  css={{
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    borderLeft: `3px solid ${entry.error ? '#f44336' : '#4caf50'}`,
                  }}
                >
                  <Box css={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <MyTypography
                      variant="caption"
                      css={{ color: '#666', fontFamily: 'monospace' }}
                    >
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </MyTypography>
                    <MyTypography
                      variant="caption"
                      css={{
                        color: entry.error ? '#f44336' : '#4caf50',
                        fontFamily: 'monospace',
                      }}
                    >
                      {entry.error ? 'ERROR' : 'OK'}
                    </MyTypography>
                    <MyTypography
                      variant="caption"
                      css={{ color: '#fff', fontFamily: 'monospace' }}
                    >
                      {entry.toolName}
                    </MyTypography>
                    {entry.duration !== undefined && (
                      <MyTypography variant="caption" css={{ color: '#666', ml: 'auto' }}>
                        {entry.duration}ms
                      </MyTypography>
                    )}
                  </Box>
                  {entry.error ? (
                    <MyTypography variant="caption" css={{ color: '#f44336' }}>
                      {entry.error}
                    </MyTypography>
                  ) : (
                    <MyTypography
                      variant="caption"
                      css={{ color: '#888', fontFamily: 'monospace' }}
                    >
                      {JSON.stringify(entry.result ?? entry.params).slice(0, 100)}
                      {JSON.stringify(entry.result ?? entry.params).length > 100 && '...'}
                    </MyTypography>
                  )}
                </Box>
              ))
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default McpPanel;
