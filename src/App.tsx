import { useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { MainPage } from './pages/MainPage';
import { useStore } from './store';
import { initCompanion } from './services/companion';
import { compactMemory } from './services/memory';
import { checkGreeting, checkReminders } from './services/actions/ActionTrigger';
import { applyPersonaTheme, resetPersonaTheme } from './utils/personaTheme';
import { getAllPersonas } from './services/persona/personaStorage';
import { generateYesterdaySummaryIfNeeded } from './services/summary/dailySummary';
import { checkAndCreateMilestones } from './services/milestone/milestoneTracker';
import { applyAppTheme, getPresetById, getSystemTheme, resetToDefault, applyCustomTheme } from './utils/appTheme';
import './services/i18n';

const linearDarkTheme = createTheme({
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
    error: {
      main: '#f26875',
    },
    warning: {
      main: '#f5c542',
    },
    success: {
      main: '#52c775',
    },
    info: {
      main: '#5e6ad2',
    },
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
  shape: {
    borderRadius: 8,
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
          height: 6,
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(255,255,255,0.15)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#191a1b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#191a1b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f1011',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 12,
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
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 6,
            minHeight: 44,
            '&:hover': {
              borderColor: 'rgba(255, 255, 255, 0.15)',
            },
            '&.Mui-focused': {
              borderColor: '#5e6ad2',
              '& .MuiInputBase-input': {
                color: '#f7f8f8',
              },
            },
          },
          '& .MuiInputBase-input': {
            color: '#f7f8f8',
            fontWeight: 400,
            '&::placeholder': {
              color: '#62666d',
              opacity: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#8a8f98',
            '&.Mui-focused': {
              color: '#5e6ad2',
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          minHeight: 44,
          '& .MuiInputBase-input': {
            padding: '10px 12px',
            color: '#f7f8f8',
            '&::placeholder': {
              color: '#62666d',
              opacity: 1,
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          color: '#d0d6e0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 44,
          fontWeight: 510,
          borderRadius: 6,
          textTransform: 'none',
          letterSpacing: 0,
          transition: 'all 0.15s ease',
        },
        containedPrimary: {
          backgroundColor: '#5e6ad2',
          color: '#ffffff',
          border: 'none',
          '&:hover': {
            backgroundColor: '#4a52b8',
          },
          '&:active': {
            backgroundColor: '#3d4499',
          },
        },
        containedSecondary: {
          backgroundColor: '#7170ff',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#5e5ae6',
          },
        },
        outlined: {
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#f7f8f8',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
        },
        text: {
          color: '#7170ff',
          '&:hover': {
            backgroundColor: 'rgba(113, 112, 255, 0.08)',
          },
        },
        ghost: {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#d0d6e0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderColor: 'rgba(255, 255, 255, 0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 32,
          borderRadius: 6,
          fontWeight: 510,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#d0d6e0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '& .MuiChip-deleteIcon': {
            color: '#62666d',
            '&:hover': {
              color: '#8a8f98',
            },
          },
        },
        filled: {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#d0d6e0',
        },
        outlined: {
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#d0d6e0',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#28282c',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          color: '#f7f8f8',
          fontSize: 12,
          fontWeight: 400,
        },
        arrow: {
          color: '#28282c',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 6,
          minHeight: 44,
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.15)',
          },
          '&.Mui-focused': {
            borderColor: '#5e6ad2',
          },
        },
        select: {
          color: '#f7f8f8',
          fontWeight: 400,
        },
        icon: {
          color: '#8a8f98',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f1011',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#d0d6e0',
          fontWeight: 400,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(94, 106, 210, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(94, 106, 210, 0.2)',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f1011',
          backgroundImage: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(94, 106, 210, 0.15)',
            '&:hover': {
              backgroundColor: 'rgba(94, 106, 210, 0.2)',
            },
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': {
                backgroundColor: '#5e6ad2',
              },
            },
          },
        },
        switchBase: {
          '&.Mui-checked': {
            '& + .MuiSwitch-track': {
              backgroundColor: '#5e6ad2',
            },
          },
        },
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderRadius: 12,
        },
        thumb: {
          backgroundColor: '#f7f8f8',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#5e6ad2',
        },
        track: {
          backgroundColor: '#5e6ad2',
        },
        rail: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        },
        thumb: {
          backgroundColor: '#f7f8f8',
          border: '2px solid #5e6ad2',
          '&:hover': {
            boxShadow: '0 0 0 4px rgba(94, 106, 210, 0.2)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#191a1b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#d0d6e0',
        },
        standardError: {
          backgroundColor: 'rgba(242, 104, 117, 0.1)',
          border: '1px solid rgba(242, 104, 117, 0.2)',
        },
        standardWarning: {
          backgroundColor: 'rgba(245, 197, 66, 0.1)',
          border: '1px solid rgba(245, 197, 66, 0.2)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(82, 199, 117, 0.1)',
          border: '1px solid rgba(82, 199, 117, 0.2)',
        },
        standardInfo: {
          backgroundColor: 'rgba(94, 106, 210, 0.1)',
          border: '1px solid rgba(94, 106, 210, 0.2)',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: '#5e6ad2',
          color: '#ffffff',
          fontWeight: 510,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 510,
          color: '#8a8f98',
          '&.Mui-selected': {
            color: '#f7f8f8',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#5e6ad2',
        },
      },
    },
  },
});

