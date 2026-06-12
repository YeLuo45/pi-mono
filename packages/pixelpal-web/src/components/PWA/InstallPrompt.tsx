import React, { useState, useEffect } from 'react';
import { MyButton as Button, MyTypography as Typography, MyPaper as Paper, MyIconButton as IconButton } from '../MUI替代';
import { Box } from '../ui/Box';
import { Close as CloseIcon, GetApp as GetAppIcon } from '@mui/icons-material';

export interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({
  onInstall,
  onDismiss,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    (deferredPrompt as any).prompt();

    // Wait for the user's response
    const { outcome } = await (deferredPrompt as any).userChoice;

    if (outcome === 'accepted') {
      onInstall?.();
    }

    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        p: 2,
        pr: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        maxWidth: 400,
        width: 'calc(100% - 32px)',
        zIndex: 9999,
        borderRadius: 2,
      }}
    >
      <GetAppIcon sx={{ color: 'primary.main', fontSize: 32 }} />

      <Box sx={{ flex: 1 }}>
        <Typography variant="subtitle2" fontWeight={600}>
          Install PixelPal
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Add to home screen for the best experience
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="small"
        onClick={handleInstall}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Install
      </Button>

      <IconButton size="small" onClick={handleDismiss} sx={{ ml: 0.5 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};

// Hook for managing PWA install prompt
export function usePWAInstall() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return {
    isInstallable,
    isInstalled,
  };
}

export default InstallPrompt;
