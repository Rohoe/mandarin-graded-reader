import { PROVIDERS, getProvider } from '../lib/providers';

export default function SettingsAITab({
  state,
  act,
  hasAnyKey,
  newKey,
  setNewKey,
  showKey,
  setShowKey,
  showModelPicker,
  setShowModelPicker,
  customModelInput,
  setCustomModelInput,
  customUrlInput,
  setCustomUrlInput,
  handleUpdateKey,
}) {
  return (
    <>
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
            {state.providerKeys[state.activeProvider] ? `${state.providerKeys[state.activeProvider].slice(0, 12)}\u2026` : 'Not set'}
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
              {showKey ? '\uD83D\uDE48' : '\uD83D\uDC41'}
            </button>
          </div>
          <button type="submit" className="btn btn-secondary btn-sm" disabled={!newKey.trim()}>
            Update Key
          </button>
        </form>
      </section>
    </>
  );
}