// V51: MiniMax Light Theme
const minimaxLightTheme = createTheme({
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
    error: {
      main: '#dc2626',
    },
    warning: {
      main: '#d97706',
    },
    success: {
      main: '#16a34a',
    },
    info: {
      main: '#1456f0',
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
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0,0,0,0.1) transparent',
          backgroundColor: '#ffffff',
        },
        '*::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '*::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(0,0,0,0.1)',
          borderRadius: 3,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(0,0,0,0.15)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 6px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 6px',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          boxShadow: 'rgba(0, 0, 0, 0.1) 0px 8px 16px',
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
            backgroundColor: '#f5f5f5',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            minHeight: 44,
            '&:hover': {
              borderColor: '#b8b8b8',
            },
            '&.Mui-focused': {
              borderColor: '#1456f0',
              backgroundColor: '#ffffff',
              '& .MuiInputBase-input': {
                color: '#222222',
              },
            },
          },
          '& .MuiInputBase-input': {
            color: '#222222',
            fontWeight: 400,
            '&::placeholder': {
              color: '#8e8e93',
              opacity: 1,
            },
          },
          '& .MuiInputLabel-root': {
            color: '#8e8e93',
            '&.Mui-focused': {
              color: '#1456f0',
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            border: 'none',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          minHeight: 44,
          '& .MuiInputBase-input': {
            padding: '10px 12px',
            color: '#222222',
            '&::placeholder': {
              color: '#8e8e93',
              opacity: 1,
            },
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
          color: '#45515e',
          '&:hover': {
            backgroundColor: 'rgba(20, 86, 240, 0.08)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          minWidth: 44,
          fontWeight: 510,
          borderRadius: 8,
          textTransform: 'none',
          letterSpacing: 0,
          transition: 'all 0.15s ease',
        },
        containedPrimary: {
          backgroundColor: '#1456f0',
          color: '#ffffff',
          border: 'none',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#0d44c7',
            boxShadow: 'none',
          },
          '&:active': {
            backgroundColor: '#0a3880',
          },
        },
        containedSecondary: {
          backgroundColor: '#ea5ec1',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#d64aad',
          },
        },
        outlined: {
          border: '1px solid #e5e7eb',
          color: '#222222',
          backgroundColor: '#ffffff',
          '&:hover': {
            backgroundColor: '#f5f5f5',
            borderColor: '#b8b8b8',
          },
        },
        text: {
          color: '#1456f0',
          '&:hover': {
            backgroundColor: 'rgba(20, 86, 240, 0.08)',
          },
        },
        ghost: {
          backgroundColor: '#f0f0f0',
          border: '1px solid #e5e7eb',
          color: '#222222',
          '&:hover': {
            backgroundColor: '#e5e5e5',
            borderColor: '#b8b8b8',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          minHeight: 32,
          borderRadius: 8,
          fontWeight: 510,
          backgroundColor: '#f0f0f0',
          border: '1px solid #e5e7eb',
          color: '#222222',
          '&:hover': {
            backgroundColor: '#e5e5e5',
          },
          '& .MuiChip-deleteIcon': {
            color: '#8e8e93',
            '&:hover': {
              color: '#45515e',
            },
          },
        },
        filled: {
          backgroundColor: '#f0f0f0',
          border: '1px solid #e5e7eb',
          color: '#222222',
        },
        outlined: {
          border: '1px solid #e5e7eb',
          color: '#222222',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#e5e7eb',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#222222',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#ffffff',
          fontSize: 12,
          fontWeight: 400,
          boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 6px',
        },
        arrow: {
          color: '#222222',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#f5f5f5',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          minHeight: 44,
          '&:hover': {
            borderColor: '#b8b8b8',
          },
          '&.Mui-focused': {
            borderColor: '#1456f0',
            backgroundColor: '#ffffff',
          },
        },
        select: {
          color: '#222222',
          fontWeight: 400,
        },
        icon: {
          color: '#8e8e93',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          boxShadow: 'rgba(0, 0, 0, 0.1) 0px 8px 16px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          color: '#222222',
          fontWeight: 400,
          '&:hover': {
            backgroundColor: 'rgba(20, 86, 240, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(20, 86, 240, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(20, 86, 240, 0.16)',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          backgroundImage: 'none',
          borderRight: '1px solid #e5e7eb',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: 'rgba(20, 86, 240, 0.08)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(20, 86, 240, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(20, 86, 240, 0.16)',
            },
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase': {
            '&.Mui-checked': {
              '& + .MuiSwitch-track': {
                backgroundColor: '#1456f0',
              },
            },
          },
        },
        switchBase: {
          '&.Mui-checked': {
            '& + .MuiSwitch-track': {
              backgroundColor: '#1456f0',
            },
          },
        },
        track: {
          backgroundColor: '#e5e7eb',
          borderRadius: 12,
        },
        thumb: {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: {
          color: '#1456f0',
        },
        track: {
          backgroundColor: '#1456f0',
        },
        rail: {
          backgroundColor: '#e5e7eb',
        },
        thumb: {
          backgroundColor: '#ffffff',
          border: '2px solid #1456f0',
          '&:hover': {
            boxShadow: '0 0 0 4px rgba(20, 86, 240, 0.2)',
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          color: '#222222',
          boxShadow: 'rgba(0, 0, 0, 0.08) 0px 4px 6px',
        },
        standardError: {
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
        },
        standardWarning: {
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          border: '1px solid rgba(217, 119, 6, 0.2)',
        },
        standardSuccess: {
          backgroundColor: 'rgba(22, 163, 74, 0.08)',
          border: '1px solid rgba(22, 163, 74, 0.2)',
        },
        standardInfo: {
          backgroundColor: 'rgba(20, 86, 240, 0.08)',
          border: '1px solid rgba(20, 86, 240, 0.2)',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: '#1456f0',
          color: '#ffffff',
          fontWeight: 510,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 510,
          color: '#8e8e93',
          '&.Mui-selected': {
            color: '#222222',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#1456f0',
        },
      },
    },
  },
});

