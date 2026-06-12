/**
 * App-Level Theme System (V33)
 * Provides preset themes and custom theme support for the application.
 * Themes are applied via data-theme attribute on :root and CSS variables.
 */

export interface AppThemePreset {
  id: string;
  name: 'light' | 'dark' | 'sunset' | 'forest';
  label: string;
  variables: Record<string, string>;
}

/**
 * @deprecated Use `MAC_THEME_PRESETS` from `macThemePresets` and `useMacTheme` instead.
 */
export const APP_THEME_PRESETS: AppThemePreset[] = [
  {
    id: 'light',
    name: 'light',
    label: '明亮',
    variables: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f5f5f5',
      '--text-primary': '#1a1a1a',
      '--text-secondary': '#666666',
      '--border-color': '#e0e0e0',
      '--accent-color': '#6366f1',
      '--shadow': '0 2px 8px rgba(0,0,0,0.1)',
    },
  },
  {
    id: 'dark',
    name: 'dark',
    label: '暗黑',
    variables: {
      '--bg-primary': '#121212',
      '--bg-secondary': '#1e1e1e',
      '--text-primary': '#e0e0e0',
      '--text-secondary': '#999999',
      '--border-color': '#333333',
      '--accent-color': '#8b5cf6',
      '--shadow': '0 2px 8px rgba(0,0,0,0.4)',
    },
  },
  {
    id: 'sunset',
    name: 'sunset',
    label: ' Sunset',
    variables: {
      '--bg-primary': '#1a1410',
      '--bg-secondary': '#2d1f15',
      '--text-primary': '#f5e6d3',
      '--text-secondary': '#b8998a',
      '--border-color': '#4a3525',
      '--accent-color': '#f97316',
      '--shadow': '0 2px 8px rgba(0,0,0,0.5)',
    },
  },
  {
    id: 'forest',
    name: 'forest',
    label: ' Forest',
    variables: {
      '--bg-primary': '#0f1a14',
      '--bg-secondary': '#1a2d20',
      '--text-primary': '#e0f0e8',
      '--text-secondary': '#8ab89a',
      '--border-color': '#2d4a35',
      '--accent-color': '#22c55e',
      '--shadow': '0 2px 8px rgba(0,0,0,0.5)',
    },
  },
];

/**
 * Get a preset by ID.
 */
export function getPresetById(id: string): AppThemePreset | undefined {
  return APP_THEME_PRESETS.find((p) => p.id === id);
}

/**
 * Apply a theme preset to :root via data-theme attribute and CSS variables.
 * @deprecated Use `applyMacThemePreset` from `macThemePresets` and `useMacTheme` instead.
 */
export function applyAppTheme(preset: AppThemePreset): void {
  const root = document.documentElement;

  // Set data-theme attribute for CSS selectors like :root[data-theme="dark"]
  root.setAttribute('data-theme', preset.name);

  // Apply all CSS variables from the preset
  Object.entries(preset.variables).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
}

/**
 * Remove app theme — reset to default (no data-theme attribute).
 * This falls back to the base :root CSS variable values.
 */
export function resetToDefault(): void {
  const root = document.documentElement;
  root.removeAttribute('data-theme');

  // Reset all app-level CSS variables to their defaults
  const defaultVars: Record<string, string> = {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f5f5f5',
    '--text-primary': '#1a1a1a',
    '--text-secondary': '#666666',
    '--border-color': '#e0e0e0',
    '--accent-color': '#6366f1',
    '--shadow': '0 2px 8px rgba(0,0,0,0.1)',
  };

  Object.entries(defaultVars).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
}

/**
 * Apply a custom theme (user-defined colors).
 * Uses the same CSS variable names with custom values.
 */
export function applyCustomTheme(theme: AppThemePreset): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'custom');
  Object.entries(theme.variables).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
}

/**
 * Get the system theme via window.matchMedia.
 * Returns 'light' or 'dark'.
 */
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Create a custom theme preset from color inputs.
 */
export function createCustomPreset(colors: {
  background: string;
  text: string;
  accent: string;
  border: string;
}): AppThemePreset {
  return {
    id: 'custom',
    name: 'light', // base name, data-theme will be 'custom'
    label: '自定义',
    variables: {
      '--bg-primary': colors.background,
      '--bg-secondary': adjustBrightness(colors.background, 0.95),
      '--text-primary': colors.text,
      '--text-secondary': adjustBrightness(colors.text, 1.3),
      '--border-color': colors.border,
      '--accent-color': colors.accent,
      '--shadow': `0 2px 8px ${colors.background}33`,
      '--bg-base': colors.background,
      '--bg-elevated': adjustBrightness(colors.background, 0.95),
      '--bg-sidebar': colors.background,
      '--bg-input': 'rgba(255, 255, 255, 0.05)',
      '--bg-hover': 'rgba(255, 255, 255, 0.06)',
      '--bg-active': 'rgba(255, 255, 255, 0.08)',
      '--text-tertiary': adjustBrightness(colors.text, 1.6),
      '--separator': colors.border,
      '--system-blue': colors.accent,
    },
  };
}

/**
 * Simple brightness adjustment for generating secondary colors.
 * factor > 1 = lighter, factor < 1 = darker
 */
function adjustBrightness(hex: string, factor: number): string {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  const adjust = (c: number) => Math.min(255, Math.floor(c * factor));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}
