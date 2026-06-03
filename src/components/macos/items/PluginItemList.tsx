import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { PluginService } from '../../../services/plugin/PluginService';
import { useStore } from '../../../store';
import { MacListRow } from '../MacListRow';

export function PluginItemList() {
  const { t } = useTranslation();
  const activePluginId = useStore((s) => s.activePluginId);
  const setActivePluginId = useStore((s) => s.setActivePluginId);

  const panelPlugins = PluginService.listPlugins().filter((p) =>
    p.capabilities.some((c) => c.type === 'panel'),
  );

  if (panelPlugins.length === 0) {
    return (
      <p css={css({ padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' })}>
        {t('plugin.noPanels', '暂无面板插件')}
      </p>
    );
  }

  return (
    <div css={css({ padding: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' })}>
      {panelPlugins.map((plugin) => (
        <MacListRow
          key={plugin.id}
          title={plugin.name}
          subtitle={`v${plugin.version}`}
          icon={plugin.icon ? <span>{plugin.icon}</span> : undefined}
          selected={activePluginId === plugin.id}
          onClick={() => setActivePluginId(plugin.id)}
        />
      ))}
    </div>
  );
}
