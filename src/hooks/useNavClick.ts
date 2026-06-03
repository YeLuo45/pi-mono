import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';

type ActivePanel = ReturnType<typeof useStore.getState>['activePanel'];

export type NavPanelId = ActivePanel | 'graph' | 'multiagent';

export interface UseNavClickOptions {
  onNavigate?: () => void;
  onMultiAgentOpen?: () => void;
}

export function useNavClick(options: UseNavClickOptions = {}) {
  const navigate = useNavigate();
  const setActivePanel = useStore((s) => s.setActivePanel);
  const setActivePluginId = useStore((s) => s.setActivePluginId);
  const { onNavigate, onMultiAgentOpen } = options;

  const handleNavClick = useCallback(
    (panelId: NavPanelId) => {
      if (panelId === 'knowledge') {
        navigate('/knowledge');
        setActivePanel('knowledge');
      } else if (panelId === 'plugin') {
        setActivePanel(panelId);
        setActivePluginId(null);
      } else if (panelId === 'graph') {
        window.dispatchEvent(new CustomEvent('pixelpal:openRelationGraph'));
      } else if (panelId === 'multiagent') {
        onMultiAgentOpen?.();
      } else {
        setActivePanel(panelId);
      }
      onNavigate?.();
    },
    [navigate, onMultiAgentOpen, onNavigate, setActivePanel, setActivePluginId],
  );

  const handlePluginNavClick = useCallback(
    (pluginId: string) => {
      setActivePanel('plugin');
      setActivePluginId(pluginId);
      onNavigate?.();
    },
    [onNavigate, setActivePanel, setActivePluginId],
  );

  return { handleNavClick, handlePluginNavClick };
}
