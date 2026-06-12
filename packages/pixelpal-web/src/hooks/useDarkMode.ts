import { useState, useEffect, useCallback } from 'react';

export type ColorScheme = 'light' | 'dark' | 'system';

export interface UseDarkModeResult {
  colorScheme: ColorScheme;
  isDark: boolean;
  isSystem: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  toggle: () => void;
}

/**
 * Hook to manage dark mode with system preference support
 */
export function useDarkMode(): UseDarkModeResult {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };

    // Set initial value
    setSystemPrefersDark(mediaQuery.matches);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pixelpal-color-scheme') as ColorScheme | null;
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setColorSchemeState(saved);
    }
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem('pixelpal-color-scheme', scheme);

    // Apply to document
    if (scheme === 'system') {
      document.documentElement.removeAttribute('data-color-scheme');
    } else {
      document.documentElement.setAttribute('data-color-scheme', scheme);
    }
  }, []);

  const toggle = useCallback(() => {
    const newScheme = colorScheme === 'light' ? 'dark' : 
                      colorScheme === 'dark' ? 'system' : 'light';
    setColorScheme(newScheme);
  }, [colorScheme, setColorScheme]);

  // Determine if currently dark
  const isDark = colorScheme === 'dark' || 
                (colorScheme === 'system' && systemPrefersDark);

  return {
    colorScheme,
    isDark,
    isSystem: colorScheme === 'system',
    setColorScheme,
    toggle,
  };
}

/**
 * Hook to simply detect if system prefers dark mode
 */
export function useSystemDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => 
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDark;
}

export default useDarkMode;
