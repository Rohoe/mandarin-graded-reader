import { loadAllReaders } from '../lib/storage';

export default function SettingsAdvancedTab({
  state,
  act,
  confirmClear,
  handleClearAll,
  setConfirmClear,
  saveFolder,
  handleReparseAll,
}) {
  return (
    <>
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
          {state.maxTokens > 8192 && ' \u2014 Note: values above 8,192 may not be supported by all API tiers.'}
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
    </>
  );
}
