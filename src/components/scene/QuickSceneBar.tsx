import React, { useState } from 'react';
import { useMediaQuery } from '../MUI替代/useMediaQuery';
import { MyIconButton, MyChip, MyTypography, MyDrawer } from '../MUI替代';
import { Box } from '../ui/Box';
import { Bolt as BoltIcon, Close as CloseIcon } from '@mui/icons-material';
import { useSceneStore } from '../../stores/sceneStore';
import { executeScene } from '../../utils/sceneScheduler';
import { useTranslation } from 'react-i18next';

interface QuickSceneBarProps {
  onClose?: () => void;
}

export const QuickSceneBar: React.FC<QuickSceneBarProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const scenes = useSceneStore((s) => s.scenes);
  const quickScenes = scenes.filter((s) => s.enabled && s.isQuick);
  const isMobile = useMediaQuery('(max-width: 600px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (quickScenes.length === 0) return null;

  // Mobile: FAB that opens a bottom sheet drawer
  if (isMobile) {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 1200,
          }}
        >
          <IconButton
            onClick={() => setDrawerOpen(true)}
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: 3,
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <BoltIcon />
          </IconButton>
        </Box>
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              bgcolor: 'background.paper',
              pb: 2,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, pb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t('scene.quickScenes', '快捷场景')}
            </Typography>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, px: 2 }}>
            {quickScenes.map((scene) => (
              <Chip
                key={scene.id}
                icon={<BoltIcon sx={{ fontSize: 18 }} />}
                label={scene.name}
                onClick={() => {
                  executeScene(scene);
                  setDrawerOpen(false);
                }}
                sx={{
                  py: 2.5,
                  fontSize: 15,
                  bgcolor: 'rgba(155, 127, 212, 0.15)',
                  border: '1px solid rgba(155, 127, 212, 0.3)',
                  cursor: 'pointer',
                  '&:active': { bgcolor: 'rgba(155, 127, 212, 0.3)' },
                }}
              />
            ))}
          </Box>
        </Drawer>
      </>
    );
  }

  // Desktop: floating pill bar on the right
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 1,
        zIndex: 1200,
      }}
    >
      {onClose && (
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            bgcolor: 'rgba(0,0,0,0.4)',
            width: 32,
            height: 32,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      {quickScenes.map((scene) => (
        <Chip
          key={scene.id}
          icon={<BoltIcon sx={{ fontSize: 16 }} />}
          label={scene.name}
          onClick={() => executeScene(scene)}
          sx={{
            bgcolor: 'rgba(155, 127, 212, 0.2)',
            border: '1px solid rgba(155, 127, 212, 0.4)',
            color: 'primary.light',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'rgba(155, 127, 212, 0.35)' },
          }}
        />
      ))}
    </Box>
  );
};
