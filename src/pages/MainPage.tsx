import React, { useState } from 'react';
import { Box, Drawer, useMediaQuery, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { Sidebar } from '../components/Layout/Sidebar';
import { ChatPanel } from '../components/ChatPanel/ChatPanel';

export const MainPage: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'rgba(10, 5, 20, 1)' }}>
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile drawer */}
      {isMobile && (
        <>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ position: 'fixed', top: 8, left: 8, zIndex: 1300, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ '& .MuiDrawer-paper': { bgcolor: 'rgba(15, 10, 30, 0.98)', width: 200 } }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        </>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ml: isMobile ? 0 : '0 !important',
        }}
      >
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: isMobile ? '100%' : 480,
            mx: 'auto',
            width: '100%',
            bgcolor: 'rgba(15, 10, 30, 0.92)',
            borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            backgroundImage: 'linear-gradient(180deg, rgba(20,10,40,0.3) 0%, rgba(15,10,30,0.95) 100%)',
          }}
        >
          {/* Top divider line */}
          <Box sx={{ height: 1, bgcolor: 'rgba(155, 127, 212, 0.15)' }} />
          <ChatPanel />
        </Box>
      </Box>
    </Box>
  );
};

export default MainPage;
