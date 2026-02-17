import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { getStorageUsage, loadAllReaders, exportAllData } from '../lib/storage';
import { parseReaderResponse } from '../lib/parser';
import { signInWithGoogle, signInWithApple, signOut, pushToCloud } from '../lib/cloudSync';
import { PROVIDERS, getProvider } from '../lib/providers';
import './Settings.css';

export default function Settings({ onClose }) {
  const { state, dispatch, pickSaveFolder, removeSaveFolder } = useApp();
  const act = actions(dispatch);

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

  async function handleSyncNow() {
    act.setCloudSyncing(true);
    try {
      await pushToCloud(state);
      act.setCloudLastSynced(Date.now());
      act.notify('success', 'Synced to cloud.');
    } catch (e) {
      act.notify('error', `Sync failed: ${e.message}`);
    } finally {
      act.setCloudSyncing(false);
    }
  }

  function handleClearAll() {
    if (!confirmClear) { setConfirmClear(true); return; }
    act.clearAll();
    act.notify('success', 'All app data cleared.');
    setConfirmClear(false);
    onClose?.();
  }

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="settings-panel card card-padded fade-in">
        <div className="settings-panel__header">
          <h2 className="font-display settings-panel__title">Settings</h2>
          <button className="btn btn-ghost settings-panel__close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <hr className="divider" />

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

        {/* Verbose Vocabulary */}
        <section className="settings-section">
          <div className="settings-toggle-row">
            <div>
              <h3 className="settings-section__title form-label">Verbose Vocabulary</h3>
              <p className="settings-section__desc text-muted">Show English translations for example sentences in the vocabulary section and include them in Anki exports.</p>
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

        {/* TTS voices */}
        {'speechSynthesis' in window && (chineseVoices.length > 0 || koreanVoices.length > 0 || cantoneseVoices.length > 0) && (
          <>
            <section className="settings-section">
              <h3 className="settings-section__title form-label">Text-to-Speech Voices</h3>
              {chineseVoices.length > 0 && (
                <>
                  <p className="settings-section__desc text-muted">
                    Chinese voice used when listening to stories.
                  </p>
                  <select
                    className="form-select"
                    value={state.ttsVoiceURI || ''}
                    onChange={e => act.setTtsVoice(e.target.value)}
                    style={{ maxWidth: '18rem' }}
                  >
                    {(() => {
                      const recommended = chineseVoices.filter(isRecommendedZhVoice);
                      const other = chineseVoices.filter(v => !isRecommendedZhVoice(v));
                      return (
                        <>
                          {recommended.length > 0 && (
                            <optgroup label="Recommended">
                              {recommended.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {other.length > 0 && (
                            <optgroup label="Other voices">
                              {other.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </>
              )}
              {koreanVoices.length > 0 && (
                <>
                  <p className="settings-section__desc text-muted" style={{ marginTop: chineseVoices.length > 0 ? 'var(--space-4)' : 0 }}>
                    Korean voice used when listening to stories.
                  </p>
                  <select
                    className="form-select"
                    value={state.ttsKoVoiceURI || ''}
                    onChange={e => act.setTtsKoVoice(e.target.value)}
                    style={{ maxWidth: '18rem' }}
                  >
                    {(() => {
                      const recommended = koreanVoices.filter(isRecommendedKoVoice);
                      const other = koreanVoices.filter(v => !isRecommendedKoVoice(v));
                      return (
                        <>
                          {recommended.length > 0 && (
                            <optgroup label="Recommended">
                              {recommended.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {other.length > 0 && (
                            <optgroup label="Other voices">
                              {other.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </>
              )}
              {cantoneseVoices.length > 0 && (
                <>
                  <p className="settings-section__desc text-muted" style={{ marginTop: (chineseVoices.length > 0 || koreanVoices.length > 0) ? 'var(--space-4)' : 0 }}>
                    Cantonese voice used when listening to stories.
                  </p>
                  <select
                    className="form-select"
                    value={state.ttsYueVoiceURI || ''}
                    onChange={e => act.setTtsYueVoice(e.target.value)}
                    style={{ maxWidth: '18rem' }}
                  >
                    {(() => {
                      const recommended = cantoneseVoices.filter(isRecommendedYueVoice);
                      const other = cantoneseVoices.filter(v => !isRecommendedYueVoice(v));
                      return (
                        <>
                          {recommended.length > 0 && (
                            <optgroup label="Recommended">
                              {recommended.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {other.length > 0 && (
                            <optgroup label="Other voices">
                              {other.map(v => (
                                <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      );
                    })()}
                  </select>
                </>
              )}
            </section>
            <hr className="divider" />
          </>
        )}

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

        <hr className="divider" />

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

        <hr className="divider" />

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

        {/* localStorage usage */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Browser Storage Usage</h3>
          <div className="settings-storage">
            <div className="settings-storage__bar">
              <div className="settings-storage__fill" style={{ width: `${Math.min(usage.pct, 100)}%` }} />
            </div>
            <p className="settings-storage__label text-subtle">
              {(usage.used / 1024).toFixed(0)} KB / {(usage.limit / 1024 / 1024).toFixed(0)} MB ({usage.pct}% used)
            </p>
          </div>
          {(() => {
            const allReaders = loadAllReaders();
            const readerCount = Object.keys(allReaders).length;
            return readerCount > 0 ? (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <p className="settings-section__desc text-muted">
                  Re-parse all cached readers from their saved raw text. Use this after a parser update to refresh vocabulary and examples without regenerating.
                </p>
                <button className="btn btn-secondary btn-sm" onClick={handleReparseAll}>
                  Re-parse {readerCount} cached reader{readerCount !== 1 ? 's' : ''}
                </button>
              </div>
            ) : null;
          })()}
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
              <div style={{ marginTop: 'var(--space-3)' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleSyncNow}
                  disabled={state.cloudSyncing}
                >
                  {state.cloudSyncing ? 'Syncing…' : 'Sync now'}
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
      </div>
    </div>
  );
}
