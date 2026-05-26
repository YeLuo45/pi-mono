import React from 'react';
import { MyTooltip as Tooltip } from '../MUI替代';
import { Box } from '../ui/Box';
import { useTheme } from '../ui/ThemeProvider';
import { Chat as ChatIcon, Psychology as PersonaIcon, SmartToy as AgentIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store';

const TAB_ITEMS = [
  { id: 'chat', label: 'Chat', icon: ChatIcon, route: '/' },
  { id: 'persona', label: 'Persona', icon: PersonaIcon, route: '/persona' },
  { id: 'agent', label: 'Agent', icon: AgentIcon, route: '/agent' },
] as const;

interface BottomTabNavProps {
  onTabChange?: (tabId: string) => void;
}

export const BottomTabNav: React.FC<BottomTabNavProps> = ({ onTabChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activePanel = useStore((s) => s.activePanel);
  const setActivePanel = useStore((s) => s.setActivePanel);
  const theme = useTheme();
  const spacing = theme.spacing;
  const borderRadius = theme.borderRadius;

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === '/' || activePanel === 'chat') return 'chat';
    if (path === '/persona' || activePanel === 'persona') return 'persona';
    if (path === '/agent' || activePanel === 'agent') return 'agent';
    return 'chat';
  };

  const activeTab = getActiveTab();

  const handleTabClick = (tab: typeof TAB_ITEMS[number]) => {
    if (tab.route === '/') {
      setActivePanel('chat');
      navigate('/');
    } else if (tab.id === 'agent') {
      setActivePanel('agent');
      navigate('/agent');
    } else {
      setActivePanel(tab.id as any);
      navigate(tab.route);
    }
    onTabChange?.(tab.id);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: spacing ? spacing(8) : 64,
        bgcolor: 'var(--color-bg-primary, #0f1011)',
        borderTop: '1px solid var(--color-border, rgba(255,255,255,0.05))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 1200,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {TAB_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <Tooltip key={tab.id} title={tab.label} placement="top">
            <Box
              component="button"
              onClick={() => handleTabClick(tab)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing ? spacing(1) : 8,
                minWidth: spacing ? spacing(8) : 64,
                height: spacing ? spacing(7) : 56,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: isActive ? 'primary.main' : 'var(--color-text-secondary, #d0d6e0)',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease',
                borderRadius: borderRadius ? borderRadius.sm : 4,
                '&:hover': {
                  color: isActive ? 'primary.main' : 'var(--color-text-primary, #f7f8f8)',
                  bgcolor: isActive ? 'rgba(94, 106, 210, 0.08)' : 'transparent',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <Icon sx={{ fontSize: 24 }} />
              <Box
                component="span"
                sx={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1,
                  color: isActive ? 'primary.main' : 'inherit',
                }}
              >
                {tab.label}
              </Box>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
};

export default BottomTabNav;
