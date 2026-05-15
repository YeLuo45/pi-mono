/**
 * ThemeProvider.tsx — MUI ThemeProvider with CssBaseline
 *
 * Uses @mui/material/styles ThemeProvider so MUI components receive the theme properly.
 * CssBaseline styles are applied via Global from @emotion/react (for custom scrollbar styling).
 */

import { Global, css } from '@emotion/react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ReactNode, createContext, useContext } from 'react';
import { borderRadius } from './design-tokens';

// ============================================================================
// Theme Types (compatible with MUI theme structure)
// ============================================================================

export interface Palette {
  primary: { main: string; light?: string; dark?: string; contrastText?: string };
  secondary: { main: string; contrastText?: string };
  background: { default: string; paper: string };
  text: { primary: string; secondary: string; disabled?: string };
  divider?: string;
  error?: { main: string };
  warning?: { main: string };
  success?: { main: string };
  info?: { main: string };
  mode?: 'light' | 'dark';
  shop?: {
    bgPage: string;
    border: string;
    borderLight: string;
    textMuted: string;
    textLight: string;
    textDark: string;
    accent: string;
    accentHover: string;
    star: string;
    success: string;
  };
}

export interface Typography {
  fontFamily: string;
  fontSize: number;
  h1?: { fontWeight?: number | string; letterSpacing?: string };
  h2?: { fontWeight?: number | string; letterSpacing?: string };
  h3?: { fontWeight?: number | string; letterSpacing?: string };
  h4?: { fontWeight?: number | string; letterSpacing?: string };
  h5?: { fontWeight?: number | string; letterSpacing?: string };
  h6?: { fontWeight?: number | string; letterSpacing?: string };
  subtitle1?: { fontWeight?: number | string };
  subtitle2?: { fontWeight?: number | string };
  body1?: { fontWeight?: number | string };
  body2?: { fontWeight?: number | string };
  button?: { fontWeight?: number | string; textTransform?: string; letterSpacing?: number | string };
  caption?: { fontWeight?: number | string };
  overline?: { fontWeight?: number | string; letterSpacing?: string };
  pxToRem?: (px: number) => string;
  [key: string]: unknown;
}

export interface Shape {
  borderRadius?: number;
}

export interface Spacing {
  (value: number): string;
  0: 0;
  0.5: 4;
  1: 8;
  1.5: 12;
  2: 16;
  2.5: 20;
  3: 24;
  3.5: 28;
  4: 32;
  5: 40;
  6: 48;
  7: 56;
  8: 64;
  9: 72;
  10: 80;
}

export interface BorderRadius {
  none: 0;
  xs: 2;
  sm: 4;
  md: 8;
  lg: 12;
  xl: 16;
  '2xl': 24;
  full: 9999;
}

export interface Shadows {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  inner: string;
}

export interface DesignTokens {
  spacing: Spacing;
  borderRadius: BorderRadius;
  shadows: Shadows;
}

export interface Theme {
  palette: Palette;
  typography: Typography;
  shape: Shape;
  components?: Record<string, { styleOverrides?: Record<string, unknown> }>;
  tokens?: DesignTokens;
  spacing?: Spacing;
  borderRadius?: BorderRadius;
  shadows?: Shadows;
  mode?: 'light' | 'dark';
}

// ============================================================================
// Default Dark Theme (linearDarkTheme) — uses MUI createTheme for full compatibility
// ============================================================================

const darkMuiTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#5e6ad2',
      light: '#7170ff',
      dark: '#4a52b8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#7170ff',
      contrastText: '#ffffff',
    },
    background: {
      default: '#08090a',
      paper: '#0f1011',
    },
    text: {
      primary: '#f7f8f8',
      secondary: '#d0d6e0',
      disabled: '#62666d',
    },
    divider: 'rgba(255, 255, 255, 0.05)',
    error: { main: '#f26875' },
    warning: { main: '#f5c542' },
    success: { main: '#52c775' },
    info: { main: '#5e6ad2' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 590, letterSpacing: '-0.056em' },
    h2: { fontWeight: 590, letterSpacing: '-0.048em' },
    h3: { fontWeight: 590, letterSpacing: '-0.04em' },
    h4: { fontWeight: 510, letterSpacing: '-0.032em' },
    h5: { fontWeight: 510, letterSpacing: '-0.024em' },
    h6: { fontWeight: 510, letterSpacing: '-0.016em' },
    subtitle1: { fontWeight: 510 },
    subtitle2: { fontWeight: 510 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 510, textTransform: 'none', letterSpacing: 0 },
    caption: { fontWeight: 400 },
    overline: { fontWeight: 510, letterSpacing: '0.08em' },
  },
  shape: { borderRadius: borderRadius.md },
  spacing: 8,
  tokens: { spacing, borderRadius, shadows: shadows.dark },
});

