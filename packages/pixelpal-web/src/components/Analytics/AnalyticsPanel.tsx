/**
 * Analytics Dashboard Panel - V17
 * Interactive heatmap, mood trends, memory activity, and habit analysis
 */

import React, { useEffect, useState, useMemo } from 'react';
import { MyTooltip as MuiTooltip } from '../MUI替代';
import { MyTypography as Typography, MyPaper as Paper, MyGrid as Grid, MyChip as Chip, MySkeleton as Skeleton, MyToggleButton as ToggleButton, MyToggleButtonGroup as ToggleButtonGroup, MyButton as Button } from '../MUI替代';
import { Box } from '../ui/Box';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { useMacSplitStore } from '../../stores/macSplitStore';
import { getAllMemories, getMemoryStats } from '../../services/memory/memoryStorage';
import type { MemoryEntry, MemoryStats } from '../../services/memory/memoryTypes';
import { FileDownload as DownloadIcon, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, TrendingFlat as TrendingFlatIcon } from '@mui/icons-material';

// Memory type colors
const MEMORY_TYPE_COLORS: Record<string, string> = {
  conversation_summary: '#8b5cf6',
  user_preference: '#3b82f6',
  pet_milestone: '#f59e0b',
  interaction_log: '#10b981',
  fact: '#6366f1',
  preference: '#ec4899',
  routine: '#14b8a6',
  custom: '#78716c',
};

interface HeatmapDay {
  date: string;
  count: number;
  level: number; // 0-4 intensity level
}

interface MoodDataPoint {
  date: string;
  mood: number | null;
  label: string;
}

interface MemoryTypeData {
  type: string;
  count: number;
  color: string;
}

interface HabitDataPoint {
  hour: number;
  count: number;
  label: string;
}

/** Generate last N days dates */
function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

