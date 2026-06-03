import { describe, it, expect } from 'vitest';
import { MAC_THEME_PRESETS, getMacPreset, mapPresetToSemanticTokens } from './macThemePresets';

describe('macThemePresets', () => {
  it('includes system presets and sunset/forest', () => {
    const ids = MAC_THEME_PRESETS.map((p) => p.id);
    expect(ids).toContain('light');
    expect(ids).toContain('dark');
    expect(ids).toContain('sunset');
    expect(ids).toContain('forest');
  });

  it('maps sunset to semantic bg and accent tokens', () => {
    const mapped = mapPresetToSemanticTokens(getMacPreset('sunset')!);
    expect(mapped['--bg-base']).toBeTruthy();
    expect(mapped['--system-blue']).toBeTruthy();
  });
});
