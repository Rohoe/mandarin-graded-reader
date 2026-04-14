import { useSyncExternalStore } from 'react';

function subscribe(cb) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

/**
 * Shared online/offline hook using useSyncExternalStore.
 * Single subscription shared across all consumers.
 */
export function useIsOnline() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
