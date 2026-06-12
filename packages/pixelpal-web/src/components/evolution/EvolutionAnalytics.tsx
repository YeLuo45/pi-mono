/**
 * V163: EvolutionAnalytics - Agent Self-Evolution Engine
 * 
 * Visualization component for:
 * - Skill fragment usage statistics
 * - Strategy optimization trajectory
 * - Crystallization success rate trends
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  MyBox,
  MyTypography,
  MyPaper,
  MyStack,
  MyChip,
  MySelect,
  MyMenuItem,
  MyFormControl,
  MyInputLabel,
} from '../MUI替代';
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

interface SkillFragmentUsage {
  fragmentId: string;
  name: string;
  useCount: number;
  successRate: number;
}

interface StrategyTrajectory {
  version: number;
  timestamp: number;
  weights: Record<string, number>;
}

interface CrystallizationTrend {
  date: string;
  successCount: number;
  totalCount: number;
  rate: number;
}

interface EvolutionAnalyticsProps {
  /** Skill fragment usage data */
  fragmentUsage?: SkillFragmentUsage[];
  /** Strategy trajectory data */
  strategyTrajectory?: StrategyTrajectory[];
  /** Crystallization success rate trend */
  crystallizationTrend?: CrystallizationTrend[];
  /** Time range filter */
  timeRange?: '7d' | '30d' | '90d';
  /** Callback when time range changes */
  onTimeRangeChange?: (range: '7d' | '30d' | '90d') => void;
}

/**
 * Skill Fragment Usage Chart Component
 */
const FragmentUsageChart: React.FC<{ data: SkillFragmentUsage[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <MyBox sx={{ p: 2, textAlign: 'center' }}>
        <MyTypography variant="body2" color="text.secondary">
          No skill fragment usage data available
        </MyTypography>
      </MyBox>
    );
  }

  const maxUseCount = Math.max(...data.map(d => d.useCount), 1);

  return (
    <MyStack spacing={1} sx={{ p: 2 }}>
      {data.slice(0, 5).map((fragment) => (
        <MyBox key={fragment.fragmentId}>
          <MyBox sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <MyTypography variant="caption" noWrap sx={{ maxWidth: '70%' }}>
              {fragment.name}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              {fragment.useCount} uses • {(fragment.successRate * 100).toFixed(0)}% success
            </MyTypography>
          </MyBox>
          <MyBox
            sx={{
              height: 8,
              bgcolor: 'action.hover',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <MyBox
              sx={{
                height: '100%',
                width: `${(fragment.useCount / maxUseCount) * 100}%`,
                bgcolor: fragment.successRate >= 0.8 ? 'success.main' : 'primary.main',
                borderRadius: 1,
              }}
            />
          </MyBox>
        </MyBox>
      ))}
    </MyStack>
  );
};

/**
 * Strategy Trajectory Chart Component
 */
const StrategyTrajectoryChart: React.FC<{ data: StrategyTrajectory[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <MyBox sx={{ p: 2, textAlign: 'center' }}>
        <MyTypography variant="body2" color="text.secondary">
          No strategy trajectory data available
        </MyTypography>
      </MyBox>
    );
  }

  // Simple visualization showing version progression
  const maxWeight = Math.max(
    ...data.flatMap(d => Object.values(d.weights)),
    1
  );

  return (
    <MyStack spacing={1} sx={{ p: 2 }}>
      {data.slice(-5).map((trajectory, idx) => (
        <MyBox key={trajectory.version}>
          <MyBox sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <MyChip 
              label={`v${trajectory.version}`} 
              size="small" 
              color={idx === data.slice(-5).length - 1 ? 'primary' : 'default'}
            />
            <MyTypography variant="caption" color="text.secondary">
              {new Date(trajectory.timestamp).toLocaleDateString()}
            </MyTypography>
          </MyBox>
          <MyBox sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {Object.entries(trajectory.weights).slice(0, 3).map(([metric, weight]) => (
              <MyBox
                key={metric}
                sx={{
                  flex: weight / maxWeight,
                  height: 16,
                  bgcolor: 'primary.light',
                  borderRadius: 0.5,
                  minWidth: 4,
                }}
                title={`${metric}: ${(weight * 100).toFixed(1)}%`}
              />
            ))}
          </MyBox>
        </MyBox>
      ))}
    </MyStack>
  );
};

/**
 * Crystallization Success Rate Trend Chart
 */
