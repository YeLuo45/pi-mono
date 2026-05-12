/**
 * Provider Stats Bar Chart Component for PixelPal V97
 * 
 * Displays provider statistics using recharts BarChart.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { tokenTracker } from '../../services/usage/TokenTracker';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#818cf8', '#a855f7', '#7c3aed'];

export const ProviderStatsBar: React.FC = () => {
  const [data, setData] = useState<Array<{
    provider: string;
    cost: number;
    calls: number;
    successRate: number;
    avgResponseTime: number;
  }>>([]);

  useEffect(() => {
    const loadData = () => {
      const records = tokenTracker.getRecords();
      const byProvider: Record<string, { cost: number; calls: number; success: number; responseTime: number }> = {};
      
      for (const record of records) {
        if (!byProvider[record.provider]) {
          byProvider[record.provider] = { cost: 0, calls: 0, success: 0, responseTime: 0 };
        }
        byProvider[record.provider].cost += record.cost;
        byProvider[record.provider].calls += 1;
        byProvider[record.provider].success += record.success ? 1 : 0;
        byProvider[record.provider].responseTime += record.responseTime;
      }
      
      const chartData = Object.entries(byProvider)
        .map(([provider, stats]) => ({
          provider,
          cost: parseFloat(stats.cost.toFixed(4)),
          calls: stats.calls,
          successRate: stats.calls > 0 ? (stats.success / stats.calls) * 100 : 0,
          avgResponseTime: stats.calls > 0 ? stats.responseTime / stats.calls : 0,
        }))
        .sort((a, b) => b.cost - a.cost)
        .slice(0, 6);
      
      setData(chartData);
    };
    
    loadData();
  }, []);

  const formatTooltip = (value: number, name: string) => {
    switch (name) {
      case 'cost':
        return [`$${value.toFixed(4)}`, 'Cost'];
      case 'calls':
        return [value, 'Calls'];
      case 'successRate':
        return [`${value.toFixed(1)}%`, 'Success Rate'];
      case 'avgResponseTime':
        return [`${(value / 1000).toFixed(1)}s`, 'Avg Response Time'];
      default:
        return [value, name];
    }
  };

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          📊 Provider Statistics
        </Typography>
        
        {data.length > 0 ? (
          <Box sx={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart 
                data={data} 
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 10, fill: '#888' }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <YAxis 
                  type="category" 
                  dataKey="provider" 
                  tick={{ fontSize: 10, fill: '#888' }}
                  width={70}
                />
                <Tooltip formatter={formatTooltip} />
                <Bar dataKey="cost" name="Cost" radius={[0, 4, 4, 0]}>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No provider data available
            </Typography>
          </Box>
        )}
        
        {/* Additional stats below chart */}
        {data.length > 0 && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {data.slice(0, 3).map((item, index) => (
              <Box 
                key={item.provider}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 0.5,
                  fontSize: 11,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: COLORS[index % COLORS.length] 
                    }} 
                  />
                  <Typography variant="body2" sx={{ fontSize: 11 }}>
                    {item.provider}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {item.successRate.toFixed(0)}% success · {(item.avgResponseTime / 1000).toFixed(1)}s avg
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderStatsBar;
