/**
 * useMediaQuery.ts — Custom useMediaQuery hook
 * 
 * Custom implementation of useMediaQuery matching MUI's API.
 * Supports: query string, options (noSsr, defaultMatches, matchMedia)
 */

import { useState, useEffect, useCallback } from 'react';

export interface UseMediaQueryOptions {
  noSsr?: boolean;
  defaultMatches?: boolean;
  matchMedia?: (query: string) => MediaQueryList | null;
  ssrMatchMedia?: (query: string) => MediaQueryList | null;
}

export const useMediaQuery = (
  query: string | string[],
  options: UseMediaQueryOptions = {}
): boolean => {
  const {
    defaultMatches = false,
    matchMedia = (q) => (typeof window !== 'undefined' ? window.matchMedia(q) : null),
    ssrMatchMedia = (q) => (typeof window !== 'undefined' ? window.matchMedia(q) : null),
  } = options;

  const queries = Array.isArray(query) ? query : [query];
  
  const getDefaultMatches = useCallback(() => {
    if (typeof window === 'undefined') {
      return defaultMatches;
    }
    return queries.some(q => {
      const m = ssrMatchMedia(q);
      return m ? m.matches : defaultMatches;
    });
  }, [queries.join(','), defaultMatches, ssrMatchMedia]);

  const [matches, setMatches] = useState<boolean>(getDefaultMatches);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueries = queries.map(q => ({
      query: q,
      mql: matchMedia(q),
    }));

    const updateMatches = () => {
      const newMatches = mediaQueries.some(mq => mq.mql?.matches || false);
      setMatches(newMatches);
    };

    // Set initial value
    updateMatches();

    // Add listeners
    const listeners: Array<{ mql: MediaQueryList; listener: () => void }> = [];
    mediaQueries.forEach(({ mql }) => {
      if (mql) {
        const listener = () => updateMatches();
        mql.addEventListener('change', listener);
        listeners.push({ mql, listener });
      }
    });

    return () => {
      listeners.forEach(({ mql, listener }) => {
        mql.removeEventListener('change', listener);
      });
    };
  }, [queries.join(','), matchMedia]);

  return matches;
};

export default useMediaQuery;
