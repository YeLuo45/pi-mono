/**
 * UsageStatsPanel Component for PixelPal V88
 * 
 * Displays token usage statistics, cost trends, and budget management.
 */

import React, { useState, useEffect } from 'react';
import { MyTable, MyTableBody, MyTableContainer, MyTableHead } from '../MUI替代';

import { MyTableCell, MyTableRow } from '../MUI替代';
import { MyBox, MyTypography, MyPaper, MyGrid, MyTabs, MyTabs, MyCard, MyCard, MyChip, MyLinearProgress, MySwitch, MyTextField, MyIconButton, MyTooltip, MyToggleButton, MyToggleButtonGroup } from '../MUI替代';
import { TrendingUp, TrendingDown, AttachMoney, ShowChart, Speed, CheckCircle, 
  Warning, Error as ErrorIcon, Refresh as RefreshIcon, Download as DownloadIcon,
  Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { tokenTracker } from '../../services/usage/TokenTracker';
import { costCalculator } from '../../services/usage/CostCalculator';
import { budgetManager } from '../../services/usage/BudgetManager';
import { statsAggregator } from '../../services/usage/StatsAggregator';
import type { TokenUsage, CostBudget, ProviderStats, DailyCostTrend } from '../../types/usage';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: { value: number; isPositive: boolean };
}

