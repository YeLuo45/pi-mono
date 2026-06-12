/**
 * design-tokens.ts — Design Token System
 * 
 * Centralized design tokens for spacing, borderRadius, shadows, and colors.
 * Tokens are organized by category and support both light/dark modes.
 * 
 * Usage:
 *   import { spacing, borderRadius, shadows, colors } from './design-tokens';
 *   import { useTheme } from './ThemeProvider';
 *   
 *   const theme = useTheme();
 *   // Access colors via theme.palette (MUI standard)
 *   // Access spacing via theme.spacing (if available) or directly from tokens
 */

// ============================================================================
// Spacing (8px base unit)
// ============================================================================

export const spacing: Record<number, number> = {
  0: 0,
  0.5: 4,   // 0.5 * 8 = 4px
  1: 8,     // 1 * 8 = 8px
  1.5: 12,  // 1.5 * 8 = 12px
  2: 16,    // 2 * 8 = 16px
  2.5: 20,  // 2.5 * 8 = 20px
  3: 24,    // 3 * 8 = 24px
  3.5: 28,  // 3.5 * 8 = 28px
  4: 32,    // 4 * 8 = 32px
  5: 40,    // 5 * 8 = 40px
  6: 48,    // 6 * 8 = 48px
  7: 56,    // 7 * 8 = 56px
  8: 64,    // 8 * 8 = 64px
  9: 72,    // 9 * 8 = 72px
  10: 80,   // 10 * 8 = 80px
};

export type SpacingKey = keyof typeof spacing;

// ============================================================================
// Border Radius
// ============================================================================

export const borderRadius: Record<string, number> = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export type BorderRadiusKey = keyof typeof borderRadius;

// ============================================================================
// Shadows
// ============================================================================

export const shadows: Record<string, Record<string, string>> = {
  // Dark theme shadows
  dark: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.24)',
    md: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.24)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.3), 0 4px 6px rgba(0, 0, 0, 0.24)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.3), 0 10px 10px rgba(0, 0, 0, 0.24)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.4)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)',
  },
  // Light theme shadows
  light: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.08)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.08)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.15)',
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
  },
};

export type ShadowKey = keyof typeof shadows.dark;

// ============================================================================
// Dark/Light Theme Token Sets
// These are attached to the Theme interface for convenient access
// ============================================================================

export interface DesignTokens {
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows.light;
}

export const darkTokens: DesignTokens = {
  spacing,
  borderRadius,
  shadows: shadows.dark,
};

export const lightTokens: DesignTokens = {
  spacing,
  borderRadius,
  shadows: shadows.light,
};

// ============================================================================
// Color Palette
// ============================================================================

export const colors = {
  // Primary colors
  primary: {
    dark: {
      main: '#0A84FF',
      light: '#409CFF',
      dark: '#007AFF',
      contrastText: '#ffffff',
    },
    light: {
      main: '#007AFF',
      light: '#409CFF',
      dark: '#0066CC',
      contrastText: '#ffffff',
    },
  },
  // Secondary colors
  secondary: {
    dark: {
      main: '#AF52DE',
      contrastText: '#ffffff',
    },
    light: {
      main: '#AF52DE',
      contrastText: '#ffffff',
    },
  },
  // Background colors
  background: {
    dark: {
      default: '#1E1E1E',
      paper: '#2D2D2D',
    },
    light: {
      default: '#FFFFFF',
      paper: '#F5F5F7',
    },
  },
  // Text colors
  text: {
    dark: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },
    light: {
      primary: '#000000',
      secondary: 'rgba(0, 0, 0, 0.55)',
      disabled: 'rgba(0, 0, 0, 0.25)',
    },
  },
  // Divider colors
  divider: {
    dark: 'rgba(255, 255, 255, 0.05)',
    light: '#e5e7eb',
  },
  // Status colors (shared across themes)
  status: {
    error: { dark: '#f26875', light: '#dc2626' },
    warning: { dark: '#f5c542', light: '#d97706' },
    success: { dark: '#52c775', light: '#16a34a' },
    info: { dark: '#5e6ad2', light: '#1456f0' },
  },
  // Common UI colors
  common: {
    // Dark theme specific
    dark: {
      border: 'rgba(255, 255, 255, 0.08)',
      hoverBackground: 'rgba(255, 255, 255, 0.06)',
      selectedBackground: 'color-mix(in srgb, #0A84FF 20%, transparent)',
      inputBackground: 'rgba(255, 255, 255, 0.04)',
      cardBackground: '#2D2D2D',
      hoverBorder: '#0A84FF',
      placeholder: 'rgba(255, 255, 255, 0.3)',
      icon: 'rgba(255, 255, 255, 0.6)',
      borderStrong: 'rgba(255, 255, 255, 0.12)',
    },
    // Light theme specific
    light: {
      border: 'rgba(0, 0, 0, 0.1)',
      hoverBackground: 'rgba(0, 0, 0, 0.04)',
      selectedBackground: 'color-mix(in srgb, #007AFF 12%, transparent)',
      inputBackground: 'rgba(0, 0, 0, 0.04)',
      cardBackground: '#F5F5F7',
      hoverBorder: '#007AFF',
      placeholder: 'rgba(0, 0, 0, 0.25)',
      icon: 'rgba(0, 0, 0, 0.55)',
      borderStrong: 'rgba(0, 0, 0, 0.15)',
    },
  },
  // Chart colors for Analytics/EmotionCurve
  chart: {
    background: '#1e1e2e',
    border: 'rgba(255, 255, 255, 0.2)',
  },
  // Task priority colors
  priority: {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#F44336',
  },
  // Task status colors
  taskStatus: {
    ai_suggestion: '#9C27B0',
    todo: '#2196F3',
    in_progress: '#FF9800',
    done: '#4CAF50',
  },
  // Intimacy level colors
  intimacy: {
    stranger: '#f44336',    // 0-20: red - 陌生人
    acquaintance: '#ff9800', // 20-40: orange - 熟人
    friend: '#ffeb3b',       // 40-60: yellow - 朋友
    closeFriend: '#4caf50',  // 60-80: green - 挚友
    soulmate: '#9c27b0',    // 80-100: purple - 灵魂伴侣
  },
};

export type Colors = typeof colors;
