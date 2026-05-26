/**
 * ProvidersPage - AI Providers Settings Page for PixelPal V81
 * 
 * Displays all available providers and their configuration status.
 */

import React, { useState, useEffect } from 'react';
import { MyTypography as Typography, MyPaper as Paper, MyButton, MySelect as Select, MyStack as Stack, MyAlert , MyDialog as Dialog, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../components/MUI替代';
import { Box } from '../components/ui/Box';
import AddIcon from '@mui/icons-material/Add';
import { providerManager, DEFAULT_PROVIDERS } from '../services/providers';
import type { ProviderConfig } from '../services/providers/types';
import { ProviderCard } from '../components/Settings/ProviderCard';
import { ProviderConfigDialog } from '../components/Settings/ProviderConfigDialog';

export const ProvidersPage: React.FC = () => {
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>({});
  const [defaultProviderId, setDefaultProviderId] = useState('openai');
  const [fallbackOrder, setFallbackOrder] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, 'connected' | 'error' | 'unconfigured'>>({});

  // Load configurations on mount
  useEffect(() => {
    const loadedConfigs = providerManager.getAllConfigs();
    setConfigs(loadedConfigs);
    setDefaultProviderId(providerManager.getDefaultId());
    setFallbackOrder(providerManager.getFallbackOrder());

    // Initialize statuses from configs
    const statuses: Record<string, 'connected' | 'error' | 'unconfigured'> = {};
    DEFAULT_PROVIDERS.forEach(p => {
      const config = loadedConfigs[p.id];
      if (config?.enabled && config?.apiKey) {
        statuses[p.id] = 'connected';
      } else if (config?.apiKey) {
        statuses[p.id] = 'error';
      } else {
        statuses[p.id] = 'unconfigured';
      }
    });
    setProviderStatuses(statuses);
  }, []);

  const handleOpenAddDialog = (providerId: string) => {
    setEditingProviderId(providerId);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (providerId: string) => {
    setEditingProviderId(providerId);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProviderId(null);
  };

  const handleSaveConfig = (providerId: string, config: ProviderConfig) => {
    providerManager.setConfig(providerId, config);
    setConfigs({ ...configs, [providerId]: config });

    // Update status
    if (config.enabled && config.apiKey) {
      setProviderStatuses(prev => ({ ...prev, [providerId]: 'connected' }));
    } else {
      setProviderStatuses(prev => ({ ...prev, [providerId]: 'unconfigured' }));
    }
  };

  const handleDeleteConfig = (providerId: string) => {
    providerManager.removeConfig(providerId);
    const newConfigs = { ...configs };
    delete newConfigs[providerId];
    setConfigs(newConfigs);
    setProviderStatuses(prev => ({ ...prev, [providerId]: 'unconfigured' }));
  };

  const handleSetDefault = (providerId: string) => {
    providerManager.setDefault(providerId);
    setDefaultProviderId(providerId);
  };

  const handleToggleEnabled = (providerId: string) => {
    const config = configs[providerId];
    if (config) {
      const updated = { ...config, enabled: !config.enabled };
      handleSaveConfig(providerId, updated);
    }
  };

  const handleTestProvider = async (providerId: string) => {
    try {
      const connected = await providerManager.ping(providerId);
      setProviderStatuses(prev => ({ ...prev, [providerId]: connected ? 'connected' : 'error' }));
    } catch {
      setProviderStatuses(prev => ({ ...prev, [providerId]: 'error' }));
    }
  };

  const availableProviders = DEFAULT_PROVIDERS.filter(p => p.id !== 'custom');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          🤖 AI Providers
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Default Provider Selector */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 2 }}>
            Default Provider
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Provider</InputLabel>
            <Select
              value={defaultProviderId}
              label="Provider"
              onChange={(e) => handleSetDefault(e.target.value)}
            >
              {availableProviders.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>

        {/* Provider Cards */}
        <Stack gap={2}>
          {availableProviders.map(provider => {
            const config = configs[provider.id];
            return (
              <ProviderCard
                key={provider.id}
                providerId={provider.id}
                providerName={provider.name}
                providerIcon={provider.icon}
                providerDescription={provider.description}
                status={providerStatuses[provider.id] || 'unconfigured'}
                config={config}
                isDefault={defaultProviderId === provider.id}
                onConfigure={() => handleOpenEditDialog(provider.id)}
                onSetDefault={() => handleSetDefault(provider.id)}
                onToggleEnabled={() => handleToggleEnabled(provider.id)}
                onTest={() => handleTestProvider(provider.id)}
                onDelete={() => handleDeleteConfig(provider.id)}
              />
            );
          })}

          {/* Add Custom Provider */}
          <Paper
            sx={{
              p: 2,
              bgcolor: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
              border: '1px dashed rgba(255,255,255,0.15)',
              cursor: 'pointer',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
            onClick={() => handleOpenAddDialog('custom')}
          >
            <Stack direction="row" alignItems="center" gap={1}>
              <AddIcon sx={{ color: 'text.secondary' }} />
              <Typography sx={{ color: 'text.secondary' }}>
                Add Custom Provider
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      {/* Config Dialog */}
      <ProviderConfigDialog
        open={dialogOpen}
        providerId={editingProviderId || 'custom'}
        config={editingProviderId ? configs[editingProviderId] : undefined}
        onClose={handleCloseDialog}
        onSave={handleSaveConfig}
      />
    </Box>
  );
};

export default ProvidersPage;
