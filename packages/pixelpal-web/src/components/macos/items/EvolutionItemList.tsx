import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useEvolutionStore, type EvolutionTab } from '../../../stores/evolutionStore';
import { MacListRow } from '../MacListRow';

const EVOLUTION_TABS: { id: EvolutionTab; labelKey: string; icon: string }[] = [
  { id: 'dashboard', labelKey: 'evolution.tabs.dashboard', icon: '📊' },
  { id: 'patterns', labelKey: 'evolution.tabs.patterns', icon: '🔍' },
  { id: 'strategies', labelKey: 'evolution.tabs.strategies', icon: '⚡' },
  { id: 'skills', labelKey: 'evolution.tabs.skills', icon: '✨' },
  { id: 'timeline', labelKey: 'evolution.tabs.timeline', icon: '📅' },
];

export function EvolutionItemList() {
  const { t } = useTranslation();
  const activeTab = useEvolutionStore((s) => s.activeTab);
  const setActiveTab = useEvolutionStore((s) => s.setActiveTab);
  const events = useEvolutionStore((s) => s.events);
  const selectedEventId = useEvolutionStore((s) => s.selectedEventId);
  const selectEvent = useEvolutionStore((s) => s.selectEvent);

  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      })}
    >
      <div css={css({ padding: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' })}>
        {EVOLUTION_TABS.map((tab) => (
          <MacListRow
            key={tab.id}
            title={t(tab.labelKey, tab.id)}
            icon={<span>{tab.icon}</span>}
            selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          />
        ))}
      </div>

      {activeTab === 'timeline' && (
        <div
          css={css({
            flex: 1,
            overflowY: 'auto',
            padding: '0 var(--space-2) var(--space-2)',
            borderTop: '1px solid var(--separator)',
          })}
        >
          <div
            css={css({
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              padding: 'var(--space-2) var(--space-1)',
              textTransform: 'uppercase',
            })}
          >
            {t('evolution.events', '事件')}
          </div>
          {events.length === 0 ? (
            <p css={css({ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 'var(--space-2)' })}>
              {t('evolution.noEvents', '暂无事件')}
            </p>
          ) : (
            events.map((ev) => (
              <MacListRow
                key={ev.id}
                title={ev.title}
                subtitle={new Date(ev.timestamp).toLocaleString()}
                selected={selectedEventId === ev.id}
                onClick={() => selectEvent(ev.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
