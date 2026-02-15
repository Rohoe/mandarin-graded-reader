import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { generateReader } from '../lib/api';
import { parseReaderResponse, parseStorySegments } from '../lib/parser';
import { getLang, getLessonTitle, DEFAULT_LANG_ID } from '../lib/languages';
import { loadRomanizer } from '../lib/romanizer';
import VocabularyList from './VocabularyList';
import ComprehensionQuestions from './ComprehensionQuestions';
import AnkiExportButton from './AnkiExportButton';
import GenerationProgress from './GenerationProgress';
import GrammarNotes from './GrammarNotes';
import './ReaderView.css';

export default function ReaderView({ lessonKey, lessonMeta, onMarkComplete, onUnmarkComplete, isCompleted, onContinueStory, onOpenSidebar }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { generatedReaders, learnedVocabulary, error, pendingReaders, apiKey, maxTokens, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI } = state;
  const isPending = !!(lessonKey && pendingReaders[lessonKey]);

  const reader = generatedReaders[lessonKey];
  const scrollRef = useRef(null);
  const [confirmRegen, setConfirmRegen] = useState(false);

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

  const [pinyinOn, setPinyinOn] = useState(false);
  const [activeVocab, setActiveVocab] = useState(null);
  const popoverRef = useRef(null);

  // Async romanizer
  const [romanizer, setRomanizer] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadRomanizer(langId).then(r => { if (!cancelled) setRomanizer(r); });
    return () => { cancelled = true; };
  }, [langId]);

  // ── Text-to-speech ──────────────────────────────────────────
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speakingKey, setSpeakingKey] = useState(null);
  const utteranceRef = useRef(null);
  const [voices, setVoices] = useState([]);

  function pickBestVoice(voiceList) {
    const priorityTests = langConfig.tts.priorityVoices;
    for (const test of priorityTests) {
      const match = voiceList.find(test);
      if (match) return match;
    }
    return voiceList[0] || null;
  }

  useEffect(() => {
    if (!ttsSupported) return;
    function loadVoices() {
      const filtered = window.speechSynthesis.getVoices().filter(v => langConfig.tts.langFilter.test(v.lang));
      setVoices(filtered);
      // Auto-set best voice in global state if none saved yet
      const activeVoiceURI = langId === 'yue' ? ttsYueVoiceURI : langId === 'ko' ? ttsKoVoiceURI : ttsVoiceURI;
      if (!activeVoiceURI && filtered.length > 0) {
        const best = pickBestVoice(filtered);
        if (best) {
          if (langId === 'yue') act.setTtsYueVoice(best.voiceURI);
          else if (langId === 'ko') act.setTtsKoVoice(best.voiceURI);
          else act.setTtsVoice(best.voiceURI);
        }
      }
    }
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsSupported, langId]);

  // Cancel speech & close popover when lesson changes
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeakingKey(null);
    setActiveVocab(null);
  }, [lessonKey]);

  function stripMarkdown(text) {
    return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1');
  }

  const speakText = useCallback((text, key) => {
    if (!ttsSupported) return;
    if (speakingKey === key) {
      window.speechSynthesis.cancel();
      setSpeakingKey(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const activeVoiceURI = langId === 'yue' ? ttsYueVoiceURI : langId === 'ko' ? ttsKoVoiceURI : ttsVoiceURI;
    const voice = voices.find(v => v.voiceURI === activeVoiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = langConfig.tts.defaultLang;
    }
    utterance.rate = langConfig.tts.defaultRate;
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);
    utteranceRef.current = utterance;
    setSpeakingKey(key);
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported, speakingKey, voices, ttsVoiceURI, ttsKoVoiceURI, ttsYueVoiceURI, langId, langConfig.tts]);

  // ── Vocab lookup map (click-to-define) ──────────────────────
  const scriptRegex = langConfig.scriptRegex;
  const vocabMap = useMemo(() => {
    const map = new Map();
    if (reader?.vocabulary) {
      for (const v of reader.vocabulary) {
        map.set(v.chinese, v);
        const stripped = v.chinese.replace(new RegExp(`^[^${scriptRegex.source.slice(1, -1)}]+|[^${scriptRegex.source.slice(1, -1)}]+$`, 'g'), '');
        if (stripped && stripped !== v.chinese) map.set(stripped, v);
      }
    }
    return map;
  }, [reader?.vocabulary, scriptRegex]);

  const handleVocabClick = useCallback((e, vocabWord) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveVocab(prev =>
      prev && prev.word.chinese === vocabWord.chinese ? null : { word: vocabWord, rect }
    );
  }, []);

  // Close popover on Escape, outside click, or scroll
  useEffect(() => {
    if (!activeVocab) return;
    function onKey(e) { if (e.key === 'Escape') setActiveVocab(null); }
    function onMouseDown(e) {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (e.target.closest('.reader-view__vocab--clickable')) return;
      setActiveVocab(null);
    }
    function onScroll() { setActiveVocab(null); }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [activeVocab]);

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

  async function handleGenerate() {
    if (isPending) return;

    let topic, level, readerLangId;
    if (lessonMeta) {
      const metaLang = getLang(lessonMeta.langId || langId);
      const titleTarget = lessonMeta[metaLang.prompts.titleFieldKey] || lessonMeta.title_zh || lessonMeta.title_target;
      topic = titleTarget
        ? `${titleTarget} — ${lessonMeta.title_en || ''}: ${lessonMeta.description || ''}`
        : lessonMeta.topic || '';
      level = lessonMeta.level || 3;
      readerLangId = lessonMeta.langId || langId;
    } else if (reader) {
      // Standalone reader — use the metadata stored on the reader object
      topic = reader.topic || '';
      level = reader.level || 3;
      readerLangId = reader.langId || langId;
    } else {
      return;
    }

    act.startPendingReader(lessonKey);
    act.clearError();
    try {
      const raw    = await generateReader(apiKey, topic, level, learnedVocabulary, 1200, maxTokens, null, readerLangId);
      console.log('[ReaderView] raw response (first 500 chars):', raw?.slice(0, 500));
      const parsed = parseReaderResponse(raw, readerLangId);
      console.log('[ReaderView] parsed.questions:', parsed.questions);
      console.log('[ReaderView] parsed.parseError:', parsed.parseError);
      act.setReader(lessonKey, { ...parsed, topic, level, langId: readerLangId, lessonKey });
      if (parsed.ankiJson?.length > 0) {
        act.addVocabulary(parsed.ankiJson.map(c => ({
          chinese: c.chinese, korean: c.korean, pinyin: c.pinyin, romanization: c.romanization, english: c.english, langId: readerLangId,
        })));
      }
      act.notify('success', `Reader ready: ${lessonMeta?.title_en || topic}`);
    } catch (err) {
      act.notify('error', `Generation failed: ${err.message.slice(0, 80)}`);
    } finally {
      act.clearPendingReader(lessonKey);
    }
  }

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
          <button
            className="btn btn-primary reader-view__empty-open-menu"
            onClick={onOpenSidebar}
          >
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
              <p className="reader-view__lesson-num text-subtle font-display">
                Lesson {lessonMeta.lesson_number}
              </p>
              <h2 className="text-target-title reader-view__lesson-title">
                {getLessonTitle(lessonMeta, langId)}
              </h2>
              <p className="reader-view__lesson-en font-display text-muted">
                {lessonMeta.title_en}
              </p>
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
              <p className="reader-view__lesson-num text-subtle font-display">
                Lesson {lessonMeta.lesson_number}
              </p>
              <h2 className="text-target-title reader-view__lesson-title">
                {getLessonTitle(lessonMeta, langId)}
              </h2>
              <p className="reader-view__lesson-en font-display text-muted">
                {lessonMeta.title_en}
              </p>
              {lessonMeta.description && (
                <p className="reader-view__lesson-desc">{lessonMeta.description}</p>
              )}
              {lessonMeta.vocabulary_focus && (
                <p className="reader-view__vocab-focus text-subtle">
                  Focus: {Array.isArray(lessonMeta.vocabulary_focus)
                    ? lessonMeta.vocabulary_focus.join(' · ')
                    : lessonMeta.vocabulary_focus}
                </p>
              )}
            </>
          )}
          <button
            className="btn btn-primary btn-lg reader-view__generate-btn"
            onClick={handleGenerate}
            disabled={isPending}
          >
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
          <div>
            <strong>Parse error:</strong> {reader.parseError}. Showing raw output below.
          </div>
        </div>
        <pre className="reader-view__raw">{reader.raw}</pre>
        <button className="btn btn-primary" onClick={handleGenerate} style={{ marginTop: 'var(--space-4)' }}>
          Regenerate
        </button>
      </div>
    );
  }

  // ── Main reading view ───────────────────────────────────────
  const storyParagraphs = (reader.story || '').split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  function lookupVocab(text) {
    const exact = vocabMap.get(text);
    if (exact) return exact;
    const stripped = text.replace(new RegExp(`^[^${scriptRegex.source.slice(1, -1)}]+|[^${scriptRegex.source.slice(1, -1)}]+$`, 'g'), '');
    if (stripped && stripped !== text) return vocabMap.get(stripped);
    return null;
  }

  function getPopoverPosition(rect) {
    const gap = 8;
    const popoverWidth = 220;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
    const preferAbove = rect.top - gap > 120;
    return {
      position: 'fixed',
      zIndex: 60,
      width: popoverWidth,
      left,
      ...(preferAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
    };
  }

  // Renders text with <ruby> romanization annotations for target script chars
  function renderChars(text, keyPrefix) {
    if (!pinyinOn || !romanizer) return text;
    const chars = [...text];
    const romArr = romanizer.romanize(text);
    const nodes = [];
    let nonTarget = '';
    let nonTargetStart = 0;
    for (let i = 0; i < chars.length; i++) {
      if (scriptRegex.test(chars[i])) {
        if (nonTarget) {
          nodes.push(<span key={`${keyPrefix}-t${nonTargetStart}`}>{nonTarget}</span>);
          nonTarget = '';
        }
        nodes.push(<ruby key={`${keyPrefix}-r${i}`}>{chars[i]}<rt>{romArr[i]}</rt></ruby>);
      } else {
        if (!nonTarget) nonTargetStart = i;
        nonTarget += chars[i];
      }
    }
    if (nonTarget) nodes.push(<span key={`${keyPrefix}-tend`}>{nonTarget}</span>);
    return nodes;
  }

  const romanizationLabel = langConfig.romanizationLabel;

  return (
    <article className="reader-view fade-in" ref={scrollRef}>
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
          {reader.titleEn && (
            <p className="reader-view__title-en font-display text-muted">{reader.titleEn}</p>
          )}
        </div>
        {headerVisible && (
          <div className="reader-view__header-actions">
            <button
              className={`btn btn-ghost btn-sm reader-view__tts-btn ${pinyinOn ? 'reader-view__tts-btn--active' : ''}`}
              onClick={() => setPinyinOn(v => !v)}
              title={pinyinOn ? `Hide ${langConfig.romanizationName}` : `Show ${langConfig.romanizationName}`}
              aria-label={pinyinOn ? `Hide ${langConfig.romanizationName}` : `Show ${langConfig.romanizationName}`}
            >
              {romanizationLabel}
            </button>
            {ttsSupported && (
              <button
                className={`btn btn-ghost btn-sm reader-view__tts-btn ${speakingKey === 'story' ? 'reader-view__tts-btn--active' : ''}`}
                onClick={() => speakingKey ? (window.speechSynthesis.cancel(), setSpeakingKey(null)) : speakText(stripMarkdown(storyParagraphs.join('\n\n')), 'story')}
                title={speakingKey ? 'Stop' : 'Listen to story'}
                aria-label={speakingKey ? 'Stop' : 'Listen to story'}
              >
                {speakingKey ? '⏹' : '🔊'}
              </button>
            )}
          </div>
        )}
      </header>
      {!headerVisible && createPortal(
        <div className="reader-view__header-actions reader-view__header-actions--floating">
          <button
            className={`btn btn-ghost btn-sm reader-view__tts-btn ${pinyinOn ? 'reader-view__tts-btn--active' : ''}`}
            onClick={() => setPinyinOn(v => !v)}
            title={pinyinOn ? `Hide ${langConfig.romanizationName}` : `Show ${langConfig.romanizationName}`}
            aria-label={pinyinOn ? `Hide ${langConfig.romanizationName}` : `Show ${langConfig.romanizationName}`}
          >
            {romanizationLabel}
          </button>
          {ttsSupported && (
            <button
              className={`btn btn-ghost btn-sm reader-view__tts-btn ${speakingKey === 'story' ? 'reader-view__tts-btn--active' : ''}`}
              onClick={() => speakingKey ? (window.speechSynthesis.cancel(), setSpeakingKey(null)) : speakText(stripMarkdown(storyParagraphs.join('\n\n')), 'story')}
              title={speakingKey ? 'Stop' : 'Listen to story'}
              aria-label={speakingKey ? 'Stop' : 'Listen to story'}
            >
              {speakingKey ? '⏹' : '🔊'}
            </button>
          )}
        </div>,
        document.body
      )}

      <hr className="divider" />

      {/* Story */}
      <div className="reader-view__story-section">
        <div className={`reader-view__story text-target ${pinyinOn ? 'reader-view__story--pinyin' : ''}`}>
          {storyParagraphs.map((para, pi) => {
            const paraKey = `para-${pi}`;
            const isSpeaking = speakingKey === paraKey;
            return (
              <p
                key={pi}
                className={`reader-view__paragraph ${ttsSupported ? 'reader-view__paragraph--tts' : ''} ${isSpeaking ? 'reader-view__paragraph--speaking' : ''}`}
                onClick={ttsSupported ? () => speakText(stripMarkdown(para), paraKey) : undefined}
                title={ttsSupported ? (isSpeaking ? 'Stop' : 'Click to listen') : undefined}
              >
                {parseStorySegments(para).map((seg, i) => {
                  if (seg.type === 'bold') {
                    const entry = lookupVocab(seg.content);
                    return (
                      <strong
                        key={i}
                        className={`reader-view__vocab${entry ? ' reader-view__vocab--clickable' : ''}`}
                        {...(entry ? {
                          role: 'button',
                          tabIndex: 0,
                          onClick: (e) => handleVocabClick(e, entry),
                          onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleVocabClick(e, entry); } },
                        } : {})}
                      >
                        {renderChars(seg.content, `${pi}-b${i}`)}
                      </strong>
                    );
                  }
                  if (seg.type === 'italic') return <em key={i}>{renderChars(seg.content, `${pi}-em${i}`)}</em>;
                  return <span key={i}>{renderChars(seg.content, `${pi}-s${i}`)}</span>;
                })}
              </p>
            );
          })}
        </div>
        {activeVocab && createPortal(
          <div ref={popoverRef} className="reader-view__popover" style={getPopoverPosition(activeVocab.rect)}>
            <span className="reader-view__popover-chinese text-target">{activeVocab.word.chinese}</span>
            <span className="reader-view__popover-pinyin">{activeVocab.word.pinyin}</span>
            <span className="reader-view__popover-english">{activeVocab.word.english}</span>
          </div>,
          document.body
        )}
      </div>

      <hr className="divider" />

      {/* Comprehension questions */}
      <ComprehensionQuestions
        questions={reader.questions}
        lessonKey={lessonKey}
        reader={reader}
        story={reader.story}
        level={reader.level || lessonMeta?.level || 3}
        langId={langId}
        renderChars={renderChars}
      />

      {/* Vocabulary */}
      <VocabularyList vocabulary={reader.vocabulary} />

      {/* Grammar notes */}
      <GrammarNotes grammarNotes={reader.grammarNotes} />

      {/* Anki export */}
      {reader.ankiJson?.length > 0 && (
        <AnkiExportButton
          ankiJson={reader.ankiJson}
          topic={reader.topic || lessonMeta?.title_en || 'lesson'}
          level={reader.level || 3}
          grammarNotes={reader.grammarNotes}
          langId={langId}
        />
      )}

      {/* Mark complete */}
      {!isCompleted && onMarkComplete && (
        <div className="reader-view__complete-row">
          <button className="btn btn-primary reader-view__complete-btn" onClick={onMarkComplete}>
            Mark Lesson Complete ✓
          </button>
        </div>
      )}
      {isCompleted && (
        <div className="reader-view__completed-badge">
          <span>✓ Lesson completed</span>
          {onUnmarkComplete && (
            <button className="btn btn-ghost btn-sm reader-view__unmark-btn" onClick={onUnmarkComplete}>
              Undo
            </button>
          )}
        </div>
      )}

      {/* Regenerate */}
      <div className="reader-view__regen-row">
        {confirmRegen ? (
          <>
            <span className="reader-view__regen-prompt text-muted">Replace this reader?</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(false)}>
              Cancel
            </button>
            <button className="btn btn-sm reader-view__regen-confirm-btn" onClick={handleRegenConfirm}>
              Regenerate
            </button>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(true)}>
            Regenerate reader
          </button>
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
