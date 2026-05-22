import React, { useState, useEffect, useCallback } from 'react';
import { MyDialog } from '../MUI替代';
import { MyBox, MyTypography, MyButton, MyTextField, MyCircularProgress, MyList, MyListItem, MyListItemText, MyPaper, MyIconButton, MyDivider, MyChip, MyAlert } from '../MUI替代';
import { useTranslation } from 'react-i18next';
import { Email as EmailIcon, Send as SendIcon, Refresh as RefreshIcon, ArrowBack } from '@mui/icons-material';
import { useStore } from '../../store';
import {
  fetchGmailMessages, fetchGmailMessageDetail, sendGmailMessage,
  parseGmailMessage, getGmailAuthUrl,
} from '../../services/email/gmailAdapter';
import type { EmailMessage } from '../../types';

export const Email: React.FC = () => {
  const { t } = useTranslation();
  const emailAccount = useStore((s) => s.emailAccount);

  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [sending, setSending] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');

  const loadMessages = useCallback(async () => {
    if (!emailAccount?.accessToken) return;
    setLoading(true);
    setError('');
    try {
      const messageList = await fetchGmailMessages(emailAccount.accessToken, 20);
      const detailedMessages: EmailMessage[] = [];
      for (const msg of messageList.slice(0, 10) as Array<{ id: string }>) {
        const detail = await fetchGmailMessageDetail(emailAccount.accessToken, msg.id);
        const parsed = parseGmailMessage(detail as Record<string, unknown>);
        detailedMessages.push(parsed);
      }
      setMessages(detailedMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  }, [emailAccount?.accessToken]);

  useEffect(() => {
    if (emailAccount?.accessToken) {
      loadMessages();
    }
  }, [emailAccount?.accessToken, loadMessages]);

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
      loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!emailAccount?.accessToken) {
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

  if (selectedMessage) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => setSelectedMessage(null)}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          📧 {t('email.title')}
        </Typography>
        <Chip label={emailAccount.email} size="small" sx={{ fontSize: 10, height: 20 }} />
        <IconButton size="small" onClick={loadMessages} disabled={loading}>
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

      {error && <Alert severity="error" sx={{ m: 1, fontSize: 12 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      ) : (
        <List dense disablePadding sx={{ flex: 1, overflow: 'auto' }}>
          {messages.map((msg) => (
            <ListItem
              key={msg.id}
              onClick={() => setSelectedMessage(msg)}
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
      )}

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
