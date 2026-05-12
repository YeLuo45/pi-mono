/**
 * V90: PersonalityChart - Personality radar chart and evolution trend visualization
 * Displays personality vector as a radar chart and shows evolution over time
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Stack,
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
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Close as CloseIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  CheckCircle as ConfirmIcon,
  Cancel as RejectIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import {
  getEvolutionHistory,
  getCurrentPersonalityVector,
  getEvolutionTrajectory,
  getPersonalityTypeLabel,
} from '../../services/persona/personalityEngine';
import type { PersonalityVector, PersonaEvolution } from '../../services/persona/v90Types';

interface PersonalityChartProps {
  personaId: string;
  currentVector?: PersonalityVector;
  onConfirmEvolution?: (evolutionId: string, confirmed: boolean) => void;
}

const TRAIT_LABELS: Record<keyof PersonalityVector, string> = {
  openness: '开放性',
  conscientiousness: '尽责性',
  extraversion: '外向性',
  agreeableness: '宜人性',
  stability: '稳定性',
  humor: '幽默感',
  empathy: '共情能力',
  creativity: '创造力',
};

const TRAIT_COLORS: Record<keyof PersonalityVector, string> = {
  openness: '#8884d8',
  conscientiousness: '#82ca9d',
  extraversion: '#ffc658',
  agreeableness: '#ff7300',
  stability: '#00C49F',
  humor: '#FF6B6B',
  empathy: '#9D65C9',
  creativity: '#58D9C0',
};

function vectorToChartData(vector: PersonalityVector) {
  return Object.entries(vector).map(([key, value]) => ({
    trait: TRAIT_LABELS[key as keyof PersonalityVector],
    value,
    fullMark: 100,
  }));
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export const PersonalityChart: React.FC<PersonalityChartProps> = ({
  personaId,
  currentVector: propVector,
  onConfirmEvolution,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [vector, setVector] = useState<PersonalityVector | null>(propVector ?? null);
  const [history, setHistory] = useState<PersonaEvolution[]>([]);
  const [trajectory, setTrajectory] = useState<any[]>([]);
  const [pendingEvolutions, setPendingEvolutions] = useState<PersonaEvolution[]>([]);
  const [detailDialog, setDetailDialog] = useState<PersonaEvolution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [personaId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vec, hist, traj] = await Promise.all([
        getCurrentPersonalityVector(personaId),
        getEvolutionHistory(personaId),
        getEvolutionTrajectory(personaId),
      ]);
      setVector(vec);
      setHistory(hist);
      setPendingEvolutions(hist.filter((h) => !h.userConfirmed));
      
      // Build trajectory for line chart
      if (traj.length > 0) {
        const trajData = traj.map((t) => ({
          date: formatDate(t.timestamp),
          ...t.vector,
        }));
        setTrajectory(trajData);
      }
    } catch (err) {
      console.error('Failed to load personality data:', err);
    }
    setLoading(false);
  };

  const handleConfirm = async (evolutionId: string, confirmed: boolean) => {
    if (onConfirmEvolution) {
      onConfirmEvolution(evolutionId, confirmed);
    }
    setPendingEvolutions((prev) => prev.filter((e) => e.id !== evolutionId));
    loadData();
  };

  if (!vector) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">加载中...</Typography>
      </Box>
    );
  }

  const radarData = vectorToChartData(vector);
  const personalityType = getPersonalityTypeLabel(vector);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">人格发展</Typography>
          <Typography variant="body2" color="text.secondary">
            人格类型: {personalityType}
          </Typography>
        </Box>
        <Chip label={`共 ${history.length} 次进化`} size="small" />
      </Box>

      {/* Pending Confirmations */}
      {pendingEvolutions.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#fff3e0' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon fontSize="small" color="warning" />
            待确认的人格变化
          </Typography>
          <Stack spacing={1}>
            {pendingEvolutions.slice(0, 2).map((evo) => (
              <Box key={evo.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2">
                  {evo.changeDescription || evo.trigger}
                </Typography>
                <Box>
                  <IconButton size="small" color="success" onClick={() => handleConfirm(evo.id, true)}>
                    <ConfirmIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleConfirm(evo.id, false)}>
                    <RejectIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab label="雷达图" icon={<TrendingUpIcon />} iconPosition="start" />
        <Tab label="进化趋势" icon={<HistoryIcon />} iconPosition="start" />
      </Tabs>

      {/* Radar Chart View */}
      {tab === 0 && (
        <Box sx={{ flex: 1, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e0e0e0" />
              <PolarAngleAxis dataKey="trait" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="当前人格"
                dataKey="value"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.5}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Trait Details */}
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {Object.entries(vector).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${TRAIT_LABELS[key as keyof PersonalityVector]}: ${value}`}
                  size="small"
                  sx={{
                    bgcolor: value > 70 ? TRAIT_COLORS[key as keyof PersonalityVector] + '30' : '#f5f5f5',
                    borderColor: TRAIT_COLORS[key as keyof PersonalityVector],
                    border: value > 70 ? '1px solid' : 'none',
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Box>
      )}

      {/* Evolution Trend View */}
      {tab === 1 && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {trajectory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, opacity: 0.3 }} />
              <Typography color="text.secondary">暂无进化历史</Typography>
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>人格特质变化趋势</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trajectory.slice(-10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  {(Object.keys(vector) as Array<keyof PersonalityVector>).map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={TRAIT_COLORS[key]}
                      strokeWidth={1.5}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>

              {/* Evolution History List */}
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>进化历史</Typography>
              <List dense>
                {history.slice().reverse().slice(0, 10).map((evo, idx) => (
                  <ListItem
                    key={evo.id}
                    sx={{
                      bgcolor: evo.userConfirmed ? '#e8f5e9' : '#fff3e0',
                      mb: 0.5,
                      borderRadius: 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => setDetailDialog(evo)}
                  >
                    <ListItemText
                      primary={evo.changeDescription || evo.trigger}
                      secondary={formatDate(evo.timestamp)}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        size="small"
                        label={evo.userConfirmed ? '已确认' : '待确认'}
                        color={evo.userConfirmed ? 'success' : 'warning'}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailDialog} onClose={() => setDetailDialog(null)} maxWidth="sm" fullWidth>
        {detailDialog && (
          <>
            <DialogTitle>
              人格变化详情
              <IconButton onClick={() => setDetailDialog(null)} sx={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">触发原因</Typography>
                <Typography variant="body1">{detailDialog.trigger}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">变化描述</Typography>
                <Typography variant="body1">{detailDialog.changeDescription || '无'}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">时间</Typography>
                <Typography variant="body1">{formatDate(detailDialog.timestamp)}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">状态</Typography>
                <Chip
                  label={detailDialog.userConfirmed ? '已确认' : '待确认'}
                  color={detailDialog.userConfirmed ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>变化后的人格向量</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
                {Object.entries(detailDialog.personalitySnapshot).map(([key, value]) => (
                  <Paper key={key} sx={{ p: 1, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                    <Typography variant="caption" color="text.secondary">
                      {TRAIT_LABELS[key as keyof PersonalityVector]}
                    </Typography>
                    <Typography variant="h6">{value}</Typography>
                  </Paper>
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              {!detailDialog.userConfirmed && (
                <>
                  <Button color="error" onClick={() => { handleConfirm(detailDialog.id, false); setDetailDialog(null); }}>
                    拒绝
                  </Button>
                  <Button variant="contained" onClick={() => { handleConfirm(detailDialog.id, true); setDetailDialog(null); }}>
                    确认变化
                  </Button>
                </>
              )}
              <Button onClick={() => setDetailDialog(null)}>关闭</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};
