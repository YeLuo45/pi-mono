import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../store';
import { useMacSplitStore, type SettingsSection } from '../stores/macSplitStore';

interface SettingsSubRouteRedirectProps {
  section: SettingsSection;
}

/** 将 /settings/providers 等子路由并入三栏 Settings 布局 */
export function SettingsSubRouteRedirect({ section }: SettingsSubRouteRedirectProps) {
  const setActivePanel = useStore((s) => s.setActivePanel);
  const setSettingsSection = useMacSplitStore((s) => s.setSettingsSection);

  useEffect(() => {
    setActivePanel('settings');
    setSettingsSection(section);
  }, [section, setActivePanel, setSettingsSection]);

  return <Navigate to="/" replace />;
}
