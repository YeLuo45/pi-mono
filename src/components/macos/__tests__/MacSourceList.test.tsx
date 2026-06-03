// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MacSourceList } from '../MacSourceList';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/' }),
}));

vi.mock('../../../store', () => ({
  useStore: (selector: (s: { activePanel: string; activePluginId: string | null }) => unknown) =>
    selector({ activePanel: 'chat', activePluginId: null }),
}));

vi.mock('../../../hooks/useNavClick', () => ({
  useNavClick: () => ({
    handleNavClick: vi.fn(),
    handlePluginNavClick: vi.fn(),
  }),
}));

vi.mock('../../../services/plugin/PluginService', () => ({
  PluginService: {
    listPlugins: () => [],
  },
}));

vi.mock('../../Persona/PersonaSelector', () => ({
  PersonaSelector: () => <div data-testid="persona-selector" />,
}));

vi.mock('../../Agent/MultiAgentPanel', () => ({
  MultiAgentPanel: () => null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('MacSourceList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders navigation landmark', () => {
    render(<MacSourceList />);
    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  it('renders workspace nav labels', () => {
    render(<MacSourceList />);
    expect(screen.getByText('nav.chat')).toBeTruthy();
    expect(screen.getByText('nav.evolution')).toBeTruthy();
  });

  it('calls onNavigate when provided', () => {
    const onNavigate = vi.fn();
    render(<MacSourceList onNavigate={onNavigate} />);
    const rows = document.querySelectorAll('button');
    expect(rows.length).toBeGreaterThan(0);
    fireEvent.click(rows[0]);
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
