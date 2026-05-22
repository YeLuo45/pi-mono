/**
 * CollabHistoryDetail.tsx — V42 Collaboration History Detail View
 * 
 * Shows the full details of a completed collaboration session:
 * - Complete conversation messages from each role
 * - Task breakdown with execution order
 * - Final aggregated conclusion
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MyAccordion, MyAccordionSummary, MyAccordionDetails, MyListItemAvatar } from '../MUI替代';
import { MyBox, MyTypography, MyCollapse, MyDivider, MyChip, MyList, MyListItem, MyListItemText } from '../MUI替代';
import {
  ChevronDown as ExpandMoreIcon,
  MessageCircle as MessageIcon,
  FileText as SummarizeIcon,
  Clock as ScheduleIcon,
  Users as PeopleIcon,
} from 'lucide-react';
import type { CollabHistoryEntry, CollabMessage } from '../../store';

// Role emoji mapping
const ROLE_EMOJI: Record<string, string> = {
  MemoryExpert: '🧠',
  EmotionAnalyst: '💜',
  Advisor: '🎯',
  Researcher: '🔍',
  Coder: '💻',
};

const ROLE_LABELS: Record<string, string> = {
  MemoryExpert: 'memoryExpert',
  EmotionAnalyst: 'emotionAnalyst',
  Advisor: 'advisor',
  Researcher: 'researcher',
  Coder: 'coder',
};

// ============================================================================
// Message Card Component
// ============================================================================

interface MessageCardProps {
  message: CollabMessage;
  index: number;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, index }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const emoji = ROLE_EMOJI[message.personaId] || ROLE_EMOJI[message.personaId.replace(/Role$/, '')] || '👤';
  const roleLabel = ROLE_LABELS[message.personaId] || ROLE_LABELS[message.personaId.replace(/Role$/, '')] || message.personaId;

  const formattedTime = new Date(message.timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isLongContent = message.content.length > 200;

  return (
    <ListItem
      sx={{
        flexDirection: 'column',
        alignItems: 'stretch',
        px: 0,
        py: 1,
        cursor: isLongContent ? 'pointer' : 'default',
      }}
      onClick={() => isLongContent && setExpanded(!expanded)}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Avatar */}
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            bgcolor: 'rgba(134, 59, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 14 }}>{emoji}</Typography>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>
              {roleLabel}
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
              {formattedTime}
            </Typography>
            <Chip
              size="small"
              label={`#${index + 1}`}
              sx={{
                height: 14,
                fontSize: 9,
                bgcolor: 'rgba(134, 59, 255, 0.1)',
                color: 'text.secondary',
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          </Box>

          {/* Message bubble */}
          <Box
            sx={{
              bgcolor: 'rgba(134, 59, 255, 0.06)',
              border: '1px solid rgba(134, 59, 255, 0.12)',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.75,
              borderTopLeftRadius: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                color: 'text.primary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.5,
              }}
            >
              {expanded || !isLongContent
                ? message.content
                : message.content.slice(0, 200) + (message.content.length > 200 ? '…' : '')}
            </Typography>
          </Box>

          {/* Expand indicator */}
          {isLongContent && (
            <Typography
              sx={{
                fontSize: 10,
                color: 'primary.main',
                mt: 0.5,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? t('collab.history.collapse') : t('collab.history.expand')}
            </Typography>
          )}
        </Box>
      </Box>
    </ListItem>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface CollabHistoryDetailProps {
  entry: CollabHistoryEntry;
  className?: string;
}

export const CollabHistoryDetail: React.FC<CollabHistoryDetailProps> = ({
 entry, className }) => {
  const { t } = useTranslation();
  const messages = entry.messages || [];

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}${t('collab.time.second')}`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}${t('collab.time.minute')}${secs}${t('collab.time.second')}` : `${mins}${t('collab.time.minutes')}`;
  };

  const formatTimestamp = (ts: number): string => {
    return new Date(ts).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const participants = entry.participants || [];
  const uniqueParticipants = [...new Set(participants)];

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Summary section */}
      <Box
        sx={{
          bgcolor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 1.5,
          p: 1.5,
          border: '1px solid rgba(134, 59, 255, 0.1)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <SummarizeIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
            {t('collab.summary.title')}
          </Typography>
        </Box>

        {entry.conclusion ? (
          <Typography
            sx={{
              fontSize: 12,
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {entry.conclusion}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontStyle: 'italic' }}>
            {t('collab.history.noConclusion')}
          </Typography>
        )}
      </Box>

      {/* Meta info */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {/* Duration */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <ScheduleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {t('collab.history.duration')}: <strong style={{ color: '#a78bfa' }}>{formatDuration(entry.duration)}</strong>
          </Typography>
        </Box>

        {/* Participants */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <PeopleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            {uniqueParticipants.map((p, i) => (
              <Typography key={i} sx={{ fontSize: 13 }}>
                {ROLE_EMOJI[p] || '👤'}
              </Typography>
            ))}
            <Typography sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5 }}>
              {uniqueParticipants.map(p => ROLE_LABELS[p] || p).join(', ')}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Start time */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
          {t('collab.history.startTime')}: {formatTimestamp(entry.timestamp)}
        </Typography>
      </Box>

      <Divider />

      {/* Messages section */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <MessageIcon sx={{ fontSize: 14, color: 'primary.main' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
            {t('collab.history.messages')}
          </Typography>
          <Chip
            size="small"
            label={`${messages.length}{t('collab.history.entries')}`}
            sx={{
              height: 16,
              fontSize: 10,
              bgcolor: 'rgba(134, 59, 255, 0.15)',
              color: '#a78bfa',
              '& .MuiChip-label': { px: 0.5 },
            }}
          />
        </Box>

        {messages.length === 0 ? (
          <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', py: 2 }}>
            {t('collab.history.noMessages')}
          </Typography>
        ) : (
          <List disablePadding>
            {messages.map((msg, index) => (
              <MessageCard key={msg.id || index} message={msg} index={index} />
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default CollabHistoryDetail;
