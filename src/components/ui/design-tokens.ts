/**
 * design-tokens.ts — Design Token System
 * 
 * Centralized design tokens for spacing, borderRadius, and shadows.
 * Tokens are organized by category and support both light/dark modes.
 * 
 * Usage:
 *   import { spacing, borderRadius, shadows, darkTokens, lightTokens } from './design-tokens';
 *   import { useTheme } from './ThemeProvider';
 *   
 *   const theme = useTheme();
 *   const tokens = theme.darkTokens; // or theme.lightTokens
 */

// ============================================================================
// Spacing (8px base unit)
// ============================================================================

export const spacing = {
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
} as const;

export type SpacingKey = keyof typeof spacing;

// ============================================================================
// Border Radius
// ============================================================================

export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export type BorderRadiusKey = keyof typeof borderRadius;

// ============================================================================
// Shadows
// ============================================================================

export const shadows = {
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
} as const;

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
