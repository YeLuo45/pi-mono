import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { taskQueue } from '../../../services/agent/taskQueue';
import type { Task } from '../../../services/agent/types';
import { useMacSplitStore, type AgentTaskFilter } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const FILTERS: { id: AgentTaskFilter; labelKey: string }[] = [
  { id: 'all', labelKey: 'macos.agentFilterAll' },
  { id: 'running', labelKey: 'macos.agentFilterRunning' },
  { id: 'pending', labelKey: 'macos.agentFilterPending' },
  { id: 'completed', labelKey: 'macos.agentFilterCompleted' },
  { id: 'failed', labelKey: 'macos.agentFilterFailed' },
];

function filterTasks(tasks: Task[], filter: AgentTaskFilter): Task[] {
  if (filter === 'all') return tasks;
  if (filter === 'running') return tasks.filter((t) => t.status === 'running');
  if (filter === 'pending') return tasks.filter((t) => t.status === 'pending' || t.status === 'paused');
  if (filter === 'completed') return tasks.filter((t) => t.status === 'completed');
  return tasks.filter((t) => t.status === 'failed' || t.status === 'cancelled');
}

export function AgentItemList() {
  const { t } = useTranslation();
  const agentTaskFilter = useMacSplitStore((s) => s.agentTaskFilter);
  const setAgentTaskFilter = useMacSplitStore((s) => s.setAgentTaskFilter);
  const agentTaskId = useMacSplitStore((s) => s.agentTaskId);
  const setAgentTaskId = useMacSplitStore((s) => s.setAgentTaskId);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const refresh = () => setTasks([...taskQueue.getAllTasks()]);
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filterTasks(tasks, agentTaskFilter);

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
        {FILTERS.map((f) => (
          <MacListRow
            key={f.id}
            title={t(f.labelKey, f.id)}
            selected={agentTaskFilter === f.id}
            onClick={() => setAgentTaskFilter(f.id)}
          />
        ))}
      </div>
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
          {t('agent.queue', '队列')}
        </div>
        {filtered.length === 0 ? (
          <p css={css({ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: 'var(--space-2)' })}>
            {t('macos.noTasks', '暂无任务')}
          </p>
        ) : (
          filtered.map((task) => (
            <MacListRow
              key={task.id}
              title={task.goal}
              subtitle={task.status}
              selected={agentTaskId === task.id}
              onClick={() => setAgentTaskId(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
