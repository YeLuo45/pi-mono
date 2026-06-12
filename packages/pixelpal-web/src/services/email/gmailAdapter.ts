// Gmail OAuth adapter
// Uses Gmail API for reading and sending emails

const GMAIL_REDIRECT_URI = window.location.origin + '/auth/gmail/callback';
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

export interface GmailToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  expires_at?: number;
}

export function getGmailAuthUrl(): string {
  const clientId = localStorage.getItem('pixelpal_gmail_client_id');
  if (!clientId) {
    throw new Error('Gmail Client ID not configured. Please enter it in Settings.');
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(GMAIL_REDIRECT_URI)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(GMAIL_SCOPES)}` +
    `&include_granted_scopes=true` +
    `&state=pixelpal_gmail_auth`;
}

export async function fetchGmailMessages(
  accessToken: string,
  maxResults: number = 20
): Promise<GmailMessageSummary[]> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.messages || []) as GmailMessageSummary[];
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
}

export async function fetchGmailMessageDetail(
  accessToken: string,
  messageId: string
): Promise<Record<string, unknown>> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch email: ${response.statusText}`);
  }

  return response.json();
}

export async function sendGmailMessage(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const encodedMessage = btoa(
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset=utf-8\r\n` +
    `\r\n` +
    `${body}`
  ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }
}

export function parseGmailMessage(raw: Record<string, unknown>) {
  const payload = raw.payload as Record<string, unknown> | undefined;
  const headers = (payload?.headers as Array<{ name: string; value: string }>) || [];
  const getHeader = (name: string) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  let body = '';
  const parts = payload?.parts as Array<{ body?: { data?: string }; mimeType?: string }> | undefined;
  if (parts) {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        break;
      }
    }
    // Fallback to HTML
    if (!body) {
      for (const part of parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          body = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          break;
        }
      }
    }
  } else if (payload?.body) {
    const bodyData = (payload.body as { data?: string })?.data;
    if (bodyData) {
      body = atob(bodyData.replace(/-/g, '+').replace(/_/g, '/'));
    }
  }

  const snippet = (raw.snippet as string) || '';

  return {
    id: raw.id as string,
    from: { address: getHeader('from') },
    to: [{ address: getHeader('to') }],
    subject: getHeader('subject'),
    body,
    date: raw.internalDate as string,
    read: !(raw.labelIds as string[])?.includes('UNREAD'),
    snippet,
  };
}
