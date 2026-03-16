/**
 * TutorChat — right-side drawer panel for AI tutor conversation.
 * Desktop: 400px slide-in. Mobile: full-screen.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { useT } from '../../i18n';
import { useAppSelector } from '../../context/useAppSelector';
import { getLang } from '../../lib/languages';
import { getNativeLang } from '../../lib/nativeLanguages';
import { buildLLMConfig, hasAnyUserKey } from '../../lib/llmConfig';
import { buildExternalTutorPrompt } from '../../lib/chatApi';
import { useTutorChat } from '../../hooks/useTutorChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSummary from './ChatSummary';
import './TutorChat.css';

export default function TutorChat({ lessonKey, reader, lessonMeta, syllabus, onClose }) {
  const t = useT();
  const messagesEndRef = useRef(null);
  const drawerRef = useRef(null);

  const { nativeLang } = useAppSelector(s => ({ nativeLang: s.nativeLang || 'en' }));
  const { providerKeys, activeProvider, activeModels, customBaseUrl } = useAppSelector(s => ({
    providerKeys: s.providerKeys, activeProvider: s.activeProvider,
    activeModels: s.activeModels, customBaseUrl: s.customBaseUrl,
  }));

  const langId = reader?.langId || lessonMeta?.langId || 'zh';
  const langConfig = getLang(langId);
  const nativeLangName = getNativeLang(nativeLang).name;
  const llmConfig = buildLLMConfig({ providerKeys, activeProvider, activeModels, customBaseUrl });
  const hasApiKey = hasAnyUserKey(providerKeys);

  const {
    messages, sendMessage, isGenerating, streamingText,
    generateSummary, summary, clearChat, stopGenerating, error,
  } = useTutorChat({ lessonKey, reader, lessonMeta, langId, nativeLang, llmConfig });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Lock body scroll on mobile
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // External flow: null | { target: 'claude' | 'chatgpt', step: 'preview' | 'copied' }
  const [externalFlow, setExternalFlow] = useState(null);

  const isMac = useMemo(() => typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform), []);
  const pasteShortcut = isMac ? '\u2318V' : 'Ctrl+V';

  const externalPrompt = useMemo(() => {
    if (!externalFlow) return '';
    return buildExternalTutorPrompt(reader, lessonMeta, langConfig, nativeLangName);
  }, [externalFlow, reader, lessonMeta, langConfig, nativeLangName]);

  function handleStartExternal(target) {
    setExternalFlow({ target, step: 'preview' });
  }

  function handleCopyAndOpen() {
    if (!externalFlow) return;
    const url = externalFlow.target === 'claude'
      ? 'https://claude.ai/new'
      : 'https://chatgpt.com';
    navigator.clipboard.writeText(externalPrompt).catch(() => {});
    window.open(url, '_blank');
    setExternalFlow(f => f && { ...f, step: 'copied' });
  }

  function handleCopyAgain() {
    navigator.clipboard.writeText(externalPrompt).catch(() => {});
  }

  const showChips = messages.length === 0;

  return (
    <>
      <div className="tutor-chat__overlay" onClick={onClose} />
      <div className="tutor-chat__drawer" ref={drawerRef} role="dialog" aria-modal="true" aria-label={t('tutor.title')}>
        {/* Header */}
        <div className="tutor-chat__header">
          <h2 className="tutor-chat__heading">{t('tutor.title')}</h2>
          <div className="tutor-chat__header-actions">
            {messages.length > 0 && (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={generateSummary}
                  disabled={isGenerating}
                  title={t('tutor.generateSummary')}
                >
                  {t('tutor.generateSummary')}
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearChat}
                  disabled={isGenerating}
                  title={t('tutor.clearChat')}
                >
                  {t('tutor.clearChat')}
                </button>
              </>
            )}
            <button className="btn btn-ghost btn-sm tutor-chat__close" onClick={onClose} aria-label={t('common.close')}>✕</button>
          </div>
        </div>

        {/* Messages area */}
        <div className="tutor-chat__messages">
          {messages.length === 0 && !isGenerating && (
            <div className="tutor-chat__welcome">
              <p>{t('tutor.welcome')}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {/* Streaming indicator */}
          {streamingText !== null && (
            <div className="tutor-chat__message tutor-chat__message--assistant">
              <div className="tutor-chat__message-content">
                {streamingText}
                <span className="tutor-chat__cursor" />
              </div>
            </div>
          )}

          {/* Generating dots (non-streaming) */}
          {isGenerating && streamingText === null && (
            <div className="tutor-chat__message tutor-chat__message--assistant">
              <div className="tutor-chat__message-content tutor-chat__typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="tutor-chat__error">
              {error}
            </div>
          )}

          {/* Summary */}
          {summary && <ChatSummary summary={summary} />}

          <div ref={messagesEndRef} />
        </div>

        {/* Stop button */}
        {isGenerating && (
          <div className="tutor-chat__stop-row">
            <button className="btn btn-ghost btn-sm" onClick={stopGenerating}>{t('tutor.stop')}</button>
          </div>
        )}

        {/* Input */}
        {hasApiKey ? (
          <ChatInput
            onSend={sendMessage}
            onSuggestion={sendMessage}
            isGenerating={isGenerating}
            showChips={showChips}
          />
        ) : (
          <div className="tutor-chat__no-key">
            <p>{t('tutor.noApiKey')}</p>
          </div>
        )}

        {/* External links — always shown */}
        {externalFlow ? (
          <div className="tutor-chat__external-card">
            {externalFlow.step === 'preview' ? (
              <>
                <div className="tutor-chat__external-card-label">
                  {externalFlow.target === 'claude' ? 'Claude' : 'ChatGPT'}
                </div>
                <div className="tutor-chat__external-preview">
                  {externalPrompt.slice(0, 200)}{externalPrompt.length > 200 ? '…' : ''}
                </div>
                <p className="tutor-chat__external-hint">
                  {t('tutor.externalHint', { target: externalFlow.target === 'claude' ? 'Claude' : 'ChatGPT' })}
                </p>
                <div className="tutor-chat__external-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleCopyAndOpen}>
                    {t('tutor.copyAndOpen')}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExternalFlow(null)}>
                    {t('tutor.back')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="tutor-chat__external-copied">
                  <p className="tutor-chat__external-copied-title">{t('tutor.copied')}</p>
                  <p className="tutor-chat__external-hint">
                    {t('tutor.pasteHint', { target: externalFlow.target === 'claude' ? 'Claude' : 'ChatGPT' })}
                  </p>
                  <kbd className="tutor-chat__kbd">{pasteShortcut}</kbd>
                </div>
                <div className="tutor-chat__external-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={handleCopyAgain}>
                    {t('tutor.copyAgain')}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setExternalFlow(null)}>
                    {t('tutor.done')}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="tutor-chat__external">
            <button className="tutor-chat__external-btn" onClick={() => handleStartExternal('claude')}>
              {t('tutor.openInClaude')}
            </button>
            <button className="tutor-chat__external-btn" onClick={() => handleStartExternal('chatgpt')}>
              {t('tutor.openInChatGPT')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
