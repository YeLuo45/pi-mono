// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMacTheme } from './useMacTheme';

describe('useMacTheme', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies dark preset when mode is dark', () => {
    const { result } = renderHook(() => useMacTheme({ mode: 'dark', presetId: 'dark' }));
    act(() => result.current.apply());
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('uses system light when mode is system and prefers light', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const { result } = renderHook(() => useMacTheme({ mode: 'system', presetId: 'dark' }));
    act(() => result.current.apply());
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
