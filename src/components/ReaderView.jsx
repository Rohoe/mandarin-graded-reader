import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { getLang, getLessonTitle, DEFAULT_LANG_ID } from '../lib/languages';
import { buildLLMConfig } from '../lib/llmConfig';
import { getProvider } from '../lib/providers';
import { translateText } from '../lib/translate';
import { useTTS } from '../hooks/useTTS';
import { useRomanization } from '../hooks/useRomanization';
import { useVocabPopover } from '../hooks/useVocabPopover';
import { useReaderGeneration } from '../hooks/useReaderGeneration';
import { useTextSelection } from '../hooks/useTextSelection';
import { DEMO_READER_KEY } from '../lib/demoReader';
import StorySection from './StorySection';
import VocabularyList from './VocabularyList';
import ComprehensionQuestions from './ComprehensionQuestions';
import AnkiExportButton from './AnkiExportButton';
import GenerationProgress from './GenerationProgress';
import GrammarNotes from './GrammarNotes';
import './ReaderView.css';

// Track which lesson keys we've already tried to load from cache
// (module-level to avoid ref-during-render lint errors)
const _loadedKeys = new Set();

export default function ReaderView({ lessonKey, lessonMeta, onMarkComplete, onUnmarkComplete, isCompleted, onContinueStory, onOpenSidebar }) {
  const { generatedReaders, learnedVocabulary, error, pendingReaders, maxTokens, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, ttsSpeechRate, romanizationOn, translateButtons, verboseVocab, quotaWarning, providerKeys, activeProvider, activeModels, customBaseUrl, useStructuredOutput } = useAppSelector(s => ({
    generatedReaders: s.generatedReaders, learnedVocabulary: s.learnedVocabulary, error: s.error,
    pendingReaders: s.pendingReaders, maxTokens: s.maxTokens,
    ttsVoiceURI: s.ttsVoiceURI, ttsKoVoiceURI: s.ttsKoVoiceURI, ttsYueVoiceURI: s.ttsYueVoiceURI, ttsSpeechRate: s.ttsSpeechRate,
    romanizationOn: s.romanizationOn, translateButtons: s.translateButtons, verboseVocab: s.verboseVocab, quotaWarning: s.quotaWarning,
    providerKeys: s.providerKeys, activeProvider: s.activeProvider, activeModels: s.activeModels, customBaseUrl: s.customBaseUrl,
    useStructuredOutput: s.useStructuredOutput,
  }));
  const dispatch = useAppDispatch();
  const act = actions(dispatch);
  const isPending = !!(lessonKey && pendingReaders[lessonKey]);

  const reader = generatedReaders[lessonKey];
  const isDemo = lessonKey === DEMO_READER_KEY;
  const scrollRef = useRef(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const [readerLength, setReaderLength] = useState(1200);
  const [translatingIndex, setTranslatingIndex] = useState(null);

  // Determine langId from reader, lessonMeta, or syllabus
  const langId = reader?.langId || lessonMeta?.langId || DEFAULT_LANG_ID;
  const langConfig = getLang(langId);

  // Set data-lang on <html> when reader changes
  useEffect(() => {
    document.documentElement.setAttribute('data-lang', langId);
    return () => document.documentElement.removeAttribute('data-lang');
  }, [langId]);

  // Cycling chars for empty state
  const decorativeChars = langConfig.decorativeChars;
  const [charIndex, setCharIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCharIndex(i => (i + 1) % decorativeChars.length), 2000);
    return () => clearInterval(id);
  }, [decorativeChars.length]);

  // ── Custom hooks ─────────────────────────────────────────────
  const setTtsVoice = (lid, uri) => {
    if (lid === 'yue') act.setTtsYueVoice(uri);
    else if (lid === 'ko') act.setTtsKoVoice(uri);
    else act.setTtsVoice(uri);
  };

  const { ttsSupported, speakingKey, speakText, stopSpeaking } = useTTS(
    langConfig, langId, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, setTtsVoice, ttsSpeechRate
  );

  const { pinyinOn, romanizer, renderChars } = useRomanization(langId, langConfig, romanizationOn);

  const { activeVocab, setActiveVocab, popoverRef, handleVocabClick, lookupVocab, getPopoverPosition } = useVocabPopover(reader, langConfig);

  const { selection, popoverRef: selectionPopoverRef, clearSelection } = useTextSelection(scrollRef);
  const [selectionPopover, setSelectionPopover] = useState(null);

  // Build selection popover data when selection changes
  useEffect(() => {
    if (!selection) {
      setSelectionPopover(null);
      return;
    }
    // If vocab popover is active, don't show selection popover
    if (activeVocab) {
      setSelectionPopover(null);
      return;
    }

    const { text, rect } = selection;
    let romanization = null;
    if (romanizer) {
      try {
        const romArr = romanizer.romanize(text);
        romanization = romArr.join('');
      } catch { /* ignore */ }
    }

    setSelectionPopover({ text, rect, romanization, translation: null });

    // Fetch translation async
    let cancelled = false;
    translateText(text, langId).then(translation => {
      if (!cancelled) {
        setSelectionPopover(prev => prev ? { ...prev, translation } : null);
      }
    }).catch(() => {
      if (!cancelled) {
        setSelectionPopover(prev => prev ? { ...prev, translation: '(translation failed)' } : null);
      }
    });
    return () => { cancelled = true; };
  }, [selection, activeVocab, romanizer, langId]);

  // Close selection popover when vocab popover opens
  useEffect(() => {
    if (activeVocab) {
      clearSelection();
    }
  }, [activeVocab, clearSelection]);

  const llmConfig = buildLLMConfig({ providerKeys, activeProvider, activeModels, customBaseUrl });
  const { handleGenerate } = useReaderGeneration(
    lessonKey, lessonMeta, reader, langId, isPending, llmConfig, learnedVocabulary, maxTokens, readerLength, useStructuredOutput
  );

  // Cancel speech & close popovers when lesson changes
  useEffect(() => {
    stopSpeaking();
    setActiveVocab(null);
    clearSelection();
  }, [lessonKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load from cache synchronously to avoid flash of "Generate Reader" button.
  // Uses module-level Set to avoid re-dispatching for the same key.
  if (lessonKey && !generatedReaders[lessonKey] && !_loadedKeys.has(lessonKey)) {
    _loadedKeys.add(lessonKey);
    dispatch({ type: 'LOAD_CACHED_READER', payload: { lessonKey } });
  }

  // Scroll to top when lesson changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonKey]);

  async function handleRegenConfirm() {
    setConfirmRegen(false);
    act.clearReader(lessonKey);
    await handleGenerate();
  }

  async function handleTranslate(index, text) {
    setTranslatingIndex(index);
    try {
      const translation = await translateText(text, langId);
      const existing = reader.paragraphTranslations || {};
      act.setReader(lessonKey, { ...reader, paragraphTranslations: { ...existing, [index]: translation } });
    } catch (err) {
      act.notify('error', `Translation failed: ${err.message}`);
    } finally {
      setTranslatingIndex(null);
    }
  }

  // Proficiency badge text
  const profBadge = `${langConfig.proficiency.name} ${reader?.level || lessonMeta?.level || ''}`;

  // ── Empty state ─────────────────────────────────────────────
  if (!lessonKey) {
    return (
      <div className="reader-view reader-view--empty">
        <div className="reader-view__empty-state">
          <span className="reader-view__empty-hanzi">{decorativeChars[charIndex]}</span>
          <p className="font-display reader-view__empty-text">
            Open the sidebar to generate a reader or start a course.
          </p>
          <button className="btn btn-primary reader-view__empty-open-menu" onClick={onOpenSidebar}>
            ☰ Open menu
          </button>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="reader-view reader-view--error">
        <div className="reader-view__error card card-padded">
          <p className="reader-view__error-title font-display">Something went wrong</p>
          <p className="reader-view__error-msg text-muted">{error}</p>
          <div className="reader-view__error-actions">
            <button className="btn btn-primary" onClick={handleGenerate}>Retry</button>
            <button className="btn btn-ghost" onClick={() => act.clearError()}>Dismiss</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Generating ──────────────────────────────────────────────
  if (!reader && isPending) {
    return (
      <div className="reader-view reader-view--generating">
        <div className="reader-view__pregenerate card card-padded">
          {lessonMeta && (
            <>
              <p className="reader-view__lesson-num text-subtle font-display">Lesson {lessonMeta.lesson_number}</p>
              <h2 className="text-target-title reader-view__lesson-title">{getLessonTitle(lessonMeta, langId)}</h2>
              <p className="reader-view__lesson-en font-display text-muted">{lessonMeta.title_en}</p>
            </>
          )}
          <GenerationProgress type="reader" />
        </div>
      </div>
    );
  }

  // ── Not yet generated ───────────────────────────────────────
  if (!reader) {
    return (
      <div className="reader-view reader-view--pregeneratе">
        <div className="reader-view__pregenerate card card-padded">
          {lessonMeta && (
            <>
              <p className="reader-view__lesson-num text-subtle font-display">Lesson {lessonMeta.lesson_number}</p>
              <h2 className="text-target-title reader-view__lesson-title">{getLessonTitle(lessonMeta, langId)}</h2>
              <p className="reader-view__lesson-en font-display text-muted">{lessonMeta.title_en}</p>
              {lessonMeta.description && <p className="reader-view__lesson-desc">{lessonMeta.description}</p>}
              {lessonMeta.vocabulary_focus && (
                <p className="reader-view__vocab-focus text-subtle">
                  Focus: {Array.isArray(lessonMeta.vocabulary_focus)
                    ? lessonMeta.vocabulary_focus.join(' · ')
                    : lessonMeta.vocabulary_focus}
                </p>
              )}
            </>
          )}
          <div className="reader-view__length-row">
            <label className="reader-view__length-label" htmlFor="rv-reader-length">Reader Length</label>
            <span className="reader-view__length-value">~{readerLength} chars</span>
            <input
              id="rv-reader-length" type="range" className="reader-view__length-slider"
              min={150} max={2000} step={50} value={readerLength}
              onChange={e => setReaderLength(Number(e.target.value))}
            />
            <div className="reader-view__length-ticks"><span>Short</span><span>Long</span></div>
          </div>
          <button className="btn btn-primary btn-lg reader-view__generate-btn" onClick={handleGenerate} disabled={isPending}>
            Generate Reader
          </button>
          {llmConfig.apiKey && (
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', textAlign: 'center', marginTop: 'var(--space-2)', opacity: 0.5 }}>
              Using {(() => {
                const prov = getProvider(activeProvider);
                const modelLabel = prov.models.find(m => m.id === llmConfig.model)?.label || llmConfig.model;
                return modelLabel;
              })()}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── Parse error fallback ────────────────────────────────────
  if (reader.parseError && !reader.story) {
    return (
      <div className="reader-view">
        <div className="alert alert-error">
          <span>⚠</span>
          <div><strong>Parse error:</strong> {reader.parseError}. Showing raw output below.</div>
        </div>
        <pre className="reader-view__raw">{reader.raw}</pre>
        <button className="btn btn-primary" onClick={handleGenerate} style={{ marginTop: 'var(--space-4)' }}>Regenerate</button>
      </div>
    );
  }

  // ── Main reading view ───────────────────────────────────────
  const storyParagraphs = (reader.story || '').split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const storyText = storyParagraphs.join('\n\n');

  return (
    <article className="reader-view fade-in" ref={scrollRef}>
      {/* Quota warning banner */}
      {quotaWarning && (
        <div className="reader-view__quota-warning">
          <span>Browser storage is full. New readers will not be saved between sessions. Free up space in Settings → Browser Storage.</span>
          <button className="reader-view__quota-dismiss" onClick={() => dispatch({ type: 'SET_QUOTA_WARNING', payload: false })} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Demo reader banner */}
      {isDemo && !demoBannerDismissed && (
        <div className="reader-view__demo-banner">
          <span>This is a sample reader. Add your API key in Settings to generate your own.</span>
          <button className="reader-view__quota-dismiss" onClick={() => setDemoBannerDismissed(true)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* Title + TTS */}
      <header className="reader-view__header">
        <div className="reader-view__header-text">
          <div className="reader-view__meta text-subtle font-display">
            {reader.level && profBadge}
            {reader.topic && ` · ${reader.topic}`}
          </div>
          <h1 className="reader-view__title text-target-title">
            {reader.titleZh || getLessonTitle(lessonMeta, langId) || ''}
          </h1>
          {reader.titleEn && <p className="reader-view__title-en font-display text-muted">{reader.titleEn}</p>}
        </div>
        {ttsSupported && (
          <div className="reader-view__header-actions">
            <button
              className={`btn btn-ghost btn-sm reader-view__tts-btn ${speakingKey === 'story' ? 'reader-view__tts-btn--active' : ''}`}
              onClick={() => speakingKey ? (window.speechSynthesis.cancel(), stopSpeaking()) : speakText(storyText.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'), 'story')}
              title={speakingKey ? 'Stop' : 'Listen to story'}
              aria-label={speakingKey ? 'Stop' : 'Listen to story'}
            >
              {speakingKey ? '⏹' : '🔊'}
            </button>
          </div>
        )}
      </header>

      <hr className="divider" />

      {/* Story */}
      <StorySection
        storyParagraphs={storyParagraphs}
        pinyinOn={pinyinOn}
        renderChars={renderChars}
        ttsSupported={ttsSupported}
        speakingKey={speakingKey}
        speakText={speakText}
        lookupVocab={lookupVocab}
        handleVocabClick={handleVocabClick}
        activeVocab={activeVocab}
        popoverRef={popoverRef}
        getPopoverPosition={getPopoverPosition}
        paragraphTranslations={reader.paragraphTranslations}
        onTranslate={handleTranslate}
        translatingIndex={translatingIndex}
        showParagraphTools={translateButtons}
        selectionPopover={selectionPopover}
        selectionPopoverRef={selectionPopoverRef}
      />

      <hr className="divider" />

      {/* Comprehension questions */}
      <ComprehensionQuestions
        key={lessonKey}
        questions={reader.questions}
        lessonKey={lessonKey}
        reader={reader}
        story={reader.story}
        level={reader.level || lessonMeta?.level || 3}
        langId={langId}
        renderChars={renderChars}
        verboseVocab={verboseVocab}
        showParagraphTools={translateButtons}
      />

      {/* Vocabulary */}
      <VocabularyList vocabulary={reader.vocabulary} renderChars={renderChars} verboseVocab={verboseVocab} />

      {/* Grammar notes */}
      <GrammarNotes grammarNotes={reader.grammarNotes} renderChars={renderChars} />

      {/* Anki export */}
      {reader.ankiJson?.length > 0 && (
        <AnkiExportButton
          ankiJson={reader.ankiJson}
          topic={reader.topic || lessonMeta?.title_en || 'lesson'}
          level={reader.level || 3}
          grammarNotes={reader.grammarNotes}
          langId={langId}
          verboseVocab={verboseVocab}
          romanizer={romanizer}
        />
      )}

      {/* Mark complete */}
      {!isDemo && !isCompleted && onMarkComplete && (
        <div className="reader-view__complete-row">
          <button className="btn btn-primary reader-view__complete-btn" onClick={onMarkComplete}>Mark Lesson Complete ✓</button>
        </div>
      )}
      {isCompleted && (
        <div className="reader-view__completed-badge">
          <span>✓ Lesson completed</span>
          {onUnmarkComplete && (
            <button className="btn btn-ghost btn-sm reader-view__unmark-btn" onClick={onUnmarkComplete}>Undo</button>
          )}
        </div>
      )}

      {/* Regenerate */}
      {!isDemo && (
        <div className="reader-view__regen-row">
          {confirmRegen ? (
            <>
              <span className="reader-view__regen-prompt text-muted">Replace this reader?</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(false)}>Cancel</button>
              <button className="btn btn-sm reader-view__regen-confirm-btn" onClick={handleRegenConfirm}>Regenerate</button>
            </>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(true)}>Regenerate reader</button>
          )}
        </div>
      )}

      {/* Continue story */}
      {!isDemo && onContinueStory && reader.story && !isPending && (
        <div className="reader-view__continue-row">
          <button
            className="btn btn-primary"
            onClick={() => onContinueStory({ story: reader.story, topic: reader.topic || lessonMeta?.title_en || 'story', level: reader.level || lessonMeta?.level || 3, langId })}
          >
            Next episode →
          </button>
        </div>
      )}
    </article>
  );
}
