import { useCallback, useEffect } from 'react';
import { applyMacThemePreset, getMacPreset, type MacThemeId } from '../utils/macThemePresets';
import { getSystemTheme } from '../utils/appTheme';

export type MacThemeMode = 'system' | 'light' | 'dark' | MacThemeId;

export interface UseMacThemeOptions {
  mode: MacThemeMode;
  presetId: string;
}

const MAC_THEME_IDS: MacThemeId[] = ['light', 'dark', 'sunset', 'forest'];

function isMacThemeId(id: string): id is MacThemeId {
  return (MAC_THEME_IDS as string[]).includes(id);
}

export function resolvePresetId(mode: MacThemeMode, presetId: string): MacThemeId {
  if (mode === 'system') return getSystemTheme();
  if (mode === 'light' || mode === 'dark' || mode === 'sunset' || mode === 'forest') return mode;
  if (isMacThemeId(presetId)) return presetId;
  return 'dark';
}

export function useMacTheme({ mode, presetId }: UseMacThemeOptions) {
  const apply = useCallback(() => {
    const id = resolvePresetId(mode, presetId);
    const preset = getMacPreset(id);
    if (preset) applyMacThemePreset(preset);
  }, [mode, presetId]);

  useEffect(() => {
    apply();
  }, [apply]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => apply();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, apply]);

  return { apply, resolvedPresetId: resolvePresetId(mode, presetId) };
}
