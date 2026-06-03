import { css } from '@emotion/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { isMacSplitPanel } from '../../stores/macSplitPanels';
import {
  AgentItemList,
  AnalyticsItemList,
  CalendarItemList,
  ChatItemList,
  DocumentItemList,
  EmailItemList,
  ExecutionItemList,
  EvolutionItemList,
  GraphItemList,
  KnowledgeItemList,
  MemoryItemList,
  McpItemList,
  PluginItemList,
  SettingsItemList,
  SkillDevItemList,
  SkillStoreItemList,
  TasksItemList,
  ToolsItemList,
  WritingItemList,
} from './items';
import { useMacSplitStore } from '../../stores/macSplitStore';
interface MacItemListProps {
  panel?: string;
}

export function MacItemList({ panel }: MacItemListProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const resetForPanel = useMacSplitStore((s) => s.resetForPanel);
  const resetForRoute = useMacSplitStore((s) => s.resetForRoute);

  useEffect(() => {
    if (panel) resetForPanel(panel);
  }, [panel, resetForPanel]);

  useEffect(() => {
    resetForRoute(location.pathname);
  }, [location.pathname, resetForRoute]);

  if (location.pathname.startsWith('/skill-store')) return <SkillStoreItemList />;
  if (location.pathname.startsWith('/skill-dev')) return <SkillDevItemList />;

  if (panel === 'chat') return <ChatItemList />;
  if (panel === 'tasks') return <TasksItemList />;
  if (panel === 'knowledge') return <KnowledgeItemList />;
  if (panel === 'settings') return <SettingsItemList />;
  if (panel === 'calendar') return <CalendarItemList />;
  if (panel === 'email') return <EmailItemList />;
  if (panel === 'writing') return <WritingItemList />;
  if (panel === 'document') return <DocumentItemList />;
  if (panel === 'memory') return <MemoryItemList />;
  if (panel === 'analytics') return <AnalyticsItemList />;
  if (panel === 'mcp') return <McpItemList />;
  if (panel === 'tools') return <ToolsItemList />;
  if (panel === 'agent') return <AgentItemList />;
  if (panel === 'execution') return <ExecutionItemList />;
  if (panel === 'graph') return <GraphItemList />;
  if (panel === 'evolution') return <EvolutionItemList />;
  if (panel === 'plugin') return <PluginItemList />;

  if (!panel || !isMacSplitPanel(panel)) {
    return (
      <div
        css={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 'var(--space-4)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-base)',
          fontFamily: 'var(--font-stack)',
          textAlign: 'center',
        })}
      >
        {t('macos.selectItem', '选择一项以查看详情')}
      </div>
    );
  }

  return null;
}
