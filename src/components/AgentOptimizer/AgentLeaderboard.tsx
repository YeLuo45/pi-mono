/**
 * Agent Leaderboard Component for V100 Agent Optimizer
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TableSortLabel,
  Chip, IconButton, Tooltip, LinearProgress,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { performanceTracker } from '../../services/agentOptimizer/performanceTracker';
import type { AgentPerformance } from '../../types/agentOptimizer';

type SortKey = 'rank' | 'successRate' | 'avgResponseTime' | 'selfOptimizationScore' | 'totalTasks';
type SortOrder = 'asc' | 'desc';

export const AgentLeaderboard: React.FC = () => {
  const [performances, setPerformances] = useState<AgentPerformance[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const loadData = () => {
      const data = performanceTracker.getAllAgentPerformance();
      setPerformances(data);
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedData = [...performances].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortKey) {
      case 'rank':
        aVal = a.rank;
        bVal = b.rank;
        break;
      case 'successRate':
        aVal = a.successRate;
        bVal = b.successRate;
        break;
      case 'avgResponseTime':
        aVal = a.avgResponseTime;
        bVal = b.avgResponseTime;
        break;
      case 'selfOptimizationScore':
        aVal = a.selfOptimizationScore;
        bVal = b.selfOptimizationScore;
        break;
      case 'totalTasks':
        aVal = a.totalTasks;
        bVal = b.totalTasks;
        break;
      default:
        return 0;
    }

    return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#fbbf24';
    if (rank === 2) return '#9ca3af';
    if (rank === 3) return '#cd7f32';
    return '#666';
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>
        🏆 Agent Leaderboard
      </Typography>

      {performances.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No agents tracked yet. Agent performance will appear here once tasks are executed.
          </Typography>
        </Card>
      ) : (
        <TableContainer component={Card}>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600, width: 60 }}>
                  <TableSortLabel
                    active={sortKey === 'rank'}
                    direction={sortKey === 'rank' ? sortOrder : 'asc'}
                    onClick={() => handleSort('rank')}
                  >
                    Rank
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600 }}>
                  Agent
                </TableCell>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600 }}>
                  Type
                </TableCell>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600, width: 80 }}>
                  <TableSortLabel
                    active={sortKey === 'totalTasks'}
                    direction={sortKey === 'totalTasks' ? sortOrder : 'asc'}
                    onClick={() => handleSort('totalTasks')}
                  >
                    Tasks
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600, width: 120 }}>
                  <TableSortLabel
                    active={sortKey === 'successRate'}
                    direction={sortKey === 'successRate' ? sortOrder : 'asc'}
                    onClick={() => handleSort('successRate')}
                  >
                    Success Rate
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600, width: 100 }}>
                  <TableSortLabel
                    active={sortKey === 'avgResponseTime'}
                    direction={sortKey === 'avgResponseTime' ? sortOrder : 'asc'}
                    onClick={() => handleSort('avgResponseTime')}
                  >
                    Avg Time
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ py: 1, px: 1.5, fontSize: 11, fontWeight: 600, width: 100 }}>
                  <TableSortLabel
                    active={sortKey === 'selfOptimizationScore'}
                    direction={sortKey === 'selfOptimizationScore' ? sortOrder : 'asc'}
                    onClick={() => handleSort('selfOptimizationScore')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((perf) => (
                <TableRow
                  key={perf.agentId}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        bgcolor: `${getRankColor(perf.rank)}30`,
                        color: getRankColor(perf.rank),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {perf.rank}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                      {perf.agentName}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Chip
                      label={perf.agentType}
                      size="small"
                      sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(100,100,100,0.1)' }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      {perf.totalTasks}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                        {(perf.successRate * 100).toFixed(0)}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={perf.successRate * 100}
                        sx={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'rgba(0,0,0,0.05)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: perf.successRate > 0.8 ? '#22c55e' : perf.successRate > 0.5 ? '#f59e0b' : '#ef4444',
                          },
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: 12,
                        color: perf.avgResponseTime > 5000 ? '#ef4444' : perf.avgResponseTime > 2000 ? '#f59e0b' : '#22c55e',
                      }}
                    >
                      {(perf.avgResponseTime / 1000).toFixed(1)}s
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1, px: 1.5 }}>
                    <Tooltip title={`Self-optimization: ${perf.selfOptimizationScore.toFixed(0)}/100`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
                          {perf.selfOptimizationScore.toFixed(0)}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={perf.selfOptimizationScore}
                          sx={{
                            flex: 1,
                            width: 40,
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'rgba(0,0,0,0.05)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: perf.selfOptimizationScore > 60 ? '#22c55e' : '#6366f1',
                            },
                          }}
                        />
                      </Box>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};