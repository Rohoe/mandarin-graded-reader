/* eslint-disable react-refresh/only-export-components */
import { createContext, useReducer, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { usePersistence } from './usePersistence';
import { normalizeSyllabi, normalizeStandaloneReaders } from '../lib/vocabNormalizer';
import { providerReducer } from './reducers/providerReducer';
import { syllabusReducer } from './reducers/syllabusReducer';
import { readerReducer } from './reducers/readerReducer';
import { vocabularyReducer } from './reducers/vocabularyReducer';
import { uiReducer } from './reducers/uiReducer';
import { preferencesReducer } from './reducers/preferencesReducer';
import { cloudReducer } from './reducers/cloudReducer';
import { dataReducer } from './reducers/dataReducer';
import {
  loadProviderKeys,
  loadActiveProvider,
  loadActiveModels,
  loadCustomBaseUrl,
  loadCustomModelName,
  loadGradingModels,
  loadCompatPreset,
  loadSyllabi,
  saveSyllabi,
  loadSyllabusProgress,
  saveSyllabusProgress,
  loadStandaloneReaders,
  saveStandaloneReaders,
  loadReader,
  loadReaderIndex,
  clearReaders,
  saveReader,
  loadLearnedVocabulary,
  mergeVocabulary,
  loadExportedWords,
  mergeExportedWords,
  clearAllAppData,
  setDirectoryHandle,
  getDirectoryHandle,
  loadMaxTokens,
  loadDefaultLevel,
  loadDefaultTopikLevel,
  loadDefaultYueLevel,
  loadDarkMode,
  loadTtsVoiceURI,
  loadTtsKoVoiceURI,
  loadTtsYueVoiceURI,
  loadCloudLastSynced,
  loadTtsSpeechRate,
  loadRomanizationOn,
  loadTranslateButtons,
  loadExportSentenceRom,
  loadExportSentenceTrans,
  loadStructuredOutput,
  loadLastModified,
  loadLearningActivity,
  stashOldActivity,
  evictStaleReaders,
  loadEvictedReaderKeys,
  unmarkEvicted,
  loadNewCardsPerDay,
  loadReadingTime,
} from '../lib/storage';
import {
  loadDirectoryHandle,
  saveDirectoryHandle,
  clearDirectoryHandle,
  verifyPermission,
  readAllFromFolder,
  readReaderFromFile,
  pickDirectory,
  isSupported,
} from '../lib/fileStorage';
import { signOut, pushToCloud, pullFromCloud, pushReaderToCloud, detectConflict, fetchCloudReaderKeys, pullReaderFromCloud, mergeData, pushMergedToCloud, computeMergeSummary } from '../lib/cloudSync';
import { DEMO_READER_KEY, DEMO_READER_DATA } from '../lib/demoReader';

// ── Initial state ─────────────────────────────────────────────

function buildInitialState() {
  const providerKeys   = loadProviderKeys();
  const activeProvider = loadActiveProvider();
  const syllabi = normalizeSyllabi(loadSyllabi());
  const standaloneReaders = normalizeStandaloneReaders(loadStandaloneReaders());

  // Inject demo reader for new users (no syllabi, no standalone readers)
  const isEmpty = syllabi.length === 0 && standaloneReaders.length === 0;
  const demoStandalone = isEmpty
    ? [{ key: DEMO_READER_KEY, topic: DEMO_READER_DATA.topic, level: 2, langId: 'zh', createdAt: Date.now(), isDemo: true }]
    : standaloneReaders;
  const demoReaders = isEmpty
    ? { [DEMO_READER_KEY]: DEMO_READER_DATA }
    : {};

  return {
    apiKey:            providerKeys[activeProvider] || '',
    providerKeys,
    activeProvider,
    activeModels:      loadActiveModels(),
    gradingModels:     loadGradingModels(),
    customBaseUrl:     loadCustomBaseUrl(),
    customModelName:   loadCustomModelName(),
    compatPreset:      loadCompatPreset(),
    syllabi,
    syllabusProgress:  loadSyllabusProgress(),
    standaloneReaders: demoStandalone,
    generatedReaders:  demoReaders,
    learnedVocabulary: loadLearnedVocabulary(),
    exportedWords:     loadExportedWords(),
    loading:           false,
    loadingMessage:    '',
    error:             null,
    notification:      null,
    _recentlyDeleted:  null,  // ephemeral, not persisted — holds data for undo
    quotaWarning:      false,
    // File storage
    fsInitialized:     false,
    saveFolder:        null,
    fsSupported:       isSupported(),
    // API preferences (persisted, survive CLEAR_ALL_DATA)
    maxTokens:         loadMaxTokens(),
    defaultLevel:      loadDefaultLevel(),
    defaultTopikLevel: loadDefaultTopikLevel(),
    defaultYueLevel:   loadDefaultYueLevel(),
    darkMode:          loadDarkMode(),
    ttsVoiceURI:       loadTtsVoiceURI(),
    ttsKoVoiceURI:     loadTtsKoVoiceURI(),
    ttsYueVoiceURI:    loadTtsYueVoiceURI(),
    ttsSpeechRate:     loadTtsSpeechRate(),
    romanizationOn:    loadRomanizationOn(),
    translateButtons:  loadTranslateButtons(),
    exportSentenceRom:   loadExportSentenceRom(),
    exportSentenceTrans: loadExportSentenceTrans(),
    useStructuredOutput: loadStructuredOutput(),
    newCardsPerDay:    loadNewCardsPerDay(),
    // Evicted reader keys (persisted)
    evictedReaderKeys: loadEvictedReaderKeys(),
    // Fetched models from provider APIs (ephemeral, not persisted)
    fetchedModels:     {},
    // Background generation tracking (ephemeral, not persisted)
    pendingReaders:    {},
    // Reading time per lesson (persisted)
    readingTime:       loadReadingTime(),
    // Learning activity log (persisted)
    learningActivity:  loadLearningActivity(),
    // Cloud sync
    cloudUser:         null,
    cloudSyncing:      false,
    cloudLastSynced:   loadCloudLastSynced(),
    lastModified:      loadLastModified() ?? Date.now(),
    hasMergeSnapshot:  !!localStorage.getItem('gradedReader_preMergeSnapshot'),
  };
}

// Actions that modify syncable data — bumps lastModified timestamp
const DATA_ACTIONS = new Set([
  'ADD_SYLLABUS', 'EXTEND_SYLLABUS_LESSONS', 'REMOVE_SYLLABUS',
  'SET_LESSON_INDEX', 'MARK_LESSON_COMPLETE', 'UNMARK_LESSON_COMPLETE',
  'ADD_STANDALONE_READER', 'REMOVE_STANDALONE_READER', 'UPDATE_STANDALONE_READER_META',
  'ARCHIVE_SYLLABUS', 'UNARCHIVE_SYLLABUS',
  'ARCHIVE_STANDALONE_READER', 'UNARCHIVE_STANDALONE_READER',
  'SET_READER', 'CLEAR_READER',
  'ADD_VOCABULARY', 'CLEAR_VOCABULARY', 'UPDATE_VOCAB_SRS',
  'ADD_EXPORTED_WORDS', 'CLEAR_EXPORTED_WORDS',
]);

// ── Reducer ───────────────────────────────────────────────────

const sliceReducers = [
  providerReducer,
  syllabusReducer,
  readerReducer,
  vocabularyReducer,
  uiReducer,
  preferencesReducer,
  cloudReducer,
  // dataReducer handled separately (needs buildInitialState)
];

function baseReducer(state, action) {
  // Try dataReducer first (needs buildInitialState)
  const dataResult = dataReducer(state, action, buildInitialState);
  if (dataResult !== undefined) return dataResult;

  // Try each slice reducer
  for (const slice of sliceReducers) {
    const result = slice(state, action);
    if (result !== undefined) return result;
  }

  return state;
}

function reducer(state, action) {
  const next = baseReducer(state, action);
  if (next !== state && DATA_ACTIONS.has(action.type)) {
    return { ...next, lastModified: Date.now() };
  }
  return next;
}

// ── Context + Provider ────────────────────────────────────────

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState);
  const stateRef = useRef(state);
  const startupSyncDoneRef = useRef(false);
  const syncPausedRef = useRef(false);
  const listenersRef = useRef(new Set());
  stateRef.current = state; // synchronous update for useSyncExternalStore

  // Notify subscribers after every state change
  useEffect(() => {
    listenersRef.current.forEach(fn => fn());
  }, [state]);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  // ── Async file storage initialisation (runs once on mount) ──
  useEffect(() => {
    async function initFileStorage() {
      try {
        const handle = await loadDirectoryHandle();
        if (!handle) {
          dispatch({ type: 'FS_INITIALIZED' });
          return;
        }

        const hasPermission = await verifyPermission(handle);
        if (!hasPermission) {
          await clearDirectoryHandle();
          dispatch({ type: 'FS_INITIALIZED' });
          return;
        }

        setDirectoryHandle(handle);
        dispatch({ type: 'SET_SAVE_FOLDER', payload: { name: handle.name } });

        const data = await readAllFromFolder(handle);
        dispatch({ type: 'HYDRATE_FROM_FILES', payload: data });

        // Mirror hydrated data back to localStorage
        if (data.syllabi.length > 0) saveSyllabi(data.syllabi);
        if (Object.keys(data.syllabusProgress).length > 0) saveSyllabusProgress(data.syllabusProgress);
        if (data.standaloneReaders.length > 0) saveStandaloneReaders(data.standaloneReaders);
      } catch (err) {
        console.warn('[AppContext] File storage init failed:', err);
      } finally {
        dispatch({ type: 'FS_INITIALIZED' });
      }
    }

    initFileStorage();

    // Auth listener for cloud sync
    supabase.auth.getSession().then(({ data: { session } }) => {
      dispatch({ type: 'SET_CLOUD_USER', payload: session?.user ?? null });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ type: 'SET_CLOUD_USER', payload: session?.user ?? null });
    });
    return () => subscription.unsubscribe();
  }, []);

  async function pickSaveFolder() {
    if (!isSupported()) return;
    try {
      const handle = await pickDirectory();
      if (!handle) return;

      await saveDirectoryHandle(handle);
      setDirectoryHandle(handle);
      dispatch({ type: 'SET_SAVE_FOLDER', payload: { name: handle.name } });
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: `Save folder set to "${handle.name}". All changes will now be written to disk.` } });
    } catch (err) {
      dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: `Could not set folder: ${err.message}` } });
    }
  }

  async function removeSaveFolder() {
    await clearDirectoryHandle();
    setDirectoryHandle(null);
    dispatch({ type: 'SET_SAVE_FOLDER', payload: null });
    dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'success', message: 'Save folder removed. Data will only be stored in browser localStorage.' } });
  }

  // Saves a newly-generated reader to local state and immediately pushes it
  // to cloud (bypassing the debounced auto-push to avoid bundling all readers).
  function pushGeneratedReader(lessonKey, readerData) {
    dispatch({ type: 'SET_READER', payload: { lessonKey, data: readerData } });
    if (stateRef.current.cloudUser) {
      pushReaderToCloud(lessonKey, readerData)
        .catch(e => {
          console.warn('[AppContext] Reader push failed:', e.message);
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Reader saved locally but cloud sync failed.' } });
        });
    }
  }

  // Restores from backup: dispatches pure state update, then persists readers to localStorage
  function performRestore(data) {
    const restoredReaders = data.generatedReaders || data.generated_readers || {};
    clearReaders();
    for (const [k, v] of Object.entries(restoredReaders)) saveReader(k, v);
    dispatch({ type: 'RESTORE_FROM_BACKUP', payload: data });
  }

  // Reverts a cloud merge: reads snapshot from localStorage, dispatches pure state update, cleans up
  function performRevertMerge() {
    const raw = localStorage.getItem('gradedReader_preMergeSnapshot');
    if (!raw) {
      dispatch({ type: 'REVERT_MERGE', payload: null });
      return;
    }
    try {
      const snapshot = JSON.parse(raw);
      localStorage.removeItem('gradedReader_preMergeSnapshot');
      dispatch({ type: 'REVERT_MERGE', payload: snapshot });
    } catch (e) {
      console.warn('[AppContext] Failed to revert merge:', e.message);
      localStorage.removeItem('gradedReader_preMergeSnapshot');
      dispatch({ type: 'REVERT_MERGE', payload: null });
    }
  }

  // Restores an evicted reader from file storage or cloud
  async function restoreEvictedReader(lessonKey) {
    // Try file storage first (faster, no network)
    const dirHandle = getDirectoryHandle();
    if (dirHandle) {
      try {
        const data = await readReaderFromFile(dirHandle, lessonKey);
        if (data) {
          dispatch({ type: 'RESTORE_EVICTED_READER', payload: { lessonKey, data } });
          return true;
        }
      } catch (e) {
        console.warn('[AppContext] File restore failed:', e.message);
      }
    }

    // Try cloud
    if (stateRef.current.cloudUser) {
      try {
        const data = await pullReaderFromCloud(lessonKey);
        if (data) {
          dispatch({ type: 'RESTORE_EVICTED_READER', payload: { lessonKey, data } });
          return true;
        }
      } catch (e) {
        console.warn('[AppContext] Cloud restore failed:', e.message);
      }
    }

    // Neither found — unmark from evicted set so UI falls through to Generate
    unmarkEvicted(lessonKey);
    const newEvicted = new Set(stateRef.current.evictedReaderKeys);
    newEvicted.delete(lessonKey);
    dispatch({ type: 'SET_EVICTED_READER_KEYS', payload: newEvicted });
    return false;
  }

  // Clears all data safely: signs out of cloud first to prevent auto-push of empty state
  async function clearAllData() {
    syncPausedRef.current = true;
    if (stateRef.current.cloudUser) {
      try { await signOut(); } catch (e) { console.warn('[AppContext] Sign-out during clear failed:', e.message); }
    }
    clearAllAppData();
    localStorage.removeItem('gradedReader_preMergeSnapshot');
    dispatch({ type: 'CLEAR_ALL_DATA' });
    startupSyncDoneRef.current = false;
    // syncPausedRef stays true — resumed only on next sign-in + startup sync
  }

  // Prune old learning activity entries to stash on startup
  useEffect(() => {
    if (!state.fsInitialized) return;
    const pruned = stashOldActivity(state.learningActivity);
    if (pruned !== state.learningActivity) {
      dispatch({ type: 'SET_LEARNING_ACTIVITY', payload: pruned });
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
            console.warn('[AppContext] Failed to fetch cloud reader keys for eviction:', e.message);
          }
        }

        if (backupKeys.size === 0) return;

        const evicted = evictStaleReaders({ backupKeys });
        if (evicted.length > 0) {
          dispatch({ type: 'SET_EVICTED_READER_KEYS', payload: loadEvictedReaderKeys() });
        }
      } catch (e) {
        console.warn('[AppContext] Eviction failed:', e.message);
      }
    }

    runEviction();
  }, [state.fsInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persistence effects (extracted to custom hook) ──
  usePersistence(state, dispatch, stateRef);

  // Startup sync: runs once when both cloudUser and fsInitialized are ready
  useEffect(() => {
    if (!state.cloudUser || !state.fsInitialized || startupSyncDoneRef.current) return;

    async function doStartupSync() {
      dispatch({ type: 'SET_CLOUD_SYNCING', payload: true });
      try {
        const data = await pullFromCloud();
        if (data) {
          const conflict = detectConflict(stateRef.current, data);
          if (!conflict) {
            // Data is identical — just update timestamp
            const cloudTs = new Date(data.updated_at).getTime();
            dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Math.max(cloudTs, stateRef.current.lastModified) });
          } else {
            // Data differs — auto-merge
            const preState = stateRef.current;
            // Capture pre-merge snapshot for undo
            const snapshot = {
              timestamp: Date.now(),
              state: {
                syllabi: preState.syllabi,
                syllabusProgress: preState.syllabusProgress,
                standaloneReaders: preState.standaloneReaders,
                learnedVocabulary: preState.learnedVocabulary,
                exportedWords: [...preState.exportedWords],
              },
            };
            localStorage.setItem('gradedReader_preMergeSnapshot', JSON.stringify(snapshot));

            const merged = mergeData(preState, data);
            dispatch({ type: 'MERGE_WITH_CLOUD', payload: merged });
            pushMergedToCloud(merged).catch(e => console.warn('[AppContext] Post-merge push failed:', e.message));
            dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });

            const summary = computeMergeSummary(preState, merged);
            dispatch({ type: 'SET_NOTIFICATION', payload: {
              type: 'success',
              message: summary,
              timeout: 10000,
            } });
            dispatch({ type: 'SET_HAS_MERGE_SNAPSHOT' });
          }
        } else {
          // No cloud data yet — upload local as initial backup
          await pushToCloud(stateRef.current);
          dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });
        }
      } catch (e) {
        console.warn('[AppContext] Startup sync failed:', e.message);
        dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Cloud sync failed. Your data may be out of date.' } });
      } finally {
        dispatch({ type: 'SET_CLOUD_SYNCING', payload: false });
        syncPausedRef.current = false;
        startupSyncDoneRef.current = true;
      }
    }

    doStartupSync();
  }, [state.cloudUser, state.fsInitialized]);

  // Debounced auto-push: 3s after any data change, once startup sync is done
  useEffect(() => {
    if (!state.cloudUser || !startupSyncDoneRef.current || syncPausedRef.current) return;
    const timer = setTimeout(async () => {
      // Skip if we just synced (e.g., after merge/pull set cloudLastSynced)
      if (stateRef.current.cloudLastSynced >= stateRef.current.lastModified) return;
      try {
        await pushToCloud(stateRef.current);
        dispatch({ type: 'SET_CLOUD_LAST_SYNCED', payload: Date.now() });
        // Clear merge snapshot after successful push (merge is now committed)
        if (stateRef.current.hasMergeSnapshot) {
          localStorage.removeItem('gradedReader_preMergeSnapshot');
          dispatch({ type: 'CLEAR_MERGE_SNAPSHOT' });
        }
      } catch (e) {
        console.warn('[AppContext] Auto-sync failed:', e.message);
        // Only show notification if the last one wasn't also a sync failure (avoid spam from 3s debounce)
        const current = stateRef.current.notification;
        if (!current || !current.message?.includes('cloud sync failed')) {
          dispatch({ type: 'SET_NOTIFICATION', payload: { type: 'error', message: 'Auto-sync to cloud failed. Changes saved locally.' } });
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [state.lastModified, state.cloudUser]);

  // Auto-clear notifications after 5 s
  useEffect(() => {
    if (!state.notification) return;
    const id = setTimeout(() => dispatch({ type: 'CLEAR_NOTIFICATION' }), state.notification.timeout || 5000);
    return () => clearTimeout(id);
  }, [state.notification]);

  // Stabilize context value — reference never changes, so useContext(AppContext)
  // alone won't trigger re-renders. Consumers use useAppSelector for fine-grained
  // subscriptions, or useApp() which reads via getSnapshot() for backward compat.
  const ctxValue = useMemo(() => ({
    dispatch,
    subscribe,
    getSnapshot,
    pickSaveFolder,
    removeSaveFolder,
    pushGeneratedReader,
    clearAllData,
    restoreEvictedReader,
    performRestore,
    performRevertMerge,
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider value={ctxValue}>
      {children}
    </AppContext.Provider>
  );
}

export { useApp } from './useApp';
export { useAppSelector, useAppDispatch } from './useAppSelector';

// Test-only exports for direct reducer testing
export { baseReducer as _baseReducer, reducer as _reducer, DATA_ACTIONS as _DATA_ACTIONS };
