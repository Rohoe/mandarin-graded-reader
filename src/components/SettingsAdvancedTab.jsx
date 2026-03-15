import { loadAllReaders } from '../lib/storage';
import { useT } from '../i18n';

export default function SettingsAdvancedTab({
  state,
  act,
  confirmClear,
  handleClearAll,
  setConfirmClear,
  saveFolder,
  handleReparseAll,
}) {
  const t = useT();

  return (
    <>
      {/* Max output tokens */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.advanced.outputTokens')}</h3>
        <p className="settings-section__desc text-muted">
          {t('settings.advanced.outputTokensDesc')}
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
          {t('settings.advanced.currentTokens')} <code className="settings-key-preview">{state.maxTokens.toLocaleString()} tokens</code>
          {state.maxTokens > 8192 && ` \u2014 ${t('settings.advanced.outputTokensNote')}`}
        </p>
      </section>

      <hr className="divider" />

      {/* Structured output */}
      <section className="settings-section">
        <div className="settings-toggle-row">
          <div>
            <h3 className="settings-section__title form-label">{t('settings.advanced.structuredOutput')}</h3>
            <p className="settings-section__desc text-muted">
              {t('settings.advanced.structuredOutputDesc')}
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
              <h3 className="settings-section__title form-label">{t('settings.advanced.reparseCachedReaders')}</h3>
              <p className="settings-section__desc text-muted">
                {t('settings.advanced.reparseDesc')}
              </p>
              <button className="btn btn-secondary btn-sm" onClick={handleReparseAll}>
                {readerCount === 1 ? t('settings.advanced.reparseCountOne') : t('settings.advanced.reparseCount', { count: readerCount })}
              </button>
            </section>
          </>
        ) : null;
      })()}

      <hr className="divider" />

      {/* Danger zone */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label" style={{ color: 'var(--color-error)' }}>
          {t('settings.advanced.dangerZone')}
        </h3>
        <p className="settings-section__desc text-muted">
          {t('settings.advanced.clearDesc')}
          {saveFolder && t('settings.advanced.clearDescFolder')}
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
            {confirmClear ? t('settings.advanced.confirmClear') : t('settings.advanced.clearBrowserData')}
          </button>
          {confirmClear && (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>
              {t('common.cancel')}
            </button>
          )}
        </div>
      </section>
    </>
  );
}
