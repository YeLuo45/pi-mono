import { css } from '@emotion/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllPersonas } from '../../../services/persona/personaStorage';
import { useStore } from '../../../store';
import { MacListRow } from '../MacListRow';
import { MacSearchField } from '../MacSearchField';

export function ChatItemList() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const activePersonaId = useStore((s) => s.activePersonaId);
  const setActivePersonaId = useStore((s) => s.setActivePersonaId);
  const messages = useStore((s) => s.messages);

  const personas = useMemo(() => {
    const all = getAllPersonas();
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((p) => p.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div css={css({ display: 'flex', flexDirection: 'column', height: '100%' })}>
      <MacSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('nav.chat', '搜索会话')}
      />
      <div css={css({ flex: 1, overflowY: 'auto', padding: '0 var(--space-2) var(--space-2)' })}>
        {personas.map((persona) => {
          const lastMsg = [...messages]
            .reverse()
            .find((m) => !m.personaId || m.personaId === persona.id);
          const subtitle = lastMsg
            ? lastMsg.content.slice(0, 40) + (lastMsg.content.length > 40 ? '…' : '')
            : t('chat.empty', '暂无消息');

          return (
            <MacListRow
              key={persona.id}
              title={persona.name}
              subtitle={subtitle}
              icon={<span>{persona.appearance?.expression ?? '🙂'}</span>}
              selected={activePersonaId === persona.id}
              onClick={() => setActivePersonaId(persona.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