const CrystallizationTrendChart: React.FC<{ data: CrystallizationTrend[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <MyBox sx={{ p: 2, textAlign: 'center' }}>
        <MyTypography variant="body2" color="text.secondary">
          No crystallization trend data available
        </MyTypography>
      </MyBox>
    );
  }

  const maxRate = Math.max(...data.map(d => d.rate), 1);

  return (
    <MyStack spacing={1} sx={{ p: 2 }}>
      {data.slice(-7).map((trend, idx) => (
        <MyBox key={trend.date}>
          <MyBox sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <MyTypography variant="caption">
              {trend.date}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              {trend.successCount}/{trend.totalCount} • {(trend.rate * 100).toFixed(0)}%
            </MyTypography>
          </MyBox>
          <MyBox
            sx={{
              height: 24,
              bgcolor: 'action.hover',
              borderRadius: 1,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <MyBox
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${(trend.rate / maxRate) * 100}%`,
                bgcolor: trend.rate >= 0.8 ? 'success.main' : trend.rate >= 0.5 ? 'warning.main' : 'error.main',
                opacity: 0.7,
              }}
            />
          </MyBox>
        </MyBox>
      ))}
    </MyStack>
  );
};

/**
 * Main EvolutionAnalytics Component
 */
export const EvolutionAnalytics: React.FC<EvolutionAnalyticsProps> = ({
  fragmentUsage = [],
  strategyTrajectory = [],
  crystallizationTrend = [],
  timeRange = '30d',
  onTimeRangeChange,
}) => {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d'>(timeRange);
  const [selectedMetric, setSelectedMetric] = useState<string>('all');

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalFragments = fragmentUsage.length;
    const avgSuccessRate = totalFragments > 0
      ? fragmentUsage.reduce((sum, f) => sum + f.successRate, 0) / totalFragments
      : 0;
    const totalUses = fragmentUsage.reduce((sum, f) => sum + f.useCount, 0);
    const recentTrend = crystallizationTrend.slice(-1)[0];
    const currentRate = recentTrend?.rate ?? 0;

    return { totalFragments, avgSuccessRate, totalUses, currentRate };
  }, [fragmentUsage, crystallizationTrend]);

  const handleRangeChange = (event: { target: { value: unknown } }) => {
    const newRange = event.target.value as '7d' | '30d' | '90d';
    setSelectedRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  return (
    <MyPaper sx={{ p: 2 }}>
      {/* Header */}
      <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <MyTypography variant="h6">Evolution Analytics</MyTypography>
        
        <MyFormControl size="small" sx={{ minWidth: 100 }}>
          <MyInputLabel>Time Range</MyInputLabel>
          <MySelect
            value={selectedRange}
            onChange={handleRangeChange}
            label="Time Range"
          >
            <MyMenuItem value="7d">7 Days</MyMenuItem>
            <MyMenuItem value="30d">30 Days</MyMenuItem>
            <MyMenuItem value="90d">90 Days</MyMenuItem>
          </MySelect>
        </MyFormControl>
      </MyBox>

      {/* Summary Stats */}
      <MyStack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" useFlexGap>
        <MyPaper
          sx={{
            p: 1.5,
            minWidth: 100,
            flex: 1,
            borderLeft: '3px solid #8884d8',
          }}
        >
          <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychologyIcon sx={{ color: '#8884d8', fontSize: 20 }} />
            <MyBox>
              <MyTypography variant="caption" color="text.secondary">
                Skill Fragments
              </MyTypography>
              <MyTypography variant="h6">{summaryStats.totalFragments}</MyTypography>
            </MyBox>
          </MyBox>
        </MyPaper>

        <MyPaper
          sx={{
            p: 1.5,
            minWidth: 100,
            flex: 1,
            borderLeft: '3px solid #00C49F',
          }}
        >
          <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ color: '#00C49F', fontSize: 20 }} />
            <MyBox>
              <MyTypography variant="caption" color="text.secondary">
                Avg Success Rate
              </MyTypography>
              <MyTypography variant="h6">
                {(summaryStats.avgSuccessRate * 100).toFixed(0)}%
              </MyTypography>
            </MyBox>
          </MyBox>
        </MyPaper>

        <MyPaper
          sx={{
            p: 1.5,
            minWidth: 100,
            flex: 1,
            borderLeft: '3px solid #82ca9d',
          }}
        >
          <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpeedIcon sx={{ color: '#82ca9d', fontSize: 20 }} />
            <MyBox>
              <MyTypography variant="caption" color="text.secondary">
                Total Uses
              </MyTypography>
              <MyTypography variant="h6">{summaryStats.totalUses}</MyTypography>
            </MyBox>
          </MyBox>
        </MyPaper>
      </MyStack>

      {/* Charts */}
      <MyStack spacing={2}>
        {/* Skill Fragment Usage */}
        <MyPaper sx={{ bgcolor: 'background.default' }}>
          <MyTypography variant="subtitle2" sx={{ p: 1, pb: 0 }}>
            Skill Fragment Usage
          </MyTypography>
          <FragmentUsageChart data={fragmentUsage} />
        </MyPaper>

        {/* Strategy Optimization Trajectory */}
        <MyPaper sx={{ bgcolor: 'background.default' }}>
          <MyTypography variant="subtitle2" sx={{ p: 1, pb: 0 }}>
            Strategy Optimization Trajectory
          </MyTypography>
          <StrategyTrajectoryChart data={strategyTrajectory} />
        </MyPaper>

        {/* Crystallization Success Rate Trend */}
        <MyPaper sx={{ bgcolor: 'background.default' }}>
          <MyTypography variant="subtitle2" sx={{ p: 1, pb: 0 }}>
            Crystallization Success Rate Trend
          </MyTypography>
          <CrystallizationTrendChart data={crystallizationTrend} />
        </MyPaper>
      </MyStack>
    </MyPaper>
  );
};

export default EvolutionAnalytics;