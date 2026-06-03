// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { createMacMuiTheme } from './createMacMuiTheme';

describe('createMacMuiTheme', () => {
  beforeEach(() => {
    document.documentElement.style.setProperty('--bg-base', '#1E1E1E');
    document.documentElement.style.setProperty('--system-blue', '#0A84FF');
    document.documentElement.style.setProperty('--text-primary', '#FFFFFF');
  });

  it('creates dark theme with SF Pro stack', () => {
    const theme = createMacMuiTheme('dark');
    expect(theme.palette?.mode).toBe('dark');
    expect(theme.typography?.fontFamily).toContain('-apple-system');
    expect(theme.shape?.borderRadius).toBe(8);
  });
});
