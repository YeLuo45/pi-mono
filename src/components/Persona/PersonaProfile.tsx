/**
 * PersonaProfile.tsx — V35
 * Persona Growth Diary / Profile component.
 * Shows persona stats, intimacy progress, and milestone timeline.
 */

import React, { useEffect, useState } from 'react';
import { MyDialog } from '../MUI替代';
import { MyBox, MyTypography, MyIconButton, MyLinearProgress, MyGrid, MyIconButton, MyDivider } from '../MUI替代';
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import { getAllPersonas } from '../../services/persona/personaStorage';
import { getPersonaMilestones, getMilestoneIcon } from '../../services/milestone/milestoneTracker';
import { queryMemories } from '../../services/memory/memoryStorage';
import type { MemoryEntry } from '../../services/memory/memoryTypes';

interface PersonaProfileProps {
  personaId: string;
  open: boolean;
  onClose: () => void;
}

// Stat card component
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        bgcolor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        p: 1.5,
        textAlign: 'center',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Typography variant="h6" sx={{ fontSize: 20, fontWeight: 700 }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
        {label}
      </Typography>
    </Box>
  );
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

function getIntimacyLevelName(intimacy: number): string {
  if (intimacy < 20) return '陌生人';
  if (intimacy < 40) return '熟人';
  if (intimacy < 60) return '朋友';
  if (intimacy < 80) return '挚友';
  return '灵魂伴侣';
}

function getIntimacyColor(intimacy: number): string {
  if (intimacy < 20) return '#9CA3AF';
  if (intimacy < 40) return '#6B7280';
  if (intimacy < 60) return '#9B7FD4';
  if (intimacy < 80) return '#F472B6';
  return '#FFD700';
}

export const PersonaProfile: React.FC<PersonaProfileProps> = ({ personaId, open, onClose }) => {
  const messages = useStore((s) => s.messages);
  const personaIntimacy = useStore((s) => s.personaIntimacy);

  const [milestones, setMilestones] = useState<MemoryEntry[]>([]);
  const [memoryCount, setMemoryCount] = useState(0);

  const personas = getAllPersonas();
  const persona = personas.find((p) => p.id === personaId);

  // Compute stats
  const personaMessages = messages.filter((m) => m.personaId === personaId);
  const userMessages = personaMessages.filter((m) => m.role === 'user');
  const firstMessage = personaMessages.reduce(
    (earliest, m) => (m.timestamp < earliest.timestamp ? m : earliest),
    personaMessages[0]
  );
  const dayMs = 24 * 60 * 60 * 1000;
  const activeDays = firstMessage ? Math.floor((Date.now() - firstMessage.timestamp) / dayMs) : 0;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayMessages = personaMessages.filter(
    (m) => m.timestamp >= todayStart && m.role === 'user'
  ).length;

  const intimacy = personaIntimacy[personaId] ?? 0;
  const levelName = getIntimacyLevelName(intimacy);
  const levelColor = getIntimacyColor(intimacy);

  const nextLevelIntimacy =
    intimacy < 20 ? 21 : intimacy < 40 ? 41 : intimacy < 60 ? 61 : intimacy < 80 ? 81 : 100;
  const messagesToNext = nextLevelIntimacy - intimacy;

  // Load milestones and memory count
  useEffect(() => {
    if (!open || !personaId) return;
    let cancelled = false;

    const load = async () => {
      const [ms, memResult] = await Promise.all([
        getPersonaMilestones(personaId),
        queryMemories({ personaId, limit: 1 }),
      ]);
      if (!cancelled) {
        setMilestones(ms);
        setMemoryCount(memResult.length);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, personaId]);

  if (!persona) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.paper',
          minHeight: 540,
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        {/* Large avatar */}
        <Avatar
          sx={{
            width: 64,
            height: 64,
            fontSize: 36,
            bgcolor: persona.theme?.primaryColor || 'primary.main',
          }}
        >
          {persona.avatar}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700 }}>
            {persona.name}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
            {persona.bio}
          </Typography>
          <br />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
            声音：{(() => {
              switch (persona.voiceType) {
                case 'warm': return '温暖';
                case 'rational': return '理性';
                case 'humorous': return '幽默';
                case 'serious': return '严肃';
              }
            })()}
            {' · '}
            创建于 {formatDate(persona.createdAt)}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Stats cards */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={3}>
            <StatCard label="总对话" value={userMessages.length} />
          </Grid>
          <Grid item xs={3}>
            <StatCard label="总记忆" value={memoryCount} />
          </Grid>
          <Grid item xs={3}>
            <StatCard label="活跃天数" value={activeDays} />
          </Grid>
          <Grid item xs={3}>
            <StatCard label="今日对话" value={todayMessages} />
          </Grid>
        </Grid>

        {/* Intimacy progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              亲密度
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, color: levelColor }}>
              {levelName} ({intimacy})
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={intimacy}
            sx={{
              height: 10,
              borderRadius: 5,
              bgcolor: 'rgba(255,255,255,0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                bgcolor: levelColor,
              },
            }}
          />
          {intimacy < 100 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, mt: 0.3, display: 'block', textAlign: 'center' }}>
              距下一级还需 {messagesToNext} 条消息
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Timeline header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <TrophyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 600 }}>
            成长档案
          </Typography>
        </Box>

        {/* Milestone timeline */}
        {milestones.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
              还没有里程碑记录，继续和人格互动吧！
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 260, overflowY: 'auto' }}>
            {milestones.map((milestone) => (
              <Box
                key={milestone.id}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Typography sx={{ fontSize: 18, lineHeight: '22px', flexShrink: 0 }}>
                  {getMilestoneIcon(milestone.content)}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 12, color: 'text.primary', lineHeight: 1.5, wordBreak: 'break-word' }}
                  >
                    {milestone.content}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {formatRelativeDate(milestone.createdAt)} · {formatDate(milestone.createdAt)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
