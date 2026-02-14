import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { getStorageUsage } from '../lib/storage';
import './Settings.css';

export default function Settings({ onClose }) {
  const { state, dispatch, pickSaveFolder, removeSaveFolder } = useApp();
  const act = actions(dispatch);

  const [newKey, setNewKey]           = useState('');
  const [showKey, setShowKey]         = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const usage = getStorageUsage();
  const { saveFolder, fsSupported } = state;

  function handleUpdateKey(e) {
    e.preventDefault();
    const trimmed = newKey.trim();
    if (!trimmed) return;
    act.setApiKey(trimmed);
    act.notify('success', 'API key updated.');
    setNewKey('');
    onClose?.();
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
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <hr className="divider" />

        {/* API Key */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Anthropic API Key</h3>
          <p className="settings-section__desc text-muted">
            Current key: <code className="settings-key-preview">
              {state.apiKey ? `${state.apiKey.slice(0, 12)}…` : 'Not set'}
            </code>
          </p>
          <form onSubmit={handleUpdateKey} className="settings-section__form">
            <div className="settings-key-row">
              <input
                type={showKey ? 'text' : 'password'}
                className="form-input"
                placeholder="sk-ant-api03-…"
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

        {/* Default HSK level */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Default HSK Level</h3>
          <p className="settings-section__desc text-muted">
            Pre-selected HSK level when opening the topic form.
          </p>
          <select
            className="form-select"
            value={state.defaultLevel}
            onChange={e => act.setDefaultLevel(e.target.value)}
            style={{ maxWidth: '18rem' }}
          >
            <option value={1}>HSK 1 — Absolute beginner (~150 words)</option>
            <option value={2}>HSK 2 — Elementary (~300 words)</option>
            <option value={3}>HSK 3 — Pre-intermediate (~600 words)</option>
            <option value={4}>HSK 4 — Intermediate (~1,200 words)</option>
            <option value={5}>HSK 5 — Upper-intermediate (~2,500 words)</option>
            <option value={6}>HSK 6 — Advanced (~5,000 words)</option>
          </select>
        </section>

        <hr className="divider" />

        {/* Max output tokens */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">API Output Tokens</h3>
          <p className="settings-section__desc text-muted">
            Maximum tokens Claude can return per generation. Increase this if readers are being cut off.
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
