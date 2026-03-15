import { useState } from 'react';
import { PROVIDERS, getProvider, fetchProviderModels } from '../lib/providers';
import { useT } from '../i18n';

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
  const t = useT();
  const [fetchingModels, setFetchingModels] = useState(false);

  async function handleRefreshModels() {
    const providerId = state.activeProvider;
    const apiKey = state.providerKeys[providerId];
    if (!apiKey || fetchingModels) return;
    setFetchingModels(true);
    try {
      const baseUrl = providerId === 'openai_compatible' ? state.customBaseUrl : undefined;
      const models = await fetchProviderModels(providerId, apiKey, baseUrl);
      if (models && models.length > 0) {
        act.setFetchedModels(providerId, models);
      } else {
        act.notify('error', t('settings.ai.refreshFailed'));
      }
    } finally {
      setFetchingModels(false);
    }
  }

  return (
    <>
      {/* Demo key callout */}
      {!hasAnyKey && !!import.meta.env.VITE_DEFAULT_GEMINI_KEY && (
        <div className="settings-demo-callout">
          {t('settings.ai.demoCallout')}
        </div>
      )}

      {/* AI Provider */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.ai.title')}</h3>

        {/* Provider pills */}
        <div className="pill-selector topic-form__lang-pills" style={{ marginBottom: 'var(--space-3)' }}>
          {Object.values(PROVIDERS).map(p => (
            <button
              key={p.id}
              type="button"
              className={`pill-option topic-form__lang-pill ${state.activeProvider === p.id ? 'active' : ''}`}
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
          const fetched = state.fetchedModels?.[state.activeProvider];
          const modelList = fetched?.models || prov.models;
          const provModel = state.activeModels?.[state.activeProvider] || null;
          const currentModel = provModel || prov.defaultModel;
          const modelLabel = modelList.find(m => m.id === currentModel)?.label || currentModel;
          const hasKey = !!state.providerKeys[state.activeProvider];
          const modelMissing = fetched && currentModel && !modelList.some(m => m.id === currentModel);

          if (state.activeProvider === 'openai_compatible') {
            const presets = prov.presets || [];
            return (
              <>
                <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                  {t('settings.ai.preset')}
                </p>
                <div className="pill-selector topic-form__lang-pills" style={{ marginBottom: 'var(--space-3)' }}>
                  {presets.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`pill-option topic-form__lang-pill ${state.compatPreset === preset.id ? 'active' : ''}`}
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
                  {t('settings.ai.modelName')}
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
                      {t('settings.ai.baseUrl')}
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
                {t('settings.ai.model')}: <strong>{modelLabel}</strong>
                {modelMissing && (
                  <span style={{ color: 'var(--color-warning, #b45309)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-1)' }}>
                    {t('settings.ai.modelNotAvailable')}
                  </span>
                )}
                {' '}<button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)' }}
                  onClick={() => setShowModelPicker(true)}
                >
                  {t('settings.ai.change')}
                </button>
              </p>
            );
          }

          return (
            <>
              <p className="settings-section__desc text-muted" style={{ marginBottom: 'var(--space-2)' }}>
                {t('settings.ai.model')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <select
                  className="form-select"
                  value={currentModel}
                  onChange={e => act.setActiveModel(state.activeProvider, e.target.value)}
                  style={{ maxWidth: '18rem' }}
                >
                  {modelList.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                  {modelMissing && (
                    <option value={currentModel}>{currentModel} {t('settings.ai.notFound')}</option>
                  )}
                </select>
                {hasKey && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 'var(--text-xs)', padding: '2px var(--space-2)', whiteSpace: 'nowrap' }}
                    onClick={handleRefreshModels}
                    disabled={fetchingModels}
                  >
                    {fetchingModels ? t('settings.ai.refreshing') : t('settings.ai.refreshModels')}
                  </button>
                )}
              </div>
              {modelMissing && (
                <p style={{ color: 'var(--color-warning, #b45309)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-2)' }}>
                  {t('settings.ai.modelNotFound', { model: currentModel })}
                </p>
              )}
              <p className="settings-section__desc text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
                {' '}<button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)' }}
                  onClick={() => { act.setActiveModel(state.activeProvider, null); setShowModelPicker(false); }}
                >
                  {t('settings.ai.resetToDefault')}
                </button>
              </p>
            </>
          );
        })()}

        {/* Grading model selector */}
        {(() => {
          const prov = getProvider(state.activeProvider);
          if (state.activeProvider === 'openai_compatible' || prov.models.length === 0) return null;
          const fetched = state.fetchedModels?.[state.activeProvider];
          const gradingModelList = fetched?.models || prov.models;
          const gradingModel = state.gradingModels?.[state.activeProvider] || prov.defaultGradingModel || prov.defaultModel;
          const gradingLabel = gradingModelList.find(m => m.id === gradingModel)?.label || gradingModel;
          const isDefault = !state.gradingModels?.[state.activeProvider];
          const gradingMissing = fetched && gradingModel && !gradingModelList.some(m => m.id === gradingModel);
          return (
            <>
              <p className="settings-section__desc text-muted" style={{ marginBottom: gradingMissing ? 'var(--space-1)' : 'var(--space-3)' }}>
                {t('settings.ai.gradingModel')} <strong>{gradingLabel}</strong>
                {isDefault && <span style={{ fontSize: 'var(--text-xs)', opacity: 0.7 }}> {t('settings.ai.default')}</span>}
                {gradingMissing && (
                  <span style={{ color: 'var(--color-warning, #b45309)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-1)' }}>
                    {t('settings.ai.modelNotAvailable')}
                  </span>
                )}
                {' '}<select
                  className="form-select"
                  value={gradingModel}
                  onChange={e => act.setGradingModel(state.activeProvider, e.target.value)}
                  style={{ maxWidth: '14rem', display: 'inline-block', verticalAlign: 'middle', fontSize: 'var(--text-sm)', padding: '2px var(--space-2)' }}
                >
                  {gradingModelList.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                  {gradingMissing && (
                    <option value={gradingModel}>{gradingModel} {t('settings.ai.notFound')}</option>
                  )}
                </select>
                {!isDefault && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 'var(--text-xs)', padding: '0 var(--space-2)', marginLeft: 'var(--space-1)' }}
                    onClick={() => act.setGradingModel(state.activeProvider, null)}
                  >
                    {t('settings.ai.reset')}
                  </button>
                )}
              </p>
              {gradingMissing && (
                <p style={{ color: 'var(--color-warning, #b45309)', fontSize: 'var(--text-xs)', marginBottom: 'var(--space-3)' }}>
                  {t('settings.ai.modelNotFound', { model: gradingModel })}
                </p>
              )}
            </>
          );
        })()}

        {/* API key input */}
        <p className="settings-section__desc text-muted">
          {t('settings.ai.apiKeyFor', { provider: getProvider(state.activeProvider).name })}
          {' '}{t('settings.ai.current')} <code className="settings-key-preview">
            {state.providerKeys[state.activeProvider] ? `${state.providerKeys[state.activeProvider].slice(0, 12)}\u2026` : t('settings.ai.notSet')}
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
            {t('settings.ai.updateKey')}
          </button>
        </form>
      </section>
    </>
  );
}
