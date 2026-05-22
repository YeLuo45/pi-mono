// TelegramPlugin — Built-in Telegram bot plugin with polling/webhook support
import React, { useState, useEffect, useCallback } from 'react';
import { MyDialog, MyFormControlLabel } from '../../components/MUI替代';
import { MyBox, MyTypography, MyIconButton, MyButton, MyTextField, MyChip, MySwitch, MyCircularProgress, MyAlert } from '../../components/MUI替代';
import { Send as SendIcon, Refresh as RefreshIcon, Settings as SettingsIcon } from '@mui/icons-material';
import type { Plugin } from './types';
import { PluginService } from './PluginService';
import {
  getTelegramConfig,
  saveTelegramConfig,
  clearTelegramConfig,
  testTelegramConnection,
  startPolling,
  stopPolling,
  connectTelegramToStore,
  type TelegramConfig,
  type TelegramMessage,
} from '../platform/telegramAdapter';

const TELEGRAM_PLUGIN_CONFIG_KEY = 'pixelpal_telegram_plugin_config';

interface TelegramPluginConfig {
  enabled: boolean;
  botToken: string;
  webhookUrl: string;
  pollingEnabled: boolean;
  allowedChatIds: string[];
  autoReply: boolean;
}

const DEFAULT_TELEGRAM_CONFIG: TelegramPluginConfig = {
  enabled: false,
  botToken: '',
  webhookUrl: '',
  pollingEnabled: true,
  allowedChatIds: [],
  autoReply: false,
};

