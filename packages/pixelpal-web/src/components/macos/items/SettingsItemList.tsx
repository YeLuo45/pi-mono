import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore, type SettingsSection } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

const SECTIONS: { id: SettingsSection; labelKey: string; icon: string; electronOnly?: boolean }[] = [
  { id: 'general', labelKey: 'settings.general', icon: '⚙️' },
  { id: 'appearance', labelKey: 'settings.themeSettings', icon: '🎨' },
  { id: 'desktop', labelKey: 'settings.desktop', icon: '🖥️', electronOnly: true },
  { id: 'analytics', labelKey: 'settings.analytics', icon: '📊' },
  { id: 'agentOptimizer', labelKey: 'settings.agentOptimizer', icon: '🤖' },
  { id: 'providers', labelKey: 'settings.providers', icon: '🤖' },
  { id: 'usage', labelKey: 'settings.usage', icon: '📊' },
];

export function SettingsItemList() {
  const { t } = useTranslation();
  const settingsSection = useMacSplitStore((s) => s.settingsSection);
  const setSettingsSection = useMacSplitStore((s) => s.setSettingsSection);

  const visible = SECTIONS.filter((s) => !s.electronOnly || isElectron);

  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-2)',
        gap: 'var(--space-1)',
      })}
    >
      {visible.map((section) => (
        <MacListRow
          key={section.id}
          title={t(section.labelKey, section.id)}
          icon={<span>{section.icon}</span>}
          selected={settingsSection === section.id}
          onClick={() => setSettingsSection(section.id)}
        />
      ))}
    </div>
  );
}
