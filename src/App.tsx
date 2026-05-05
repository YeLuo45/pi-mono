import { useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { MainPage } from './pages/MainPage';
import { useStore } from './store';
import type { EmailAccount } from './types';
import { initCompanion } from './services/companion';
import { compactMemory } from './services/memory';
import { checkGreeting, checkReminders } from './services/actions/ActionTrigger';
import { applyPersonaTheme, resetPersonaTheme } from './utils/personaTheme';
import { getAllPersonas } from './services/persona/personaStorage';
import { generateYesterdaySummaryIfNeeded } from './services/summary/dailySummary';
import { applyAppTheme, getPresetById, getSystemTheme, resetToDefault, applyCustomTheme } from './utils/appTheme';
import './services/i18n';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#9B7FD4',
      light: '#C4A8E0',
      dark: '#6B4FA0',
    },
    secondary: {
      main: '#FF6B9D',
    },
    background: {
      default: '#0A0514',
      paper: '#1A1028',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.6)',
    },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.1) transparent',
        },
        '*::-webkit-scrollbar': {
          width: 6,
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1A1028',
          backgroundImage: 'none',
        },
        root: {
          '&.MuiDialog-fullScreen': {
            '& .MuiDialog-paper': {
              margin: 0,
              padding: 0,
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: 0,
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-root': {
            paddingTop: 8,
            paddingBottom: 8,
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        input: {
          padding: '10px 12px',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 44,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 32,
        },
      },
    },
  },
});

function App() {
  const setEmailAccount = useStore((s) => s.setEmailAccount);
  const setActivePanel = useStore((s) => s.setActivePanel);
  const companion = useStore((s) => s.companion);
  const personaFollowTheme = useStore((s) => s.personaFollowTheme);
  const activePersonaId = useStore((s) => s.activePersonaId);

  // V33: App theme state
  const appThemeMode = useStore((s) => s.appThemeMode);
  const appThemePresetId = useStore((s) => s.appThemePresetId);
  const customTheme = useStore((s) => s.customTheme);

  // V33: Apply app theme on mount + listen for system theme changes
  useEffect(() => {
    // Determine effective preset based on mode
    let effectivePresetId = appThemePresetId;
    if (appThemeMode === 'system') {
      effectivePresetId = getSystemTheme(); // 'light' or 'dark'
    }

    // Apply the determined preset
    if (effectivePresetId === 'custom' && customTheme) {
      applyCustomTheme(customTheme);
    } else {
      const preset = getPresetById(effectivePresetId);
      if (preset) {
        applyAppTheme(preset);
      } else {
        resetToDefault();
      }
    }
  }, [appThemeMode, appThemePresetId, customTheme]);

  // V33: Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (appThemeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Re-apply app theme with the new system theme
      const preset = getPresetById(e.matches ? 'dark' : 'light');
      if (preset) applyAppTheme(preset);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [appThemeMode]);

  // Initialize companion service and memory on startup
  useEffect(() => {
    const init = async () => {
      await initCompanion(companion.personaId, companion.moodId, companion.customName);
      // Compact memory if needed (runs in background)
      compactMemory().catch(() => {});
      // Trigger proactive actions on app open
      checkGreeting();
      checkReminders();
      
      // V32: Generate yesterday's summary if > 24 hours since last summary
      generateYesterdaySummaryIfNeeded().catch(() => {});

      // Apply initial persona theme if enabled
      if (personaFollowTheme) {
        const persona = getAllPersonas().find((p) => p.id === activePersonaId);
        if (persona?.theme) {
          applyPersonaTheme(persona.theme);
        }
      } else {
        resetPersonaTheme();
      }

      // Intimacy decay: check last active time for each persona on app load
      const { personaIntimacy, setPersonaIntimacy } = useStore.getState();
      const personas = getAllPersonas();
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      for (const p of personas) {
        const lastActive = localStorage.getItem(`persona_lastActive_${p.id}`);
        if (lastActive) {
          const elapsed = now - parseInt(lastActive, 10);
          const current = personaIntimacy[p.id] || 0;
          if (elapsed > 30 * DAY && current > 5) {
            // Dormant: reduce to 5
            setPersonaIntimacy(p.id, 5);
          } else if (elapsed > 7 * DAY && current > 0) {
            // Decay by 5
            setPersonaIntimacy(p.id, Math.max(0, current - 5));
          }
        }
      }
    };
    init();
  }, []);

  // Handle Gmail OAuth callback — tokens returned via URL hash fragment
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const account: EmailAccount = {
        type: 'gmail',
        email: 'Gmail User',
        accessToken: params.get('access_token') || '',
        refreshToken: params.get('refresh_token') || undefined,
        expiresAt: Date.now() + parseInt(params.get('expires_in') || '3600', 10) * 1000,
      };
      setEmailAccount(account);
      // Clean up URL hash without page reload
      window.history.replaceState({}, '', window.location.pathname);
      // Navigate to email panel
      setActivePanel('email');
    }
  }, [setEmailAccount, setActivePanel]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', overflow: 'hidden' }}>
        <MainPage />
      </Box>
    </ThemeProvider>
  );
}

export default App;
