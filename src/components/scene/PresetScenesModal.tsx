import React from 'react';
import { useMediaQuery } from '../MUI替代/useMediaQuery';

import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle } from '../MUI替代';
import { MyButton as Button, MyBox as Box, MyTypography as Typography, MyGrid as Grid } from '../MUI替代';
import { PRESET_SCENES, type PresetScene } from '../../data/presetScenes';
import { useTranslation } from 'react-i18next';

interface PresetScenesModalProps {
  open: boolean;
  onClose: () => void;
  onAddPreset: (preset: PresetScene) => void;
}

export const PresetScenesModal: React.FC<PresetScenesModalProps> = ({ open, onClose, onAddPreset }) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 600px)');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {t('scene.selectPreset', '选择预设场景')}
      </DialogTitle>
      <DialogContent sx={{ overflowY: isMobile ? 'auto' : undefined }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          {t('scene.presetHint', '一键添加常用场景，后续可自行编辑')}
        </Typography>
        <Grid container spacing={2}>
          {PRESET_SCENES.map((preset) => (
            <Grid item xs={12} sm={6} key={preset.id}>
              <Box
                sx={{
                  p: 2,
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(155, 127, 212, 0.08)',
                  },
                }}
                onClick={() => {
                  onAddPreset(preset);
                  onClose();
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6">{preset.emoji}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {preset.name}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  {preset.description}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" fullWidth={isMobile}>
          {t('common.close', '关闭')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
