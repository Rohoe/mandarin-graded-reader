import { useState, useEffect } from 'react';
import { getAllLanguages } from '../lib/languages';
import { getAllNativeLanguages } from '../lib/nativeLanguages';
import { useT } from '../i18n';

export default function SettingsReadingTab({ state, act }) {
  const t = useT();

  const [levelsOpen, setLevelsOpen] = useState(false);
  const [voicesOpen, setVoicesOpen] = useState(false);

  // Build voices map keyed by langId
  const [voicesMap, setVoicesMap] = useState({});

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    function loadVoices() {
      const all = window.speechSynthesis.getVoices();
      const map = {};
      for (const lang of getAllLanguages()) {
        map[lang.id] = all.filter(v => lang.tts.langFilter.test(v.lang));
      }
      setVoicesMap(map);
    }
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  function isRecommendedVoice(lang, v) {
    return lang.tts.priorityVoices.some(test => test(v));
  }

  return (
    <>
      {/* My Native Language */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.reading.nativeLang')}</h3>
        <p className="settings-section__desc text-muted">
          {t('settings.reading.nativeLangDesc')}
        </p>
        <select
          className="form-select"
          value={state.nativeLang || 'en'}
          onChange={e => act.setNativeLang(e.target.value)}
          style={{ maxWidth: '18rem' }}
        >
          {getAllNativeLanguages().map(lang => (
            <option key={lang.id} value={lang.id}>{lang.name}</option>
          ))}
        </select>
      </section>

      <hr className="divider" />

      {/* Dark mode */}
      <section className="settings-section">
        <div className="settings-toggle-row">
          <div>
            <h3 className="settings-section__title form-label">{t('settings.reading.darkMode')}</h3>
            <p className="settings-section__desc text-muted">{t('settings.reading.darkModeDesc')}</p>
          </div>
          <button
            role="switch"
            aria-checked={state.darkMode}
            className={`settings-toggle ${state.darkMode ? 'settings-toggle--on' : ''}`}
            onClick={() => { act.setDarkMode(!state.darkMode); act.notify('success', t(!state.darkMode ? 'notify.darkModeOn' : 'notify.darkModeOff'), { timeout: 2500 }); }}
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
            <h3 className="settings-section__title form-label">{t('settings.reading.romanization')}</h3>
            <p className="settings-section__desc text-muted">{t('settings.reading.romanizationDesc')}</p>
          </div>
          <button
            role="switch"
            aria-checked={state.romanizationOn}
            className={`settings-toggle ${state.romanizationOn ? 'settings-toggle--on' : ''}`}
            onClick={() => { act.setRomanizationOn(!state.romanizationOn); act.notify('success', t(!state.romanizationOn ? 'notify.romanizationOn' : 'notify.romanizationOff'), { timeout: 2500 }); }}
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
            <h3 className="settings-section__title form-label">{t('settings.reading.paragraphTools')}</h3>
            <p className="settings-section__desc text-muted">{t('settings.reading.paragraphToolsDesc')}</p>
          </div>
          <button
            role="switch"
            aria-checked={state.translateButtons}
            className={`settings-toggle ${state.translateButtons ? 'settings-toggle--on' : ''}`}
            onClick={() => { act.setTranslateButtons(!state.translateButtons); act.notify('success', t(!state.translateButtons ? 'notify.paragraphToolsOn' : 'notify.paragraphToolsOff'), { timeout: 2500 }); }}
          >
            <span className="settings-toggle__thumb" />
          </button>
        </div>
      </section>

      <hr className="divider" />

      {/* Translate comprehension questions */}
      <section className="settings-section">
        <div className="settings-toggle-row">
          <div>
            <h3 className="settings-section__title form-label">{t('settings.reading.translateQuestions')}</h3>
            <p className="settings-section__desc text-muted">{t('settings.reading.translateQuestionsDesc')}</p>
          </div>
          <button
            role="switch"
            aria-checked={state.translateQuestions}
            className={`settings-toggle ${state.translateQuestions ? 'settings-toggle--on' : ''}`}
            onClick={() => act.setTranslateQuestions(!state.translateQuestions)}
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
            <h3 className="settings-section__title form-label">{t('settings.reading.readingSpeed')}</h3>
            <p className="settings-section__desc text-muted">
              {t('settings.reading.readingSpeedDesc')}
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

      {/* Show Archived */}
      <section className="settings-section">
        <div className="settings-toggle-row">
          <div>
            <h3 className="settings-section__title form-label">{t('settings.reading.showArchived')}</h3>
            <p className="settings-section__desc text-muted">{t('settings.reading.showArchivedDesc')}</p>
          </div>
          <button
            role="switch"
            aria-checked={state.showArchived}
            className={`settings-toggle ${state.showArchived ? 'settings-toggle--on' : ''}`}
            onClick={() => act.setShowArchived(!state.showArchived)}
          >
            <span className="settings-toggle__thumb" />
          </button>
        </div>
      </section>

      <hr className="divider" />

      {/* New flashcards per day */}
      <section className="settings-section">
        <h3 className="settings-section__title form-label">{t('settings.reading.flashcardsPerDay')}</h3>
        <p className="settings-section__desc text-muted">
          {t('settings.reading.flashcardsPerDayDesc')}
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

      {/* Default proficiency levels — collapsible */}
      <section className="settings-section">
        <button
          className="settings-collapsible-header"
          onClick={() => setLevelsOpen(o => !o)}
          aria-expanded={levelsOpen}
        >
          <h3 className="settings-section__title form-label" style={{ margin: 0 }}>
            {t('settings.reading.defaultLevels') || 'Default Levels'}
          </h3>
          <span className="settings-collapsible-icon">{levelsOpen ? '▾' : '▸'}</span>
        </button>
        {levelsOpen && (
          <div className="settings-collapsible-body">
            {getAllLanguages().map(lang => (
              <div className="settings-section" key={lang.id}>
                <h4 className="settings-section__title form-label">
                  {t('settings.reading.defaultLevel', { profName: `${lang.name} ${lang.proficiency.name}` })}
                </h4>
                <p className="settings-section__desc text-muted">
                  {t('settings.reading.defaultLevelDesc', { langName: lang.name })}
                </p>
                <select
                  className="form-select"
                  value={state.defaultLevels?.[lang.id] ?? 2}
                  onChange={e => act.setDefaultLevelForLang(lang.id, e.target.value)}
                  style={{ maxWidth: '18rem' }}
                >
                  {lang.proficiency.levels.map(l => (
                    <option key={l.value} value={l.value}>{l.label} — {l.desc}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TTS voice preferences — collapsible */}
      {'speechSynthesis' in window && (
        <>
          <hr className="divider" />
          <section className="settings-section">
            <button
              className="settings-collapsible-header"
              onClick={() => setVoicesOpen(o => !o)}
              aria-expanded={voicesOpen}
            >
              <h3 className="settings-section__title form-label" style={{ margin: 0 }}>
                {t('settings.reading.ttsVoices')}
              </h3>
              <span className="settings-collapsible-icon">{voicesOpen ? '▾' : '▸'}</span>
            </button>
            <p className="settings-section__desc text-muted">
              {t('settings.reading.ttsVoicesDesc')}
            </p>
            {voicesOpen && (
              <div className="settings-collapsible-body">
                {getAllLanguages().map(lang => {
                  const langVoices = voicesMap[lang.id] || [];
                  return (
                    <div key={lang.id}>
                      <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{t('settings.reading.voice', { langName: lang.name })}</label>
                      <select
                        className="form-select"
                        value={state.ttsVoiceURIs?.[lang.id] || ''}
                        onChange={e => act.setTtsVoiceForLang(lang.id, e.target.value || null)}
                        style={{ maxWidth: '18rem' }}
                      >
                        <option value="">{t('settings.reading.autoVoice')}</option>
                        {langVoices
                          .sort((a, b) => isRecommendedVoice(lang, b) - isRecommendedVoice(lang, a))
                          .map(v => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang}){isRecommendedVoice(lang, v) ? ' \u2605' : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
