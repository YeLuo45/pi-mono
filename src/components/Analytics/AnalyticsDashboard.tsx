/**
 * Analytics Dashboard Component for PixelPal V97
 * 
 * Main analytics dashboard with overview cards and charts.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Alert, IconButton, Collapse, Button } from '@mui/material';
import { ExpandMore as ExpandIcon, ExpandLess as CollapseIcon, Download as DownloadIcon } from '@mui/icons-material';
import { tokenTracker } from '../../services/usage/TokenTracker';
import { metricsCollector } from '../../services/dataPipeline/metricsCollector';
import { dataPipelineEngine } from '../../services/dataPipeline/pipelineEngine';
import { CostTrendChart } from './CostTrendChart';
import { TokenUsagePie } from './TokenUsagePie';
import { ProviderStatsBar } from './ProviderStatsBar';
import { UsageHeatmap } from './UsageHeatmap';
import { ResponseTimeChart } from './ResponseTimeChart';

interface OverviewCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  trend?: { value: number; isPositive: boolean };
}

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, subtitle, icon, trend }) => (
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
          {trend && (
            <Chip
              size="small"
              label={`${trend.isPositive ? '↑' : '↓'} ${Math.abs(trend.value).toFixed(1)}%`}
              sx={{ 
                mt: 0.5, 
                height: 18, 
                fontSize: 9,
                bgcolor: trend.isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: trend.isPositive ? '#22c55e' : '#ef4444',
              }}
            />
          )}
        </Box>
        <Box sx={{ 
          width: 36, 
          height: 36, 
          borderRadius: 1.5, 
          bgcolor: 'rgba(99, 102, 241, 0.1)',
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

export const AnalyticsDashboard: React.FC = () => {
  const [overviewData, setOverviewData] = useState({
    totalCost: 0,
    totalTokens: 0,
    totalCalls: 0,
    successRate: 0,
    avgResponseTime: 0,
  });
  const [costForecast, setCostForecast] = useState({ daily: 0, weekly: 0, monthly: 0, projectedMonthly: 0 });
  const [anomalies, setAnomalies] = useState<ReturnType<typeof metricsCollector.detectAnomalies>>([]);
  const [insightsExpanded, setInsightsExpanded] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = () => {
      // Get overview stats
      const records = tokenTracker.getRecords();
      const summary = metricsCollector.collectRangeMetrics(0, Date.now());
      
      const successfulCalls = records.filter(r => r.success).length;
      
      setOverviewData({
        totalCost: summary.totalCost,
        totalTokens: summary.totalTokens,
        totalCalls: summary.totalCalls,
        successRate: summary.totalCalls > 0 ? successfulCalls / summary.totalCalls : 0,
        avgResponseTime: summary.avgResponseTime,
      });

      // Get cost forecast
      setCostForecast(metricsCollector.getCostForecast());

      // Detect anomalies
      setAnomalies(metricsCollector.detectAnomalies());
    };

    loadData();
  }, [refreshKey]);

  const handleExportCSV = () => {
    const csv = dataPipelineEngine.exportCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixelpal-usage-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = dataPipelineEngine.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixelpal-usage-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCost = (cost: number): string => {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    if (cost < 1) return `$${cost.toFixed(3)}`;
    return `$${cost.toFixed(2)}`;
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
          📊 Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportCSV}
            sx={{ fontSize: 11, textTransform: 'none' }}
          >
            CSV
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExportJSON}
            sx={{ fontSize: 11, textTransform: 'none' }}
          >
            JSON
          </Button>
        </Box>
      </Box>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mb: 1,
              '&:hover': { opacity: 0.8 },
            }}
            onClick={() => setInsightsExpanded(!insightsExpanded)}
          >
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'warning.main' }}>
              ⚠️ {anomalies.length} Insight{anomalies.length > 1 ? 's' : ''} Detected
            </Typography>
            <IconButton size="small" sx={{ ml: 0.5, p: 0.25 }}>
              {insightsExpanded ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Box>
          <Collapse in={insightsExpanded}>
            {anomalies.map((anomaly, index) => (
              <Alert 
                key={index}
                severity={anomaly.severity === 'high' ? 'error' : anomaly.severity === 'medium' ? 'warning' : 'info'}
                sx={{ mb: 0.5, py: 0.5 }}
              >
                <Typography variant="body2" sx={{ fontSize: 11 }}>
                  {anomaly.message}
                </Typography>
              </Alert>
            ))}
          </Collapse>
        </Box>
      )}

      {/* Overview Cards */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <OverviewCard
            title="Total Cost"
            value={formatCost(overviewData.totalCost)}
            subtitle={`Projected: ${formatCost(costForecast.projectedMonthly)}/mo`}
            icon="💰"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <OverviewCard
            title="Total Tokens"
            value={formatTokens(overviewData.totalTokens)}
            icon="🔢"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <OverviewCard
            title="API Calls"
            value={overviewData.totalCalls.toLocaleString()}
            subtitle={`Today: ${tokenTracker.getTodayRecords().length}`}
            icon="📞"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <OverviewCard
            title="Success Rate"
            value={`${(overviewData.successRate * 100).toFixed(1)}%`}
            subtitle={`Avg: ${(overviewData.avgResponseTime / 1000).toFixed(1)}s`}
            icon="✅"
          />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={1.5}>
        <Grid item xs={12} md={8}>
          <CostTrendChart />
        </Grid>
        <Grid item xs={12} md={4}>
          <TokenUsagePie />
        </Grid>
        <Grid item xs={12} md={6}>
          <ProviderStatsBar />
        </Grid>
        <Grid item xs={12} md={6}>
          <UsageHeatmap />
        </Grid>
        <Grid item xs={12}>
          <ResponseTimeChart />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
