import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store';
import {
  fetchGmailMessages,
  fetchGmailMessageDetail,
  parseGmailMessage,
} from '../services/email/gmailAdapter';
import type { EmailMessage } from '../types';

export function useGmailMessages() {
  const emailAccount = useStore((s) => s.emailAccount);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } else {
      setMessages([]);
    }
  }, [emailAccount?.accessToken, loadMessages]);

  return {
    messages,
    loading,
    error,
    setError,
    reload: loadMessages,
    isAuthenticated: !!emailAccount?.accessToken,
    accountEmail: emailAccount?.email,
  };
}
