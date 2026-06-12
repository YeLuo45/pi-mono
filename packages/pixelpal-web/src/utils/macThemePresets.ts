export type MacThemeId = 'light' | 'dark' | 'sunset' | 'forest';

export interface MacThemePreset {
  id: MacThemeId;
  label: string;
  dataTheme: string;
  variables: Record<string, string>;
}

/** macOS 语义 token — sunset/forest 覆盖 accent/background，结构不变 */
export const MAC_THEME_PRESETS: MacThemePreset[] = [
  {
    id: 'light',
    label: '浅色',
    dataTheme: 'light',
    variables: {
      '--bg-base': '#FFFFFF',
      '--bg-elevated': '#F5F5F7',
      '--bg-sidebar': 'rgba(246, 246, 246, 0.72)',
      '--bg-input': 'rgba(0, 0, 0, 0.04)',
      '--bg-hover': 'rgba(0, 0, 0, 0.04)',
      '--bg-active': 'rgba(0, 0, 0, 0.08)',
      '--text-primary': '#000000',
      '--text-secondary': 'rgba(0, 0, 0, 0.55)',
      '--text-tertiary': 'rgba(0, 0, 0, 0.25)',
      '--separator': 'rgba(0, 0, 0, 0.1)',
      '--system-blue': '#007AFF',
    },
  },
  {
    id: 'dark',
    label: '深色',
    dataTheme: 'dark',
    variables: {
      '--bg-base': '#1E1E1E',
      '--bg-elevated': '#2D2D2D',
      '--bg-sidebar': 'rgba(30, 30, 30, 0.72)',
      '--bg-input': 'rgba(255, 255, 255, 0.04)',
      '--bg-hover': 'rgba(255, 255, 255, 0.06)',
      '--bg-active': 'rgba(255, 255, 255, 0.08)',
      '--text-primary': '#FFFFFF',
      '--text-secondary': 'rgba(255, 255, 255, 0.6)',
      '--text-tertiary': 'rgba(255, 255, 255, 0.3)',
      '--separator': 'rgba(255, 255, 255, 0.08)',
      '--system-blue': '#0A84FF',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    dataTheme: 'sunset',
    variables: {
      '--bg-base': '#1A1410',
      '--bg-elevated': '#2D1F15',
      '--bg-sidebar': 'rgba(26, 20, 16, 0.85)',
      '--bg-input': 'rgba(255, 255, 255, 0.05)',
      '--bg-hover': 'rgba(249, 115, 22, 0.08)',
      '--bg-active': 'rgba(249, 115, 22, 0.12)',
      '--text-primary': '#F5E6D3',
      '--text-secondary': '#B8998A',
      '--text-tertiary': 'rgba(184, 153, 138, 0.5)',
      '--separator': 'rgba(74, 53, 37, 0.8)',
      '--system-blue': '#F97316',
    },
  },
  {
    id: 'forest',
    label: 'Forest',
    dataTheme: 'forest',
    variables: {
      '--bg-base': '#0F1A14',
      '--bg-elevated': '#1A2D20',
      '--bg-sidebar': 'rgba(15, 26, 20, 0.85)',
      '--bg-input': 'rgba(255, 255, 255, 0.05)',
      '--bg-hover': 'rgba(34, 197, 94, 0.08)',
      '--bg-active': 'rgba(34, 197, 94, 0.12)',
      '--text-primary': '#E0F0E8',
      '--text-secondary': '#8AB89A',
      '--text-tertiary': 'rgba(138, 184, 154, 0.5)',
      '--separator': 'rgba(45, 74, 53, 0.8)',
      '--system-blue': '#22C55E',
    },
  },
];

export function getMacPreset(id: string): MacThemePreset | undefined {
  return MAC_THEME_PRESETS.find((p) => p.id === id);
}

export function mapPresetToSemanticTokens(preset: MacThemePreset): Record<string, string> {
  return { ...preset.variables };
}

export function applyMacThemePreset(preset: MacThemePreset): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', preset.dataTheme);
  Object.entries(mapPresetToSemanticTokens(preset)).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}
