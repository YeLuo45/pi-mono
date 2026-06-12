import { css } from '@emotion/react';
import type { ComponentType, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  NAV_GROUP_LABEL_KEYS,
  getNavItemsForGroup,
  type NavGroupId,
} from '../../config/navItems';
import { useNavClick } from '../../hooks/useNavClick';
import { PluginService } from '../../services/plugin/PluginService';
import { useStore } from '../../store';
import { PersonaSelector } from '../Persona/PersonaSelector';
import { MultiAgentPanel } from '../Agent/MultiAgentPanel';
import { MacListRow } from './MacListRow';

const GROUP_ORDER: NavGroupId[] = ['workspace', 'tools', 'other'];

interface MacSourceListProps {
  onNavigate?: () => void;
}

export function MacSourceList({ onNavigate }: MacSourceListProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const activePanel = useStore((s) => s.activePanel);
  const activePluginId = useStore((s) => s.activePluginId);
  const { handleNavClick, handlePluginNavClick } = useNavClick({ onNavigate });

  const isKnowledgeRoute = location.pathname === '/knowledge';

  const pluginNavItems = PluginService.listPlugins()
    .filter((p) => p.capabilities.some((c) => c.type === 'panel'))
    .map((p) => ({ id: p.id, label: p.name, icon: p.icon }));

  const isItemActive = (itemId: string) => {
    if (itemId === 'knowledge') {
      return isKnowledgeRoute;
    }
    if (itemId === 'graph' || itemId === 'multiagent') {
      return false;
    }
    return activePanel === itemId;
  };

  return (
    <div
      role="navigation"
      aria-label={t('nav.menu', 'Menu')}
      css={css({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--separator)',
      })}
    >
      <div css={css({ padding: 'var(--space-3) var(--space-2) var(--space-2)' })}>
        <PersonaSelector />
      </div>

      <div
        css={css({
          flex: 1,
          overflowY: 'auto',
          padding: '0 var(--space-2) var(--space-2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        })}
      >
        {GROUP_ORDER.map((groupId) => {
          const items = getNavItemsForGroup(groupId);

          return (
            <section key={groupId}>
              <h2
                css={css({
                  margin: '0 0 var(--space-1)',
                  padding: '0 var(--space-3)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  letterSpacing: '0.02em',
                  color: 'var(--text-tertiary)',
                  fontFamily: 'var(--font-stack)',
                  textTransform: 'none',
                })}
              >
                {t(NAV_GROUP_LABEL_KEYS[groupId])}
              </h2>
              <div
                css={css({
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                })}
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  const selected = isItemActive(item.id);

                  return (
                    <MacListRow
                      key={item.id}
                      title={t(item.labelKey)}
                      icon={<Icon size={16} />}
                      selected={selected}
                      onClick={() => handleNavClick(item.id as Parameters<typeof handleNavClick>[0])}
                    />
                  );
                })}

                {groupId === 'tools' &&
                  pluginNavItems.map((plugin) => {
                    const Icon = plugin.icon as ComponentType<{ size?: number; style?: CSSProperties }> | string;
                    const selected = activePanel === 'plugin' && activePluginId === plugin.id;

                    return (
                      <MacListRow
                        key={plugin.id}
                        title={plugin.label}
                        icon={
                          typeof Icon === 'string' ? (
                            <span css={css({ fontSize: 'var(--text-base)' })}>{Icon}</span>
                          ) : (
                            <Icon size={16} />
                          )
                        }
                        selected={selected}
                        onClick={() => handlePluginNavClick(plugin.id)}
                      />
                    );
                  })}
              </div>
            </section>
          );
        })}
      </div>

      <MultiAgentPanel />
    </div>
  );
}
