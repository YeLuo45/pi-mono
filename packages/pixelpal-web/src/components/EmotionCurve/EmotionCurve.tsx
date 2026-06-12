/**
 * EmotionCurve Component - V17
 * Day/Week/Month emotion trend charts using recharts
 * Shows intensity trends and emotion distribution over time
 */

import React, { useEffect, useState, useMemo } from 'react';
import { MyTypography as Typography, MyPaper, MyTabs as Tabs, MyChip as Chip, MySkeleton as Skeleton , MyTab as Tab } from '../MUI替代';
import { Box } from '../ui/Box';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import {
  getEmotionLogs,
  getRecentEmotionLogs,
  getEmotionLogsForDay,
  getEmotionStats,
} from '../../services/emotion/emotionStorage';
import {
  getTextEmotionColor,
  getTextEmotionEmoji,
  type TextEmotion,
  type EmotionLogEntry,
} from '../../services/emotion/emotionService';

// --- Types ---
type ViewMode = 'day' | 'week' | 'month';

interface DayChartPoint {
  hour: string;
  intensity: number | null;
  emotion: TextEmotion | null;
  emoji: string;
}

interface WeekChartPoint {
  day: string;
  date: string;
  avgIntensity: number | null;
  emotion: TextEmotion | null;
  emoji: string;
  count: number;
}

interface MonthChartPoint {
  date: string;
  day: string;
  avgIntensity: number | null;
  emotion: TextEmotion | null;
  emoji: string;
  count: number;
}

interface EmotionDistributionPoint {
  emotion: TextEmotion;
  count: number;
  color: string;
  emoji: string;
}

const EMOTION_ORDER: TextEmotion[] = ['happy', 'excited', 'calm', 'anxious', 'sad', 'angry', 'exhausted', 'unknown'];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getLast7Days(): { date: string; dayLabel: string }[] {
  const result: { date: string; dayLabel: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      dayLabel: WEEKDAY_LABELS[d.getDay()],
    });
  }
  return result;
}

function getLast30Days(): { date: string; dayLabel: string }[] {
  const result: { date: string; dayLabel: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().split('T')[0],
      dayLabel: WEEKDAY_LABELS[d.getDay()],
    });
  }
  return result;
}

