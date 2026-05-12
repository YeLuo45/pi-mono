import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Tooltip, Divider } from '@mui/material';
import { Chat as ChatIcon, CalendarMonth as CalendarIcon, CheckBox as TaskIcon, Description as DocIcon, Email as EmailIcon, Edit as WriteIcon, Settings as SettingsIcon, Group as GroupIcon, Psychology as KnowledgeIcon, Extension as PluginIcon, Memory as MemoryIcon, BarChart as AnalyticsIcon, Hub as GraphIcon, AutoAwesome as ScenesIcon, FlashOn as AgentIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { PluginService } from '../../services/plugin/PluginService';
import { useTranslation } from 'react-i18next';
import { PersonaSelector } from '../Persona/PersonaSelector';

const NAV_ITEMS = [
  { id: 'chat', labelKey: 'nav.chat', icon: ChatIcon },
  { id: 'memory', labelKey: 'nav.memory', icon: MemoryIcon },
  { id: 'calendar', labelKey: 'nav.calendar', icon: CalendarIcon },
  { id: 'tasks', labelKey: 'nav.tasks', icon: TaskIcon },
  { id: 'document', labelKey: 'nav.document', icon: DocIcon },
  { id: 'knowledge', labelKey: 'nav.knowledge', icon: KnowledgeIcon },
  { id: 'writing', labelKey: 'nav.writing', icon: WriteIcon },
  { id: 'email', labelKey: 'nav.email', icon: EmailIcon },
  { id: 'team', labelKey: 'nav.team', icon: GroupIcon },
  { id: 'analytics', labelKey: 'nav.analytics', icon: AnalyticsIcon },
  { id: 'graph', labelKey: 'nav.graph', icon: GraphIcon },
  { id: 'scenes', labelKey: 'nav.scenes', icon: ScenesIcon },
  { id: 'agent', labelKey: 'nav.agent', icon: AgentIcon },
  { id: 'settings', labelKey: 'nav.settings', icon: SettingsIcon },
] as const;

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const activePanel = useStore((s) => s.activePanel);
  const setActivePanel = useStore((s) => s.setActivePanel);
  const setActivePluginId = useStore((s) => s.setActivePluginId);

  const isKnowledgeRoute = location.pathname === '/knowledge';

  const handleNavClick = (panelId: typeof activePanel) => {
    if (panelId === 'knowledge') {
      // Navigate to the dedicated knowledge page route
      navigate('/knowledge');
      setActivePanel('knowledge');
    } else if (panelId === 'plugin') {
      setActivePanel(panelId);
      setActivePluginId(null);
    } else if ((panelId as string) === 'graph') {
      // RelationGraph is a dialog, not a panel — fire event to open it
      window.dispatchEvent(new CustomEvent('pixelpal:openRelationGraph'));
    } else {
      setActivePanel(panelId);
    }
    onNavigate?.();
  };

  // Get registered plugin nav items with badges
  const pluginNavItems = PluginService.listPlugins()
    .filter((p) => p.capabilities.some((c) => c.type === 'panel'))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }));

  return (
    <Box
      sx={{
        width: 160,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'var(--color-bg-primary, #0f1011)',
        borderRight: '1px solid var(--color-border, rgba(255,255,255,0.05))',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo / Title */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>
          PixelPal
        </Typography>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
          AI Companion
        </Typography>
      </Box>

      <Divider sx={{ opacity: 0.15, mx: 1, mb: 1 }} />

      {/* Persona Selector */}
      <Box sx={{ px: 1, pb: 1 }}>
        <PersonaSelector collapsed={false} />
      </Box>

      {/* Navigation items */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0.5, px: 1 }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'knowledge' 
            ? isKnowledgeRoute 
            : (activePanel as string) === item.id;
          return (
            <Tooltip key={item.id} title="" placement="right">
              <Box
                component="button"
                onClick={() => handleNavClick(item.id as typeof activePanel)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  minHeight: 44,
                  borderRadius: 1.5,
                  border: 'none',
                  cursor: 'pointer',
                  bgcolor: isActive ? 'var(--persona-bg, rgba(94, 106, 210, 0.15))' : 'transparent',
                  color: isActive ? 'var(--persona-text, #f7f8f8)' : 'var(--color-text-secondary, #d0d6e0)',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  textAlign: 'left',
                  '&:hover': {
                    bgcolor: 'var(--color-button-hover, rgba(255,255,255,0.05))',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <Icon sx={{ fontSize: 18, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>
                  {t(item.labelKey)}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {/* Plugin nav items */}
        {pluginNavItems.map((plugin) => {
          const Icon = plugin.icon as any;
          const isActive = activePanel === 'plugin';
          return (
            <Tooltip key={plugin.id} title="" placement="right">
              <Box
                component="button"
                onClick={() => {
                  setActivePanel('plugin');
                  setActivePluginId(plugin.id);
                  onNavigate?.();
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  px: 1.5,
                  py: 1,
                  minHeight: 44,
                  borderRadius: 1.5,
                  border: 'none',
                  cursor: 'pointer',
                  bgcolor: isActive ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
                  color: isActive ? '#f7f8f8' : '#d0d6e0',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  textAlign: 'left',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                {typeof Icon === 'string' ? (
                  <Typography sx={{ fontSize: 18, flexShrink: 0 }}>{Icon}</Typography>
                ) : (
                  <Icon sx={{ fontSize: 18, flexShrink: 0 }} />
                )}
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>
                  {plugin.label}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Settings at bottom */}
      <Box sx={{ px: 1, mt: 'auto' }}>
        <Tooltip title="" placement="right">
          <Box
            component="button"
                onClick={() => handleNavClick('settings')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 1.5,
              py: 1,
              minHeight: 44,
              borderRadius: 1.5,
              border: 'none',
              cursor: 'pointer',
              bgcolor: activePanel === 'settings' ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
              color: activePanel === 'settings' ? '#f7f8f8' : '#d0d6e0',
              transition: 'all 0.15s ease',
              width: '100%',
              textAlign: 'left',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.05)',
                transform: 'scale(1.05)',
              },
            }}
          >
            <SettingsIcon sx={{ fontSize: 18, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ fontSize: 12, fontWeight: activePanel === 'settings' ? 600 : 400 }}>
              {t('nav.settings')}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Sidebar;
