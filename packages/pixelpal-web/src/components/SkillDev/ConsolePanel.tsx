/**
 * V80 Skill Dev Tools - ConsolePanel Component
 * Virtualized log list with color-coded entries and JSON inspection.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MyTypography as Typography, MyIconButton as IconButton, MyTooltip as Tooltip, MyCollapse as Collapse, MyButton as Button } from '../MUI替代';
import { Box } from '../ui/Box';
import {
  Trash2 as ClearIcon,
  Copy as CopyIcon,
  ChevronDown as ExpandIcon,
  ChevronUp as CollapseIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  AlertCircle as ErrorIcon,
  AlertTriangle as WarnIcon,
} from 'lucide-react';

export interface ConsoleEntry {
  id: string;
  level: 'info' | 'success' | 'error' | 'warn';
  message: string;
  timestamp: number;
  data?: unknown;
  expanded?: boolean;
}

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
}

const LEVEL_COLORS = {
  info: '#5e6ad2',
  success: '#52c775',
  error: '#f26875',
  warn: '#f5c542',
};

const LEVEL_ICONS = {
  info: <InfoIcon sx={{ fontSize: 14 }} />,
  success: <SuccessIcon sx={{ fontSize: 14 }} />,
  error: <ErrorIcon sx={{ fontSize: 14 }} />,
  warn: <WarnIcon sx={{ fontSize: 14 }} />,
};

const formatTimestamp = (ts: number): string => {
  const date = new Date(ts);
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatMessage = (msg: string): string => {
  // Highlight JSON objects
  try {
    if (msg.startsWith('{') || msg.startsWith('[')) {
      const parsed = JSON.parse(msg);
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not JSON, return as is
  }
  return msg;
};

interface EntryItemProps {
  entry: ConsoleEntry;
  onToggleExpand: (id: string) => void;
}

const EntryItem: React.FC<EntryItemProps> = ({ entry, onToggleExpand }) => {
  const [copied, setCopied] = useState(false);
  const isExpandable = entry.data !== undefined || entry.message.startsWith('{') || entry.message.startsWith('[');

  const handleCopy = useCallback(() => {
    const text = entry.data !== undefined ? JSON.stringify(entry.data, null, 2) : entry.message;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [entry]);

  const handleToggle = useCallback(() => {
    onToggleExpand(entry.id);
  }, [entry.id, onToggleExpand]);

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
      }}
    >
      {/* Main row */}
      <Box css={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.75, px: 1.5 }}>
        {/* Level icon */}
        <Box css={{ color: LEVEL_COLORS[entry.level], mt: 0.25, flexShrink: 0 }}>
          {LEVEL_ICONS[entry.level]}
        </Box>

        {/* Timestamp */}
        <Typography
          variant="caption"
          sx={{
            fontSize: 10,
            color: 'text.disabled',
            fontFamily: 'monospace',
            flexShrink: 0,
            minWidth: 60,
          }}
        >
          {formatTimestamp(entry.timestamp)}
        </Typography>

        {/* Message */}
        <Box css={{ flex: 1, minWidth: 0 }}>
          <Typography
            component="pre"
            sx={{
              fontSize: 11,
              fontFamily: "'Fira Code', monospace",
              color: LEVEL_COLORS[entry.level],
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              m: 0,
              lineHeight: 1.4,
            }}
          >
            {entry.message.length > 200 && !entry.expanded
              ? entry.message.substring(0, 200) + '...'
              : formatMessage(entry.message)}
          </Typography>

          {/* Expandable data */}
          {isExpandable && (
            <Box css={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Button
                size="small"
                onClick={handleToggle}
                sx={{
                  minWidth: 'auto',
                  p: '2px 6px',
                  fontSize: 10,
                  color: 'text.secondary',
                  textTransform: 'none',
                }}
                endIcon={entry.expanded ? <CollapseIcon css={{ fontSize: 12 }} /> : <ExpandIcon css={{ fontSize: 12 }} />}
              >
                {entry.expanded ? 'Collapse' : 'Expand'}
              </Button>
            </Box>
          )}

          {/* Expanded content */}
          <Collapse in={entry.expanded}>
            <Box
              css={{
                mt: 1,
                p: 1,
                bgcolor: 'rgba(0,0,0,0.3)',
                borderRadius: 1,
                overflow: 'auto',
              }}
            >
              <Typography
                component="pre"
                sx={{
                  fontSize: 10,
                  fontFamily: "'Fira Code', monospace",
                  color: 'text.secondary',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  m: 0,
                }}
              >
                {entry.data !== undefined
                  ? JSON.stringify(entry.data, null, 2)
                  : formatMessage(entry.message)}
              </Typography>
            </Box>
          </Collapse>
        </Box>

        {/* Actions */}
        <Box css={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
          <Tooltip title={copied ? 'Copied!' : 'Copy'}>
            <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
              <CopyIcon css={{ fontSize: 12, color: copied ? 'success.main' : 'text.disabled' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ entries, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new entries added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries.length]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <Box
      css={{
        width: 300,
        height: '100%',
        bgcolor: 'rgba(0,0,0,0.15)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <Box
        css={{
          px: 1.5,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          Console ({entries.length})
        </Typography>
        <Tooltip title="Clear Console">
          <IconButton size="small" onClick={onClear} sx={{ p: 0.5 }}>
            <ClearIcon css={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Entries */}
      <Box ref={containerRef} css={{ flex: 1, overflowY: 'auto' }}>
        {entries.length === 0 ? (
          <Box css={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
              No output yet
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
              Run a skill to see console output
            </Typography>
          </Box>
        ) : (
          entries.map((entry) => (
            <EntryItem
              key={entry.id}
              entry={{ ...entry, expanded: expandedEntries.has(entry.id) }}
              onToggleExpand={handleToggleExpand}
            />
          ))
        )}
      </Box>

      {/* Status bar */}
      {entries.length > 0 && (
        <Box
          css={{
            px: 1.5,
            py: 0.5,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            gap: 2,
          }}
        >
          {(['error', 'warn', 'info', 'success'] as const).map((level) => {
            const count = entries.filter((e) => e.level === level).length;
            if (count === 0) return null;
            return (
              <Typography
                key={level}
                variant="caption"
                sx={{
                  fontSize: 10,
                  color: LEVEL_COLORS[level],
                  fontWeight: 500,
                }}
              >
                {level}: {count}
              </Typography>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default ConsolePanel;
