import { useState, useEffect } from 'react';
import { getAllLanguages } from '../lib/languages';
import { getAllNativeLanguages } from '../lib/nativeLanguages';

export default function SettingsReadingTab({ state, act }) {
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
                    {v.name} ({v.lang}){isRecommendedZhVoice(v) ? ' \u2605' : ''}
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
                    {v.name} ({v.lang}){isRecommendedYueVoice(v) ? ' \u2605' : ''}
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
                    {v.name} ({v.lang}){isRecommendedKoVoice(v) ? ' \u2605' : ''}
                  </option>
                ))}
            </select>
          </section>
        </>
      )}
    </>
  );
}
