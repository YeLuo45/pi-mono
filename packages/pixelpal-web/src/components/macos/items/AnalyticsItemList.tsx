import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore, type AnalyticsTimeRange } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const RANGES: { id: AnalyticsTimeRange; labelKey: string }[] = [
  { id: '7d', labelKey: 'analytics.moodTrend.weekly' },
  { id: '30d', labelKey: 'analytics.moodTrend.monthly' },
  { id: '90d', labelKey: 'analytics.moodTrend.allTime' },
];

export function AnalyticsItemList() {
  const { t } = useTranslation();
  const analyticsTimeRange = useMacSplitStore((s) => s.analyticsTimeRange);
  const setAnalyticsTimeRange = useMacSplitStore((s) => s.setAnalyticsTimeRange);

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
        {t('macos.timeRange', '时间范围')}
      </div>
      {RANGES.map((r) => (
        <MacListRow
          key={r.id}
          title={t(r.labelKey)}
          selected={analyticsTimeRange === r.id}
          onClick={() => setAnalyticsTimeRange(r.id)}
        />
      ))}
    </div>
  );
}
