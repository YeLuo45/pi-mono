import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore, type ToolsView } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const VIEWS: { id: ToolsView; labelKey: string; icon: string }[] = [
  { id: 'registry', labelKey: 'macos.toolsRegistry', icon: '📦' },
  { id: 'history', labelKey: 'macos.toolsHistory', icon: '🕐' },
];

export function ToolsItemList() {
  const { t } = useTranslation();
  const toolsView = useMacSplitStore((s) => s.toolsView);
  const setToolsView = useMacSplitStore((s) => s.setToolsView);

  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-2)',
        gap: 'var(--space-1)',
      })}
    >
      {VIEWS.map((v) => (
        <MacListRow
          key={v.id}
          title={t(v.labelKey, v.id)}
          icon={<span>{v.icon}</span>}
          selected={toolsView === v.id}
          onClick={() => setToolsView(v.id)}
        />
      ))}
    </div>
  );
}
