/**
 * Handles startup eviction of stale readers from localStorage and
 * pruning of old learning activity entries.
 * Extracted from AppContext.jsx — no behavior changes.
 */
import { useEffect } from 'react';
import {
  stashOldActivity,
  evictStaleReaders,
  loadEvictedReaderKeys,
} from '../../lib/storage';
import { fetchCloudReaderKeys } from '../../lib/cloudSync';
import {
  SET_LEARNING_ACTIVITY, SET_EVICTED_READER_KEYS,
} from '../actionTypes';

export function useStartupEviction(state, dispatch, stateRef) {
  // Prune old learning activity entries to stash on startup
  useEffect(() => {
    if (!state.fsInitialized) return;
    const pruned = stashOldActivity(state.learningActivity);
    if (pruned !== state.learningActivity) {
      dispatch({ type: SET_LEARNING_ACTIVITY, payload: pruned });
    }
  }, [state.fsInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Evict stale readers from localStorage on startup (only when backup exists)
  useEffect(() => {
    if (!state.fsInitialized) return;
    const hasFileBackup = !!state.saveFolder;
    const hasCloudBackup = !!state.cloudUser;
    if (!hasFileBackup && !hasCloudBackup) return;

    async function runEviction() {
      try {
        // Build backupKeys from file + cloud
        let backupKeys = new Set();

        // File storage: readers were hydrated into generatedReaders already
        if (hasFileBackup) {
          for (const k of Object.keys(stateRef.current.generatedReaders)) {
            backupKeys.add(k);
          }
        }

        // Cloud: fetch reader keys
        if (hasCloudBackup) {
          try {
            const cloudKeys = await fetchCloudReaderKeys();
            if (cloudKeys) {
              for (const k of cloudKeys) backupKeys.add(k);
            }
          } catch (e) {
            console.warn('[AppContext] Failed to fetch cloud reader keys for eviction:', e);
          }
        }

        if (backupKeys.size === 0) return;

        const evicted = evictStaleReaders({ backupKeys });
        if (evicted.length > 0) {
          dispatch({ type: SET_EVICTED_READER_KEYS, payload: loadEvictedReaderKeys() });
        }
      } catch (e) {
        console.warn('[AppContext] Eviction failed:', e);
      }
    }

    runEviction();
  }, [state.fsInitialized]); // eslint-disable-line react-hooks/exhaustive-deps
}
