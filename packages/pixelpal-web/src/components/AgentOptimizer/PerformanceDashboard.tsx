/**
 * Performance Dashboard Component for V100 Agent Optimizer
 */

import React, { useState, useEffect } from 'react';
import { MyTypography as Typography, MyCard as Card, MyGrid as Grid, MyChip as Chip, MyLinearProgress as LinearProgress , MyCardContent as CardContent, MyList as List } from '../MUI替代';
import { Box } from '../ui/Box';
import { performanceTracker } from '../../services/agentOptimizer/performanceTracker';
import type { AgentPerformance } from '../../types/agentOptimizer';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontSize: 20, fontWeight: 700 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          bgcolor: `${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const PerformanceDashboard: React.FC = () => {
  const [performances, setPerformances] = useState<AgentPerformance[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalAgents: 0,
    avgSuccessRate: 0,
    avgResponseTime: 0,
    totalTasks: 0,
  });

  useEffect(() => {
    const loadData = () => {
      const data = performanceTracker.getAllAgentPerformance();
      setPerformances(data);

      if (data.length > 0) {
        setOverallStats({
          totalAgents: data.length,
          avgSuccessRate: data.reduce((sum, p) => sum + p.successRate, 0) / data.length,
          avgResponseTime: data.reduce((sum, p) => sum + p.avgResponseTime, 0) / data.length,
          totalTasks: data.reduce((sum, p) => sum + p.totalTasks, 0),
        });
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>
        📊 Agent Performance Overview
      </Typography>

      {/* Overall Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={2.4}>
          <MetricCard
            title="Total Agents"
            value={overallStats.totalAgents.toString()}
            icon="🤖"
            color="#6366f1"
          />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard
            title="Success Rate"
            value={`${(overallStats.avgSuccessRate * 100).toFixed(1)}%`}
            icon="✅"
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard
            title="Avg Response"
            value={`${(overallStats.avgResponseTime / 1000).toFixed(1)}s`}
            icon="⚡"
            color="#f59e0b"
          />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard
            title="Total Tasks"
            value={overallStats.totalTasks.toString()}
            icon="📋"
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={6} md={2.4}>
          <MetricCard
            title="Optimizations"
            value={performances.filter(p => p.selfOptimizationScore > 60).length.toString()}
            subtitle="High performing"
            icon="🚀"
            color="#8b5cf6"
          />
        </Grid>
      </Grid>

      {/* Agent Performance List */}
      <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>
        Individual Agent Performance
      </Typography>

      {performances.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No performance data yet. Agent task executions will be tracked automatically.
          </Typography>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {performances.map((perf) => (
            <Grid item xs={12} md={6} key={perf.agentId}>
              <Card sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600 }}>
                      {perf.agentName}
                    </Typography>
                    <Chip
                      label={`#${perf.rank}`}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 9,
                        bgcolor: perf.rank <= 3 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(100, 100, 100, 0.2)',
                        color: perf.rank <= 3 ? '#6366f1' : '#666',
                      }}
                    />
                  </Box>
                  <Chip
                    label={perf.agentType}
                    size="small"
                    sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(100, 100, 100, 0.1)' }}
                  />
                </Box>

                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      Success Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                        {(perf.successRate * 100).toFixed(0)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={perf.successRate * 100}
                        sx={{ flex: 1, height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      Response Time
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                      {(perf.avgResponseTime / 1000).toFixed(1)}s
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      Self-Optimization
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                        {perf.selfOptimizationScore.toFixed(0)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={perf.selfOptimizationScore}
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'rgba(100,100,100,0.1)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: perf.selfOptimizationScore > 60 ? '#22c55e' : '#f59e0b',
                          },
                        }}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {perf.commonFailurePatterns.length > 0 && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                      Common Issues:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      {perf.commonFailurePatterns.slice(0, 2).map((pattern, i) => (
                        <Chip
                          key={i}
                          label={pattern.slice(0, 30) + '...'}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 8,
                            bgcolor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};