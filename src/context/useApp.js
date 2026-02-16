import { useContext, useSyncExternalStore } from 'react';
import { AppContext } from './AppContext';

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  const { subscribe, getSnapshot, dispatch, ...rest } = ctx;
  // Subscribe to state changes so this component re-renders on every update
  // (backward-compatible behavior — prefer useAppSelector for fine-grained updates)
  const state = useSyncExternalStore(subscribe, getSnapshot);
  return { state, dispatch, ...rest };
}