// --- Mini Bar Chart for emotion distribution ---
const MiniEmotionBar: React.FC<{ data: EmotionDistributionPoint[] }> = ({ data }) => {
  const { t } = useTranslation();
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <Box sx={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
          {t('analytics.noMoodData')}
        </Typography>
      </Box>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={60}>
      <BarChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="emotion"
          tick={{ fontSize: 8, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
          tickFormatter={(v: TextEmotion) => getTextEmotionEmoji(v)}
        />
        <YAxis
          tick={{ fontSize: 8, fill: '#ffffff60' }}
          axisLine={{ stroke: '#ffffff20' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 11 }}
          labelStyle={{ color: '#ffffff80' }}
          formatter={(value: any, _name: any, props: any) => {
            const d = props.payload as EmotionDistributionPoint;
            return [`${value} ${t('analytics.entries')}`, `${d.emoji} ${t('emotion.' + d.emotion)}`];
          }}
        />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// --- Main EmotionCurve Component ---
export const EmotionCurve: React.FC<{
  /** If true, shows compact view suitable for sidebar */
  compact?: boolean;
  /** Height for compact mode */
  compactHeight?: number;
}> = ({ compact = false, compactHeight = 120 }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<EmotionLogEntry[]>([]);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      const allLogs = getEmotionLogs();
      setLogs(allLogs);
      setLoading(false);
    };
    load();

    const handleUpdate = () => load();
    window.addEventListener('emotion:logAdded', handleUpdate);
    window.addEventListener('emotion:logsCleared', handleUpdate);
    return () => {
      window.removeEventListener('emotion:logAdded', handleUpdate);
      window.removeEventListener('emotion:logsCleared', handleUpdate);
    };
  }, []);

  // --- Day view data ---
  const dayData = useMemo<DayChartPoint[]>(() => {
    const today = new Date();
    const todayLogs = getEmotionLogsForDay(today);

    const points: DayChartPoint[] = [];
    for (let h = 0; h < 24; h++) {
      const hourLogs = todayLogs.filter(log => new Date(log.timestamp).getHours() === h);
      if (hourLogs.length === 0) {
        points.push({ hour: `${h}:00`, intensity: null, emotion: null, emoji: '' });
      } else {
        // Average intensity for this hour, pick most frequent emotion
        const avgIntensity = Math.round(hourLogs.reduce((sum, l) => sum + l.intensity, 0) / hourLogs.length);
        const emotionCounts: Record<TextEmotion, number> = {} as any;
        for (const l of hourLogs) {
          emotionCounts[l.emotion] = (emotionCounts[l.emotion] || 0) + 1;
        }
        const topEmotion = (Object.entries(emotionCounts) as [TextEmotion, number][])
          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
        points.push({
          hour: `${h}:00`,
          intensity: avgIntensity,
          emotion: topEmotion,
          emoji: getTextEmotionEmoji(topEmotion),
        });
      }
    }
    return points;
  }, [logs]);

  // --- Week view data ---
  const weekData = useMemo<WeekChartPoint[]>(() => {
    const last7 = getLast7Days();

    return last7.map(({ date, dayLabel }) => {
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === date;
      });

      if (dayLogs.length === 0) {
        return { day: dayLabel, date, avgIntensity: null, emotion: null, emoji: '', count: 0 };
      }

      const avgIntensity = Math.round(dayLogs.reduce((s, l) => s + l.intensity, 0) / dayLogs.length);
      const emotionCounts: Record<TextEmotion, number> = {} as any;
      for (const l of dayLogs) {
        emotionCounts[l.emotion] = (emotionCounts[l.emotion] || 0) + 1;
      }
      const topEmotion = (Object.entries(emotionCounts) as [TextEmotion, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      return {
        day: dayLabel,
        date,
        avgIntensity,
        emotion: topEmotion,
        emoji: getTextEmotionEmoji(topEmotion),
        count: dayLogs.length,
      };
    });
  }, [logs]);

  // --- Month view data ---
  const monthData = useMemo<MonthChartPoint[]>(() => {
    const last30 = getLast30Days();

    return last30.map(({ date, dayLabel }) => {
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === date;
      });

      if (dayLogs.length === 0) {
        return { date, day: dayLabel, avgIntensity: null, emotion: null, emoji: '', count: 0 };
      }

      const avgIntensity = Math.round(dayLogs.reduce((s, l) => s + l.intensity, 0) / dayLogs.length);
      const emotionCounts: Record<TextEmotion, number> = {} as any;
      for (const l of dayLogs) {
        emotionCounts[l.emotion] = (emotionCounts[l.emotion] || 0) + 1;
      }
      const topEmotion = (Object.entries(emotionCounts) as [TextEmotion, number][])
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

      return {
        date,
        day: dayLabel,
        avgIntensity,
        emotion: topEmotion,
        emoji: getTextEmotionEmoji(topEmotion),
        count: dayLogs.length,
      };
    });
  }, [logs]);

  // --- Emotion distribution for current view ---
  const distributionData = useMemo<EmotionDistributionPoint[]>(() => {
    const cutoff = viewMode === 'day'
      ? Date.now() - 24 * 60 * 60 * 1000
      : viewMode === 'week'
      ? Date.now() - 7 * 24 * 60 * 60 * 1000
      : Date.now() - 30 * 24 * 60 * 60 * 1000;

    const recentLogs = logs.filter(log => log.timestamp >= cutoff);
    const counts: Record<TextEmotion, number> = {} as any;
    for (const log of recentLogs) {
      counts[log.emotion] = (counts[log.emotion] || 0) + 1;
    }

    return EMOTION_ORDER
      .filter(e => e !== 'unknown')
      .map(emotion => ({
        emotion,
        count: counts[emotion] || 0,
        color: getTextEmotionColor(emotion),
        emoji: getTextEmotionEmoji(emotion),
      }));
  }, [logs, viewMode]);

  // --- Stats ---
  const stats = useMemo(() => {
    const cutoff = Date.now() - (viewMode === 'day' ? 24 : viewMode === 'week' ? 7 : 30) * 60 * 60 * 1000;
    const recentLogs = logs.filter(log => log.timestamp >= cutoff);
    return getEmotionStats(recentLogs);
  }, [logs, viewMode]);

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={compact ? compactHeight : 300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  // --- Compact view (for sidebar) ---
  if (compact) {
    return (
      <Box sx={{ px: 1, py: 0.5 }}>
        {/* Stats row */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
          <Chip
            label={`${stats.total} ${t('analytics.entries')}`}
            size="small"
            sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
          />
          {stats.mostFrequent !== 'unknown' && (
            <Chip
              label={`${getTextEmotionEmoji(stats.mostFrequent)} ${t('emotion.' + stats.mostFrequent)}`}
              size="small"
              sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(255,255,255,0.06)' }}
            />
          )}
          {stats.streakDays > 0 && (
            <Chip
              label={`🔥 ${stats.streakDays}d`}
              size="small"
              sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            />
          )}
        </Box>

        {/* Mini week chart */}
        <ResponsiveContainer width="100%" height={compactHeight}>
          <AreaChart data={weekData} margin={{ top: 2, right: 2, bottom: 2, left: -20 }}>
            <defs>
              <linearGradient id="intensityGradientCompact" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 8, fill: '#ffffff60' }}
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 8, fill: '#ffffff60' }}
              axisLine={{ stroke: '#ffffff20' }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 10 }}
              labelStyle={{ color: '#ffffff80' }}
              formatter={(value: any, _name: any, props: any) => {
                const d = props.payload as WeekChartPoint;
                return d.avgIntensity !== null
                  ? [`${d.emoji} ${d.avgIntensity}%`, d.date]
                  : ['No data', d.date];
              }}
            />
            <Area
              type="monotone"
              dataKey="avgIntensity"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              fill="url(#intensityGradientCompact)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    );
  }

  // --- Full view ---
  const chartHeight = 180;
  const currentChartData = viewMode === 'day' ? dayData : viewMode === 'week' ? weekData : monthData;
  const xDataKey = viewMode === 'day' ? 'hour' : 'day';

  const hasData = currentChartData.some(d => d.avgIntensity !== null);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
          📈 {t('emotion.curveTitle', '心情曲线')}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          {t('emotion.curveSubtitle', '追踪你的情绪变化')}
        </Typography>
      </Box>

      {/* View Mode Tabs */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Tabs
          value={viewMode}
          onChange={(_, v) => setViewMode(v)}
          sx={{
            minHeight: 32,
            '& .MuiTabs-indicator': { height: 2 },
            '& .MuiTab': { minHeight: 32, py: 0, fontSize: 11, color: 'text.secondary' },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          <Tab value="day" label={t('emotion.day', '日')} />
          <Tab value="week" label={t('emotion.week', '周')} />
          <Tab value="month" label={t('emotion.month', '月')} />
        </Tabs>
      </Box>

      {/* Quick Stats */}
      <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Chip
          label={`${stats.total} ${t('analytics.entries')}`}
          size="small"
          sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}
        />
        {stats.mostFrequent !== 'unknown' && (
          <Chip
            label={`${getTextEmotionEmoji(stats.mostFrequent)} ${t('emotion.' + stats.mostFrequent)}`}
            size="small"
            sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(255,255,255,0.06)' }}
          />
        )}
        {stats.averageIntensity > 0 && (
          <Chip
            label={`⚡ ${stats.averageIntensity}%`}
            size="small"
            sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
          />
        )}
        {stats.streakDays > 0 && (
          <Chip
            label={`🔥 ${stats.streakDays} ${t('analytics.days', '天')}`}
            size="small"
            sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
          />
        )}
      </Box>

      {/* Main Chart */}
      <Box sx={{ px: 2, pb: 1 }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <AreaChart data={currentChartData as any} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <defs>
                <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
              <XAxis
                dataKey={xDataKey}
                tick={{ fontSize: 9, fill: '#ffffff60' }}
                axisLine={{ stroke: '#ffffff20' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: '#ffffff60' }}
                axisLine={{ stroke: '#ffffff20' }}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ background: '#1e1e2e', border: '1px solid #ffffff20', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#ffffff80' }}
                formatter={(value: any, _name: any, props: any) => {
                  const d = props.payload as WeekChartPoint | MonthChartPoint;
                  return d.avgIntensity !== null
                    ? [`${d.emoji} ${d.avgIntensity}%`, (d as any).date || d.day]
                    : ['No data', (d as any).date || d.day];
                }}
              />
              <Area
                type="monotone"
                dataKey="avgIntensity"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#intensityGradient)"
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Box sx={{ height: chartHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.disabled', fontSize: 12 }}>
              {t('analytics.noMoodData')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Emotion Distribution */}
      <Box sx={{ px: 2, pb: 2 }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', display: 'block', mb: 0.5 }}>
          {t('emotion.emotionDistribution', '情绪分布')} ({t('emotion.' + viewMode)})
        </Typography>
        <MiniEmotionBar data={distributionData} />
      </Box>
    </Box>
  );
};

export default EmotionCurve;
