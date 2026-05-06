import React, { useState, useEffect } from 'react';
import { Box, Drawer, useMediaQuery, IconButton } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { Sidebar } from '../components/Layout/Sidebar';
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
import { registerBuiltinPlugins, registerOptionalPlugins } from '../plugins';
import { useStore } from '../store';
import { RelationGraph } from '../components/Graph/RelationGraph';

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
  graph: () => null, // RelationGraph is rendered as a dialog at root level
} as const;

export const MainPage: React.FC = () => {
  const activePanel = useStore((s) => s.activePanel);
  const activePluginId = useStore((s) => s.activePluginId);
  const setActivePluginId = useStore((s) => s.setActivePluginId);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [relationGraphOpen, setRelationGraphOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Listen for relation graph open event from Sidebar
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
        return () => (
          <PluginPanel
            pluginId={activePluginId}
            onBack={() => {
              setActivePluginId(null);
            }}
          />
        );
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

  const ActivePanelComponent = resolvePanelComponent();

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'rgba(10, 5, 20, 1)' }}>
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile drawer */}
      {isMobile && (
        <>
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ position: 'fixed', top: 12, left: 8, zIndex: 1300, bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            disableEnforceFocus
            hideBackdrop
            sx={{
              '& .MuiDrawer-paper': {
                bgcolor: 'rgba(15, 10, 30, 0.98)',
                width: 260,
                pt: 2,
                touchAction: 'none',
              },
            }}
          >
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </Drawer>
        </>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          ml: isMobile ? 0 : '0 !important',
        }}
      >
        {/* Panel */}
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: isMobile ? '100%' : 480,
            mx: 'auto',
            width: '100%',
            bgcolor: 'rgba(15, 10, 30, 0.92)',
            borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
            backgroundImage: 'linear-gradient(180deg, rgba(20,10,40,0.3) 0%, rgba(15,10,30,0.95) 100%)',
          }}
        >
          {/* Top divider line */}
          <Box sx={{ height: 1, bgcolor: 'rgba(155, 127, 212, 0.15)' }} />
          <ActivePanelComponent />
        </Box>
      </Box>

      {/* Relation Graph Dialog — rendered at root level */}
      <RelationGraph open={relationGraphOpen} onClose={() => setRelationGraphOpen(false)} />
    </Box>
  );
};

export default MainPage;
