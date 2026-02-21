import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { getStorageUsage, loadAllReaders, exportAllData } from '../lib/storage';
import { parseReaderResponse } from '../lib/parser';
import { signInWithGoogle, signInWithApple, signOut, pushToCloud, pullFromCloud, mergeData, pushMergedToCloud } from '../lib/cloudSync';
import { PROVIDERS, getProvider } from '../lib/providers';
import './Settings.css';

const TABS = [
  { id: 'reading',  label: 'Reading' },
  { id: 'ai',       label: 'AI Provider' },
  { id: 'sync',     label: 'Sync' },
  { id: 'advanced', label: 'Advanced' },
];

export default function Settings({ onClose }) {
  const { state, dispatch, pickSaveFolder, removeSaveFolder, clearAllData } = useApp();
  const act = actions(dispatch);

  const hasAnyKey = Object.values(state.providerKeys).some(k => k);
  const [activeTab, setActiveTab] = useState(hasAnyKey ? 'reading' : 'ai');
  const [newKey, setNewKey]           = useState('');
  const [showKey, setShowKey]         = useState(false);
  const [customModelInput, setCustomModelInput] = useState(state.customModelName || '');
  const [customUrlInput, setCustomUrlInput] = useState(state.customBaseUrl || '');
  // Show model picker expanded if user has a non-default model set, or for openai_compatible
  const [showModelPicker, setShowModelPicker] = useState(() => {
    if (state.activeProvider === 'openai_compatible') return true;
    const prov = getProvider(state.activeProvider);
    const provModel = state.activeModels?.[state.activeProvider];
    return !!(provModel && provModel !== prov.defaultModel);
  });
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  const [chineseVoices, setChineseVoices] = useState([]);
  const [koreanVoices, setKoreanVoices]   = useState([]);
  const [cantoneseVoices, setCantoneseVoices] = useState([]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      setChineseVoices(all.filter(v => /zh/i.test(v.lang)));
      setKoreanVoices(all.filter(v => /ko/i.test(v.lang)));
      setCantoneseVoices(all.filter(v => /zh-HK|yue/i.test(v.lang)));
    }
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  function isRecommendedZhVoice(v) {
    return /^Google\s+/i.test(v.name) || /^(Tingting|Meijia|Sinji)$/i.test(v.name);
  }

  function isRecommendedKoVoice(v) {
    return /^Google\s+/i.test(v.name) || /^Yuna$/i.test(v.name);
  }

  function isRecommendedYueVoice(v) {
    return /^Google\s+/i.test(v.name) || /^Sin-?ji$/i.test(v.name);
  }

  const usage = getStorageUsage();
  const { saveFolder, fsSupported } = state;

  function handleUpdateKey(e) {
    e.preventDefault();
    const trimmed = newKey.trim();
    if (!trimmed) return;
    act.setProviderKey(state.activeProvider, trimmed);
    act.notify('success', 'API key updated.');
    setNewKey('');
  }

  function handleReparseAll() {
    // Use loadAllReaders() directly so we re-parse everything in localStorage,
    // not just the subset currently loaded into React state.
    const readers = loadAllReaders();
    let count = 0;
    for (const [key, reader] of Object.entries(readers)) {
      if (!reader?.raw) continue;
      const parsed = parseReaderResponse(reader.raw);
      act.setReader(key, {
        ...parsed,
        topic:          reader.topic,
        level:          reader.level,
        lessonKey:      reader.lessonKey || key,
        userAnswers:    reader.userAnswers,
        gradingResults: reader.gradingResults,
      });
      count++;
    }
    act.notify('success', `Re-parsed ${count} reader${count !== 1 ? 's' : ''} from cached text.`);
  }

  function handleExportBackup() {
    const data = exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graded-reader-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data || typeof data !== 'object' || !data.syllabi) {
          throw new Error('Invalid backup file: missing syllabi field.');
        }
        act.restoreFromBackup(data);
        act.notify('success', 'Backup restored successfully.');
        setConfirmRestore(false);
      } catch (err) {
        setRestoreError(err.message);
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  async function handlePushToCloud() {
    act.setCloudSyncing(true);
    try {
      await pushToCloud(state);
      act.setCloudLastSynced(Date.now());
      // Clear merge snapshot — push commits the merge
      if (state.hasMergeSnapshot) {
        localStorage.removeItem('gradedReader_preMergeSnapshot');
        act.clearMergeSnapshot();
      }
      act.notify('success', 'Pushed to cloud.');
    } catch (e) {
      act.notify('error', `Push failed: ${e.message}`);
    } finally {
      act.setCloudSyncing(false);
    }
  }

  async function handlePullFromCloud() {
    act.setCloudSyncing(true);
    try {
      const cloudData = await pullFromCloud();
      if (!cloudData) {
        act.notify('error', 'No cloud data found.');
        return;
      }
      // Merge cloud data with local (additive, no data loss)
      const merged = mergeData(state, cloudData);
      dispatch({ type: 'MERGE_WITH_CLOUD', payload: merged });
      await pushMergedToCloud(merged);
      act.setCloudLastSynced(Date.now());
      // Clear merge snapshot — pull commits the merge
      if (state.hasMergeSnapshot) {
        localStorage.removeItem('gradedReader_preMergeSnapshot');
        act.clearMergeSnapshot();
      }
      act.notify('success', 'Pulled and merged from cloud.');
    } catch (e) {
      act.notify('error', `Pull failed: ${e.message}`);
    } finally {
      act.setCloudSyncing(false);
    }
  }

  async function handleClearAll() {
    if (!confirmClear) { setConfirmClear(true); return; }
    await clearAllData();
    act.notify('success', 'All app data cleared.');
    setConfirmClear(false);
    onClose?.();
  }

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="settings-panel card card-padded fade-in">
        <div className="settings-panel__header">
          <h2 className="font-display settings-panel__title">Settings</h2>
          <button className="btn btn-ghost settings-panel__close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        {/* Tab bar */}
        <div className="settings-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`settings-tabs__tab ${activeTab === tab.id ? 'settings-tabs__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'ai' && !hasAnyKey && (
                <span className="settings-tabs__warning-dot" title="No API key configured" />
              )}
            </button>
          ))}
        </div>

        {/* ═══ Reading tab ═══ */}
        {activeTab === 'reading' && (<>

        {/* Dark mode */}
        <section className="settings-section">
          <div className="settings-toggle-row">
            <div>
              <h3 className="settings-section__title form-label">Dark Mode</h3>
              <p className="settings-section__desc text-muted">Switch to a dark colour scheme.</p>
            </div>
            <button
              role="switch"
              aria-checked={state.darkMode}
              className={`settings-toggle ${state.darkMode ? 'settings-toggle--on' : ''}`}
              onClick={() => act.setDarkMode(!state.darkMode)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>
        </section>

        <hr className="divider" />

        {/* Show Romanization */}
        <section className="settings-section">
          <div className="settings-toggle-row">
            <div>
              <h3 className="settings-section__title form-label">Show Romanization</h3>
              <p className="settings-section__desc text-muted">Display pinyin, jyutping, or romanized Korean above characters in stories and vocabulary.</p>
            </div>
            <button
              role="switch"
              aria-checked={state.romanizationOn}
              className={`settings-toggle ${state.romanizationOn ? 'settings-toggle--on' : ''}`}
              onClick={() => act.setRomanizationOn(!state.romanizationOn)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>
        </section>

        <hr className="divider" />

        {/* Paragraph Tools */}
        <section className="settings-section">
          <div className="settings-toggle-row">
            <div>
              <h3 className="settings-section__title form-label">Paragraph Tools</h3>
              <p className="settings-section__desc text-muted">Show inline TTS and translate buttons at the end of each paragraph.</p>
            </div>
            <button
              role="switch"
              aria-checked={state.translateButtons}
              className={`settings-toggle ${state.translateButtons ? 'settings-toggle--on' : ''}`}
              onClick={() => act.setTranslateButtons(!state.translateButtons)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>
        </section>

        <hr className="divider" />

        {/* Verbose Vocabulary */}
        <section className="settings-section">
          <div className="settings-toggle-row">
            <div>
              <h3 className="settings-section__title form-label">Verbose Vocabulary</h3>
              <p className="settings-section__desc text-muted">Include English translations of example sentences in Anki flashcard exports (translated via Google Translate at export time).</p>
            </div>
            <button
              role="switch"
              aria-checked={state.verboseVocab}
              className={`settings-toggle ${state.verboseVocab ? 'settings-toggle--on' : ''}`}
              onClick={() => act.setVerboseVocab(!state.verboseVocab)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>
        </section>

        <hr className="divider" />

        {/* Reading speed */}
        {'speechSynthesis' in window && (
          <>
            <section className="settings-section">
              <h3 className="settings-section__title form-label">Reading Speed</h3>
              <p className="settings-section__desc text-muted">
                Adjust the text-to-speech playback speed.
              </p>
              <div className="settings-slider-row">
                <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>0.5x</span>
                <span className="settings-slider-value">{state.ttsSpeechRate.toFixed(1)}x</span>
                <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>2.0x</span>
              </div>
              <input
                type="range"
                className="settings-slider"
                min={0.5} max={2} step={0.1}
                value={state.ttsSpeechRate}
                onChange={e => act.setTtsSpeechRate(e.target.value)}
              />
            </section>
            <hr className="divider" />
          </>
        )}

        {/* New flashcards per day */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">New Flashcards Per Day</h3>
          <p className="settings-section__desc text-muted">
            Maximum number of new cards introduced in each daily session.
          </p>
          <div className="settings-slider-row">
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>5</span>
            <span className="settings-slider-value">{state.newCardsPerDay}</span>
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>50</span>
          </div>
          <input
            type="range"
            className="settings-slider"
            min={5} max={50} step={5}
            value={state.newCardsPerDay}
            onChange={e => act.setNewCardsPerDay(e.target.value)}
          />
        </section>

        <hr className="divider" />

        {/* Default HSK level */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Default HSK Level</h3>
          <p className="settings-section__desc text-muted">
            Pre-selected level when creating Chinese content.
          </p>
          <select
            className="form-select"
            value={state.defaultLevel}
            onChange={e => act.setDefaultLevel(e.target.value)}
            style={{ maxWidth: '18rem' }}
          >
            <option value={0}>HSK 0 — Total beginner (~30 words, pinyin focus)</option>
            <option value={1}>HSK 1 — Absolute beginner (~150 words)</option>
            <option value={2}>HSK 2 — Elementary (~300 words)</option>
            <option value={3}>HSK 3 — Pre-intermediate (~600 words)</option>
            <option value={4}>HSK 4 — Intermediate (~1,200 words)</option>
            <option value={5}>HSK 5 — Upper-intermediate (~2,500 words)</option>
            <option value={6}>HSK 6 — Advanced (~5,000 words)</option>
          </select>
        </section>

        <hr className="divider" />

        {/* Default TOPIK level */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Default TOPIK Level</h3>
          <p className="settings-section__desc text-muted">
            Pre-selected level when creating Korean content.
          </p>
          <select
            className="form-select"
            value={state.defaultTopikLevel}
            onChange={e => act.setDefaultTopikLevel(e.target.value)}
            style={{ maxWidth: '18rem' }}
          >
            <option value={0}>TOPIK 0 — Total beginner (~30 words, hangul focus)</option>
            <option value={1}>TOPIK 1 — Absolute beginner (~800 words)</option>
            <option value={2}>TOPIK 2 — Elementary (~1,500 words)</option>
            <option value={3}>TOPIK 3 — Pre-intermediate (~3,000 words)</option>
            <option value={4}>TOPIK 4 — Intermediate (~5,000 words)</option>
            <option value={5}>TOPIK 5 — Upper-intermediate (~8,000 words)</option>
            <option value={6}>TOPIK 6 — Advanced (~12,000 words)</option>
          </select>
        </section>

        <hr className="divider" />

        {/* Default YUE level */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Default YUE Level</h3>
          <p className="settings-section__desc text-muted">
            Pre-selected level when creating Cantonese content.
          </p>
          <select
            className="form-select"
            value={state.defaultYueLevel}
            onChange={e => act.setDefaultYueLevel(e.target.value)}
            style={{ maxWidth: '18rem' }}
          >
            <option value={0}>YUE 0 — Total beginner (~30 words, jyutping focus)</option>
            <option value={1}>YUE 1 — Absolute beginner (~150 words)</option>
            <option value={2}>YUE 2 — Elementary (~300 words)</option>
            <option value={3}>YUE 3 — Pre-intermediate (~600 words)</option>
            <option value={4}>YUE 4 — Intermediate (~1,200 words)</option>
            <option value={5}>YUE 5 — Upper-intermediate (~2,500 words)</option>
            <option value={6}>YUE 6 — Advanced (~5,000 words)</option>
          </select>
        </section>

        {/* TTS voice preferences */}
        {'speechSynthesis' in window && (
          <>
            <hr className="divider" />
            <section className="settings-section">
              <h3 className="settings-section__title form-label">TTS Voices</h3>
              <p className="settings-section__desc text-muted">
                Choose preferred text-to-speech voices for each language. Recommended voices are listed first.
              </p>

              {/* Chinese voice */}
              <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>Chinese voice</label>
              <select
                className="form-select"
                value={state.ttsZhVoiceURI || ''}
                onChange={e => act.setTtsZhVoiceURI(e.target.value || null)}
                style={{ maxWidth: '18rem' }}
              >
                <option value="">Auto (best available)</option>
                {chineseVoices
                  .sort((a, b) => isRecommendedZhVoice(b) - isRecommendedZhVoice(a))
                  .map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){isRecommendedZhVoice(v) ? ' ★' : ''}
                    </option>
                  ))}
              </select>

              {/* Cantonese voice */}
              <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>Cantonese voice</label>
              <select
                className="form-select"
                value={state.ttsYueVoiceURI || ''}
                onChange={e => act.setTtsYueVoiceURI(e.target.value || null)}
                style={{ maxWidth: '18rem' }}
              >
                <option value="">Auto (best available)</option>
                {cantoneseVoices
                  .sort((a, b) => isRecommendedYueVoice(b) - isRecommendedYueVoice(a))
                  .map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){isRecommendedYueVoice(v) ? ' ★' : ''}
                    </option>
                  ))}
              </select>

              {/* Korean voice */}
              <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>Korean voice</label>
              <select
                className="form-select"
                value={state.ttsKoVoiceURI || ''}
                onChange={e => act.setTtsKoVoiceURI(e.target.value || null)}
                style={{ maxWidth: '18rem' }}
              >
                <option value="">Auto (best available)</option>
                {koreanVoices
                  .sort((a, b) => isRecommendedKoVoice(b) - isRecommendedKoVoice(a))
                  .map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang}){isRecommendedKoVoice(v) ? ' ★' : ''}
                    </option>
                  ))}
              </select>
            </section>
          </>
        )}

        </>)}

        {/* ═══ AI Provider tab ═══ */}
        {activeTab === 'ai' && (<>

        {/* Demo key callout */}
        {!hasAnyKey && !!import.meta.env.VITE_DEFAULT_GEMINI_KEY && (
          <div className="settings-demo-callout">
            You're currently using the <strong>demo API key</strong>. Add your own key below for faster responses and higher limits.
          </div>
        )}

        {/* AI Provider */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">AI Provider</h3>

          {/* Provider pills */}
          <div className="topic-form__lang-pills" style={{ marginBottom: 'var(--space-3)' }}>
            {Object.values(PROVIDERS).map(p => (
              <button
                key={p.id}
                type="button"
                className={`topic-form__lang-pill ${state.activeProvider === p.id ? 'active' : ''}`}
                onClick={() => act.setActiveProvider(p.id)}
                style={{ position: 'relative' }}
              >
                {p.name.split(' (')[0]}
                {state.providerKeys[p.id] && (
                  <span style={{
                    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--color-accent)', marginLeft: 4, verticalAlign: 'middle',
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Model selector */}
          {(() => {
            const prov = getProvider(state.activeProvider);
            const provModel = state.activeModels?.[state.activeProvider] || null;
            const currentModel = provModel || prov.defaultModel;
            const modelLabel = prov.models.find(m => m.id === currentModel)?.label || currentModel;

            if (state.activeProvider === 'openai_compatible') {
              const presets = prov.presets || [];
              return (
                <>
                  <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                    Preset
                  </p>
                  <div className="topic-form__lang-pills" style={{ marginBottom: 'var(--space-3)' }}>
                    {presets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`topic-form__lang-pill ${state.compatPreset === preset.id ? 'active' : ''}`}
                        onClick={() => {
                          act.setCompatPreset(preset.id);
                          if (preset.baseUrl) act.setCustomBaseUrl(preset.baseUrl);
                          if (preset.defaultModel) {
                            act.setCustomModelName(preset.defaultModel);
                            setCustomModelInput(preset.defaultModel);
                            act.setActiveModel('openai_compatible', preset.defaultModel);
                          }
                          if (preset.baseUrl) setCustomUrlInput(preset.baseUrl);
                        }}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                    Model name
                  </p>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. deepseek-chat"
                    value={customModelInput}
                    onChange={e => {
                      setCustomModelInput(e.target.value);
                      act.setCustomModelName(e.target.value);
                      act.setActiveModel('openai_compatible', e.target.value);
                    }}
                    style={{ maxWidth: '18rem', marginBottom: 'var(--space-3)' }}
                  />
                  {state.compatPreset === 'custom' && (
                    <>
                      <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                        Base URL
                      </p>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="https://api.example.com"
                        value={customUrlInput}
                        onChange={e => {
                          setCustomUrlInput(e.target.value);
                          act.setCustomBaseUrl(e.target.value);
                        }}
                        style={{ maxWidth: '18rem', marginBottom: 'var(--space-3)' }}
                      />
                    </>
                  )}
                </>
              );
            }

            // Standard providers: show default model with option to change
            if (!showModelPicker) {
              return (
                <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-3)' }}>
                  Model: <strong>{modelLabel}</strong>
                  {' '}<button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)' }}
                    onClick={() => setShowModelPicker(true)}
                  >
                    Change
                  </button>
                </p>
              );
            }

            return (
              <>
                <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                  Model
                </p>
                <select
                  className="form-select"
                  value={currentModel}
                  onChange={e => act.setActiveModel(state.activeProvider, e.target.value)}
                  style={{ maxWidth: '18rem', marginBottom: 'var(--space-2)' }}
                >
                  {prov.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                <p className="settings-section__desc text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
                  {' '}<button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)' }}
                    onClick={() => { act.setActiveModel(state.activeProvider, null); setShowModelPicker(false); }}
                  >
                    Reset to default
                  </button>
                </p>
              </>
            );
          })()}

          {/* Grading model selector */}
          {(() => {
            const prov = getProvider(state.activeProvider);
            if (state.activeProvider === 'openai_compatible' || prov.models.length === 0) return null;
            const gradingModel = state.gradingModels?.[state.activeProvider] || prov.defaultGradingModel || prov.defaultModel;
            const gradingLabel = prov.models.find(m => m.id === gradingModel)?.label || gradingModel;
            const isDefault = !state.gradingModels?.[state.activeProvider];
            return (
              <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-3)' }}>
                Grading model: <strong>{gradingLabel}</strong>
                {isDefault && <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}> (default)</span>}
                {' '}<select
                  className="form-select"
                  value={gradingModel}
                  onChange={e => act.setGradingModel(state.activeProvider, e.target.value)}
                  style={{ maxWidth: '14rem', display: 'inline-block', verticalAlign: 'middle', fontSize: 'var(--text-sm)', padding: '2px var(--space-2)' }}
                >
                  {prov.models.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
                {!isDefault && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)', marginLeft: 'var(--space-1)' }}
                    onClick={() => act.setGradingModel(state.activeProvider, null)}
                  >
                    Reset
                  </button>
                )}
              </p>
            );
          })()}

          {/* API key input */}
          <p className="settings-section__desc text-muted">
            API key for {getProvider(state.activeProvider).name}.
            {' '}Current: <code className="settings-key-preview">
              {state.providerKeys[state.activeProvider] ? `${state.providerKeys[state.activeProvider].slice(0, 12)}…` : 'Not set'}
            </code>
          </p>
          <form onSubmit={handleUpdateKey} className="settings-section__form">
            <div className="settings-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="form-input"
                placeholder={getProvider(state.activeProvider).keyPlaceholder}
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                autoComplete="off"
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowKey(s => !s)}>
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
            <button type="submit" className="btn btn-secondary btn-sm" disabled={!newKey.trim()}>
              Update Key
            </button>
          </form>
        </section>

        </>)}

        {/* ═══ Sync tab ═══ */}
        {activeTab === 'sync' && (<>

        {/* localStorage usage */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Browser Storage Usage</h3>
          <div className="settings-storage">
            <div className="settings-storage__bar">
              <div className="settings-storage__fill" style={{ width: `${Math.max(Math.min(usage.pct, 100), usage.pct > 0 ? 3 : 0)}%` }} />
            </div>
            <p className="settings-storage__label text-subtle">
              {(usage.used / 1024).toFixed(0)} KB / {(usage.limit / 1024 / 1024).toFixed(0)} MB ({usage.pct}% used)
            </p>
          </div>
        </section>

        <hr className="divider" />

        {/* Backup & Restore */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Backup &amp; Restore</h3>
          <p className="settings-section__desc text-muted">
            Export all your data (syllabi, readers, vocabulary) as a JSON file, or restore from a previous backup. Your API key is never included.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExportBackup}>
              Export backup ↓
            </button>
            {!confirmRestore ? (
              <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRestore(true); setRestoreError(null); }}>
                Restore from backup…
              </button>
            ) : (
              <>
                <label
                  className="btn btn-sm"
                  style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', border: '1px solid var(--color-error)', cursor: 'pointer' }}
                >
                  This will replace all data — choose file
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleRestoreFile}
                  />
                </label>
                <button className="btn btn-ghost btn-sm" onClick={() => { setConfirmRestore(false); setRestoreError(null); }}>
                  Cancel
                </button>
              </>
            )}
          </div>
          {restoreError && (
            <p className="settings-section__desc" style={{ color: 'var(--color-error)', marginTop: 'var(--space-2)' }}>
              ⚠ {restoreError}
            </p>
          )}
        </section>

        <hr className="divider" />

        {/* Cloud Sync */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Cloud Sync</h3>
          {state.cloudUser ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p className="settings-section__desc text-muted" style={{ margin: 0 }}>
                  Signed in as <strong>{state.cloudUser.email || state.cloudUser.user_metadata?.full_name || state.cloudUser.id}</strong>
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}
                  onClick={() => signOut()}
                >
                  Sign out
                </button>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handlePushToCloud}
                  disabled={state.cloudSyncing}
                >
                  {state.cloudSyncing ? 'Syncing…' : 'Push to cloud'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handlePullFromCloud}
                  disabled={state.cloudSyncing}
                >
                  {state.cloudSyncing ? 'Syncing…' : 'Pull from cloud'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="settings-section__desc text-muted">
                Sign in to sync your syllabi, readers, and vocabulary across devices.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => signInWithGoogle()}>
                  Sign in with Google
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => signInWithApple()}>
                  Sign in with Apple
                </button>
              </div>
            </>
          )}
        </section>

        {/* Revert last sync — only when a merge snapshot exists and user is signed in */}
        {state.hasMergeSnapshot && state.cloudUser && (() => {
          let snapshotDate = '';
          try {
            const raw = localStorage.getItem('gradedReader_preMergeSnapshot');
            if (raw) {
              const snap = JSON.parse(raw);
              snapshotDate = new Date(snap.timestamp).toLocaleString();
            }
          } catch {}
          return (
            <>
              <hr className="divider" />
              <section className="settings-section">
                <h3 className="settings-section__title form-label">Revert Last Sync</h3>
                <p className="settings-section__desc text-muted">
                  Undo the auto-merge that ran on startup{snapshotDate ? ` (${snapshotDate})` : ''}. Restores your local data to its pre-merge state.
                </p>
                {!confirmRevert ? (
                  <button className="btn btn-secondary btn-sm" onClick={() => setConfirmRevert(true)}>
                    Revert last sync
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ color: 'var(--color-error)' }}
                      onClick={() => {
                        dispatch({ type: 'REVERT_MERGE' });
                        setConfirmRevert(false);
                        act.notify('success', 'Reverted to pre-merge state.');
                      }}
                    >
                      Confirm revert
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRevert(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </section>
            </>
          );
        })()}

        <hr className="divider" />

        {/* Save folder */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Save Folder</h3>

          {!fsSupported ? (
            <p className="settings-section__desc text-muted">
              File System Access API is not supported in this browser.
              Use Chrome or Edge to enable disk persistence.
            </p>
          ) : saveFolder ? (
            <>
              <div className="settings-folder-active">
                <span className="settings-folder-icon">📁</span>
                <div>
                  <p className="settings-folder-name">{saveFolder.name}</p>
                  <p className="settings-section__desc text-muted" style={{ marginTop: 2 }}>
                    Data is being saved to this folder on every change.
                  </p>
                </div>
              </div>
              <div className="settings-section__form">
                <button className="btn btn-secondary btn-sm" onClick={pickSaveFolder}>
                  Change folder
                </button>
                <button className="btn btn-ghost btn-sm" onClick={removeSaveFolder}>
                  Remove folder
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="settings-section__desc text-muted">
                Choose a folder on your computer where the app will save your syllabi,
                readers, and vocabulary as JSON files. This is in addition to browser
                storage and survives clearing browser data.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={pickSaveFolder}>
                📁 Choose save folder…
              </button>
            </>
          )}
        </section>

        </>)}

        {/* ═══ Advanced tab ═══ */}
        {activeTab === 'advanced' && (<>

        {/* Max output tokens */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">API Output Tokens</h3>
          <p className="settings-section__desc text-muted">
            Maximum output tokens per generation. Increase this if readers are being cut off.
          </p>
          <div className="settings-slider-row">
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>4 096</span>
            <span className="settings-slider-value">{state.maxTokens.toLocaleString()}</span>
            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>16 384</span>
          </div>
          <input
            type="range"
            className="settings-slider"
            min={4096} max={16384} step={1024}
            value={state.maxTokens}
            onChange={e => act.setMaxTokens(e.target.value)}
          />
          <p className="settings-section__desc text-muted" style={{ fontSize: 'var(--text-xs)' }}>
            Current: <code className="settings-key-preview">{state.maxTokens.toLocaleString()} tokens</code>
            {state.maxTokens > 8192 && ' — Note: values above 8,192 may not be supported by all API tiers.'}
          </p>
        </section>

        <hr className="divider" />

        {/* Structured output */}
        <section className="settings-section">
          <div className="settings-toggle-row">
            <div>
              <h3 className="settings-section__title form-label">Structured Output</h3>
              <p className="settings-section__desc text-muted">
                Use provider-native structured output (tool use for Anthropic, JSON schema for OpenAI, response schema for Gemini).
                May improve parsing reliability but is not supported by all providers.
                OpenAI-compatible endpoints fall back to the standard text parser.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={state.useStructuredOutput}
              className={`settings-toggle ${state.useStructuredOutput ? 'settings-toggle--on' : ''}`}
              onClick={() => act.setStructuredOutput(!state.useStructuredOutput)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>
        </section>

        {/* Re-parse cached readers */}
        {(() => {
          const allReaders = loadAllReaders();
          const readerCount = Object.keys(allReaders).length;
          return readerCount > 0 ? (
            <>
              <hr className="divider" />
              <section className="settings-section">
                <h3 className="settings-section__title form-label">Re-parse Cached Readers</h3>
                <p className="settings-section__desc text-muted">
                  Re-parse all cached readers from their saved raw text. Use this after a parser update to refresh vocabulary and examples without regenerating.
                </p>
                <button className="btn btn-secondary btn-sm" onClick={handleReparseAll}>
                  Re-parse {readerCount} cached reader{readerCount !== 1 ? 's' : ''}
                </button>
              </section>
            </>
          ) : null;
        })()}

        <hr className="divider" />

        {/* Danger zone */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label" style={{ color: 'var(--color-error)' }}>
            Danger Zone
          </h3>
          <p className="settings-section__desc text-muted">
            Clear all syllabi, generated readers, and vocabulary history from browser storage.
            {saveFolder && ' Files in your save folder are not deleted.'}
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              className="btn btn-sm"
              onClick={handleClearAll}
              style={confirmClear ? {
                background: 'var(--color-error-light)',
                color: 'var(--color-error)',
                border: '1px solid var(--color-error)',
              } : { background: 'transparent', color: 'var(--color-text-muted)' }}
            >
              {confirmClear ? 'Click again to confirm' : 'Clear browser data'}
            </button>
            {confirmClear && (
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            )}
          </div>
        </section>

        </>)}
      </div>
    </div>
  );
}
