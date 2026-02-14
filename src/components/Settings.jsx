import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { getStorageUsage } from '../lib/storage';
import './Settings.css';

export default function Settings({ onClose }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);

  const [newKey, setNewKey]     = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const usage = getStorageUsage();

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
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
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
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowKey(s => !s)}
              >
                {showKey ? '🙈' : '👁'}
              </button>
            </div>
            <button
              type="submit"
              className="btn btn-secondary btn-sm"
              disabled={!newKey.trim()}
            >
              Update Key
            </button>
          </form>
        </section>

        <hr className="divider" />

        {/* Storage usage */}
        <section className="settings-section">
          <h3 className="settings-section__title form-label">Storage Usage</h3>
          <div className="settings-storage">
            <div className="settings-storage__bar">
              <div
                className="settings-storage__fill"
                style={{ width: `${Math.min(usage.pct, 100)}%` }}
              />
            </div>
            <p className="settings-storage__label text-subtle">
              {(usage.used / 1024).toFixed(0)} KB / {(usage.limit / 1024 / 1024).toFixed(0)} MB
              ({usage.pct}% used)
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
            Clear all syllabi, generated readers, and vocabulary history. Your API key will be kept.
          </p>
          <button
            className={`btn btn-sm ${confirmClear ? 'settings-danger-confirm' : 'btn-ghost'}`}
            onClick={handleClearAll}
            style={confirmClear ? {
              background: 'var(--color-error-light)',
              color: 'var(--color-error)',
              border: '1px solid var(--color-error)'
            } : {}}
          >
            {confirmClear ? 'Click again to confirm' : 'Clear all data'}
          </button>
          {confirmClear && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
