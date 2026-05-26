/**
 * AgentLogPanel - Real-time agent execution log viewer
 * 
 * Features:
 * - Real-time log streaming from all agents
 * - Filter by agent, level, search text
 * - Log entry detail expansion
 * - Export logs
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyChip as Chip, MyTextField as TextField, MySelect as Select, MyButton, MyCollapse as Collapse, MyTooltip as Tooltip , MyFormControl as FormControl, MyMenuItem as MenuItem } from '../MUI替代';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { AgentRegistry } from '../../services/agent/v114/AgentRegistry';
import type { AgentLogEntry, LogLevel } from '../../services/agent/v114/types';

const LOG_LEVEL_COLORS: Record<LogLevel, { color: string; bg: string }> = {
  debug: { color: '#9E9E9E', bg: 'rgba(158,158,158,0.1)' },
  info: { color: '#2196F3', bg: 'rgba(33,150,243,0.1)' },
  warn: { color: '#FF9800', bg: 'rgba(255,152,0,0.15)' },
  error: { color: '#F44336', bg: 'rgba(244,67,54,0.15)' },
};

interface AgentLogPanelProps {
  maxHeight?: number | string;
  showFilters?: boolean;
  autoScroll?: boolean;
}

export const AgentLogPanel: React.FC<AgentLogPanelProps> = ({
  maxHeight = 400,
  showFilters = true,
  autoScroll = true,
}) => {
  const [logs, setLogs] = useState<AgentLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AgentLogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to agent logs
  useEffect(() => {
    const registry = AgentRegistry.getInstance();
    
    const unsubscribe = registry.on('agent:error', (event) => {
      if (event.type === 'agent:error' && event.data) {
        const entry = event.data as AgentLogEntry;
        setLogs((prev) => {
          const newLogs = [...prev, entry];
          // Keep max 5000 entries
          if (newLogs.length > 5000) {
            return newLogs.slice(-5000);
          }
          return newLogs;
        });
      }
    });

    // Collect agent IDs
    const allAgents = registry.getAllAgents();
    setAgents(['all', ...allAgents.map((a) => a.id)]);

    const interval = setInterval(() => {
      const updatedAgents = registry.getAllAgents();
      setAgents(['all', ...updatedAgents.map((a) => a.id)]);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Filter logs
  useEffect(() => {
    let result = logs;

    if (levelFilter !== 'all') {
      result = result.filter((log) => log.level === levelFilter);
    }

    if (agentFilter !== 'all') {
      result = result.filter((log) => log.agentId === agentFilter);
    }

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(lower) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(lower))
      );
    }

    setFilteredLogs(result);
  }, [logs, levelFilter, agentFilter, searchText]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const toggleExpanded = useCallback((logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setFilteredLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs]);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>
          Agent Logs
        </Typography>
        
        <Chip
          label={`${filteredLogs.length} / ${logs.length}`}
          size="small"
          sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(255,255,255,0.08)', color: '#9E9E9E' }}
        />

        {showFilters && (
          <Tooltip title="Export logs">
            <IconButton size="small" onClick={exportLogs} sx={{ p: 0.5 }}>
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Clear logs">
          <IconButton size="small" onClick={clearLogs} sx={{ p: 0.5 }}>
            <ClearIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filters */}
      {showFilters && (
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="small"
              sx={{ flex: 1, minWidth: 120, '& .MuiInputBase-input': { fontSize: 12 } }}
            />

            <FormControl size="small" sx={{ minWidth: 80 }}>
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
                sx={{ fontSize: 12 }}
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warn">Warn</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                sx={{ fontSize: 12 }}
              >
                {agents.map((id) => (
                  <MenuItem key={id} value={id}>
                    {id === 'all' ? 'All Agents' : id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      )}

      {/* Log entries */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          maxHeight,
          bgcolor: 'rgba(0,0,0,0.2)',
          fontFamily: 'monospace',
          fontSize: 11,
        }}
      >
        {filteredLogs.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.4 }}>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              No log entries
            </Typography>
          </Box>
        ) : (
          filteredLogs.map((entry) => {
            const levelCfg = LOG_LEVEL_COLORS[entry.level];
            const isExpanded = expandedLogs.has(entry.id);

            return (
              <Box
                key={entry.id}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  bgcolor: isExpanded ? levelCfg.bg : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
                  cursor: entry.data ? 'pointer' : 'default',
                }}
                onClick={() => entry.data && toggleExpanded(entry.id)}
              >
                {/* Log header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography
                    component="span"
                    sx={{ fontSize: 10, color: levelCfg.color, fontWeight: 600, minWidth: 40 }}
                  >
                    [{entry.level.toUpperCase()}]
                  </Typography>
                  
                  <Typography component="span" sx={{ fontSize: 10, color: '#9E9E9E' }}>
                    {formatTime(entry.timestamp)}
                  </Typography>
                  
                  <Typography component="span" sx={{ fontSize: 10, color: '#64B5F6', mx: 0.5 }}>
                    [{entry.agentId}]
                  </Typography>
                  
                  {entry.taskId && (
                    <Typography component="span" sx={{ fontSize: 10, color: '#81C784', mx: 0.5 }}>
                      [task:{entry.taskId.substring(0, 8)}]
                    </Typography>
                  )}

                  <Typography component="span" sx={{ fontSize: 10, color: 'inherit', flex: 1 }}>
                    {entry.message}
                  </Typography>

                  {entry.data && (
                    <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                      {isExpanded ? <ExpandLessIcon sx={{ fontSize: 14 }} /> : <ExpandMoreIcon sx={{ fontSize: 14 }} />}
                    </IconButton>
                  )}
                </Box>

                {/* Expanded data */}
                {entry.data && (
                  <Collapse in={isExpanded}>
                    <Box
                      sx={{
                        mt: 0.5,
                        p: 1,
                        bgcolor: 'rgba(0,0,0,0.3)',
                        borderRadius: 1,
                        fontSize: 10,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: '#B0BEC5',
                      }}
                    >
                      {typeof entry.data === 'string'
                        ? entry.data
                        : JSON.stringify(entry.data, null, 2)}
                    </Box>
                  </Collapse>
                )}
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Box>
    </Box>
  );
};

export default AgentLogPanel;