/**
 * Usage Heatmap Component for PixelPal V97
 * 
 * Displays usage intensity by hour and day of week using a custom grid.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';
import { dataPipelineEngine } from '../../services/dataPipeline/pipelineEngine';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface HeatmapCell {
  hour: number;
  dayOfWeek: number;
  count: number;
}

const getHeatmapColor = (count: number, max: number): string => {
  if (count === 0 || max === 0) return 'rgba(255,255,255,0.05)';
  const intensity = Math.min(count / max, 1);
  
  // Blue-purple gradient
  if (intensity < 0.25) return 'rgba(99, 102, 241, 0.2)';
  if (intensity < 0.5) return 'rgba(99, 102, 241, 0.4)';
  if (intensity < 0.75) return 'rgba(139, 92, 246, 0.6)';
  return 'rgba(139, 92, 246, 0.9)';
};

export const UsageHeatmap: React.FC = () => {
  const [data, setData] = useState<HeatmapCell[]>([]);
  const [maxCount, setMaxCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const records = await dataPipelineEngine.collect();
      const heatmapData = dataPipelineEngine.getHourlyUsageHeatmap(records);
      
      const max = Math.max(...heatmapData.map(d => d.count), 1);
      setMaxCount(max);
      setData(heatmapData);
    };
    
    loadData();
  }, []);

  const getCellCount = (hour: number, day: number): number => {
    const cell = data.find(d => d.hour === hour && d.dayOfWeek === day);
    return cell?.count || 0;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12a';
    if (hour === 12) return '12p';
    if (hour < 12) return `${hour}a`;
    return `${hour - 12}p`;
  };

  return (
    <Card sx={{ height: '100%', minHeight: 300 }}>
      <CardContent>
        <Typography variant="h6" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          🗓️ Usage Heatmap
        </Typography>
        
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ minWidth: 500 }}>
            {/* Hour labels */}
            <Box sx={{ display: 'flex', ml: 4, mb: 0.5 }}>
              {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
                <Typography
                  key={hour}
                  variant="body2"
                  sx={{ 
                    fontSize: 9, 
                    color: 'text.secondary',
                    width: `${(100 / 24) * 3}%`,
                    textAlign: 'center',
                  }}
                >
                  {formatHour(hour)}
                </Typography>
              ))}
            </Box>

            {/* Heatmap grid */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {DAYS.map((day, dayIndex) => (
                <Box key={day} sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* Day label */}
                  <Typography
                    variant="body2"
                    sx={{ 
                      fontSize: 10, 
                      color: 'text.secondary',
                      width: 28,
                      mr: 0.5,
                    }}
                  >
                    {day}
                  </Typography>
                  
                  {/* Hour cells */}
                  <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
                    {HOURS.map(hour => {
                      const count = getCellCount(hour, dayIndex);
                      return (
                        <Box
                          key={hour}
                          sx={{
                            flex: 1,
                            height: 16,
                            borderRadius: 0.5,
                            bgcolor: getHeatmapColor(count, maxCount),
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            '&:hover': {
                              bgcolor: 'rgba(139, 92, 246, 1)',
                            },
                          }}
                          title={`${day} ${formatHour(hour)}: ${count} calls`}
                        />
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mt: 1.5, gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: 9, color: 'text.secondary', mr: 0.5 }}>
                Less
              </Typography>
              {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.5,
                    bgcolor: getHeatmapColor(intensity * maxCount, maxCount),
                  }}
                />
              ))}
              <Typography variant="body2" sx={{ fontSize: 9, color: 'text.secondary', ml: 0.5 }}>
                More
              </Typography>
            </Box>

            {/* Summary stats */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                  {data.reduce((sum, d) => sum + d.count, 0)}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 9, color: 'text.secondary' }}>
                  Total Calls
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                  {data.length > 0 ? DAYS[Math.floor(data.reduce((sum, d) => sum + d.dayOfWeek * d.count, 0) / data.reduce((sum, d) => sum + d.count, 0))] : '-'}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 9, color: 'text.secondary' }}>
                  Busiest Day
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                  {data.length > 0 ? formatHour(data.reduce((max, d) => d.count > max.count ? d : max, data[0]).hour) : '-'}
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 9, color: 'text.secondary' }}>
                  Busiest Hour
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default UsageHeatmap;
