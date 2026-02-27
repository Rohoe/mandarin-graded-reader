/**
 * Extracts all persistence side-effects from AppProvider into a single custom hook.
 * Mechanical move — no logic changes. Each useEffect persists one state slice to localStorage.
 */
import { useEffect, useRef } from 'react';
import {
  saveSyllabi,
  saveSyllabusProgress,
  saveStandaloneReaders,
  saveLearnedVocabulary,
  saveExportedWordsFull,
  saveLearningActivity,
  saveEvictedReaderKeys,
  saveProviderKeys,
  saveActiveProvider,
  saveActiveModels,
  saveGradingModels,
  saveCustomBaseUrl,
  saveCustomModelName,
  saveCompatPreset,
  saveMaxTokens,
  saveDefaultLevel,
  saveDefaultTopikLevel,
  saveDefaultYueLevel,
  saveDarkMode,
  saveTtsVoiceURI,
  saveTtsKoVoiceURI,
  saveTtsYueVoiceURI,
  saveExportSentenceRom,
  saveExportSentenceTrans,
  saveTtsSpeechRate,
  saveRomanizationOn,
  saveTranslateButtons,
  saveStructuredOutput,
  saveNewCardsPerDay,
  saveCloudLastSynced,
  saveReaderSafe,
  deleteReader,
  saveLastModified,
} from '../lib/storage';
import { pushReaderToCloud } from '../lib/cloudSync';

export function usePersistence(state, dispatch, stateRef) {
  // Skip persistence on first render (state came from localStorage already)
  const mountedRef = useRef(false);
  useEffect(() => { mountedRef.current = true; }, []);

  // Data slices
  useEffect(() => { if (mountedRef.current) saveSyllabi(state.syllabi); }, [state.syllabi]);
  useEffect(() => { if (mountedRef.current) saveSyllabusProgress(state.syllabusProgress); }, [state.syllabusProgress]);
  useEffect(() => { if (mountedRef.current) saveStandaloneReaders(state.standaloneReaders); }, [state.standaloneReaders]);
  useEffect(() => { if (mountedRef.current) saveLearnedVocabulary(state.learnedVocabulary); }, [state.learnedVocabulary]);
  useEffect(() => { if (mountedRef.current) saveExportedWordsFull(state.exportedWords); }, [state.exportedWords]);
  useEffect(() => { if (mountedRef.current) saveLearningActivity(state.learningActivity); }, [state.learningActivity]);
  useEffect(() => { if (mountedRef.current) saveEvictedReaderKeys(state.evictedReaderKeys); }, [state.evictedReaderKeys]);

  // Provider/API settings
  useEffect(() => { if (mountedRef.current) saveProviderKeys(state.providerKeys); }, [state.providerKeys]);
  useEffect(() => { if (mountedRef.current) saveActiveProvider(state.activeProvider); }, [state.activeProvider]);
  useEffect(() => { if (mountedRef.current) saveActiveModels(state.activeModels); }, [state.activeModels]);
  useEffect(() => { if (mountedRef.current) saveGradingModels(state.gradingModels); }, [state.gradingModels]);
  useEffect(() => { if (mountedRef.current) saveCustomBaseUrl(state.customBaseUrl); }, [state.customBaseUrl]);
  useEffect(() => { if (mountedRef.current) saveCustomModelName(state.customModelName); }, [state.customModelName]);
  useEffect(() => { if (mountedRef.current) saveCompatPreset(state.compatPreset); }, [state.compatPreset]);

  // User preferences
  useEffect(() => { if (mountedRef.current) saveMaxTokens(state.maxTokens); }, [state.maxTokens]);
  useEffect(() => { if (mountedRef.current) saveDefaultLevel(state.defaultLevel); }, [state.defaultLevel]);
  useEffect(() => { if (mountedRef.current) saveDefaultTopikLevel(state.defaultTopikLevel); }, [state.defaultTopikLevel]);
  useEffect(() => { if (mountedRef.current) saveDefaultYueLevel(state.defaultYueLevel); }, [state.defaultYueLevel]);
  useEffect(() => { if (mountedRef.current) saveDarkMode(state.darkMode); }, [state.darkMode]);
  useEffect(() => { if (mountedRef.current) saveTtsVoiceURI(state.ttsVoiceURI); }, [state.ttsVoiceURI]);
  useEffect(() => { if (mountedRef.current) saveTtsKoVoiceURI(state.ttsKoVoiceURI); }, [state.ttsKoVoiceURI]);
  useEffect(() => { if (mountedRef.current) saveTtsYueVoiceURI(state.ttsYueVoiceURI); }, [state.ttsYueVoiceURI]);
  useEffect(() => { if (mountedRef.current) saveExportSentenceRom(state.exportSentenceRom); }, [state.exportSentenceRom]);
  useEffect(() => { if (mountedRef.current) saveExportSentenceTrans(state.exportSentenceTrans); }, [state.exportSentenceTrans]);
  useEffect(() => { if (mountedRef.current) saveTtsSpeechRate(state.ttsSpeechRate); }, [state.ttsSpeechRate]);
  useEffect(() => { if (mountedRef.current) saveRomanizationOn(state.romanizationOn); }, [state.romanizationOn]);
  useEffect(() => { if (mountedRef.current) saveTranslateButtons(state.translateButtons); }, [state.translateButtons]);
  useEffect(() => { if (mountedRef.current) saveStructuredOutput(state.useStructuredOutput); }, [state.useStructuredOutput]);
  useEffect(() => { if (mountedRef.current) saveNewCardsPerDay(state.newCardsPerDay); }, [state.newCardsPerDay]);
  useEffect(() => { if (mountedRef.current) saveCloudLastSynced(state.cloudLastSynced); }, [state.cloudLastSynced]);

  // Generated readers — diff-based persistence
  const prevReadersRef = useRef(state.generatedReaders);
  useEffect(() => {
    if (!mountedRef.current) return;
    const prev = prevReadersRef.current;
    const curr = state.generatedReaders;
    prevReadersRef.current = curr;
    if (prev === curr) return;
    // Save new/changed readers
    for (const key of Object.keys(curr)) {
      if (curr[key] !== prev[key]) {
        const { quotaExceeded } = saveReaderSafe(key, curr[key]);
        if (quotaExceeded) dispatch({ type: 'SET_QUOTA_WARNING', payload: true });
        // Push updated reader to cloud (handles grading results, user answers, etc.)
        if (stateRef.current.cloudUser) {
          pushReaderToCloud(key, curr[key])
            .catch(e => console.warn('[AppContext] Reader cloud sync failed:', e.message));
        }
      }
    }
    // Delete removed readers
    for (const key of Object.keys(prev)) {
      if (!(key in curr)) deleteReader(key);
    }
  }, [state.generatedReaders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply / remove dark theme attribute on <html>
  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [state.darkMode]);

  // Persist lastModified to localStorage whenever it changes
  useEffect(() => {
    saveLastModified(state.lastModified);
  }, [state.lastModified]);
}