function App() {
  const companion = useStore((s) => s.companion);
  const personaFollowTheme = useStore((s) => s.personaFollowTheme);
  const activePersonaId = useStore((s) => s.activePersonaId);

  // V33: App theme state
  const appThemeMode = useStore((s) => s.appThemeMode);
  const appThemePresetId = useStore((s) => s.appThemePresetId);
  const customTheme = useStore((s) => s.customTheme);

  // V51: Select theme based on appThemeMode
  // 'minimax' uses minimaxLightTheme, 'dark' uses linearDarkTheme
  const currentTheme = appThemeMode === 'minimax' ? minimaxLightTheme : linearDarkTheme;

  // V51: Apply data-theme attribute to root for CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (appThemeMode === 'minimax') {
      root.setAttribute('data-theme', 'minimax');
    } else {
      root.removeAttribute('data-theme');
    }
  }, [appThemeMode]);

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

      // V35: Check active day milestones for all personas on startup
      const personas = getAllPersonas();
      for (const p of personas) {
        checkAndCreateMilestones(p.id).catch(() => {});
      }

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
      const allPersonas = getAllPersonas();
      const now = Date.now();
      const DAY = 24 * 60 * 60 * 1000;
      for (const p of allPersonas) {
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

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', overflow: 'hidden' }}>
        <MainPage />
      </Box>
    </ThemeProvider>
  );
}

export default App;
