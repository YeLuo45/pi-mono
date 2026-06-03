import { css } from '@emotion/react';
import { useTranslation } from 'react-i18next';
import { useMacSplitStore, type McpTab } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const MCP_TABS: { id: McpTab; labelKey: string; icon: string }[] = [
  { id: 'clients', labelKey: 'mcp.tabs.clients', icon: '🌐' },
  { id: 'tools', labelKey: 'mcp.tabs.tools', icon: '🔧' },
  { id: 'logs', labelKey: 'mcp.tabs.logs', icon: '📜' },
];

export function McpItemList() {
  const { t } = useTranslation();
  const mcpTab = useMacSplitStore((s) => s.mcpTab);
  const setMcpTab = useMacSplitStore((s) => s.setMcpTab);

  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-2)',
        gap: 'var(--space-1)',
      })}
    >
      {MCP_TABS.map((tab) => (
        <MacListRow
          key={tab.id}
          title={t(tab.labelKey, tab.id)}
          icon={<span>{tab.icon}</span>}
          selected={mcpTab === tab.id}
          onClick={() => setMcpTab(tab.id)}
        />
      ))}
    </div>
  );
}
