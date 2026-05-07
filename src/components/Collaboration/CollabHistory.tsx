/**
 * CollabHistory.tsx — V42 Collaboration History List
 * 
 * Displays the last 10 collaboration sessions with:
 * - Task description, timestamp, duration, status
 * - Participant avatars
 * - Conclusion summary
 * - Click to expand detail view
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Stop as StopIcon,
  FileDownload as DownloadIcon,
  FileDownload as JSONDownloadIcon,
} from '@mui/icons-material';
import { useStore, type CollabHistoryEntry } from '../../store';
import { CollabHistoryDetail } from './CollabHistoryDetail';
import { collabHistoryToCSV, downloadCSV } from '../../services/backup/csvExport';

// Role emoji mapping
const ROLE_EMOJI: Record<string, string> = {
  MemoryExpert: '🧠',
  EmotionAnalyst: '💜',
  Advisor: '🎯',
  Researcher: '🔍',
  Coder: '💻',
};

const STATUS_CONFIG = {
  completed: { color: '#4caf50', icon: CheckCircleIcon, label: '已完成' },
  failed: { color: '#f44336', icon: ErrorIcon, label: '失败' },
  stopped: { color: '#ff9800', icon: StopIcon, label: '已停止' },
};

interface CollabHistoryItemProps {
  entry: CollabHistoryEntry;
  onDelete: (id: string) => void;
}

const CollabHistoryItem: React.FC<CollabHistoryItemProps> = ({ entry, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_CONFIG[entry.status];
  const StatusIcon = status.icon;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
  };

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return `今天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
      return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get unique participants with emoji
  const participants = entry.participants || [];
  const uniqueParticipants = [...new Set(participants)];

  return (
    <>
      <ListItem
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          py: 1.5,
          px: 2,
          cursor: 'pointer',
          transition: 'background 0.15s',
          '&:hover': { bgcolor: 'rgba(134, 59, 255, 0.08)' },
          '&:hover .delete-btn': { opacity: 1 },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, width: '100%' }}>
          {/* Status icon */}
          <StatusIcon sx={{ fontSize: 16, color: status.color, mt: 0.5, flexShrink: 0 }} />

          {/* Main content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Task description */}
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 500,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mb: 0.5,
              }}
            >
              {entry.task || '无描述任务'}
            </Typography>

            {/* Meta row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {/* Timestamp */}
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {formatTimestamp(entry.timestamp)}
              </Typography>

              {/* Duration */}
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {formatDuration(entry.duration)}
              </Typography>

              {/* Participants */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                {uniqueParticipants.slice(0, 5).map((p, i) => (
                  <Typography key={i} sx={{ fontSize: 12 }}>
                    {ROLE_EMOJI[p] || '👤'}
                  </Typography>
                ))}
                {uniqueParticipants.length > 5 && (
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                    +{uniqueParticipants.length - 5}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Conclusion preview */}
            {entry.conclusion && (
              <Typography
                sx={{
                  fontSize: 11,
                  color: 'text.secondary',
                  mt: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.conclusion}
              </Typography>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Chip
              size="small"
              label={status.label}
              sx={{
                height: 18,
                fontSize: 10,
                fontWeight: 500,
                bgcolor: `${status.color}20`,
                color: status.color,
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
            <IconButton
              size="small"
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              sx={{
                p: 0.5,
                opacity: 0,
                transition: 'opacity 0.15s',
                '&:hover': { color: '#f44336' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            )}
          </Box>
        </Box>
      </ListItem>

      {/* Expandable detail */}
      <Collapse in={expanded}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Divider sx={{ mb: 1.5 }} />
          <CollabHistoryDetail entry={entry} />
        </Box>
      </Collapse>
    </>
  );
};

interface CollabHistoryProps {
  className?: string;
  /** Callback when a history entry is clicked */
  onEntryClick?: (entry: CollabHistoryEntry) => void;
}

export const CollabHistory: React.FC<CollabHistoryProps> = ({ className, onEntryClick }) => {
  const collabHistory = useStore((s) => s.collabHistory);
  const clearCollabHistory = useStore((s) => s.clearCollabHistory);
  const deleteCollabHistoryEntry = useStore((s) => s.deleteCollabHistoryEntry);

  const handleDeleteEntry = (id: string) => {
    deleteCollabHistoryEntry(id);
  };

  const handleExportJSON = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const json = JSON.stringify(collabHistory, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixelpal_collab_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    downloadCSV(collabHistoryToCSV(collabHistory), `pixelpal_collab_${dateStr}.csv`);
  };

  if (collabHistory.length === 0) {
    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          px: 3,
          textAlign: 'center',
        }}
      >
        <HistoryIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5, opacity: 0.5 }} />
        <Typography sx={{ fontSize: 13, color: 'text.disabled', mb: 0.5 }}>
          暂无协作历史
        </Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled', opacity: 0.7 }}>
          完成的协作会话将显示在这里
        </Typography>
      </Box>
    );
  }

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(134, 59, 255, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            协作历史
          </Typography>
          <Chip
            size="small"
            label={collabHistory.length}
            sx={{
              height: 16,
              fontSize: 10,
              fontWeight: 600,
              bgcolor: 'rgba(134, 59, 255, 0.2)',
              color: '#a78bfa',
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title="导出 JSON">
            <IconButton
              size="small"
              onClick={handleExportJSON}
              sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: '#4caf50' } }}
            >
              <JSONDownloadIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="导出 CSV">
            <IconButton
              size="small"
              onClick={handleExportCSV}
              sx={{ p: 0.5, color: 'text.disabled', '&:hover': { color: '#2196f3' } }}
            >
              <DownloadIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="清除全部历史">
            <IconButton
              size="small"
              onClick={clearCollabHistory}
              sx={{
                p: 0.5,
                color: 'text.disabled',
                '&:hover': { color: '#f44336' },
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* History list */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <List dense disablePadding>
          {collabHistory.map((entry, index) => (
            <React.Fragment key={entry.id}>
              <CollabHistoryItem entry={entry} onDelete={handleDeleteEntry} />
              {index < collabHistory.length - 1 && (
                <Divider sx={{ opacity: 0.5 }} />
              )}
            </React.Fragment>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default CollabHistory;