/** Get week day labels */
function getWeekdayLabels(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

// --- Interaction Heatmap Component ---
const InteractionHeatmap: React.FC<{ data: HeatmapDay[] }> = ({ data }) => {
  const { t } = useTranslation();
  const weeks = 7;
  const cells: { date: string; count: number; level: number; dayOfWeek: number; weekIndex: number }[] = [];

  // Build grid: 7 weeks x 7 days, most recent week on right
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1));

  const dataMap = new Map(data.map(d => [d.date, d]));

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const current = new Date(startDate);
      current.setDate(current.getDate() + w * 7 + d);
      const dateStr = current.toISOString().split('T')[0];
      const dayData = dataMap.get(dateStr);
      cells.push({
        date: dateStr,
        count: dayData?.count ?? 0,
        level: dayData?.level ?? 0,
        dayOfWeek: d,
        weekIndex: w,
      });
    }
  }

  const getColor = (level: number) => {
    const colors = ['#1e1e2e', '#2d2d44', '#3d5a80', '#5c8ab8', '#8ecae6'];
    return colors[Math.min(level, 4)];
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12, color: 'text.secondary' }}>
        {t('analytics.interactionHeatmap')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
        {/* Weekday labels */}
        <Box sx={{ display: 'flex', ml: 3.5, mb: 0.3 }}>
          {getWeekdayLabels().map((label, i) => (
            <Typography key={i} variant="caption" sx={{ width: 14, fontSize: 9, color: 'text.disabled', textAlign: 'center' }}>
              {i % 2 === 1 ? label : ''}
            </Typography>
          ))}
        </Box>
        {/* Heatmap grid */}
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {/* Month labels (simplified) */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {getWeekdayLabels().map((_, i) => (
              <Box key={i} sx={{ height: 14, display: 'flex', alignItems: 'center' }}>
                {i % 2 === 1 && (
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', lineHeight: 1 }}>
                    {getWeekdayLabels()[i]}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
          {/* Grid cells */}
          {Array.from({ length: weeks }).map((_, weekIdx) => (
            <Box key={weekIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
              {cells.filter(c => c.weekIndex === weekIdx).map((cell) => (
                <MuiTooltip key={cell.date} title={`${cell.date}: ${cell.count} interactions`} arrow>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: 0.3,
                      bgcolor: getColor(cell.level),
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                      '&:hover': { transform: 'scale(1.2)' },
                    }}
                  />
                </MuiTooltip>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
      {/* Legend */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, ml: 3.5 }}>
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>Less</Typography>
        {[0, 1, 2, 3, 4].map(level => (
          <Box key={level} sx={{ width: 10, height: 10, borderRadius: 0.2, bgcolor: getColor(level) }} />
        ))}
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled' }}>More</Typography>
      </Box>
    </Box>
  );
};

// --- Mood Trend Chart ---
const MoodTrendChart: React.FC<{ data: MoodDataPoint[] }> = ({ data }) => {
  const { t } = useTranslation();

  if (data.every(d => d.mood === null)) {
    return (
      <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 12 }}>
          {t('analytics.noMoodData')}
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
        />
        <YAxis
          domain={[1, 5]}
          tick={{ fontSize: 10, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
          ticks={[1, 2, 3, 4, 5]}
          tickFormatter={(v) => ['', '😢', '', '😐', '', '😄'][v] ?? ''}
        />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#ffffff80' }}
          formatter={(value: any) => {
            const moods = ['', 'Sad', 'Frustrated', 'Neutral', 'Happy', 'Excited'];
            return [moods[value] ?? value, 'Mood'];
          }}
        />
        <Line
          type="monotone"
          dataKey="mood"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ fill: '#8b5cf6', r: 3 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

// --- Memory Activity Chart ---
const MemoryActivityChart: React.FC<{ data: MemoryTypeData[] }> = ({ data }) => {
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <Box sx={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 12 }}>
          {t('analytics.noMemoryData')}
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="type"
          tick={{ fontSize: 9, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
          tickFormatter={(v) => t(`memory.memoryTypes.${v}` as any) || v}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#ffffff80' }}
          formatter={(value: any) => [value, t('analytics.entries')]}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Habit Analysis Chart ---
const HabitChart: React.FC<{ data: HabitDataPoint[] }> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 9, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
          tickFormatter={(h) => `${h}:00`}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#ffffff80' }}
          formatter={(value: any) => [value, t('analytics.interactions')]}
          labelFormatter={(h) => `${h}:00 - ${h}:59`}
        />
        <Bar dataKey="count" fill="#14b8a6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Main Analytics Panel ---
export const AnalyticsPanel: React.FC<{ splitLayout?: boolean }> = ({ splitLayout = false }) => {
  const { t } = useTranslation();
  const messages = useStore((s) => s.messages);
  const storeTimeRange = useMacSplitStore((s) => s.analyticsTimeRange);
  const setStoreTimeRange = useMacSplitStore((s) => s.setAnalyticsTimeRange);
  const [localTimeRange, setLocalTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const timeRange = splitLayout ? storeTimeRange : localTimeRange;
  const setTimeRange = splitLayout ? setStoreTimeRange : setLocalTimeRange;
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);

  // Interaction heatmap data (last 7 weeks, derived from messages)
  const heatmapData = useMemo<HeatmapDay[]>(() => {
    const last49Days = getLastNDays(49);
    const dateMap = new Map<string, number>();

    // Count messages per day
    messages.forEach(msg => {
      const dateStr = new Date(msg.timestamp).toISOString().split('T')[0];
      if (last49Days.includes(dateStr)) {
        dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1);
      }
    });

    // Also count interaction_log memories per day
    memories
      .filter(m => m.type === 'interaction_log')
      .forEach(m => {
        const dateStr = new Date(m.createdAt).toISOString().split('T')[0];
        if (last49Days.includes(dateStr)) {
          dateMap.set(dateStr, (dateMap.get(dateStr) ?? 0) + 1);
        }
      });

    return last49Days.map(date => {
      const count = dateMap.get(date) ?? 0;
      // Calculate intensity level (0-4)
      const maxCount = Math.max(...Array.from(dateMap.values()), 1);
      const level = Math.min(4, Math.floor((count / maxCount) * 5));
      return { date, count, level };
    });
  }, [messages, memories]);

  // Mood trend data (dynamic from timeRange, simulated from message count patterns)
  const moodData = useMemo<MoodDataPoint[]>(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const lastNDays = getLastNDays(days);
    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return lastNDays.map((date) => {
      const dayMessages = messages.filter(m => {
        const msgDate = new Date(m.timestamp).toISOString().split('T')[0];
        return msgDate === date;
      });

      let mood: number | null = null;
      if (dayMessages.length > 0) {
        const count = dayMessages.length;
        const hasEvening = dayMessages.some(m => {
          const h = new Date(m.timestamp).getHours();
          return h >= 18 && h <= 22;
        });
        const hasMorning = dayMessages.some(m => {
          const h = new Date(m.timestamp).getHours();
          return h >= 6 && h <= 10;
        });

        if (count >= 5 && hasMorning && hasEvening) mood = 5;
        else if (count >= 3) mood = 4;
        else if (count >= 1) mood = 3;
        else mood = 2;
      }

      const dayOfWeek = new Date(date).getDay();
      return {
        date,
        mood,
        label: weekdayLabels[dayOfWeek],
      };
    });
  }, [messages, timeRange]);

  // Trend analysis
  const trendStats = useMemo(() => {
    const validMoodData = moodData.filter(d => d.mood !== null);
    if (validMoodData.length < 2) return null;

    const avgMood = validMoodData.reduce((sum, d) => sum + (d.mood ?? 0), 0) / validMoodData.length;
    const best = validMoodData.reduce((a, b) => ((b.mood ?? 0) > (a.mood ?? 0) ? b : a));
    const worst = validMoodData.reduce((a, b) => ((b.mood ?? 0) < (a.mood ?? 0) ? b : a));

    // Weekly change: compare last 7 days avg to previous 7 days
    const last7 = validMoodData.slice(-7);
    const prev7 = validMoodData.slice(-14, -7);
    let weeklyChange: number | null = null;
    if (last7.length > 0 && prev7.length > 0) {
      const last7Avg = last7.reduce((s, d) => s + (d.mood ?? 0), 0) / last7.length;
      const prev7Avg = prev7.reduce((s, d) => s + (d.mood ?? 0), 0) / prev7.length;
      weeklyChange = ((last7Avg - prev7Avg) / prev7Avg) * 100;
    }

    return { avgMood, best, worst, weeklyChange };
  }, [moodData]);

  // Memory type distribution data
  const memoryTypeData = useMemo<MemoryTypeData[]>(() => {
    if (!memoryStats || memoryStats.totalEntries === 0) return [];

    return Object.entries(memoryStats.byType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        count,
        color: MEMORY_TYPE_COLORS[type] ?? '#78716c',
      }))
      .sort((a, b) => b.count - a.count);
  }, [memoryStats]);

  // Habit data (hourly distribution of interactions)
  const habitData = useMemo<HabitDataPoint[]>(() => {
    const hourMap = new Array(24).fill(0);

    messages.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours();
      hourMap[hour]++;
    });

    return hourMap.map((count, hour) => ({
      hour,
      count,
      label: `${hour}:00`,
    }));
  }, [messages]);

  // Load data
  useEffect(() => {
    const load = async () => {
      try {
        const [memoriesResult, statsResult] = await Promise.all([
          getAllMemories(),
          getMemoryStats(),
        ]);
        setMemories(memoriesResult);
        setMemoryStats(statsResult);
      } catch (err) {
        console.error('Failed to load analytics data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalInteractions = messages.length + (memories.filter(m => m.type === 'interaction_log').length);
  const activeDays = heatmapData.filter(d => d.count > 0).length;
  const streakDays = useMemo(() => {
    let streak = 0;
    const sorted = [...heatmapData].reverse();
    for (const day of sorted) {
      if (day.count > 0) streak++;
      else break;
    }
    return streak;
  }, [heatmapData]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3].map((i) => (
            <Grid item key={i} xs={12} md={4}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, mb: 0.5 }}>
            {t('analytics.title')}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('analytics.subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!splitLayout && (
            <ToggleButtonGroup
              value={timeRange}
              exclusive
              onChange={(_, v) => v && setTimeRange(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': { px: 1, py: 0.5, fontSize: 10, border: '1px solid rgba(255,255,255,0.15)', color: 'text.secondary' },
                '& .Mui-selected': { bgcolor: 'rgba(134,59,255,0.2)', color: 'primary.main' },
              }}
            >
              <ToggleButton value="7d">{t('analytics.moodTrend.weekly')}</ToggleButton>
              <ToggleButton value="30d">{t('analytics.moodTrend.monthly')}</ToggleButton>
              <ToggleButton value="90d">{t('analytics.moodTrend.allTime')}</ToggleButton>
            </ToggleButtonGroup>
          )}
          {!splitLayout && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon sx={{ fontSize: 12 }} />}
            onClick={() => window.print()}
            sx={{ fontSize: 10, py: 0.5, px: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
          >
            {t('analytics.exportReport')}
          </Button>
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: t('analytics.totalInteractions'), value: totalInteractions, color: '#8b5cf6' },
          { label: t('analytics.activeDays'), value: activeDays, color: '#10b981' },
          { label: t('analytics.currentStreak'), value: `${streakDays} ${t('analytics.days')}`, color: '#f59e0b' },
          { label: t('analytics.totalMemories'), value: memoryStats?.totalEntries ?? 0, color: '#3b82f6' },
        ].map((stat, i) => (
          <Grid item key={i} xs={6} md={3}>
            <Paper
              sx={{
                p: 1.5,
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 2,
              }}
            >
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block' }}>
                {stat.label}
              </Typography>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
        {/* Trend stats */}
        {trendStats && (
          <>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block' }}>
                  {t('analytics.avgMood')}
                </Typography>
                <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700, color: '#8b5cf6' }}>
                  {trendStats.avgMood.toFixed(1)} {['😢', '', '😐', '', '😄', '🤩'][Math.round(trendStats.avgMood)] ?? ''}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block' }}>
                  {t('analytics.weeklyChange')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {trendStats.weeklyChange !== null && (
                    <>
                      {trendStats.weeklyChange > 0 ? <TrendingUpIcon sx={{ fontSize: 16, color: '#4caf50' }} /> : trendStats.weeklyChange < 0 ? <TrendingDownIcon sx={{ fontSize: 16, color: '#f44336' }} /> : <TrendingFlatIcon sx={{ fontSize: 16, color: '#9e9e9e' }} />}
                      <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 700, color: trendStats.weeklyChange > 0 ? '#4caf50' : trendStats.weeklyChange < 0 ? '#f44336' : '#9e9e9e' }}>
                        {trendStats.weeklyChange > 0 ? '+' : ''}{trendStats.weeklyChange.toFixed(0)}%
                      </Typography>
                    </>
                  )}
                  {trendStats.weeklyChange === null && (
                    <Typography variant="body2" sx={{ fontSize: 11, color: 'text.disabled' }}>—</Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>

      {/* Interaction Heatmap */}
      <Paper
        sx={{
          p: 2,
          mb: 2,
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 2,
        }}
      >
        <InteractionHeatmap data={heatmapData} />
      </Paper>

      {/* Charts Row */}
      <Grid container spacing={2}>
        {/* Mood Trend */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: '100%',
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12, color: 'text.secondary' }}>
              {t('analytics.moodTrend')}
            </Typography>
            <MoodTrendChart data={moodData} />
          </Paper>
        </Grid>

        {/* Memory Activity */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: '100%',
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12, color: 'text.secondary' }}>
              {t('analytics.memoryActivity')}
            </Typography>
            <MemoryActivityChart data={memoryTypeData} />
          </Paper>
        </Grid>

        {/* Habit Analysis */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              height: '100%',
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 2,
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1, fontSize: 12, color: 'text.secondary' }}>
              {t('analytics.habitAnalysis')}
            </Typography>
            <HabitChart data={habitData} />
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip
                label={t('analytics.mostActiveHour', {
                  hour: habitData.reduce((a, b) => (b.count > a.count ? b : a), habitData[0]).hour
                })}
                size="small"
                sx={{ fontSize: 9, height: 20, bgcolor: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Feature Usage Summary */}
      <Paper
        sx={{
          p: 2,
          mt: 2,
          bgcolor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontSize: 12, color: 'text.secondary' }}>
          {t('analytics.featureUsage')}
        </Typography>
        <Grid container spacing={2}>
          {[
            { feature: t('nav.chat'), count: messages.filter(m => m.role === 'user').length, icon: '💬' },
            { feature: t('nav.memory'), count: memories.length, icon: '🧠' },
            { feature: t('nav.calendar'), count: useStore.getState().events.length, icon: '📅' },
            { feature: t('nav.tasks'), count: useStore.getState().tasks.length, icon: '✅' },
            { feature: t('nav.email'), count: useStore.getState().emailAccount ? 1 : 0, icon: '📧' },
          ].map((item, i) => (
            <Grid item key={i} xs={6} md={2.4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ fontSize: 20 }}>{item.icon}</Typography>
                <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>{item.feature}</Typography>
                <Typography variant="caption" sx={{ fontSize: 14, fontWeight: 600, color: 'primary.main' }}>
                  {item.count}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Box>
  );
};

export default AnalyticsPanel;
