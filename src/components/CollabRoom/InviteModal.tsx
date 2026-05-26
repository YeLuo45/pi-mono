/**
 * InviteModal.tsx — V93 Multi-User Collaboration
 * 
 * Generates and shares invite links for collaboration rooms
 */

import React, { useState, useEffect } from 'react';
import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle } from '../MUI替代';
import { MyButton as Button, MyTextField as TextField, MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyTooltip as Tooltip, MyAlert as Alert, MyFade as Fade, MyChip as Chip } from '../MUI替代';
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Share as ShareIcon,
  Link as LinkIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { roomManager } from '../../services/room';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  roomId?: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({ open, onClose, roomId }) => {
  const { t } = useTranslation();
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const link = roomManager.generateInviteLink(roomId);
      if (link) {
        setInviteLink(link);
        setError(null);
      } else {
        setError(t('collabRoom.noRoom', 'No active room to generate invite link'));
      }
    }
  }, [open, roomId, t]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = inviteLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('collabRoom.inviteTitle', 'Join my PixelPal Collaboration Room'),
          text: t('collabRoom.inviteText', 'Join my collaboration room on PixelPal'),
          url: inviteLink,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback - just copy
      handleCopy();
    }
  };

  const handleNativeShare = () => {
    // Copy link for sharing via other means
    handleCopy();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth TransitionComponent={Fade}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinkIcon color="primary" />
          {t('collabRoom.inviteLink', 'Invite Link')}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('collabRoom.inviteHint', 'Share this link to invite others to join your collaboration room')}
            </Typography>

            {/* Invite Link Input */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                value={inviteLink}
                readOnly
                size="small"
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: 12 },
                }}
                sx={{ flex: 1 }}
              />
              <Tooltip title={copied ? t('collabRoom.copied', 'Copied!') : t('collabRoom.copy', 'Copy')}>
                <IconButton
                  onClick={handleCopy}
                  color={copied ? 'success' : 'primary'}
                  sx={{
                    bgcolor: copied ? 'success.main' : 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: copied ? 'success.dark' : 'primary.dark' },
                  }}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
              </Tooltip>
            </Box>

            {/* QR Code Placeholder */}
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1,
                }}
              >
                <QrCodeIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('collabRoom.qrHint', 'QR code for quick mobile access')}
              </Typography>
            </Box>

            {/* Info Chips */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={t('collabRoom.ownerOnly', 'Owner only')}
                sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
              />
              <Chip
                size="small"
                label={t('collabRoom.revokedAnytime', 'Can be revoked anytime')}
                sx={{ bgcolor: 'info.light', color: 'info.dark' }}
              />
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          {t('common.close', 'Close')}
        </Button>
        {'share' in navigator && (
          <Button onClick={handleShare} variant="contained" startIcon={<ShareIcon />}>
            {t('collabRoom.share', 'Share')}
          </Button>
        )}
        <Button onClick={handleNativeShare} variant="contained" startIcon={<CopyIcon />}>
          {t('collabRoom.copyLink', 'Copy Link')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
