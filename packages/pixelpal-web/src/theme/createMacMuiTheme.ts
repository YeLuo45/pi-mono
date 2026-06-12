import { createTheme } from '@mui/material/styles';

function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function createMacMuiTheme(mode: 'light' | 'dark') {
  return createTheme({
    palette: {
      mode,
      primary: { main: cssVar('--system-blue', '#007AFF') },
      background: {
        default: cssVar('--bg-base', mode === 'dark' ? '#1E1E1E' : '#FFFFFF'),
        paper: cssVar('--bg-elevated', mode === 'dark' ? '#2D2D2D' : '#F5F5F7'),
      },
      text: {
        primary: cssVar('--text-primary', mode === 'dark' ? '#FFFFFF' : '#000000'),
        secondary: cssVar('--text-secondary', 'rgba(128,128,128,1)'),
      },
      divider: cssVar('--separator', 'rgba(128,128,128,0.2)'),
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
      fontSize: 13,
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: 'var(--font-stack)',
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
          },
        },
      },
    },
  });
}
