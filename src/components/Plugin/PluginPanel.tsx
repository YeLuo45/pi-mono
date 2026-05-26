// PluginPanel — wrapper component that renders a plugin's panel by pluginId
import React from 'react';
import { MyTypography as Typography, MyIconButton as IconButton } from '../MUI替代';
import { Box } from '../ui/Box';
import { useTranslation } from 'react-i18next';
import { ArrowBack as ArrowBackIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { PluginService } from '../../services/plugin/PluginService';

interface PluginPanelProps {
  pluginId: string;
  onBack?: () => void;
  onSettings?: () => void;
}

export const PluginPanel: React.FC<PluginPanelProps> = ({ pluginId, onBack, onSettings }) => {
  const { t } = useTranslation();
  const plugin = PluginService.getPlugin(pluginId);

  if (!plugin) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('plugin.notFound')} "{pluginId}"
        </Typography>
      </Box>
    );
  }

  const PanelComponent = plugin.panel;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Plugin panel header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '1px solid rgba(155,127,212,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: 'rgba(155,127,212,0.04)',
        }}
      >
        {plugin.icon && (
          <Typography variant="h6" sx={{ fontSize: 16 }}>
            {plugin.icon}
          </Typography>
        )}
        <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>
          {plugin.name}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary', opacity: 0.6 }}>
          v{plugin.version}
        </Typography>
        {onBack && (
          <IconButton size="small" onClick={onBack} sx={{ ml: 0.5 }}>
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
        <IconButton size="small" onClick={onSettings} sx={{ ml: 0.5 }}>
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Plugin content */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {PanelComponent ? (
          <PanelComponent pluginId={pluginId} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
              {t('plugin.noPanelContent')}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PluginPanel;
