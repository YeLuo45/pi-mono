/**
 * Usage Statistics Page for PixelPal V88
 */

import React from 'react';
import { MyIconButton as IconButton, MyTypography as Typography } from '../components/MUI替代';
import { Box } from '../components/ui/Box';
import { ArrowBackIcon } from '../components/ui/muiIconMap';
import { useNavigate } from 'react-router-dom';
import { UsageStatsPanel } from '../components/Usage/UsageStatsPanel';

export const UsageStatsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box css={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box css={{ 
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
      <Box css={{ flex: 1, overflow: 'auto' }}>
        <UsageStatsPanel />
      </Box>
    </Box>
  );
};

export default UsageStatsPage;
