/**
 * Token Usage Pie Chart Component for PixelPal V97
 * 
 * Displays token usage distribution by provider using recharts PieChart.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { tokenTracker } from '../../services/usage/TokenTracker';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#818cf8', '#a855f7', '#7c3aed'];

export const TokenUsagePie: React.FC = () => {
  const [data, setData] = useState<Array<{ name: string; value: number; tokens: number }>>([]);

  useEffect(() => {
    const loadData = () => {
      const records = tokenTracker.getRecords();
      const byProvider: Record<string, { tokens: number; calls: number }> = {};
      
      for (const record of records) {
        if (!byProvider[record.provider]) {
          byProvider[record.provider] = { tokens: 0, calls: 0 };
        }
        byProvider[record.provider].tokens += record.totalTokens;
        byProvider[record.provider].calls += 1;
      }
      
      const chartData = Object.entries(byProvider)
        .map(([provider, stats]) => ({
          name: provider,
          value: stats.calls,
          tokens: stats.tokens,
        }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 7);
      
      setData(chartData);
    };
    
    loadData();
  }, []);

  const formatTooltip = (value: number, name: string, props: any) => {
    return [`${value} calls (${(props.payload.tokens / 1000).toFixed(1)}K tokens)`, name];
  };

  const formatLabel = (name: string, value: number, total: number) => {
    const percentage = ((value / total) * 100).toFixed(1);
    return `${name}: ${percentage}%`;
  };

  const totalCalls = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          🔄 Token Usage by Provider
        </Typography>
        
        {data.length > 0 ? (
          <>
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={(props) => formatLabel(props.name, props.value, totalCalls)}
                    labelLine={false}
                  >
                    {data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            {/* Legend with detailed stats */}
            <Box sx={{ mt: 1 }}>
              {data.map((item, index) => (
                <Box 
                  key={item.name}
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
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: COLORS[index % COLORS.length] 
                      }} 
                    />
                    <Typography variant="body2" sx={{ fontSize: 11 }}>
                      {item.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {(item.tokens / 1000).toFixed(1)}K tokens
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No usage data available
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenUsagePie;
