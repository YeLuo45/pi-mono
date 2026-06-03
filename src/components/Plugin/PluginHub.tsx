// PluginHub — landing page listing all registered plugin panels + install/uninstall
import React from 'react';
import { MyTypography as Typography, MyCardActionArea as CardActionArea, MyCard as Card, MyDivider as Divider, MyButton as Button, MyChip as Chip , MyCardContent as CardContent } from '../MUI替代';
import { Box } from '../ui/Box';
import { Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { PluginService } from '../../services/plugin/PluginService';
import { useStore } from '../../store';
import { ALL_PLUGINS, BUILTIN_PLUGIN_IDS, installPlugin } from '../../plugins';

export const PluginHub: React.FC<{ splitLayout?: boolean }> = ({ splitLayout = false }) => {
  const { t } = useTranslation();
  const setActivePluginId = useStore((s) => s.setActivePluginId);
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);

  const panelPlugins = PluginService.listPlugins().filter((p) =>
    p.capabilities.some((c) => c.type === 'panel')
  );

  const aiToolPlugins = PluginService.listPlugins().filter((p) =>
    p.capabilities.some((c) => c.type === 'ai_tool')
  );

  const allPlugins = PluginService.listPlugins();

  // Get installed plugin IDs from localStorage
  const getInstalledIds = (): string[] => {
    try {
      const stored = localStorage.getItem('pixelpal_installed_plugins');
      if (stored) return JSON.parse(stored);
    } catch {}
    return BUILTIN_PLUGIN_IDS;
  };

  const installedIds = getInstalledIds();

  // Available plugins not yet installed
  const availablePlugins = ALL_PLUGINS.filter((p) => !installedIds.includes(p.id));

  const handleInstall = (pluginId: string) => {
    installPlugin(pluginId);
    forceUpdate();
  };

  if (splitLayout) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {t('plugin.clickToOpen', '从左侧列表选择插件')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(155,127,212,0.2)', bgcolor: 'rgba(155,127,212,0.04)' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          🧩 {t('plugin.hub')}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
          {allPlugins.length} {t('plugin.registered', { count: allPlugins.length })} · {t('plugin.clickToOpen')}
        </Typography>
      </Box>

      {/* Installed Panel plugins */}
      {panelPlugins.length > 0 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
            {t('plugin.appPanels')}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
            {panelPlugins.map((plugin) => {
              const isBuiltin = BUILTIN_PLUGIN_IDS.includes(plugin.id);
              return (
                <Card
                  key={plugin.id}
                  sx={{ bgcolor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => setActivePluginId(plugin.id)}
                >
                  <CardActionArea sx={{ p: 1.5 }}>
                    <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                      {plugin.icon && (
                        <Typography variant="h6" sx={{ fontSize: 24, mb: 0.5 }}>
                          {plugin.icon}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                          {plugin.name}
                        </Typography>
                        {isBuiltin && (
                          <Chip label="Built-in" size="small" sx={{ height: 14, fontSize: 8, bgcolor: 'rgba(155,127,212,0.2)' }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                        v{plugin.version}
                      </Typography>
                      <Divider sx={{ my: 0.75 }} />
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {plugin.capabilities.map((cap, i) => (
                          <Box
                            key={i}
                            sx={{
                              px: 0.5,
                              py: 0.1,
                              borderRadius: 0.5,
                              bgcolor: cap.type === 'panel'
                                ? 'rgba(155,127,212,0.15)'
                                : cap.type === 'ai_tool'
                                ? 'rgba(76,175,80,0.15)'
                                : 'rgba(255,152,0,0.15)',
                            }}
                          >
                            <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary' }}>
                              {cap.type === 'ai_tool' ? `🤖 ${cap.name}` : cap.type === 'panel' ? '📱 panel' : `⚡ ${cap.event}`}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}

      {/* AI-only plugins */}
      {aiToolPlugins.length > panelPlugins.length && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
            {t('plugin.aiTools')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {aiToolPlugins
              .filter((p) => !p.capabilities.some((c) => c.type === 'panel'))
              .map((plugin) => {
                const isBuiltin = BUILTIN_PLUGIN_IDS.includes(plugin.id);
                return (
                  <Card
                    key={plugin.id}
                    sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {plugin.icon && <Typography variant="body2" sx={{ fontSize: 14 }}>{plugin.icon}</Typography>}
                        <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
                          {plugin.name}
                        </Typography>
                        {isBuiltin && (
                          <Chip label="Built-in" size="small" sx={{ height: 14, fontSize: 8, bgcolor: 'rgba(155,127,212,0.2)' }} />
                        )}
                        <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                          v{plugin.version}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
          </Box>
        </Box>
      )}

      {/* Available Plugins to Install */}
      {availablePlugins.length > 0 && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Divider sx={{ opacity: 0.1, mb: 2 }} />
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1, display: 'block' }}>
            {t('plugin.availablePlugins') || 'Available Plugins'}
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1.5 }}>
            {availablePlugins.map((plugin) => (
              <Card
                key={plugin.id}
                sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}
              >
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  {plugin.icon && (
                    <Typography variant="h6" sx={{ fontSize: 24, mb: 0.5 }}>
                      {plugin.icon}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {plugin.name}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                    v{plugin.version}
                  </Typography>
                  <Divider sx={{ my: 0.75 }} />
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                    {plugin.capabilities.map((cap, i) => (
                      <Box
                        key={i}
                        sx={{
                          px: 0.5,
                          py: 0.1,
                          borderRadius: 0.5,
                          bgcolor: cap.type === 'panel'
                            ? 'rgba(155,127,212,0.15)'
                            : cap.type === 'ai_tool'
                            ? 'rgba(76,175,80,0.15)'
                            : 'rgba(255,152,0,0.15)',
                        }}
                      >
                        <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary' }}>
                          {cap.type === 'ai_tool' ? `🤖 ${cap.name}` : cap.type === 'panel' ? '📱 panel' : `⚡ ${cap.event}`}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                    onClick={() => handleInstall(plugin.id)}
                    fullWidth
                    sx={{ fontSize: 10 }}
                  >
                    Install
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {allPlugins.length === 0 && availablePlugins.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 6, opacity: 0.5 }}>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {t('plugin.noPlugins')}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PluginHub;
