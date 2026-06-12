import React, { useMemo, useState } from 'react';
import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyButton as Button, MyTextField as TextField, MyCircularProgress as CircularProgress, MyList as List, MyListItem as ListItem, MyListItemText as ListItemText, MyPaper as Paper, MyIconButton as IconButton, MyDivider as Divider, MyChip as Chip, MyAlert as Alert } from '../MUI替代';
import { useTranslation } from 'react-i18next';
import { Email as EmailIcon, Send as SendIcon, Refresh as RefreshIcon, ArrowBack } from '@mui/icons-material';
import { useStore } from '../../store';
import { sendGmailMessage, getGmailAuthUrl } from '../../services/email/gmailAdapter';
import { useGmailMessages } from '../../hooks/useGmailMessages';
import { useMacSplitStore } from '../../stores/macSplitStore';

interface EmailProps {
  splitLayout?: boolean;
}

export const Email: React.FC<EmailProps> = ({ splitLayout = false }) => {
  const { t } = useTranslation();
  const emailAccount = useStore((s) => s.emailAccount);
  const { messages, loading, error, setError, reload, isAuthenticated, accountEmail } = useGmailMessages();
  const emailMessageId = useMacSplitStore((s) => s.emailMessageId);
  const setEmailMessageId = useMacSplitStore((s) => s.setEmailMessageId);
  const selectedMessage = useMemo(
    () => messages.find((m) => m.id === emailMessageId) ?? null,
    [messages, emailMessageId],
  );
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  const handleGmailAuth = () => {
    if (!clientIdInput.trim()) {
      setError('Please enter your Gmail Client ID first in Settings or the field below.');
      return;
    }
    localStorage.setItem('pixelpal_gmail_client_id', clientIdInput.trim());
    const url = getGmailAuthUrl();
    window.open(url, '_blank', 'width=600,height=700');
  };

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject || !emailAccount?.accessToken) {
      setError('Please fill in all fields and ensure you are authenticated.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await sendGmailMessage(emailAccount.accessToken, composeData.to, composeData.subject, composeData.body);
      setComposeOpen(false);
      setComposeData({ to: '', subject: '', body: '' });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, gap: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
            📧 {t('email.title')}
          </Typography>
        </Box>
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
          <EmailIcon sx={{ fontSize: 40, opacity: 0.3, mb: 2 }} />
          <Typography variant="body2" sx={{ fontSize: 13, mb: 1 }}>
            {t('email.connect')}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mb: 2 }}>
            {t('email.clientIdHelp')}
            <br />
            {t('email.credentialsHint')}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={t('email.clientId')}
            value={clientIdInput}
            onChange={(e) => setClientIdInput(e.target.value)}
            placeholder={t('email.clientIdPlaceholder')}
            sx={{ mb: 2, '& .MuiInputBase-root': { fontSize: 12 } }}
            helperText={
              <Typography variant="caption" sx={{ fontSize: 10 }}>
                {t('email.clientIdHelp')}
              </Typography>
            }
          />
          <Button variant="contained" onClick={handleGmailAuth} fullWidth sx={{ fontSize: 12 }}>
            {t('email.connectButton')}
          </Button>
        </Paper>
        {error && <Alert severity="error" sx={{ fontSize: 12 }} onClose={() => setError('')}>{error}</Alert>}
      </Box>
    );
  }

  if (selectedMessage && (!splitLayout || emailMessageId)) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 1.5, borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: 1 }}>
          {!splitLayout && (
          <IconButton size="small" onClick={() => setEmailMessageId(null)}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          )}
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, flex: 1 }} noWrap>
            {selectedMessage.subject}
          </Typography>
        </Box>
        <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
          <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
            From: {selectedMessage.from.address}
          </Typography>
          <Divider sx={{ my: 1, opacity: 0.2 }} />
          <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {selectedMessage.body}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (splitLayout && !emailMessageId) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13, textAlign: 'center' }}>
          {t('email.selectMessage', '从列表中选择一封邮件')}
        </Typography>
        <Button
          size="small"
          variant="contained"
          startIcon={<SendIcon sx={{ fontSize: 14 }} />}
          onClick={() => setComposeOpen(true)}
          sx={{ mt: 2, fontSize: 11 }}
        >
          {t('email.compose')}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!splitLayout && (
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          📧 {t('email.title')}
        </Typography>
        {accountEmail && <Chip label={accountEmail} size="small" sx={{ fontSize: 10, height: 20 }} />}
        <IconButton size="small" onClick={reload} disabled={loading}>
          <RefreshIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <Button
          size="small"
          variant="contained"
          startIcon={<SendIcon sx={{ fontSize: 14 }} />}
          onClick={() => setComposeOpen(true)}
          sx={{ fontSize: 11 }}
        >
          {t('email.compose')}
        </Button>
      </Box>
      )}

      {error && <Alert severity="error" sx={{ m: 1, fontSize: 12 }} onClose={() => setError('')}>{error}</Alert>}

      {!splitLayout && (loading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <List dense disablePadding sx={{ flex: 1, overflow: 'auto' }}>
          {messages.map((msg) => (
            <ListItem
              key={msg.id}
              onClick={() => setEmailMessageId(msg.id)}
              sx={{
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                bgcolor: msg.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
              }}
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {!msg.read && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />}
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: msg.read ? 400 : 700 }} noWrap>
                      {msg.subject || '(No subject)'}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {msg.from.address} · {new Date(parseInt(msg.date)).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', display: 'block', mt: 0.3 }} noWrap>
                      {msg.snippet || msg.body.slice(0, 60)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: 13 }}>{t('email.noEmails')}</Typography>
            </Box>
          )}
        </List>
      ))}

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>{t('email.newEmail')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('email.to')}
              value={composeData.to}
              onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
              size="small"
              fullWidth
              autoFocus
            />
            <TextField
              label={t('email.subject')}
              value={composeData.subject}
              onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label={t('email.body')}
              value={composeData.body}
              onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
              size="small"
              fullWidth
              multiline
              rows={5}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setComposeOpen(false)} size="small">{t('common.cancel')}</Button>
          <Button
            onClick={handleSend}
            variant="contained"
            size="small"
            disabled={sending || !composeData.to || !composeData.subject}
            startIcon={sending ? <CircularProgress size={12} /> : <SendIcon sx={{ fontSize: 14 }} />}
          >
            {t('email.send')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Email;
