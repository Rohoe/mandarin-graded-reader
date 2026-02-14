import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import './ApiKeySetup.css';

export default function ApiKeySetup() {
  const { dispatch } = useApp();
  const act = actions(dispatch);

  const [key, setKey]       = useState('');
  const [show, setShow]     = useState(false);
  const [error, setError]   = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed.startsWith('sk-ant-')) {
      setError('That doesn\'t look like a valid Anthropic API key (should start with sk-ant-).');
      return;
    }
    act.setApiKey(trimmed);
  }

  return (
    <div className="api-key-setup">
      <div className="api-key-setup__card card card-padded">
        <div className="api-key-setup__logo">
          <span className="api-key-setup__hanzi">读</span>
        </div>

        <h1 className="api-key-setup__title font-display">Mandarin Graded Reader</h1>
        <p className="api-key-setup__subtitle text-muted">
          Generate personalised Mandarin readers at your HSK level, with vocabulary tracking and Anki export.
        </p>

        <hr className="divider" />

        <p className="api-key-setup__instructions">
          To get started, enter your{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
            Anthropic API key
          </a>
          . Your key is stored locally in your browser and never sent to any server other than Anthropic.
        </p>

        <form onSubmit={handleSubmit} className="api-key-setup__form">
          <div className="form-group">
            <label className="form-label" htmlFor="apikey-input">API Key</label>
            <div className="api-key-setup__input-row">
              <input
                id="apikey-input"
                type={show ? 'text' : 'password'}
                className="form-input"
                placeholder="sk-ant-api03-..."
                value={key}
                onChange={e => { setKey(e.target.value); setError(''); }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm api-key-setup__toggle"
                onClick={() => setShow(s => !s)}
                aria-label={show ? 'Hide key' : 'Show key'}
              >
                {show ? '🙈' : '👁'}
              </button>
            </div>
            {error && <p className="api-key-setup__error">{error}</p>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg api-key-setup__submit"
            disabled={!key.trim()}
          >
            Start Reading
          </button>
        </form>

        <p className="api-key-setup__note text-subtle">
          Your key is only stored in <code>localStorage</code> on this device.
          Get a key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">
            console.anthropic.com
          </a>.
        </p>
      </div>
    </div>
  );
}
