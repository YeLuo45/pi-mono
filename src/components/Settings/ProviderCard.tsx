/**
 * ProviderCard - Individual Provider Card Component for PixelPal V81
 * 
 * Displays provider status, model info, and quick actions.
 */

import React from 'react';
import { MyBox as Box, MyTypography as Typography, MyPaper as Paper, MyButton as Button, MyChip as Chip, MyStack as Stack, MyIconButton as IconButton, MyTooltip as Tooltip , MyCard as Card } from '../MUI替代';
import SettingsIcon from '@mui/icons-material/Settings';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { ProviderConfig } from '../../services/providers/types';

interface ProviderCardProps {
  providerId: string;
  providerName: string;
  providerIcon: string;
  providerDescription: string;
  status: 'connected' | 'error' | 'unconfigured';
  config?: ProviderConfig;
  isDefault: boolean;
  onConfigure: () => void;
  onSetDefault: () => void;
  onToggleEnabled: () => void;
  onTest: () => void;
  onDelete: () => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  providerId,
  providerName,
  providerIcon,
  providerDescription,
  status,
  config,
  isDefault,
  onConfigure,
  onSetDefault,
  onToggleEnabled,
  onTest,
  onDelete,
}) => {
  const statusConfig = {
    connected: { color: '#52c775', icon: <CheckCircleIcon sx={{ fontSize: 10 }} />, label: 'Connected' },
    error: { color: '#f26875', icon: <ErrorIcon sx={{ fontSize: 10 }} />, label: 'Error' },
    unconfigured: { color: '#62666d', icon: <RadioButtonUncheckedIcon sx={{ fontSize: 10 }} />, label: 'Not Configured' },
  };

  const currentStatus = statusConfig[status];

  return (
    <Paper
      sx={{
        p: 2,
        bgcolor: 'rgba(255,255,255,0.05)',
        borderRadius: 2,
        border: isDefault ? '1px solid rgba(94, 106, 210, 0.5)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Stack gap={2}>
        {/* Header Row */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" gap={1.5}>
            <Typography variant="h6" sx={{ fontSize: 20 }}>
              {providerIcon}
            </Typography>
            <Box>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {providerName}
                </Typography>
                {isDefault && (
                  <Chip
                    label="Default"
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      bgcolor: 'rgba(94, 106, 210, 0.2)',
                      color: '#7170ff',
                    }}
                  />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
                {providerDescription}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" gap={0.5}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                bgcolor: `${currentStatus.color}20`,
              }}
            >
              <Box sx={{ color: currentStatus.color }}>{currentStatus.icon}</Box>
              <Typography variant="caption" sx={{ color: currentStatus.color, fontSize: 11 }}>
                {currentStatus.label}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        {/* Model Info Row */}
        {config && (
          <Stack direction="row" alignItems="center" gap={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
              Model: <strong>{config.defaultModel || 'Not set'}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
              Temp: <strong>{config.temperature}</strong>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 12 }}>
              Max: <strong>{config.maxTokens}</strong>
            </Typography>
          </Stack>
        )}

        {/* Actions Row */}
        <Stack direction="row" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={onConfigure}
            startIcon={<SettingsIcon />}
            sx={{ fontSize: 12 }}
          >
            {config ? 'Configure' : 'Add API Key'}
          </Button>

          {!isDefault && status === 'connected' && (
            <Button
              variant="text"
              size="small"
              onClick={onSetDefault}
              sx={{ fontSize: 12 }}
            >
              Set as Default
            </Button>
          )}

          <Box sx={{ flex: 1 }} />

          {config && (
            <Tooltip title="Test Connection">
              <Button
                variant="text"
                size="small"
                onClick={onTest}
                sx={{ fontSize: 12, minWidth: 'auto', px: 1 }}
              >
                Test
              </Button>
            </Tooltip>
          )}

          {config && config.apiKey && (
            <Tooltip title="Remove Configuration">
              <IconButton size="small" onClick={onDelete}>
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default ProviderCard;
