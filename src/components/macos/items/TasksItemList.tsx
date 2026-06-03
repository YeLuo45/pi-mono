import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore, type TasksFilter } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const TASK_FILTERS: { id: TasksFilter; labelKey: string; icon: string }[] = [
  { id: 'all', labelKey: 'tasks.filterAll', icon: '📋' },
  { id: 'today', labelKey: 'tasks.filterToday', icon: '📅' },
  { id: 'overdue', labelKey: 'tasks.filterOverdue', icon: '⚠️' },
  { id: 'todo', labelKey: 'tasks.todo', icon: '○' },
  { id: 'in_progress', labelKey: 'tasks.inProgress', icon: '◐' },
  { id: 'done', labelKey: 'tasks.done', icon: '✓' },
  { id: 'ai_suggestion', labelKey: 'tasks.aiSuggestion', icon: '✨' },
];

export function TasksItemList() {
  const { t } = useTranslation();
  const tasksFilter = useMacSplitStore((s) => s.tasksFilter);
  const setTasksFilter = useMacSplitStore((s) => s.setTasksFilter);

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
        {t('tasks.filters', '筛选')}
      </div>
      {TASK_FILTERS.map((f) => (
        <MacListRow
          key={f.id}
          title={t(f.labelKey, f.id)}
          icon={<span>{f.icon}</span>}
          selected={tasksFilter === f.id}
          onClick={() => setTasksFilter(f.id)}
        />
      ))}
    </div>
  );
}
