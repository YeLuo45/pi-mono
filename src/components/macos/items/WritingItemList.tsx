import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore, type WritingMode } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const WRITING_MODES: { id: WritingMode; labelKey: string; icon: string }[] = [
  { id: 'generate', labelKey: 'writing.modeGenerate', icon: '✨' },
  { id: 'continue', labelKey: 'writing.modeContinue', icon: '➡️' },
  { id: 'polish', labelKey: 'writing.modePolish', icon: '💎' },
  { id: 'summarize', labelKey: 'writing.modeSummarize', icon: '📝' },
];

export function WritingItemList() {
  const { t } = useTranslation();
  const writingMode = useMacSplitStore((s) => s.writingMode);
  const setWritingMode = useMacSplitStore((s) => s.setWritingMode);

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
        {t('writing.modes', '写作模式')}
      </div>
      {WRITING_MODES.map((m) => (
        <MacListRow
          key={m.id}
          title={t(m.labelKey, m.id)}
          icon={<span>{m.icon}</span>}
          selected={writingMode === m.id}
          onClick={() => setWritingMode(m.id)}
        />
      ))}
    </div>
  );
}
