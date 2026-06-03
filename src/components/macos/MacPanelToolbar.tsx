import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { MacToolbar } from './MacToolbar';

interface MacPanelToolbarProps {
  panel: string;
}

export function MacPanelToolbar({ panel }: MacPanelToolbarProps) {
  const { t } = useTranslation();

  if (panel === 'analytics') {
    return (
      <MacToolbar>
        <button
          type="button"
          onClick={() => window.print()}
          css={css({
            fontSize: 'var(--text-sm)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--separator)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-stack)',
          })}
        >
          {t('analytics.exportReport', '导出')}
        </button>
      </MacToolbar>
    );
  }

  if (panel === 'execution') {
    return (
      <MacToolbar>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('pixelpal:refreshExecutionLogs'))}
          css={css({
            fontSize: 'var(--text-sm)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--separator)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-stack)',
          })}
        >
          {t('common.refresh', '刷新')}
        </button>
      </MacToolbar>
    );
  }

  if (panel === 'evolution') {
    return (
      <MacToolbar>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('pixelpal:runEvolution'))}
          css={css({
            fontSize: 'var(--text-sm)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--separator)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-stack)',
          })}
        >
          {t('evolution.run', '运行进化')}
        </button>
      </MacToolbar>
    );
  }

  if (panel === 'memory') {
    return (
      <MacToolbar>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('pixelpal:refreshMemoryPanel'))}
          css={css({
            fontSize: 'var(--text-sm)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--separator)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-stack)',
          })}
        >
          {t('common.refresh', '刷新')}
        </button>
      </MacToolbar>
    );
  }

  return null;
}
