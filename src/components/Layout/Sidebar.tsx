import { css } from '@emotion/react';
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box } from '../ui/Box';
import { IconButton, Tooltip } from '@mui/material';
import { ChatIcon, CalendarMonthIcon, CheckBoxIcon, DescriptionIcon, EmailIcon, EditIcon, SettingsIcon, GroupIcon, PsychologyIcon, ExtensionIcon, MemoryIcon, BarChartIcon, HubIcon, ScenesIcon, FlashOnIcon, MultiAgentIcon, ChevronLeftIcon, ChevronRightIcon } from '../ui/muiIconMap';
const CalendarIcon = CalendarMonthIcon;
import { useStore } from '../../store';
import { PluginService } from '../../services/plugin/PluginService';
import { useTranslation } from 'react-i18next';
import { PersonaSelector } from '../Persona/PersonaSelector';
import { MultiAgentPanel } from '../Agent/MultiAgentPanel';

const NAV_ITEMS = [
  { id: 'chat', labelKey: 'nav.chat', icon: ChatIcon },
  { id: 'memory', labelKey: 'nav.memory', icon: MemoryIcon },
  { id: 'calendar', labelKey: 'nav.calendar', icon: CalendarIcon },
  { id: 'tasks', labelKey: 'nav.tasks', icon: CheckBoxIcon },
  { id: 'document', labelKey: 'nav.document', icon: DescriptionIcon },
  { id: 'knowledge', labelKey: 'nav.knowledge', icon: PsychologyIcon },
  { id: 'writing', labelKey: 'nav.writing', icon: EditIcon },
  { id: 'email', labelKey: 'nav.email', icon: EmailIcon },
  { id: 'team', labelKey: 'nav.team', icon: GroupIcon },
  { id: 'analytics', labelKey: 'nav.analytics', icon: BarChartIcon },
  { id: 'graph', labelKey: 'nav.graph', icon: HubIcon },
  { id: 'scenes', labelKey: 'nav.scenes', icon: ScenesIcon },
  { id: 'agent', labelKey: 'nav.agent', icon: FlashOnIcon },
  { id: 'multiagent', labelKey: 'nav.multiAgent', icon: MultiAgentIcon },
  { id: 'tools', labelKey: 'nav.tools', icon: ExtensionIcon },
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
  const [collapsed, setCollapsed] = React.useState(false);

  const isKnowledgeRoute = location.pathname === '/knowledge';
  const [multiAgentOpen, setMultiAgentOpen] = React.useState(false);

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
    } else if ((panelId as string) === 'multiagent') {
      // Open multi-agent panel
      setMultiAgentOpen(true);
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
      css={css`
        width: ${collapsed ? 60 : 160}px;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--color-bg-primary, #0f1011);
        border-right: 1px solid var(--color-border, rgba(255,255,255,0.05));
        flex-shrink: 0;
        overflow: hidden;
        transition: width 0.2s ease;
      `}
    >
      {/* Logo / Title */}
      <Box css={css`padding: 16px; padding-bottom: 8px; display: flex; align-items: center; justify-content: ${collapsed ? 'center' : 'flex-start'};`}>
        {!collapsed && (
          <Box css={css`flex: 1; min-width: 0;`}>
            <Box css={css`font-size: 13px; font-weight: 700; color: #9b7fd4; margin-bottom: 2px;`}>
              PixelPal
            </Box>
            <Box css={css`font-size: 10px; color: rgba(255,255,255,0.5);`}>
              AI Companion
            </Box>
          </Box>
        )}
        <Tooltip title={collapsed ? '展开侧边栏' : '收起侧边栏'} placement="right">
          <IconButton
            size="small"
            onClick={() => setCollapsed(!collapsed)}
            css={css`
              color: rgba(255,255,255,0.4);
              &:hover { color: rgba(255,255,255,0.7); }
            `}
          >
            {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {!collapsed && <Box css={css`opacity: 0.15; margin-left: 8px; margin-right: 8px; margin-bottom: 8px; height: 1px; background: rgba(255,255,255,0.1);`} />}

      {/* Persona Selector */}
      <Box css={css`padding-left: ${collapsed ? 4 : 8}px; padding-bottom: 8px; display: flex; justify-content: center;`}>
        <PersonaSelector collapsed={collapsed} />
      </Box>

      {/* Navigation items */}
      <Box css={css`flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 4px; padding-left: ${collapsed ? 4 : 8}px; padding-right: ${collapsed ? 4 : 8}px;`}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === 'knowledge'
            ? isKnowledgeRoute
            : (activePanel as string) === item.id;
          return (
            <Tooltip key={item.id} title={collapsed ? t(item.labelKey) : ''} placement="right">
              <Box
                component="button"
                onClick={() => handleNavClick(item.id as typeof activePanel)}
                title=""
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: ${collapsed ? 'center' : 'flex-start'};
                  gap: ${collapsed ? 0 : 12}px;
                  padding: ${collapsed ? '8px' : '8px 12px'};
                  min-height: 44px;
                  border-radius: 12px;
                  border: none;
                  cursor: pointer;
                  background: ${isActive ? 'var(--persona-bg, rgba(94, 106, 210, 0.15))' : 'transparent'};
                  color: ${isActive ? 'var(--persona-text, #f7f8f8)' : 'var(--color-text-secondary, #d0d6e0)'};
                  transition: all 0.15s ease;
                  width: 100%;
                  text-align: left;
                  &:hover {
                    background: var(--color-button-hover, rgba(255,255,255,0.05));
                    transform: scale(1.05);
                  }
                `}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <Box css={css`font-size: 12px; font-weight: ${isActive ? 600 : 400};`}>
                    {t(item.labelKey)}
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}

        {/* Plugin nav items */}
        {pluginNavItems.map((plugin) => {
          const Icon = plugin.icon as any;
          const isActive = activePanel === 'plugin';
          return (
            <Box
              key={plugin.id}
              component="button"
              onClick={() => {
                setActivePanel('plugin');
                setActivePluginId(plugin.id);
                onNavigate?.();
              }}
              title=""
              css={css`
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                min-height: 44px;
                border-radius: 12px;
                border: none;
                cursor: pointer;
                background: ${isActive ? 'rgba(94, 106, 210, 0.15)' : 'transparent'};
                color: ${isActive ? '#f7f8f8' : '#d0d6e0'};
                transition: all 0.15s ease;
                width: 100%;
                text-align: left;
                &:hover {
                  background: rgba(255,255,255,0.05);
                  transform: scale(1.05);
                }
              `}
            >
              {typeof Icon === 'string' ? (
                <Box css={css`font-size: 18px; flex-shrink: 0;`}>{Icon}</Box>
              ) : (
                <Icon size={18} style={{ flexShrink: 0 }} />
              )}
              <Box css={css`font-size: 12px; font-weight: ${isActive ? 600 : 400};`}>
                {plugin.label}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Settings at bottom */}
      <Box css={css`padding-left: ${collapsed ? 4 : 8}px; margin-top: auto; display: flex; justify-content: ${collapsed ? 'center' : 'flex-start'};`}>
        <Tooltip title={collapsed ? t('nav.settings') : ''} placement="right">
          <Box
            component="button"
            onClick={() => handleNavClick('settings')}
            title=""
            css={css`
              display: flex;
              align-items: center;
              justify-content: ${collapsed ? 'center' : 'flex-start'};
              gap: ${collapsed ? 0 : 12}px;
              padding: ${collapsed ? '8px' : '8px 12px'};
              min-height: 44px;
              border-radius: 12px;
              border: none;
              cursor: pointer;
              background: ${activePanel === 'settings' ? 'rgba(94, 106, 210, 0.15)' : 'transparent'};
              color: ${activePanel === 'settings' ? '#f7f8f8' : '#d0d6e0'};
              transition: all 0.15s ease;
              width: 100%;
              text-align: left;
              &:hover {
                background: rgba(255,255,255,0.05);
                transform: scale(1.05);
              }
            `}
          >
            <SettingsIcon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <Box css={css`font-size: 12px; font-weight: ${activePanel === 'settings' ? 600 : 400};`}>
                {t('nav.settings')}
              </Box>
            )}
          </Box>
        </Tooltip>
      </Box>

      {/* Multi-Agent Panel */}
      <MultiAgentPanel />
    </Box>
  );
};

export default Sidebar;
