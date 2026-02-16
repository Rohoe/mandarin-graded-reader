import { useContext, useRef, useCallback, useSyncExternalStore } from 'react';
import { AppContext } from './AppContext';

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  for (const key of keysA) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

/**
 * Fine-grained state selector — only re-renders when the selected slice changes.
 * Usage: const { apiKey, loading } = useAppSelector(s => ({ apiKey: s.apiKey, loading: s.loading }));
 */
export function useAppSelector(selector) {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppSelector must be used within AppProvider');
  const { subscribe, getSnapshot } = ctx;

  const prevRef = useRef(undefined);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSelection = useCallback(() => {
    const next = selectorRef.current(getSnapshot());
    if (prevRef.current !== undefined && shallowEqual(prevRef.current, next)) {
      return prevRef.current;
    }
    prevRef.current = next;
    return next;
  }, [getSnapshot]);

  return useSyncExternalStore(subscribe, getSelection);
}

/**
 * Returns dispatch + stable helper functions from context (no state subscription).
 */
export function useAppDispatch() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppDispatch must be used within AppProvider');
  return ctx.dispatch;
}