export const TelegramPluginPanel: React.FC<{ pluginId: string }> = ({ pluginId: _pluginId }) => {
  const [config, setConfig] = useState<TelegramPluginConfig>(() => {
    try {
      const stored = localStorage.getItem(TELEGRAM_PLUGIN_CONFIG_KEY);
      if (stored) {
        return { ...DEFAULT_TELEGRAM_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_TELEGRAM_CONFIG;
  });

  const [connected, setConnected] = useState(false);
  const [botInfo, setBotInfo] = useState<{ username?: string; first_name?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [botTokenInput, setBotTokenInput] = useState(config.botToken);
  const [webhookUrlInput, setWebhookUrlInput] = useState(config.webhookUrl);
  const [allowedChatsInput, setAllowedChatsInput] = useState(config.allowedChatIds.join(', '));

  const testConnection = useCallback(async (token: string) => {
    if (!token.trim()) return;
    
    setLoading(true);
    setError(null);
    setTestResult(null);

    const result = await testTelegramConnection(token);
    setTestResult(result);
    
    if (result.success && result.botInfo) {
      setBotInfo(result.botInfo);
      setConnected(true);
    } else {
      setError(result.message);
      setConnected(false);
    }

    setLoading(false);
  }, []);

  // Load config and test connection on mount
  useEffect(() => {
    const cfg = getTelegramConfig();
    if (cfg?.botToken) {
      testConnection(cfg.botToken);
    }
  }, [testConnection]);

  // Connect to Telegram when enabled
  useEffect(() => {
    if (!config.enabled || !config.botToken) {
      stopPolling();
      setConnected(false);
      return;
    }

    const cleanup = connectTelegramToStore(async (response, chatId) => {
      if (config.autoReply) {
        // Auto-reply is handled by the store + AI
      }
    });

    setConnected(true);

    return cleanup;
  }, [config.enabled, config.botToken]);

  const handleSaveConfig = async () => {
    const newConfig: TelegramPluginConfig = {
      ...config,
      botToken: botTokenInput.trim(),
      webhookUrl: webhookUrlInput.trim(),
      allowedChatIds: allowedChatsInput
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    };

    setConfig(newConfig);
    localStorage.setItem(TELEGRAM_PLUGIN_CONFIG_KEY, JSON.stringify(newConfig));

    // Save to telegram adapter
    if (botTokenInput.trim()) {
      const adapterConfig: TelegramConfig = {
        botToken: botTokenInput.trim(),
        webhookUrl: webhookUrlInput.trim(),
        pollingEnabled: newConfig.pollingEnabled,
        allowedChatIds: newConfig.allowedChatIds,
      };
      saveTelegramConfig(adapterConfig);

      // Test connection
      await testConnection(botTokenInput.trim());
    }

    setConfigDialogOpen(false);
    setSuccess('Configuration saved!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleToggleEnabled = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    localStorage.setItem(TELEGRAM_PLUGIN_CONFIG_KEY, JSON.stringify(newConfig));

    if (!newConfig.enabled) {
      stopPolling();
      setConnected(false);
    } else if (config.botToken) {
      testConnection(config.botToken);
    }
  };

  const handleClearConfig = () => {
    clearTelegramConfig();
    setConfig(DEFAULT_TELEGRAM_CONFIG);
    localStorage.removeItem(TELEGRAM_PLUGIN_CONFIG_KEY);
    setBotTokenInput('');
    setWebhookUrlInput('');
    setAllowedChatsInput('');
    setBotInfo(null);
    setConnected(false);
    setSuccess('Configuration cleared');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          📱 Telegram Integration
        </Typography>
        
        {connected && botInfo && (
          <Chip
            label={`@${botInfo.username}`}
            size="small"
            sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(76,175,80,0.2)', color: '#4CAF50' }}
          />
        )}
        
        {connected ? (
          <Chip
            label="Connected"
            size="small"
            sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(76,175,80,0.2)', color: '#4CAF50' }}
          />
        ) : (
          <Chip
            label="Disconnected"
            size="small"
            sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(244,67,54,0.2)', color: '#F44336' }}
          />
        )}

        <IconButton size="small" onClick={() => setConfigDialogOpen(true)}>
          <SettingsIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Status Content */}
      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: 12 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, fontSize: 12 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {!config.enabled && !loading && (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
            <Typography variant="body2" sx={{ fontSize: 13, mb: 2 }}>
              Telegram integration is disabled
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setConfigDialogOpen(true)}
              startIcon={<SettingsIcon />}
            >
              Configure Telegram
            </Button>
          </Box>
        )}

        {config.enabled && !connected && !loading && (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.6 }}>
            <Typography variant="body2" sx={{ fontSize: 13, mb: 2 }}>
              Not connected. Check your bot token.
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setConfigDialogOpen(true)}
              startIcon={<SettingsIcon />}
            >
              Update Configuration
            </Button>
          </Box>
        )}

        {config.enabled && connected && (
          <Box>
            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.enabled}
                    onChange={handleToggleEnabled}
                    size="small"
                  />
                }
                label="Enable Telegram"
                sx={{ mr: 1 }}
              />
            </Box>

            {botInfo && (
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 1, p: 2, mb: 2 }}>
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>
                  {botInfo.first_name}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                  @{botInfo.username}
                </Typography>
              </Box>
            )}

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mb: 1 }}>
                Setup Instructions:
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>
                1. Create a bot via @BotFather in Telegram
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>
                2. Get your bot token and configure it above
              </Typography>
              <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block' }}>
                3. Start a chat with your bot and send /start
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.pollingEnabled}
                    onChange={() => setConfig({ ...config, pollingEnabled: !config.pollingEnabled })}
                    size="small"
                  />
                }
                label="Polling Mode"
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
                {config.pollingEnabled ? 'Actively checking for messages' : 'Using webhook'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.autoReply}
                    onChange={() => setConfig({ ...config, autoReply: !config.autoReply })}
                    size="small"
                  />
                }
                label="Auto Reply"
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block' }}>
                {config.autoReply ? 'AI will respond to messages' : 'Manual response only'}
              </Typography>
            </Box>

            {config.allowedChatIds.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                  Allowed Chats:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                  {config.allowedChatIds.map((chatId) => (
                    <Chip
                      key={chatId}
                      label={chatId}
                      size="small"
                      sx={{ fontSize: 10, height: 18 }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Recent Messages */}
        {connected && messages.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, mb: 1, display: 'block' }}>
              Recent Messages:
            </Typography>
            {messages.slice(-5).map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  bgcolor: 'rgba(0,0,0,0.15)',
                  borderRadius: 1,
                  p: 1,
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                  {msg.from?.firstName || msg.from?.username || 'Unknown'}:
                </Typography>
                <Typography variant="caption" sx={{ fontSize: 11, display: 'block' }}>
                  {msg.text.slice(0, 100)}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>
          📱 Telegram Configuration
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 11 }}>
              Create a bot via @BotFather in Telegram and paste your token below.
            </Alert>

            <TextField
              label="Bot Token"
              value={botTokenInput}
              onChange={(e) => setBotTokenInput(e.target.value)}
              size="small"
              fullWidth
              placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxYZ"
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => testConnection(botTokenInput)}
              disabled={!botTokenInput.trim() || loading}
              startIcon={loading ? <CircularProgress size={14} /> : <RefreshIcon />}
            >
              Test Connection
            </Button>

            {testResult && (
              <Alert severity={testResult.success ? 'success' : 'error'} sx={{ fontSize: 11 }}>
                {testResult.message}
              </Alert>
            )}

            <TextField
              label="Webhook URL (optional)"
              value={webhookUrlInput}
              onChange={(e) => setWebhookUrlInput(e.target.value)}
              size="small"
              fullWidth
              placeholder="https://your-server.com/webhook"
              helperText="Required for webhook mode"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.pollingEnabled}
                  onChange={() => setConfig({ ...config, pollingEnabled: !config.pollingEnabled })}
                  size="small"
                />
              }
              label="Polling Mode (recommended)"
            />

            <TextField
              label="Allowed Chat IDs (optional)"
              value={allowedChatsInput}
              onChange={(e) => setAllowedChatsInput(e.target.value)}
              size="small"
              fullWidth
              placeholder="123456789, 987654321"
              helperText="Comma-separated chat IDs for security"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.autoReply}
                  onChange={() => setConfig({ ...config, autoReply: !config.autoReply })}
                  size="small"
                />
              }
              label="Auto Reply via AI"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button size="small" onClick={handleClearConfig} color="error">
            Clear
          </Button>
          <Button size="small" onClick={() => setConfigDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveConfig} variant="contained" size="small" disabled={!botTokenInput.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// AI tools for Telegram integration
const handleTelegramMessageTool = async (args: unknown): Promise<unknown> => {
  const { action, chat_id, text } = args as { action?: string; chat_id?: string; text?: string };
  
  const config = getTelegramConfig();
  if (!config) {
    return { success: false, error: 'Telegram not configured' };
  }

  if (action === 'send') {
    if (!chat_id || !text) {
      return { success: false, error: 'chat_id and text required' };
    }
    
    const { sendMessage } = await import('../platform/telegramAdapter');
    const result = await sendMessage(config, { chatId: chat_id, text });
    return { success: true, message_id: result.messageId };
  }

  return { success: false, error: 'Unknown action' };
};

export const telegramPlugin: Plugin = {
  id: 'telegram',
  name: 'Telegram',
  version: '1.0.0',
  icon: '📱',
  panel: TelegramPluginPanel,
  capabilities: [
    { type: 'panel' },
    { type: 'ai_tool', name: 'telegram_message' },
  ],

  onInit() {
    PluginService.registerTool('telegram', 'telegram_message', handleTelegramMessageTool);
  },
};
