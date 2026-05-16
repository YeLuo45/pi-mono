/**
 * BotChannelsSettings
 * V102: Settings panel for Telegram and Discord bot configurations
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Paper,
  Stack, Switch, Collapse, IconButton,
} from '@mui/material';
import {
  Send as TelegramIcon,
  Games as DiscordIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Visibility, VisibilityOff,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { botConfigManager, type BotChannelConfig } from '../../services/bus/BotConfigManager';

/** Individual channel config row */
const ChannelConfigRow: React.FC<{
  channel: 'telegram' | 'discord';
  icon: React.ReactNode;
  label: string;
  config: BotChannelConfig;
  onUpdate: (updates: Partial<BotChannelConfig>) => void;
}> = ({ channel, icon, label, config, onUpdate }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [localToken, setLocalToken] = useState(config.token);

  useEffect(() => {
    setLocalToken(config.token);
  }, [config.token]);

  const handleSaveToken = () => {
    onUpdate({ token: localToken });
  };

  return (
    <Paper
      sx={{
        p: 1.5,
        bgcolor: 'rgba(255,255,255,0.03)',
        borderRadius: 1.5,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ fontSize: 18 }}>{icon}</Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 500 }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
            {config.enabled ? '✅ Connected' : 'Disabled'}
          </Typography>
        </Box>
        <Switch
          size="small"
          checked={config.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
        />
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ p: 0.5 }}
        >
          {expanded ? <CollapseIcon sx={{ fontSize: 16 }} /> : <ExpandIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {/* Expanded settings */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 1.5, pl: 4 }}>
          {/* Token input */}
          <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, display: 'block' }}>
              Bot Token
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                type={showToken ? 'text' : 'password'}
                placeholder={channel === 'telegram' ? '123456789:ABCdefGHI...' : 'MTIz...'}
                value={localToken}
                onChange={(e) => setLocalToken(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': { fontSize: 11, py: 0.75, px: 1 },
                }}
              />
              <IconButton
                size="small"
                onClick={() => setShowToken(!showToken)}
                sx={{ p: 0.5 }}
              >
                {showToken ? <VisibilityOff sx={{ fontSize: 16 }} /> : <Visibility sx={{ fontSize: 16 }} />}
              </IconButton>
            </Box>
          </Box>

          {/* Save button */}
          <Button
            size="small"
            variant="outlined"
            onClick={handleSaveToken}
            disabled={!localToken || localToken === config.token}
            sx={{ fontSize: 10, py: 0.5 }}
          >
            {t('settings.save', 'Save')}
          </Button>

          {/* Info note */}
          <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', display: 'block', mt: 1 }}>
            {channel === 'telegram'
              ? 'Get token from @BotFather'
              : 'Get token from Discord Developer Portal'}
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
};

/** Main component */
export const BotChannelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState(botConfigManager.getConfig());

  useEffect(() => {
    return botConfigManager.subscribe((newConfig) => {
      setConfig(newConfig);
    });
  }, []);

  const handleUpdate = (channel: 'telegram' | 'discord', updates: Partial<BotChannelConfig>) => {
    botConfigManager.updateChannel(channel, updates);
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600, mb: 1.5 }}>
        📡 Bot Channels
      </Typography>
      <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled', mb: 2, display: 'block' }}>
        Connect Telegram or Discord bots to chat via those channels
      </Typography>

      <Stack gap={1}>
        <ChannelConfigRow
          channel="telegram"
          icon={<TelegramIcon sx={{ fontSize: 18, color: '#229ED9' }} />}
          label="Telegram Bot"
          config={config.telegram}
          onUpdate={(u) => handleUpdate('telegram', u)}
        />
        <ChannelConfigRow
          channel="discord"
          icon={<DiscordIcon sx={{ fontSize: 18, color: '#5865F2' }} />}
          label="Discord Bot"
          config={config.discord}
          onUpdate={(u) => handleUpdate('discord', u)}
        />
      </Stack>

      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.disabled', display: 'block', mt: 1.5 }}>
        ⚠️ Bot tokens are stored locally. Phase 2 enables actual bot connections.
      </Typography>
    </Box>
  );
};