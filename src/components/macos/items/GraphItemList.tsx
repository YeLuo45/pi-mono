import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { MacListRow } from '../MacListRow';

export function GraphItemList() {
  const { t } = useTranslation();

  const openGraph = () => {
    window.dispatchEvent(new CustomEvent('pixelpal:openRelationGraph'));
  };

  return (
    <div css={css({ padding: 'var(--space-2)' })}>
      <MacListRow
        title={t('nav.graph', '关系图谱')}
        icon={<span>🕸️</span>}
        onClick={openGraph}
      />
    </div>
  );
}