function StatCard({ title, value, subtitle, icon, color = '#6366f1', trend }: StatCardProps) {
  return (
    <Card sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {title}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 20, mt: 0.5 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                {trend.isPositive ? (
                  <TrendingUp sx={{ fontSize: 14, color: 'success.main' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 14, color: 'error.main' }} />
                )}
                <Typography variant="caption" sx={{ 
                  fontSize: 10, 
                  color: trend.isPositive ? 'success.main' : 'error.main' 
                }}>
                  {trend.value.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ 
            p: 1, 
            borderRadius: 1.5, 
            bgcolor: `${color}22`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 20, color } })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export const UsageStatsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [budgets, setBudgets] = useState<CostBudget[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyCostTrend[]>([]);
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([]);
  const [summary, setSummary] = useState({ totalCost: 0, totalTokens: 0, totalCalls: 0, successRate: 0, avgResponseTime: 0 });
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetLimitInput, setBudgetLimitInput] = useState<Record<string, string>>({});

  useEffect(() => {
    refreshData();
    
    // Subscribe to usage updates
    const unsubscribe = tokenTracker.subscribe(() => {
      refreshData();
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const refreshData = () => {
    setBudgets(budgetManager.getBudgets());
    setDailyTrends(statsAggregator.getDailyCostTrend(timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90));
    setProviderStats(statsAggregator.getAllProviderStats());
    setSummary(statsAggregator.getUsageSummary());
  };

  const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newValue: '7d' | '30d' | '90d') => {
    if (newValue) {
      setTimeRange(newValue);
      setDailyTrends(statsAggregator.getDailyCostTrend(newValue === '7d' ? 7 : newValue === '30d' ? 30 : 90));
    }
  };

  const handleBudgetToggle = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (budget) {
      budgetManager.setBudgetEnabled(budget.type, !budget.enabled, budget.providerId);
      setBudgets(budgetManager.getBudgets());
    }
  };

  const handleBudgetLimitChange = (budgetId: string, value: string) => {
    setBudgetLimitInput(prev => ({ ...prev, [budgetId]: value }));
  };

  const handleBudgetLimitSave = (budgetId: string) => {
    const budget = budgets.find(b => b.id === budgetId);
    if (budget) {
      const newLimit = parseFloat(budgetLimitInput[budgetId] || '0');
      if (newLimit > 0) {
        budgetManager.setBudget(budget.type, newLimit, budget.enabled, budget.providerId);
        setBudgets(budgetManager.getBudgets());
      }
    }
    setEditingBudget(null);
    setBudgetLimitInput(prev => ({ ...prev, [budgetId]: '' }));
  };

  const handleResetBudget = (budgetId: string) => {
    budgetManager.resetBudget(budgetId);
    setBudgets(budgetManager.getBudgets());
  };

  const handleExportData = () => {
    const data = tokenTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixelpal-usage-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all usage data? This cannot be undone.')) {
      tokenTracker.clearAll();
      refreshData();
    }
  };

  const getMaxCost = () => {
    return Math.max(...dailyTrends.map(d => d.cost), 0.01);
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          📊 Usage Statistics
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Export Data">
            <IconButton size="small" onClick={handleExportData}>
              <DownloadIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={refreshData}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear All Data">
            <IconButton size="small" onClick={handleClearData} color="error">
              <DeleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Total Cost"
              value={costCalculator.formatCost(summary.totalCost)}
              icon={<AttachMoney />}
              color="#22c55e"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Total Tokens"
              value={costCalculator.formatTokens(summary.totalTokens)}
              icon={<TrendingUp />}
              color="#6366f1"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="API Calls"
              value={summary.totalCalls.toLocaleString()}
              icon={<Speed />}
              color="#f59e0b"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Success Rate"
              value={`${(summary.successRate * 100).toFixed(1)}%`}
              icon={summary.successRate >= 0.95 ? <CheckCircle /> : <Warning />}
              color={summary.successRate >= 0.95 ? '#22c55e' : '#f59e0b'}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Avg Response"
              value={formatResponseTime(summary.avgResponseTime)}
              icon={<Speed />}
              color="#8b5cf6"
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="Monthly Est."
              value={costCalculator.formatCost(statsAggregator.estimateMonthlyBill())}
              subtitle="Based on current rate"
              icon={<TrendingUp />}
              color="#ec4899"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 36 }}>
          <Tab label="Overview" sx={{ minHeight: 36, fontSize: 13 }} />
          <Tab label="Budgets" sx={{ minHeight: 36, fontSize: 13 }} />
          <Tab label="Providers" sx={{ minHeight: 36, fontSize: 13 }} />
          <Tab label="Daily Trend" sx={{ minHeight: 36, fontSize: 13 }} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ p: 2 }}>
        {/* Overview Tab */}
        <TabPanel value={tab} index={0}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, mb: 2 }}>
              Cost Breakdown by Provider
            </Typography>
            <Grid container spacing={1}>
              {providerStats
                .filter(p => p.totalCost > 0)
                .sort((a, b) => b.totalCost - a.totalCost)
                .map((provider) => (
                  <Grid item xs={12} key={provider.provider}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, width: 100 }}>
                        {provider.provider}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={(provider.totalCost / Math.max(summary.totalCost, 0.01)) * 100}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontSize: 11, width: 80, textAlign: 'right' }}>
                        {costCalculator.formatCost(provider.totalCost)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              {providerStats.filter(p => p.totalCost > 0).length === 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', p: 2 }}>
                  No usage data yet. Make some API calls to see statistics.
                </Typography>
              )}
            </Grid>
          </Paper>

          {/* Provider Comparison */}
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2, mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, mb: 2 }}>
              Provider Performance
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11 }}>Provider</TableCell>
                    <TableCell sx={{ fontSize: 11 }} align="right">Calls</TableCell>
                    <TableCell sx={{ fontSize: 11 }} align="right">Tokens</TableCell>
                    <TableCell sx={{ fontSize: 11 }} align="right">Cost</TableCell>
                    <TableCell sx={{ fontSize: 11 }} align="right">Success</TableCell>
                    <TableCell sx={{ fontSize: 11 }} align="right">Avg Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {providerStats.map((p) => (
                    <TableRow key={p.provider} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontSize: 11 }}>{p.provider}</TableCell>
                      <TableCell sx={{ fontSize: 11 }} align="right">{p.totalCalls}</TableCell>
                      <TableCell sx={{ fontSize: 11 }} align="right">{costCalculator.formatTokens(p.totalTokens)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }} align="right">{costCalculator.formatCost(p.totalCost)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }} align="right">
                        <Chip 
                          size="small" 
                          label={`${(p.successRate * 100).toFixed(0)}%`}
                          color={p.successRate >= 0.95 ? 'success' : p.successRate >= 0.8 ? 'warning' : 'error'}
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }} align="right">{formatResponseTime(p.avgResponseTime)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>

        {/* Budgets Tab */}
        <TabPanel value={tab} index={1}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ fontSize: 13, mb: 2 }}>
              Cost Budgets
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {budgets.map((budget) => (
                <Box key={budget.id} sx={{ 
                  p: 2, 
                  borderRadius: 1.5, 
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>
                        {budget.type.charAt(0).toUpperCase() + budget.type.slice(1)} Budget
                      </Typography>
                      {budget.providerId && (
                        <Chip size="small" label={budget.providerId} sx={{ height: 18, fontSize: 10 }} />
                      )}
                      <Switch
                        size="small"
                        checked={budget.enabled}
                        onChange={() => handleBudgetToggle(budget.id)}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {editingBudget === budget.id ? (
                        <>
                          <TextField
                            size="small"
                            type="number"
                            placeholder={`$${budget.limit}`}
                            value={budgetLimitInput[budget.id] || ''}
                            onChange={(e) => handleBudgetLimitChange(budget.id, e.target.value)}
                            sx={{ width: 100, '& input': { fontSize: 12, py: 0.5 } }}
                          />
                          <IconButton size="small" onClick={() => handleBudgetLimitSave(budget.id)}>
                            <CheckCircle sx={{ fontSize: 16 }} />
                          </IconButton>
                        </>
                      ) : (
                        <Tooltip title="Edit limit">
                          <IconButton size="small" onClick={() => {
                            setEditingBudget(budget.id);
                            setBudgetLimitInput(prev => ({ ...prev, [budget.id]: budget.limit.toString() }));
                          }}>
                            <AttachMoney sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Reset spend">
                        <IconButton size="small" onClick={() => handleResetBudget(budget.id)}>
                          <RefreshIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min((budget.current / budget.limit) * 100, 100)}
                        color={budget.current >= budget.limit ? 'error' : budget.current >= budget.limit * 0.9 ? 'warning' : 'primary'}
                        sx={{ height: 6, borderRadius: 1 }}
                      />
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                      ${budget.current.toFixed(2)} / ${budget.limit.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {((budget.current / budget.limit) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        </TabPanel>

        {/* Providers Tab */}
        <TabPanel value={tab} index={2}>
          <Grid container spacing={2}>
            {providerStats.map((provider) => (
              <Grid item xs={12} sm={6} md={4} key={provider.provider}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                    {provider.provider}
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                        Total Calls
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {provider.totalCalls}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                        Success Rate
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: provider.successRate >= 0.95 ? 'success.main' : 'warning.main' }}>
                        {(provider.successRate * 100).toFixed(1)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                        Total Cost
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {costCalculator.formatCost(provider.totalCost)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                        Avg Response
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatResponseTime(provider.avgResponseTime)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                        Total Tokens
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {costCalculator.formatTokens(provider.totalTokens)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
            {providerStats.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', p: 4 }}>
                  No provider usage data yet.
                </Typography>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Daily Trend Tab */}
        <TabPanel value={tab} index={3}>
          <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontSize: 13 }}>
                Daily Cost Trend
              </Typography>
              <ToggleButtonGroup
                size="small"
                value={timeRange}
                exclusive
                onChange={handleTimeRangeChange}
                sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 1.5, fontSize: 11 } }}
              >
                <ToggleButton value="7d">7D</ToggleButton>
                <ToggleButton value="30d">30D</ToggleButton>
                <ToggleButton value="90d">90D</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            {/* Simple Bar Chart */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 150 }}>
              {dailyTrends.map((day, index) => {
                const height = (day.cost / getMaxCost()) * 100;
                const isToday = index === dailyTrends.length - 1;
                return (
                  <Tooltip 
                    key={day.date} 
                    title={`${day.date}: ${costCalculator.formatCost(day.cost)} (${day.calls} calls)`}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        minWidth: 4,
                        height: `${Math.max(height, 2)}%`,
                        bgcolor: isToday ? '#6366f1' : 'rgba(99,102,241,0.4)',
                        borderRadius: '2px 2px 0 0',
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: '#6366f1',
                        }
                      }}
                    />
                  </Tooltip>
                );
              })}
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {dailyTrends[0]?.date}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                {dailyTrends[dailyTrends.length - 1]?.date}
              </Typography>
            </Box>
            
            {/* Summary Stats */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                    Total Cost
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {costCalculator.formatCost(dailyTrends.reduce((sum, d) => sum + d.cost, 0))}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                    Total Calls
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {dailyTrends.reduce((sum, d) => sum + d.calls, 0)}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                    Avg Daily Cost
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {costCalculator.formatCost(dailyTrends.reduce((sum, d) => sum + d.cost, 0) / Math.max(dailyTrends.length, 1))}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default UsageStatsPanel;
