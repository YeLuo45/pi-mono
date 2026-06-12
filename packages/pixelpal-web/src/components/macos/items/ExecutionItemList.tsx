import { css } from '@emotion/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getExecutionLogs } from '../../../services/storage/skillExecutionStorage';
import type { ExecutionLog } from '../../../types/execution';
import { useMacSplitStore } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

export function ExecutionItemList() {
  const { t } = useTranslation();
  const executionLogId = useMacSplitStore((s) => s.executionLogId);
  const setExecutionLogId = useMacSplitStore((s) => s.setExecutionLogId);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getExecutionLogs({ limit: 50 })
      .then((fetched) => {
        if (!cancelled) {
          setLogs(fetched);
          const current = useMacSplitStore.getState().executionLogId;
          if (fetched.length > 0 && !current) {
            setExecutionLogId(fetched[0].id);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setExecutionLogId]);

  if (loading) {
    return (
      <p css={css({ padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' })}>
        {t('common.loading', '加载中…')}
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <p css={css({ padding: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' })}>
        {t('execution.noLogs', '暂无执行记录')}
      </p>
    );
  }

  return (
    <div css={css({ padding: 'var(--space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' })}>
      {logs.map((log) => (
        <MacListRow
          key={log.id}
          title={log.skillId}
          subtitle={new Date(log.timestamp).toLocaleString()}
          selected={executionLogId === log.id}
          onClick={() => setExecutionLogId(log.id)}
        />
      ))}
    </div>
  );
}
