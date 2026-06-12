import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useGmailMessages } from '../../../hooks/useGmailMessages';
import { useMacSplitStore } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';
import { MacSearchField } from '../MacSearchField';
import { useMemo, useState } from 'react';

export function EmailItemList() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const { messages, loading, isAuthenticated } = useGmailMessages();
  const emailMessageId = useMacSplitStore((s) => s.emailMessageId);
  const setEmailMessageId = useMacSplitStore((s) => s.setEmailMessageId);

  const filtered = useMemo(() => {
    if (!query.trim()) return messages;
    const q = query.toLowerCase();
    return messages.filter(
      (m) =>
        (m.subject || '').toLowerCase().includes(q) ||
        m.from.address.toLowerCase().includes(q),
    );
  }, [messages, query]);

  if (!isAuthenticated) {
    return (
      <div
        css={css({
          padding: 'var(--space-4)',
          color: 'var(--text-secondary)',
          fontSize: 13,
          textAlign: 'center',
        })}
      >
        {t('email.connect', '请先连接 Gmail')}
      </div>
    );
  }

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <MacSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('email.searchMessages', '搜索邮件')}
      />
      <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
        {loading && filtered.length === 0 ? (
          <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
            {t('email.loading', '加载中…')}
          </div>
        ) : filtered.length === 0 ? (
          <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
            {t('email.noMessages', '暂无邮件')}
          </div>
        ) : (
          filtered.map((msg) => (
            <MacListRow
              key={msg.id}
              title={msg.subject || t('email.noSubject', '(无主题)')}
              subtitle={`${msg.from.address} · ${new Date(parseInt(msg.date, 10)).toLocaleDateString()}`}
              icon={<span>{msg.read ? '📭' : '📬'}</span>}
              selected={emailMessageId === msg.id}
              onClick={() => setEmailMessageId(msg.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
