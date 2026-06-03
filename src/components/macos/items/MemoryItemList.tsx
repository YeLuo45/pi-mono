import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const MEMORY_TABS: { id: number; labelKey: string; icon: string }[] = [
  { id: 0, labelKey: 'memoryPanel.all', icon: '🧠' },
  { id: 1, labelKey: 'memoryPanel.entities', icon: '🔗' },
  { id: 2, labelKey: 'memoryPanel.timeline', icon: '📅' },
  { id: 3, labelKey: 'memoryPanel.insights', icon: '💡' },
  { id: 4, labelKey: 'emotionPanel.title', icon: '😊' },
  { id: 5, labelKey: 'memoryPanel.weeklyReport', icon: '📊' },
];

export function MemoryItemList() {
  const { t } = useTranslation();
  const memoryTab = useMacSplitStore((s) => s.memoryTab);
  const setMemoryTab = useMacSplitStore((s) => s.setMemoryTab);

  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-2)',
        gap: 'var(--space-1)',
      })}
    >
      <div
        css={css({
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          padding: 'var(--space-1) var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        })}
      >
        {t('macos.memoryViews', '视图')}
      </div>
      {MEMORY_TABS.map((tab) => (
        <MacListRow
          key={tab.id}
          title={t(tab.labelKey)}
          icon={<span>{tab.icon}</span>}
          selected={memoryTab === tab.id}
          onClick={() => setMemoryTab(tab.id)}
        />
      ))}
    </div>
  );
}
