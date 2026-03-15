import { useState, useEffect } from 'react';
import { getAllLanguages } from '../lib/languages';
import { getAllNativeLanguages } from '../lib/nativeLanguages';

export default function SettingsReadingTab({ state, act }) {
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
        <h3 className="settings-section__title form-label">My Native Language</h3>
        <p className="settings-section__desc text-muted">
          Definitions, explanations, and translations will be in this language.
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

      {/* Default proficiency levels (data-driven for all languages) */}
      {getAllLanguages().map(lang => (
        <section className="settings-section" key={lang.id}>
          <h3 className="settings-section__title form-label">Default {lang.proficiency.name} Level</h3>
          <p className="settings-section__desc text-muted">
            Pre-selected level when creating {lang.name} content.
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
          <hr className="divider" />
        </section>
      ))}

      {/* TTS voice preferences */}
      {'speechSynthesis' in window && (
        <>
          <hr className="divider" />
          <section className="settings-section">
            <h3 className="settings-section__title form-label">TTS Voices</h3>
            <p className="settings-section__desc text-muted">
              Choose preferred text-to-speech voices for each language. Recommended voices are listed first.
            </p>

            {getAllLanguages().map(lang => {
              const langVoices = voicesMap[lang.id] || [];
              return (
                <div key={lang.id}>
                  <label className="form-label" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>{lang.name} voice</label>
                  <select
                    className="form-select"
                    value={state.ttsVoiceURIs?.[lang.id] || ''}
                    onChange={e => act.setTtsVoiceForLang(lang.id, e.target.value || null)}
                    style={{ maxWidth: '18rem' }}
                  >
                    <option value="">Auto (best available)</option>
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
          </section>
        </>
      )}
    </>
  );
}
