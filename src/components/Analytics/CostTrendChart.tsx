/**
 * Cost Trend Chart Component for PixelPal V97
 * 
 * Displays cost trends over time using recharts LineChart.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, ToggleButtonGroup, ToggleButton, Card, CardContent } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { dataPipelineEngine } from '../../services/dataPipeline/pipelineEngine';
import type { DailyCostTrend } from '../../types/usage';

interface CostTrendChartProps {
  costBudgetLimit?: number;
}

type TimeRange = 'day' | 'week' | 'month';

export const CostTrendChart: React.FC<CostTrendChartProps> = ({ costBudgetLimit }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [data, setData] = useState<Array<{ date: string; cost: number; tokens: number; calls: number }>>([]);

  useEffect(() => {
    const loadData = async () => {
      const records = await dataPipelineEngine.collect();
      let aggregated;
      
      switch (timeRange) {
        case 'day':
          aggregated = dataPipelineEngine.aggregateByDay(records);
          break;
        case 'week':
          aggregated = dataPipelineEngine.aggregateByDay(records).slice(-7);
          break;
        case 'month':
        default:
          aggregated = dataPipelineEngine.aggregateByDay(records).slice(-30);
          break;
      }
      
      setData(aggregated);
    };
    
    loadData();
  }, [timeRange]);

  const handleTimeRangeChange = (_: React.MouseEvent<HTMLElement>, newRange: TimeRange | null) => {
    if (newRange) {
      setTimeRange(newRange);
    }
  };

  const formatTooltip = (value: number) => `$${value.toFixed(4)}`;
  const formatYAxis = (value: number) => `$${value.toFixed(2)}`;

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 600 }}>
            💰 Cost Trend
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={timeRange}
            exclusive
            onChange={handleTimeRangeChange}
            sx={{ 
              '& .MuiToggleButton-root': { 
                px: 1.5, 
                py: 0.5, 
                fontSize: 11,
                textTransform: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
              }
            }}
          >
            <ToggleButton value="day">Day</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
            <ToggleButton value="month">Month</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Box sx={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#888' }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getMonth() + 1}/${date.getDate()}`;
                }}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#888' }}
                tickFormatter={formatYAxis}
                width={50}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'rgba(30,30,30,0.95)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              {costBudgetLimit && (
                <ReferenceLine 
                  y={costBudgetLimit} 
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  label={{ value: 'Budget', fill: '#ef4444', fontSize: 10 }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="cost" 
                stroke="#6366f1" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CostTrendChart;