export const darkTheme: Theme = darkMuiTheme as unknown as Theme;

// ============================================================================
// Default Light Theme (minimaxLightTheme) — uses MUI createTheme for full compatibility
// ============================================================================

const lightMuiTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1456f0',
      light: '#3daeff',
      dark: '#0d44c7',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ea5ec1',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#222222',
      secondary: '#45515e',
      disabled: '#b8b8b8',
    },
    divider: '#e5e7eb',
    error: { main: '#dc2626' },
    warning: { main: '#d97706' },
    success: { main: '#16a34a' },
    info: { main: '#1456f0' },
    // Extended light theme palette
    shop: {
      bgPage: '#F8FAFC',
      border: '#E5E7EB',
      borderLight: '#F1F5F9',
      textMuted: '#64748B',
      textLight: '#94A3B8',
      textDark: '#1E293B',
      accent: '#6366F1',
      accentHover: '#4F46E5',
      star: '#F59E0B',
      success: '#10B981',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Outfit", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: 14,
    h1: { fontWeight: 590, letterSpacing: '-0.056em' },
    h2: { fontWeight: 590, letterSpacing: '-0.048em' },
    h3: { fontWeight: 590, letterSpacing: '-0.04em' },
    h4: { fontWeight: 510, letterSpacing: '-0.032em' },
    h5: { fontWeight: 510, letterSpacing: '-0.024em' },
    h6: { fontWeight: 510, letterSpacing: '-0.016em' },
    subtitle1: { fontWeight: 510 },
    subtitle2: { fontWeight: 510 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
    button: { fontWeight: 510, textTransform: 'none', letterSpacing: 0 },
    caption: { fontWeight: 400 },
    overline: { fontWeight: 510, letterSpacing: '0.08em' },
  },
  shape: { borderRadius: borderRadius.md },
  spacing: 8,
  tokens: { spacing, borderRadius, shadows: shadows.light },
});

export const lightTheme: Theme = lightMuiTheme as unknown as Theme;

// ============================================================================
// CssBaseline Global Styles
// ============================================================================

const darkCssBaseline = css`
  body {
    margin: 0;
    padding: 0;
    background-color: #08090a;
    color: #f7f8f8;
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }
  *::-webkit-scrollbar {
    width: 6;
    height: 6;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.15);
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

const lightCssBaseline = css`
  body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    color: #222222;
    font-family: "DM Sans", "Outfit", "Helvetica Neue", Helvetica, Arial, sans-serif;
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,0.1) transparent;
  }
  *::-webkit-scrollbar {
    width: 6;
    height: 6;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: rgba(0,0,0,0.1);
    border-radius: 3;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(0,0,0,0.15);
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

// ============================================================================
// Theme Provider Component
// ============================================================================

interface AppThemeProviderProps {
  children: ReactNode;
  theme?: Theme;
}

export const ThemeProvider = ({ children, theme }: AppThemeProviderProps) => {
  const activeTheme = theme || darkTheme;
  const globalCss = activeTheme.palette.mode === 'light' ? lightCssBaseline : darkCssBaseline;

  // Create MUI-compatible theme using createTheme to ensure full compatibility
  const muiTheme = createTheme({
    palette: activeTheme.palette,
    typography: activeTheme.typography,
    shape: activeTheme.shape,
    components: activeTheme.components,
    tokens: activeTheme.tokens,
    spacing: activeTheme.spacing,
    borderRadius: activeTheme.borderRadius,
    shadows: activeTheme.shadows,
  });

  return (
    <MuiThemeProvider theme={muiTheme}>
      <Global styles={globalCss} />
      {children}
    </MuiThemeProvider>
  );
};

// ============================================================================
// useTheme Hook
// ============================================================================

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
};

// Private context
const ThemeContext = createContext<Theme | null>(null);

// Alias for compatibility
export { ThemeContext as MUIThemeContext };

// Re-export types
export type { Theme };
