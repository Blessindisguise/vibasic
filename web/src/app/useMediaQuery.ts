import { useSyncExternalStore } from 'react';

/** Live result of a CSS media query, e.g. useMediaQuery('(max-width: 767px)'). */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    cb => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
