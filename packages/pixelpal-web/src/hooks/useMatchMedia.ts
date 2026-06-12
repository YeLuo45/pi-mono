import { useState, useEffect } from 'react';

/**
 * Custom hook using native window.matchMedia API
 * Handles SSR case where window is undefined
 */
export const useMatchMedia = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mql = window.matchMedia(query);
    
    // Set initial value
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    mql.addEventListener('change', handler);
    
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

export default useMatchMedia;
