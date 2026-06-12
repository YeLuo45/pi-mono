/**
 * ThemeProvider.tsx — MUI ThemeProvider with CssBaseline
 *
 * Uses @mui/material/styles ThemeProvider so MUI components receive the theme properly.
 * CssBaseline styles are applied via Global from @emotion/react (for custom scrollbar styling).
 */

import { Global, css } from '@emotion/react';
import {
  createTheme,
  ThemeProvider as MuiThemeProvider,
  type Theme as MuiTheme,
} from '@mui/material/styles';
import { ReactNode, createContext, useContext, useMemo } from 'react';
import { createMacMuiTheme } from '../../theme/createMacMuiTheme';
import { borderRadius, shadows } from './design-tokens';

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

function isMuiTheme(theme: Theme | MuiTheme): theme is MuiTheme {
  return typeof (theme as MuiTheme).breakpoints?.up === 'function';
}

function toLegacyTheme(muiTheme: MuiTheme): Theme {
  const mode = muiTheme.palette.mode === 'light' ? 'light' : 'dark';
  return {
    palette: muiTheme.palette as Palette,
    typography: muiTheme.typography as Typography,
    shape: muiTheme.shape as Shape,
    mode,
    tokens: {
      spacing: muiTheme.spacing as unknown as Spacing,
      borderRadius: borderRadius as BorderRadius,
      shadows: mode === 'light' ? shadows.light : shadows.dark,
    },
    spacing: muiTheme.spacing as unknown as Spacing,
    borderRadius: borderRadius as BorderRadius,
    shadows: mode === 'light' ? shadows.light : shadows.dark,
  };
}

// ============================================================================
// CssBaseline Global Styles (scrollbar + body via CSS variables)
// ============================================================================

const darkCssBaseline = css`
  body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-stack, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif);
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.15);
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
`;

const lightCssBaseline = css`
  body {
    margin: 0;
    padding: 0;
    background-color: var(--bg-base);
    color: var(--text-primary);
    font-family: var(--font-stack, -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif);
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
  }
  *::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  *::-webkit-scrollbar-track {
    background: transparent;
  }
  *::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 3px;
  }
  *::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.15);
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
  /** MUI Theme from createMacMuiTheme/createTheme, or legacy app theme object */
  theme?: Theme | MuiTheme;
  /** When theme is omitted, build from macOS CSS tokens */
  mode?: 'light' | 'dark';
}

export const ThemeProvider = ({ children, theme, mode }: AppThemeProviderProps) => {
  const muiTheme = useMemo(() => {
    if (theme) {
      if (isMuiTheme(theme)) return theme;
      return createTheme({
        palette: theme.palette,
        typography: theme.typography,
        shape: theme.shape,
        components: theme.components,
        // @ts-expect-error extended app theme fields
        tokens: theme.tokens,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius,
        shadows: theme.shadows,
      });
    }
    return createMacMuiTheme(mode ?? 'dark');
  }, [theme, mode]);

  const contextTheme = useMemo(() => {
    if (theme && !isMuiTheme(theme)) return theme;
    return toLegacyTheme(muiTheme);
  }, [theme, muiTheme]);

  const globalCss = muiTheme.palette.mode === 'light' ? lightCssBaseline : darkCssBaseline;

  return (
    <ThemeContext.Provider value={contextTheme}>
      <MuiThemeProvider theme={muiTheme}>
        <Global styles={globalCss} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
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

/** Back-compat for tests and legacy imports — prefer createMacMuiTheme() */
export const darkTheme = createMacMuiTheme('dark') as unknown as Theme;
export const lightTheme = createMacMuiTheme('light') as unknown as Theme;
