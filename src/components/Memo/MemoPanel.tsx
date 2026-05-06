/**
 * MemoPanel.tsx — V36
 * Inter-persona memo display and management panel.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Reply as ReplyIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { getAllPersonas } from '../../services/persona/personaStorage';
import type { Memo } from '../../store';

interface MemoPanelProps {
  personaId: string;
  open: boolean;
  onClose: () => void;
}

function formatTimeAgo(timestamp: number, t: (key: string, fallback: string) => string): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return t('time.daysAgo', '{{count}}天前').replace('{{count}}', String(days));
  if (hours > 0) return t('time.hoursAgo', '{{count}}小时前').replace('{{count}}', String(hours));
  if (minutes > 0) return t('time.minutesAgo', '{{count}}分钟前').replace('{{count}}', String(minutes));
  return t('time.justNow', '刚刚');
}

export const MemoPanel: React.FC<MemoPanelProps> = ({ personaId, open, onClose }) => {
  const { t } = useTranslation();
  const memos = useStore((s) => s.memos);
  const markMemoRead = useStore((s) => s.markMemoRead);
  const markAllMemosReadForPersona = useStore((s) => s.markAllMemosReadForPersona);
  const setActivePersonaId = useStore((s) => s.setActivePersonaId);
  const setChatInputMention = useStore((s) => s.setChatInputMention);

  // Filter memos for this persona, sorted by createdAt desc
  const receivedMemos = useMemo(() => {
    return memos
      .filter((m: Memo) => m.toPersonaId === personaId)
      .sort((a: Memo, b: Memo) => b.createdAt - a.createdAt);
  }, [memos, personaId]);

  // Get persona info lookup
  const allPersonas = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string }>();
    getAllPersonas().forEach((p) => map.set(p.id, { name: p.name, avatar: p.avatar }));
    return map;
  }, [memos]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReply = (fromPersonaId: string, fromPersonaName: string) => {
    onClose();
    setActivePersonaId(fromPersonaId);
    setChatInputMention(`@${fromPersonaName} `);
  };

  const handleMarkAllRead = () => {
    receivedMemos.forEach((m: Memo) => {
      if (!m.read) markMemoRead(m.id);
    });
    // Also mark via bulk action
    markAllMemosReadForPersona(personaId);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          minHeight: 400,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: 16 }}>
          📬 {t('memo.receivedMemos', '收到的便条')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {receivedMemos.some((m: Memo) => !m.read) && (
            <Button
              size="small"
              startIcon={<DoneAllIcon sx={{ fontSize: 14 }} />}
              onClick={handleMarkAllRead}
              sx={{ fontSize: 11 }}
            >
              {t('memo.markAllRead', '全部标为已读')}
            </Button>
          )}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {receivedMemos.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" sx={{ opacity: 0.3, fontSize: 40 }}>
              📭
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.5, fontSize: 13 }}>
              {t('memo.noMemos', '还没有便条')}
            </Typography>
          </Box>
        ) : (
          receivedMemos.map((memo: Memo) => {
            const sender = allPersonas.get(memo.fromPersonaId);
            const senderName = sender?.name || '未知人格';
            const senderAvatar = sender?.avatar || '❓';

            return (
              <Box
                key={memo.id}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: memo.read ? 'rgba(255,255,255,0.03)' : 'rgba(155, 127, 212, 0.08)',
                  border: '1px solid',
                  borderColor: memo.read
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(155, 127, 212, 0.25)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Header: avatar + name + time */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.75,
                  }}
                >
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: 'primary.main',
                      fontSize: 12,
                    }}
                  >
                    {senderAvatar}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}
                  >
                    {senderName}
                  </Typography>
                  {!memo.read && (
                    <Chip
                      label={t('memo.new', '新')}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: 9,
                        bgcolor: 'rgba(155, 127, 212, 0.3)',
                        color: 'primary.main',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {formatTimeAgo(memo.createdAt, t)}
                  </Typography>
                </Box>

                {/* Content */}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: 13,
                    color: 'text.primary',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                    mb: 1,
                  }}
                >
                  {memo.content}
                </Typography>

                {/* Reply button */}
                <Button
                  size="small"
                  startIcon={<ReplyIcon sx={{ fontSize: 12 }} />}
                  onClick={() => handleReply(memo.fromPersonaId, senderName)}
                  sx={{
                    fontSize: 11,
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  {t('memo.reply', '回复')}
                </Button>
              </Box>
            );
          })
        )}
      </DialogContent>
    </Dialog>
  );
};
