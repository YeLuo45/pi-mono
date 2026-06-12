/* eslint-disable react-refresh/only-export-components */
/**
 * MyUseTheme.ts — Custom theme hook
 * 
 * A simple theme hook that provides design tokens.
 * Can be extended to work with MUI theme context.
 */

import { useContext, createContext, type ReactNode, type FC } from 'react';

export interface ThemeColors {
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  background: string;
  paper: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  divider: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: (factor: number) => number;
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
  };
  shadows: string[];
  zIndex: {
    modal: number;
    popover: number;
    tooltip: number;
    drawer: number;
  };
}

const defaultTheme: Theme = {
  colors: {
    primary: '#0A84FF',
    secondary: '#AF52DE',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    info: '#007AFF',
    background: '#1E1E1E',
    paper: '#2D2D2D',
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.6)',
      disabled: 'rgba(255, 255, 255, 0.3)',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  spacing: (factor: number) => factor * 8,
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '24px',
    },
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
    '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
    '0 10px 15px rgba(0, 0, 0, 0.07), 0 4px 6px rgba(0, 0, 0, 0.05)',
    '0 20px 25px rgba(0, 0, 0, 0.08), 0 10px 10px rgba(0, 0, 0, 0.04)',
    '0 25px 50px rgba(0, 0, 0, 0.15)',
  ],
  zIndex: {
    modal: 9999,
    popover: 9998,
    tooltip: 9997,
    drawer: 1200,
  },
};

const ThemeContext = createContext<Theme>(defaultTheme);

export interface MyUseThemeProviderProps {
  children: ReactNode;
  theme?: Theme;
}

export const MyUseThemeProvider: FC<MyUseThemeProviderProps> = ({ 
  children, 
  theme = defaultTheme 
}) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): Theme => {
  return useContext(ThemeContext);
};

// Alias for MUI compatibility
export const MyUseTheme = useTheme;

export default useTheme;
