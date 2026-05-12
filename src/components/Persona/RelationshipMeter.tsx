/**
 * V90: RelationshipMeter - Relationship level and intimacy display
 * Shows relationship stage, progress bars, and milestone achievements
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react/i18next';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Stack,
  Chip,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Favorite as HeartIcon,
  People as PeopleIcon,
  Lock as LockIcon,
  LockOpen as UnlockedIcon,
  EmojiEvents as TrophyIcon,
  CalendarMonth as CalendarIcon,
  Close as CloseIcon,
  TrendingUp as UpIcon,
  TrendingDown as DownIcon,
} from '@mui/icons-material';
import {
  getPersonaRelationship,
  getRelationshipProgress,
  getMilestonesForPersona,
  getStageLabel,
  getStageDescription,
  getStageColor,
  getDialogueStyleAdjustments,
} from '../../services/persona/relationshipTracker';
import { getUpcomingAnniversaries } from '../../services/persona/memoryStore';
import type { RelationshipLevel, RelationshipStage, RelationshipMilestone } from '../../services/persona/v90Types';

interface RelationshipMeterProps {
  personaId: string;
  personaName?: string;
}

const MILESTONE_ICONS: Record<string, string> = {
  first_greeting: '👋',
  first_secret: '🤫',
  first_conflict: '⚡',
  first_support: '🤝',
  deep_connection: '💫',
  trust_built: '🛡️',
};

const MILESTONE_LABELS: Record<string, string> = {
  first_greeting: '初次相遇',
  first_secret: '分享秘密',
  first_conflict: '经历分歧',
  first_support: '互相支持',
  deep_connection: '深层连接',
  trust_built: '坚不可摧',
};

const STAGE_ORDER: RelationshipStage[] = ['stranger', 'acquaintance', 'friend', 'close'];

export const RelationshipMeter: React.FC<RelationshipMeterProps> = ({ personaId, personaName }) => {
  const { t } = useTranslation();
  const [relationship, setRelationship] = useState<RelationshipLevel | null>(null);
  const [progress, setProgress] = useState<{
    currentStage: RelationshipStage;
    nextStage: RelationshipStage | null;
    progress: number;
    intimacyToNext: number;
    trustToNext: number;
    memoriesToNext: number;
  } | null>(null);
  const [milestones, setMilestones] = useState<RelationshipMilestone[]>([]);
  const [anniversaries, setAnniversaries] = useState<any[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [personaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rel, prog, ms, anni] = await Promise.all([
        getPersonaRelationship(personaId),
        getRelationshipProgress(personaId),
        getMilestonesForPersona(personaId),
        getUpcomingAnniversaries(personaId),
      ]);
      setRelationship(rel);
      setProgress(prog);
      setMilestones(ms);
      setAnniversaries(anni);
    } catch (err) {
      console.error('Failed to load relationship data:', err);
    }
    setLoading(false);
  };

  if (loading || !relationship) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">加载中...</Typography>
      </Box>
    );
  }

  const stageColor = getStageColor(relationship.level);
  const stageLabel = getStageLabel(relationship.level);
  const styleAdjustments = getDialogueStyleAdjustments(relationship);

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HeartIcon sx={{ color: stageColor }} />
          <Typography variant="h6">关系发展</Typography>
        </Box>
        <Button size="small" onClick={() => setDetailOpen(true)}>
          详情
        </Button>
      </Box>

      {/* Current Stage Card */}
      <Card sx={{ mb: 2, bgcolor: stageColor + '15', border: `2px solid ${stageColor}` }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: stageColor }}>
              {stageLabel}
            </Typography>
            <Chip
              label={`互动 ${relationship.interactionCount} 次`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.8)' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {getStageDescription(relationship.level)}
          </Typography>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 2 }}>
        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fff3e0' }}>
          <Typography variant="h5" sx={{ color: '#f59e0b' }}>{relationship.intimacy}</Typography>
          <Typography variant="caption" color="text.secondary">亲密度</Typography>
          <LinearProgress variant="determinate" value={relationship.intimacy} sx={{ mt: 1, height: 4, borderRadius: 2 }} />
        </Paper>
        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e3f2fd' }}>
          <Typography variant="h5" sx={{ color: '#2196f3' }}>{relationship.trust}</Typography>
          <Typography variant="caption" color="text.secondary">信任度</Typography>
          <LinearProgress variant="determinate" value={relationship.trust} color="info" sx={{ mt: 1, height: 4, borderRadius: 2 }} />
        </Paper>
        <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f3e5f5' }}>
          <Typography variant="h5" sx={{ color: '#9c27b0' }}>{relationship.sharedMemories}</Typography>
          <Typography variant="caption" color="text.secondary">共同记忆</Typography>
        </Paper>
      </Box>

      {/* Next Stage Progress */}
      {progress?.nextStage && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">
              向 {getStageLabel(progress.nextStage)} 发展
            </Typography>
            <Typography variant="caption" color="text.secondary">{progress.progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress.progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              亲密度 +{progress.intimacyToNext}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              信任 +{progress.trustToNext}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              记忆 +{progress.memoriesToNext}
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* Milestones */}
      <Typography variant="subtitle2" sx={{ mb: 1 }}>里程碑成就</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {STAGE_ORDER.map((stage) => {
          const unlocked = STAGE_ORDER.indexOf(relationship.level) >= STAGE_ORDER.indexOf(stage);
          return (
            <Chip
              key={stage}
              icon={<span>{MILESTONE_ICONS[stage] || '🏆'}</span>}
              label={MILESTONE_LABELS[stage] || stage}
              size="small"
              sx={{
                bgcolor: unlocked ? getStageColor(stage) + '30' : '#f5f5f5',
                opacity: unlocked ? 1 : 0.5,
              }}
            />
          );
        })}
      </Box>

      {/* Dialogue Style */}
      <Paper sx={{ p: 2, mt: 2, bgcolor: '#fafafa' }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>对话风格</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={{ formal: '正式', casual: '随意', intimate: '亲密' }[styleAdjustments.formality]}
            sx={{ bgcolor: '#e0e0e0' }}
          />
          <Chip
            size="small"
            icon={<span>{styleAdjustments.emojiFrequency === 'high' ? '😊' : styleAdjustments.emojiFrequency === 'medium' ? '🙂' : '😐'}</span>}
            label={{ low: '少表情', medium: '中表情', high: '多表情' }[styleAdjustments.emojiFrequency]}
            sx={{ bgcolor: '#e0e0e0' }}
          />
          <Chip
            size="small"
            label={{ safe: '安全话题', varied: '多样话题', personal: '个人话题' }[styleAdjustments.topics]}
            sx={{ bgcolor: '#e0e0e0' }}
          />
        </Stack>
      </Paper>

      {/* Anniversary Reminders */}
      {anniversaries.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: '#fff3e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CalendarIcon fontSize="small" color="warning" />
            <Typography variant="subtitle2">即将到来的纪念日</Typography>
          </Box>
          {anniversaries.slice(0, 3).map((a) => (
            <Typography key={a.id} variant="body2">
              💝 {a.content} - {new Date(a.anniversaryDate!).toLocaleDateString()}
            </Typography>
          ))}
        </Paper>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          关系详情
          <IconButton onClick={() => setDetailOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>关系阶段</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            {STAGE_ORDER.map((stage) => (
              <Box key={stage} sx={{ textAlign: 'center', flex: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: STAGE_ORDER.indexOf(relationship.level) >= STAGE_ORDER.indexOf(stage)
                      ? getStageColor(stage)
                      : '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 0.5,
                  }}
                >
                  <span>{MILESTONE_ICONS[stage]?.[0] || '🏆'}</span>
                </Box>
                <Typography variant="caption">{getStageLabel(stage)}</Typography>
              </Box>
            ))}
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>关系属性</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
            <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
              <Typography variant="h6">{relationship.intimacy}</Typography>
              <Typography variant="caption">亲密度</Typography>
            </Paper>
            <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
              <Typography variant="h6">{relationship.trust}</Typography>
              <Typography variant="caption">信任度</Typography>
            </Paper>
          </Box>

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>已解锁里程碑</Typography>
          <List dense>
            {milestones.filter((m) => m.unlocked).map((m) => (
              <ListItem key={m.id}>
                <ListItemIcon>{MILESTONE_ICONS[m.type]?.[0] || '🏆'}</ListItemIcon>
                <ListItemText
                  primary={m.description}
                  secondary={new Date(m.timestamp).toLocaleDateString()}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
