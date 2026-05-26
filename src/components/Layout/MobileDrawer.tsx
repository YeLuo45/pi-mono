import React, { useRef, useEffect, useState } from 'react';
import { MyIconButton as IconButton, MyTypography, MyDrawer as Drawer } from '../MUI替代';
import { Box } from '../ui/Box';
import { Close as CloseIcon } from '@mui/icons-material';
import { Sidebar } from './Sidebar';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ open, onClose, onOpen }) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(open);

  useEffect(() => {
    setDrawerOpen(open);
  }, [open]);

  // Swipe right to open drawer
  useSwipeGesture(drawerRef, {
    threshold: 80,
    onSwipeRight: () => {
      if (!open) {
        onOpen?.();
      }
    },
    onSwipeLeft: () => {
      if (open) {
        onClose();
      }
    },
  });

  return (
    <>
      {/* Swipe trigger area on the left edge */}
      <Box
        ref={drawerRef}
        onClick={() => {
          if (!open) onOpen?.();
        }}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 20,
          height: '100%',
          zIndex: 1100,
          // Invisible touch target on left edge
        }}
      />

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        variant="temporary"
        sx={{
          '& .MuiDrawer-paper': {
            bgcolor: '#0f1011',
            border: '1px solid rgba(255,255,255,0.05)',
            width: 260,
            pt: 2,
            touchAction: 'none',
          },
        }}
      >
        {/* Close button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, mb: 1 }}>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: 'var(--color-text-secondary, #d0d6e0)' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Sidebar onNavigate={onClose} />
      </Drawer>
    </>
  );
};

export default MobileDrawer;
