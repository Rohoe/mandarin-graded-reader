import { useEffect, useRef, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { getLang, getLessonTitle, DEFAULT_LANG_ID } from '../lib/languages';
import { buildLLMConfig } from '../lib/llmConfig';
import { useTTS } from '../hooks/useTTS';
import { useRomanization } from '../hooks/useRomanization';
import { useVocabPopover } from '../hooks/useVocabPopover';
import { useReaderGeneration } from '../hooks/useReaderGeneration';
import StorySection from './StorySection';
import ReaderControls from './ReaderControls';
import VocabularyList from './VocabularyList';
import ComprehensionQuestions from './ComprehensionQuestions';
import AnkiExportButton from './AnkiExportButton';
import GenerationProgress from './GenerationProgress';
import GrammarNotes from './GrammarNotes';
import './ReaderView.css';

export default function ReaderView({ lessonKey, lessonMeta, onMarkComplete, onUnmarkComplete, isCompleted, onContinueStory, onOpenSidebar }) {
  const { generatedReaders, learnedVocabulary, error, pendingReaders, maxTokens, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, verboseVocab, quotaWarning, providerKeys, activeProvider, activeModel, customBaseUrl } = useAppSelector(s => ({
    generatedReaders: s.generatedReaders, learnedVocabulary: s.learnedVocabulary, error: s.error,
    pendingReaders: s.pendingReaders, maxTokens: s.maxTokens,
    ttsVoiceURI: s.ttsVoiceURI, ttsKoVoiceURI: s.ttsKoVoiceURI, ttsYueVoiceURI: s.ttsYueVoiceURI,
    verboseVocab: s.verboseVocab, quotaWarning: s.quotaWarning,
    providerKeys: s.providerKeys, activeProvider: s.activeProvider, activeModel: s.activeModel, customBaseUrl: s.customBaseUrl,
  }));
  const dispatch = useAppDispatch();
  const act = actions(dispatch);
  const isPending = !!(lessonKey && pendingReaders[lessonKey]);

  const reader = generatedReaders[lessonKey];
  const scrollRef = useRef(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [readerLength, setReaderLength] = useState(1200);

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

  // Float header actions when article header scrolls off screen
  const headerRef = useRef(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  useEffect(() => {
    setHeaderVisible(true);
    const el = headerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHeaderVisible(entry.isIntersecting),
      { root: null, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [lessonKey]);

  // ── Custom hooks ─────────────────────────────────────────────
  const setTtsVoice = (lid, uri) => {
    if (lid === 'yue') act.setTtsYueVoice(uri);
    else if (lid === 'ko') act.setTtsKoVoice(uri);
    else act.setTtsVoice(uri);
  };

  const { ttsSupported, speakingKey, speakText, stopSpeaking } = useTTS(
    langConfig, langId, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, setTtsVoice
  );

  const { pinyinOn, setPinyinOn, romanizer, renderChars } = useRomanization(langId, langConfig);

  const { activeVocab, setActiveVocab, popoverRef, handleVocabClick, lookupVocab, getPopoverPosition } = useVocabPopover(reader, langConfig);

  const llmConfig = buildLLMConfig({ providerKeys, activeProvider, activeModel, customBaseUrl });
  const { handleGenerate } = useReaderGeneration(
    lessonKey, lessonMeta, reader, langId, isPending, llmConfig, learnedVocabulary, maxTokens, readerLength
  );

  // Cancel speech & close popover when lesson changes
  useEffect(() => {
    stopSpeaking();
    setActiveVocab(null);
  }, [lessonKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load from cache or generate
  useEffect(() => {
    if (!lessonKey) return;
    if (generatedReaders[lessonKey]) return;
    dispatch({ type: 'LOAD_CACHED_READER', payload: { lessonKey } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonKey]);

  // Scroll to top when lesson changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lessonKey]);

  async function handleRegenConfirm() {
    setConfirmRegen(false);
    act.clearReader(lessonKey);
    await handleGenerate();
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
              min={300} max={2000} step={100} value={readerLength}
              onChange={e => setReaderLength(Number(e.target.value))}
            />
            <div className="reader-view__length-ticks"><span>Short</span><span>Long</span></div>
          </div>
          <button className="btn btn-primary btn-lg reader-view__generate-btn" onClick={handleGenerate} disabled={isPending}>
            Generate Reader
          </button>
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

      {/* Title + controls */}
      <header className="reader-view__header" ref={headerRef}>
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
        <ReaderControls
          headerVisible={headerVisible}
          pinyinOn={pinyinOn}
          setPinyinOn={setPinyinOn}
          ttsSupported={ttsSupported}
          speakingKey={speakingKey}
          speakText={speakText}
          stopSpeaking={stopSpeaking}
          storyText={storyText}
          langConfig={langConfig}
        />
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
      {!isCompleted && onMarkComplete && (
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

      {/* Continue story */}
      {onContinueStory && reader.story && !isPending && (
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
