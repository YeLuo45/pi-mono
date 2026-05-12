/**
 * Usage Statistics Page for PixelPal V88
 */

import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { UsageStatsPanel } from '../components/Usage/UsageStatsPanel';

export const UsageStatsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box sx={{ 
        p: 1.5, 
        borderBottom: '1px solid rgba(255,255,255,0.08)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        bgcolor: 'rgba(34, 197, 94, 0.05)'
      }}>
        <IconButton size="small" onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: 14 }}>
          📊 Usage Statistics
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <UsageStatsPanel />
      </Box>
    </Box>
  );
};

export default UsageStatsPage;
