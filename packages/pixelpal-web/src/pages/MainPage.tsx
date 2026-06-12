import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MyIconButton as IconButton , MyDialog as Dialog, MyDrawer as Drawer, MyTab as Tab } from '../components/MUI替代';
import { Box } from '../components/ui/Box';
import { MenuIcon } from '../components/ui/muiIconMap';

import { ChatPanel } from '../components/ChatPanel/ChatPanel';
import { Calendar } from '../components/Calendar/Calendar';
import { Tasks } from '../components/Tasks/Tasks';
import { DocumentUpload } from '../components/Document/DocumentUpload';
import { Writing } from '../components/Writing/Writing';
import { Email } from '../components/Email/Email';
import { Settings } from '../components/Settings/Settings';
import { KnowledgePanel } from '../components/Knowledge/Knowledge';
import { MultiPersonaCollaboration } from '../components/MultiPersona/MultiPersonaCollaboration';
import { PluginPanel } from '../components/Plugin/PluginPanel';
import { PluginHub } from '../components/Plugin/PluginHub';
import { MemoryPanel } from '../components/Memory/MemoryPanel';
import { AnalyticsPanel } from '../components/Analytics/AnalyticsPanel';
import { PluginStore } from '../components/PluginStore/PluginStore';
import { registerBuiltinPlugins, registerOptionalPlugins } from '../plugins';
import { useStore } from '../store';
import { RelationGraph } from '../components/Graph/RelationGraph';
import { AgentPanel } from '../components/Agent/AgentPanel';
import { ToolsPanel } from '../components/Tools/ToolsPanel';
import { ExecutionLogPanel } from '../components/Execution/ExecutionLogPanel';
import { BottomTabNav } from '../components/Layout/BottomTabNav';
import { MobileDrawer } from '../components/Layout/MobileDrawer';
import { useMobile } from '../hooks/useMobile';
import { McpPanel } from '../components/MCP/McpPanel';
import { EvolutionDashboard } from '../components/evolution';
import { MacDetailPane } from '../components/macos';
import { isMacSplitPanel } from '../stores/macSplitPanels';

const PANEL_COMPONENTS = {
  chat: ChatPanel,
  calendar: Calendar,
  tasks: Tasks,
  document: DocumentUpload,
  knowledge: KnowledgePanel,
  writing: Writing,
  email: Email,
  team: MultiPersonaCollaboration,
  settings: Settings,
  plugin: PluginPanel,
  memory: MemoryPanel,
  analytics: AnalyticsPanel,
  pluginStore: PluginStore,
  agent: AgentPanel,
  graph: function GraphPanelPlaceholder({ splitLayout }: { splitLayout?: boolean }) {
    const { t } = useTranslation();
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          p: 3,
          color: 'text.secondary',
          fontSize: 14,
        }}
      >
        {splitLayout
          ? t('macos.openGraphHint', '在中间栏点击「关系图谱」打开')
          : t('nav.graph', '关系图谱')}
      </Box>
    );
  },
  tools: ToolsPanel,
  execution: ExecutionLogPanel,
  mcp: McpPanel,
  evolution: function EvolutionPanelRoute({ splitLayout }: { splitLayout?: boolean }) {
    return <EvolutionDashboard embedded splitLayout={splitLayout} />;
  },
} as const;

export const MainPage: React.FC = () => {
  const activePanel = useStore((s) => s.activePanel);
  const activePluginId = useStore((s) => s.activePluginId);
  const setActivePluginId = useStore((s) => s.setActivePluginId);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [relationGraphOpen, setRelationGraphOpen] = useState(false);
  const isMobile = useMobile();

  // Listen for relation graph open event from source list
  useEffect(() => {
    const handleOpenRelationGraph = () => setRelationGraphOpen(true);
    window.addEventListener('pixelpal:openRelationGraph', handleOpenRelationGraph);
    return () => window.removeEventListener('pixelpal:openRelationGraph', handleOpenRelationGraph);
  }, []);

  // Register built-in and optional plugins once on mount
  useEffect(() => {
    registerBuiltinPlugins();
    registerOptionalPlugins();
  }, []);

  // Resolve the active component
  const resolvePanelComponent = () => {
    if (activePanel === 'plugin') {
      if (activePluginId) {
        const pluginId = activePluginId;
        return function PluginPanelRoute() {
          return (
            <PluginPanel
              pluginId={pluginId}
              splitLayout={isMacSplitPanel('plugin')}
              onBack={() => {
                setActivePluginId(null);
              }}
            />
          );
        };
      }
      return PluginHub;
    }
    if (activePanel === 'scenes') {
      // scenes maps to ChatPanel for now (scene system is chat-based)
      return ChatPanel;
    }
    if (activePanel === 'mall') {
      // mall not in PANEL_COMPONENTS, fall back to chat
      return ChatPanel;
    }
    return PANEL_COMPONENTS[activePanel as keyof typeof PANEL_COMPONENTS] || ChatPanel;
  };

  // Cast to React.FC to handle cases where TypeScript can't infer the component props
  // The resolvePanelComponent function always handles pluginId correctly when needed
  const ActivePanelComponent = resolvePanelComponent() as React.FC<{ splitLayout?: boolean }>;
  const useSplitLayout = isMacSplitPanel(activePanel);

  return (
    <>
      {/* Mobile Drawer - Left side swipe accessible */}
      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpen={() => setMobileDrawerOpen(true)}
      />

      {/* Mobile menu button (top left) */}
      {isMobile && (
        <IconButton
          onClick={() => setMobileDrawerOpen(true)}
          sx={{
            position: 'fixed',
            top: 12,
            left: 8,
            zIndex: 1300,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.7)',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <MacDetailPane>
        <Box
          component="main"
          css={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            pb: isMobile ? '64px' : 0, // Space for bottom tab nav on mobile
          }}
        >
          <ActivePanelComponent splitLayout={useSplitLayout} />
        </Box>
      </MacDetailPane>

      {/* Bottom Tab Navigation for Mobile */}
      {isMobile && <BottomTabNav />}

      {/* Relation Graph Dialog — rendered at root level */}
      <RelationGraph open={relationGraphOpen} onClose={() => setRelationGraphOpen(false)} />

    </>
  );
};

export default MainPage;
