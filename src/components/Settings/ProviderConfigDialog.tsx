/**
 * ProviderConfigDialog - Configuration Dialog for PixelPal V81
 * 
 * Allows users to configure API key, model, and other settings for a provider.
 */

import React, { useState, useEffect } from 'react';
import { MyDialog as Dialog , MyBox as Box, MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../MUI替代';
import { MyButton as Button, MyTextField as TextField, MySelect as Select, MyStack as Stack, MyTypography, MyIconButton as IconButton, MyAlert as Alert, MyCircularProgress as CircularProgress } from '../MUI替代';
import CloseIcon from '@mui/icons-material/Close';
import type { ProviderConfig } from '../../services/providers/types';
import { DEFAULT_PROVIDERS, PROVIDER_BASE_URLS, getProviderDefinition } from '../../data/defaultProviders';
import { providerManager } from '../../services/providers/providerManager';

interface ProviderConfigDialogProps {
  open: boolean;
  providerId: string;
  config?: ProviderConfig;
  onClose: () => void;
  onSave: (providerId: string, config: ProviderConfig) => void;
}

export const ProviderConfigDialog: React.FC<ProviderConfigDialogProps> = ({
  open,
  providerId,
  config,
  onClose,
  onSave,
}) => {
  const providerDef = getProviderDefinition(providerId);

  const [formData, setFormData] = useState({
    apiKey: '',
    baseUrl: '',
    defaultModel: '',
    temperature: 0.7,
    maxTokens: 4096,
    enabled: true,
  });

  const [testStatus, setTestStatus] = useState<{ loading: boolean; success?: boolean; message: string } | null>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        apiKey: config.apiKey || '',
        baseUrl: config.baseUrl || '',
        defaultModel: config.defaultModel || providerDef?.defaultModel || '',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 4096,
        enabled: config.enabled ?? true,
      });
    } else {
      setFormData({
        apiKey: '',
        baseUrl: providerDef?.id === 'ollama' ? 'http://localhost:11434/v1' : PROVIDER_BASE_URLS[providerId] || '',
        defaultModel: providerDef?.defaultModel || '',
        temperature: 0.7,
        maxTokens: 4096,
        enabled: true,
      });
    }
    setTestStatus(null);
  }, [open, providerId, config, providerDef]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTest = async () => {
    setTestStatus({ loading: true, message: 'Testing connection...' });

    try {
      // Save temp config for testing
      const tempConfig: ProviderConfig = {
        id: providerId,
        apiKey: formData.apiKey,
        baseUrl: formData.baseUrl,
        defaultModel: formData.defaultModel,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        enabled: true,
      };

      // Initialize the provider with temp config
      let provider;
      switch (providerId) {
        case 'openai':
          const { createOpenAIProvider } = await import('../../services/providers/openaiProvider');
          provider = createOpenAIProvider({ apiKey: formData.apiKey, baseUrl: formData.baseUrl, defaultModel: formData.defaultModel });
          break;
        case 'anthropic':
          const { createAnthropicProvider } = await import('../../services/providers/anthropicProvider');
          provider = createAnthropicProvider({ apiKey: formData.apiKey, defaultModel: formData.defaultModel });
          break;
        case 'gemini':
          const { createGeminiProvider } = await import('../../services/providers/geminiProvider');
          provider = createGeminiProvider({ apiKey: formData.apiKey, defaultModel: formData.defaultModel });
          break;
        case 'siliconflow':
          const { createSiliconFlowProvider } = await import('../../services/providers/siliconFlowProvider');
          provider = createSiliconFlowProvider({ apiKey: formData.apiKey, baseUrl: formData.baseUrl, defaultModel: formData.defaultModel });
          break;
        case 'ollama':
          const { createOllamaProvider } = await import('../../services/providers/ollamaProvider');
          provider = createOllamaProvider({ baseUrl: formData.baseUrl, defaultModel: formData.defaultModel });
          break;
        default:
          const { createCustomProvider } = await import('../../services/providers/customProvider');
          provider = createCustomProvider({ id: providerId, name: providerDef?.name || 'Custom', baseUrl: formData.baseUrl, apiKey: formData.apiKey, defaultModel: formData.defaultModel });
      }

      const connected = await providerManager.ping(providerId);
      setTestStatus({
        loading: false,
        success: connected,
        message: connected ? 'Connection successful!' : 'Connection failed',
      });
    } catch (error) {
      setTestStatus({
        loading: false,
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  };

  const handleSave = () => {
    const saveConfig: ProviderConfig = {
      id: providerId,
      apiKey: formData.apiKey,
      baseUrl: formData.baseUrl,
      defaultModel: formData.defaultModel,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
      enabled: formData.enabled,
    };
    onSave(providerId, saveConfig);
    onClose();
  };

  const models = providerDef?.models || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <span>{providerDef?.icon}</span>
          <span>Configure {providerDef?.name || 'Provider'}</span>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack gap={2} sx={{ mt: 1 }}>
          {/* API Key */}
          <TextField
            label="API Key"
            type="password"
            value={formData.apiKey}
            onChange={(e) => handleChange('apiKey', e.target.value)}
            fullWidth
            placeholder={providerId === 'ollama' ? 'Not required for local Ollama' : 'Enter your API key'}
            helperText={providerId === 'ollama' ? 'Ollama does not require an API key' : ''}
          />

          {/* Base URL */}
          <TextField
            label="Base URL"
            value={formData.baseUrl}
            onChange={(e) => handleChange('baseUrl', e.target.value)}
            fullWidth
            placeholder="https://api.openai.com/v1"
            helperText="Leave empty for default or enter custom endpoint"
          />

          {/* Default Model */}
          <FormControl fullWidth>
            <InputLabel>Default Model</InputLabel>
            <Select
              value={formData.defaultModel}
              label="Default Model"
              onChange={(e) => handleChange('defaultModel', e.target.value)}
            >
              {models.length > 0 ? (
                models.map((model) => (
                  <MenuItem key={model} value={model}>
                    {model}
                  </MenuItem>
                ))
              ) : (
                <MenuItem value="">
                  <em>Enter model name manually</em>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Custom Model Name (when no predefined models) */}
          {models.length === 0 && (
            <TextField
              label="Model Name"
              value={formData.defaultModel}
              onChange={(e) => handleChange('defaultModel', e.target.value)}
              fullWidth
              placeholder="e.g., gpt-4o, claude-3-5-sonnet"
            />
          )}

          {/* Temperature */}
          <TextField
            label="Temperature"
            type="number"
            value={formData.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            fullWidth
            inputProps={{ min: 0, max: 2, step: 0.1 }}
            helperText="Higher = more creative, Lower = more deterministic (0-2)"
          />

          {/* Max Tokens */}
          <TextField
            label="Max Tokens"
            type="number"
            value={formData.maxTokens}
            onChange={(e) => handleChange('maxTokens', parseInt(e.target.value) || 4096)}
            fullWidth
            inputProps={{ min: 1, max: 128000 }}
          />

          {/* Test Result */}
          {testStatus && (
            <Alert severity={testStatus.success === false ? 'error' : testStatus.success === true ? 'success' : 'info'}>
              {testStatus.loading && <CircularProgress size={16} sx={{ mr: 1 }} />}
              {testStatus.message}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={testStatus?.loading}
        >
          Test Connection
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!formData.defaultModel}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProviderConfigDialog;
