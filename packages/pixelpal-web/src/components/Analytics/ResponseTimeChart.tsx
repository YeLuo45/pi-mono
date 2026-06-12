/**
 * Response Time Chart Component for PixelPal V97
 * 
 * Displays response time trends using recharts AreaChart.
 */

import React, { useState, useEffect } from 'react';
import { MyTypography as Typography, MyCard as Card , MyCardContent as CardContent } from '../MUI替代';
import { Box } from '../ui/Box';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { tokenTracker } from '../../services/usage/TokenTracker';

interface ResponseTimeData {
  timestamp: number;
  date: string;
  responseTime: number;
  p50: number;
  p95: number;
}

export const ResponseTimeChart: React.FC = () => {
  const [data, setData] = useState<ResponseTimeData[]>([]);

  useEffect(() => {
    const loadData = () => {
      const records = tokenTracker.getRecords();
      
      // Group by day and calculate response time stats
      const byDay: Record<string, number[]> = {};
      for (const record of records) {
        const date = new Date(record.timestamp).toISOString().split('T')[0];
        if (!byDay[date]) byDay[date] = [];
        byDay[date].push(record.responseTime);
      }
      
      const chartData: ResponseTimeData[] = [];
      const sortedDates = Object.keys(byDay).sort();
      const last7Days = sortedDates.slice(-7);
      
      for (const date of last7Days) {
        const times = byDay[date].sort((a, b) => a - b);
        const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
        const p50 = times[Math.floor(times.length * 0.5)] || 0;
        const p95 = times[Math.floor(times.length * 0.95)] || 0;
        
        chartData.push({
          timestamp: new Date(date).getTime(),
          date,
          responseTime: parseFloat((avg / 1000).toFixed(2)),
          p50: parseFloat((p50 / 1000).toFixed(2)),
          p95: parseFloat((p95 / 1000).toFixed(2)),
        });
      }
      
      setData(chartData);
    };
    
    loadData();
  }, []);

  const formatTooltip = (value: number) => `${value}s`;
  const formatYAxis = (value: number) => `${value}s`;

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          ⚡ Response Time Trend
        </Typography>
        
        {data.length > 0 ? (
          <Box sx={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
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
                  width={40}
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
                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '10s', fill: '#ef4444', fontSize: 9 }} />
                <Area 
                  type="monotone" 
                  dataKey="p95" 
                  stroke="#ef4444" 
                  strokeWidth={1}
                  fill="url(#p95Gradient)"
                  strokeDasharray="3 3"
                  name="P95"
                />
                <Area 
                  type="monotone" 
                  dataKey="p50" 
                  stroke="#8b5cf6" 
                  strokeWidth={1}
                  fill="transparent"
                  strokeDasharray="5 5"
                  name="P50"
                />
                <Area 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fill="url(#responseTimeGradient)"
                  name="Avg"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No response time data available
            </Typography>
          </Box>
        )}
        
        {/* Legend */}
        {data.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 2, bgcolor: '#6366f1', borderRadius: 1 }} />
              <Typography variant="body2" sx={{ fontSize: 10, color: 'text.secondary' }}>
                Avg Response
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 2, bgcolor: '#8b5cf6', borderRadius: 1, borderStyle: 'dashed' }} />
              <Typography variant="body2" sx={{ fontSize: 10, color: 'text.secondary' }}>
                P50
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 2, bgcolor: '#ef4444', borderRadius: 1, borderStyle: 'dashed' }} />
              <Typography variant="body2" sx={{ fontSize: 10, color: 'text.secondary' }}>
                P95
              </Typography>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseTimeChart;
