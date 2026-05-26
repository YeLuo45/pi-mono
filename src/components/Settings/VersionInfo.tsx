import React from 'react';
import { MyTypography as Typography, MyButton as Button, MyStack as Stack, MyChip as Chip } from '../MUI替代';
import { Box } from '../ui/Box';
import { Update as UpdateIcon } from '@mui/icons-material';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.0.0';
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || '';

const formatDate = (isoString: string): string => {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return isoString;
  }
};

const formatDateTime = (isoString: string): string => {
  if (!isoString) return 'Unknown';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const VersionInfo: React.FC = () => {
  const handleCheckUpdate = () => {
    window.open('https://github.com/your-repo/pixel-pal-web/releases', '_blank');
  };

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <Typography variant="subtitle2" sx={{ fontSize: 12, fontWeight: 600, mb: 1.5, color: 'text.secondary' }}>
        Version Information
      </Typography>

      <Stack gap={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', minWidth: 90 }}>
            Current:
          </Typography>
          <Chip
            label={`V${APP_VERSION}`}
            size="small"
            sx={{
              fontSize: 11,
              fontWeight: 600,
              height: 20,
              bgcolor: 'rgba(139, 92, 246, 0.2)',
              color: '#a78bfa',
            }}
          />
          <Typography variant="body2" sx={{ fontSize: 11, color: 'text.disabled' }}>
            ({formatDate(BUILD_TIME)})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', minWidth: 90 }}>
            Build Time:
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.disabled' }}>
            {formatDateTime(BUILD_TIME)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontSize: 12, color: 'text.secondary', minWidth: 90 }}>
            Latest:
          </Typography>
          <Chip
            label={`V${APP_VERSION}`}
            size="small"
            sx={{
              fontSize: 11,
              height: 20,
              bgcolor: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
            }}
          />
        </Box>

        <Button
          size="small"
          startIcon={<UpdateIcon sx={{ fontSize: 14 }} />}
          onClick={handleCheckUpdate}
          sx={{
            mt: 0.5,
            fontSize: 11,
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' },
          }}
        >
          Check for Updates
        </Button>
      </Stack>
    </Box>
  );
};

export default VersionInfo;
