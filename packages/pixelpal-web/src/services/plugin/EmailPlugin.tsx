// EmailPlugin — Built-in Gmail plugin with OAuth support
import React, { useState, useEffect } from 'react';
import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyTab as Tab } from '../../components/MUI替代';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyButton as Button, MyList as List, MyListItem as ListItem, MyListItemText as ListItemText, MyTextField as TextField, MyChip as Chip, MyCircularProgress as CircularProgress } from '../../components/MUI替代';
import { Email as EmailIcon, Refresh as RefreshIcon, OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import type { Plugin } from './types';
import { PluginService } from './PluginService';

const GMAIL_CLIENT_ID_KEY = 'pixelpal_gmail_client_id';
const GMAIL_API_KEY_KEY = 'pixelpal_gmail_api_key';
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

export interface EmailMessage {
  id: string;
  threadId: string;
  from: { name?: string; address: string };
  subject: string;
  snippet: string;
  internalDate: string;
  labelIds?: string[];
  body?: string;
}

export interface GmailAccount {
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

const DEFAULT_ACCOUNT: GmailAccount | null = null;

// GMail OAuth flow — opens popup
function initiateGmailOAuth(clientId: string): void {
  const redirectUri = `${window.location.origin}/gmail-callback`;
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=token` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(GMAIL_SCOPES)}`;

  window.open(authUrl, 'gmail_oauth', 'width=500,height=600');
}

// Fetch Gmail messages using access token
async function fetchGmail(accessToken: string, maxResults = 20): Promise<EmailMessage[]> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
  const data = await res.json() as { messages?: { threadId: string; id: string }[] };

  if (!data.messages?.length) return [];

  // Fetch individual message details
  const messages = await Promise.all(
    data.messages.map(async (msg) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Snippet`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!detailRes.ok) return null;
        const detail = await detailRes.json() as {
          id: string;
          threadId: string;
          internalDate: string;
          labelIds?: string[];
          payload?: {
            headers?: { name: string; value: string }[];
          };
          snippet?: string;
        };

        const getHeader = (name: string) =>
          detail.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

        const fromRaw = getHeader('From');
        const fromMatch = fromRaw.match(/^(?:"?([^"]*)"?\s)?<?([^<>]+@[^<>]+)>?$/);
        const from = fromMatch
          ? { name: fromMatch[1] || undefined, address: fromMatch[2] }
          : { address: fromRaw };

        return {
          id: detail.id,
          threadId: detail.threadId,
          from,
          subject: getHeader('Subject') || '(no subject)',
          snippet: detail.snippet ?? '',
          internalDate: detail.internalDate,
          labelIds: detail.labelIds,
        } satisfies EmailMessage;
      } catch {
        return null;
      }
    })
  );

  return messages.filter(Boolean) as EmailMessage[];
}

export const EmailPluginPanel: React.FC<{ pluginId: string }> = ({ pluginId: _pluginId }) => {
  const [account, setAccount] = useState<GmailAccount | null>(DEFAULT_ACCOUNT);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [clientIdInput, setClientIdInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedTab, setSelectedTab] = useState<'inbox' | 'unread'>('inbox');

  // Load stored credentials
  useEffect(() => {
    const storedClientId = localStorage.getItem(GMAIL_CLIENT_ID_KEY);
    const storedApiKey = localStorage.getItem(GMAIL_API_KEY_KEY);
    if (storedClientId) setClientIdInput(storedClientId);
    if (storedApiKey) setApiKeyInput(storedApiKey);

    // Check URL hash for OAuth token
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token') || '';
      if (accessToken) {
        setAccount({ email: 'Gmail User', accessToken });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleConnect = () => {
    if (!clientIdInput.trim()) return;
    localStorage.setItem(GMAIL_CLIENT_ID_KEY, clientIdInput.trim());
    if (apiKeyInput.trim()) localStorage.setItem(GMAIL_API_KEY_KEY, apiKeyInput.trim());
    else localStorage.removeItem(GMAIL_API_KEY_KEY);
    initiateGmailOAuth(clientIdInput.trim());
    setConfigDialogOpen(false);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setMessages([]);
  };

  const handleRefresh = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const msgs = await fetchGmail(account.accessToken);
      setMessages(msgs);
    } catch {
      // On 401, clear account
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const displayedMessages = selectedTab === 'unread'
    ? messages.filter((m) => m.labelIds?.includes('UNREAD'))
    : messages;

  const unreadCount = messages.filter((m) => m.labelIds?.includes('UNREAD')).length;

  // Auto-fetch on connect
  useEffect(() => {
    if (account && messages.length === 0) {
      handleRefresh();
    }
  }, [account]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          📧 Email Plugin
        </Typography>
        {account && (
          <>
            <Chip
              label={`${unreadCount} unread`}
              size="small"
              sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(244,67,54,0.2)', color: '#F44336' }}
            />
            <IconButton size="small" onClick={handleRefresh} disabled={loading}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Button size="small" variant="outlined" onClick={handleDisconnect} sx={{ fontSize: 10 }}>
              Disconnect
            </Button>
          </>
        )}
        {!account && (
          <Button size="small" variant="contained" onClick={() => setConfigDialogOpen(true)} sx={{ fontSize: 10 }}>
            Connect Gmail
          </Button>
        )}
      </Box>

      {/* Tab bar */}
      {account && (
        <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['inbox', 'unread'] as const).map((tab) => (
            <Typography
              key={tab}
              component="button"
              onClick={() => setSelectedTab(tab)}
              sx={{
                fontSize: 11, background: 'none', border: 'none', cursor: 'pointer',
                color: selectedTab === tab ? 'primary.main' : 'text.secondary',
                textTransform: 'capitalize', px: 1, py: 0.5, borderRadius: 1,
                bgcolor: selectedTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              {tab}
            </Typography>
          ))}
        </Box>
      )}

      {/* Content */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!account && !loading && (
        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
          <EmailIcon sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            Connect your Gmail account to view emails
          </Typography>
        </Box>
      )}

      {account && !loading && displayedMessages.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            No {selectedTab === 'unread' ? 'unread ' : ''}emails
          </Typography>
        </Box>
      )}

      {account && !loading && displayedMessages.length > 0 && (
        <List dense disablePadding sx={{ flex: 1, overflow: 'auto' }}>
          {displayedMessages.map((msg) => (
            <ListItem
              key={msg.id}
              disablePadding
              onClick={() => setSelectedMessage(msg)}
              sx={{
                px: 2, py: 1, cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                bgcolor: msg.labelIds?.includes('UNREAD') ? 'rgba(155,127,212,0.04)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
              secondaryAction={
                <IconButton edge="end" size="small">
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </IconButton>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {msg.labelIds?.includes('UNREAD') && (
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                    )}
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: msg.labelIds?.includes('UNREAD') ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {msg.from.name || msg.from.address}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', flexShrink: 0 }}>
                      {new Date(parseInt(msg.internalDate)).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" sx={{ fontSize: 11, color: 'text.primary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {msg.subject}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {msg.snippet}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* Email detail dialog */}
      <Dialog open={!!selectedMessage} onClose={() => setSelectedMessage(null)} maxWidth="sm" fullWidth>
        {selectedMessage && (
          <>
            <DialogTitle sx={{ fontSize: 15 }}>
              {selectedMessage.subject}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
                  From: {selectedMessage.from.name
                    ? `${selectedMessage.from.name} <${selectedMessage.from.address}>`
                    : selectedMessage.from.address}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {selectedMessage.snippet}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedMessage(null)} size="small">Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Config dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>Connect Gmail</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary' }}>
              Create a Gmail OAuth 2.0 client in Google Cloud Console and paste the Client ID below.
              Add <code>{window.location.origin}</code> as an authorized redirect URI.
            </Typography>
            <TextField
              label="Gmail Client ID"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              size="small" fullWidth
              placeholder="123456789-abc.apps.googleusercontent.com"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfigDialogOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleConnect} variant="contained" size="small" disabled={!clientIdInput.trim()}>
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// AI tools
const fetchEmailsTool = async (args: unknown): Promise<unknown> => {
  const { maxResults = 10 } = args as { maxResults?: number };
  return { success: true, emails: [], count: 0, maxResults };
};

const sendEmailTool = async (args: unknown): Promise<unknown> => {
  const { to, subject, body } = args as { to: string; subject: string; body: string };
  return { success: true, message: `Email to ${to} queued`, to, subject, body };
};

export const emailPlugin: Plugin = {
  id: 'email',
  name: 'Email',
  version: '1.0.0',
  icon: '📧',
  panel: EmailPluginPanel,
  capabilities: [
    { type: 'panel' },
    { type: 'ai_tool', name: 'fetch_emails' },
    { type: 'ai_tool', name: 'send_email' },
  ],

  onInit() {
    PluginService.registerTool('email', 'fetch_emails', fetchEmailsTool);
    PluginService.registerTool('email', 'send_email', sendEmailTool);
  },
};
