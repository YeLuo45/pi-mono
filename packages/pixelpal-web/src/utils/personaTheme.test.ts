// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyPersonaTheme, resetPersonaTheme } from './personaTheme';

describe('personaTheme', () => {
  beforeEach(() => {
    resetPersonaTheme();
  });

  afterEach(() => {
    resetPersonaTheme();
  });

  it('writes persona variables and tints --system-blue from accent', () => {
    applyPersonaTheme({
      primaryColor: '#112233',
      secondaryColor: '#445566',
      accentColor: '#AABBCC',
      backgroundColor: '#0a0a0a',
      textColor: '#ffffff',
    });

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--persona-primary')).toBe('#112233');
    expect(root.style.getPropertyValue('--persona-accent')).toBe('#AABBCC');
    expect(root.style.getPropertyValue('--system-blue')).toBe('#AABBCC');
  });

  it('falls back accent to primary for --system-blue when accent empty', () => {
    applyPersonaTheme({
      primaryColor: '#FF5500',
      secondaryColor: '#333333',
      accentColor: '',
      backgroundColor: '#000000',
      textColor: '#eeeeee',
    });

    expect(document.documentElement.style.getPropertyValue('--system-blue')).toBe('#FF5500');
  });

  it('reset removes persona and accent overrides', () => {
    applyPersonaTheme({
      primaryColor: '#111111',
      secondaryColor: '#222222',
      accentColor: '#333333',
      backgroundColor: '#000000',
      textColor: '#ffffff',
    });
    resetPersonaTheme();
    expect(document.documentElement.style.getPropertyValue('--persona-primary')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--system-blue')).toBe('');
  });
});
