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
      main: '#5e6ad2',
      light: '#7170ff',
      dark: '#4a52b8',
      contrastText: '#ffffff',
    },
    light: {
      main: '#1456f0',
      light: '#3daeff',
      dark: '#0d44c7',
      contrastText: '#ffffff',
    },
  },
  // Secondary colors
  secondary: {
    dark: {
      main: '#7170ff',
      contrastText: '#ffffff',
    },
    light: {
      main: '#ea5ec1',
      contrastText: '#ffffff',
    },
  },
  // Background colors
  background: {
    dark: {
      default: '#08090a',
      paper: '#0f1011',
    },
    light: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
  // Text colors
  text: {
    dark: {
      primary: '#f7f8f8',
      secondary: '#d0d6e0',
      disabled: '#62666d',
    },
    light: {
      primary: '#222222',
      secondary: '#45515e',
      disabled: '#b8b8b8',
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
      border: 'rgba(255, 255, 255, 0.05)',
      hoverBackground: 'rgba(255, 255, 255, 0.05)',
      selectedBackground: 'rgba(94, 106, 210, 0.2)',
      inputBackground: '#191a1b',
      cardBackground: '#0f1011',
      hoverBorder: '#5e6ad2',
      placeholder: '#62666d',
      icon: '#8a8f98',
      borderStrong: 'rgba(255, 255, 255, 0.1)',
    },
    // Light theme specific
    light: {
      border: '#e5e7eb',
      hoverBackground: '#f5f5f5',
      selectedBackground: 'rgba(20, 86, 240, 0.1)',
      inputBackground: '#f0f0f0',
      cardBackground: '#ffffff',
      hoverBorder: '#1456f0',
      placeholder: '#8e8e93',
      icon: '#8e8e93',
      borderStrong: '#b8b8b8',
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
