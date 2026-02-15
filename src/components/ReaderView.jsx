import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { generateReader } from '../lib/api';
import { parseReaderResponse, parseStorySegments } from '../lib/parser';
import { pinyin } from 'pinyin-pro';
import VocabularyList from './VocabularyList';
import ComprehensionQuestions from './ComprehensionQuestions';
import AnkiExportButton from './AnkiExportButton';
import GenerationProgress from './GenerationProgress';
import GrammarNotes from './GrammarNotes';
import './ReaderView.css';

export default function ReaderView({ lessonKey, lessonMeta, onMarkComplete, onUnmarkComplete, isCompleted, onContinueStory, onOpenSidebar }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { generatedReaders, learnedVocabulary, error, pendingReaders, apiKey, maxTokens, ttsVoiceURI } = state;
  const isPending = !!(lessonKey && pendingReaders[lessonKey]);

  const reader = generatedReaders[lessonKey];
  const scrollRef = useRef(null);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [pinyinOn, setPinyinOn] = useState(false);
  const [activeVocab, setActiveVocab] = useState(null);
  const popoverRef = useRef(null);

  // ── Text-to-speech ──────────────────────────────────────────
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speakingKey, setSpeakingKey] = useState(null);
  const utteranceRef = useRef(null);
  const [chineseVoices, setChineseVoices] = useState([]);

  function pickBestVoice(voices) {
    const priority = [
      v => v.name === 'Google 普通话（中国大陆）',
      v => v.name === 'Google 国语（台灣）',
      v => /^Tingting$/i.test(v.name),
      v => /^Meijia$/i.test(v.name),
      v => v.lang === 'zh-CN',
      v => v.lang.startsWith('zh'),
    ];
    for (const test of priority) {
      const match = voices.find(test);
      if (match) return match;
    }
    return voices[0] || null;
  }

  useEffect(() => {
    if (!ttsSupported) return;
    function loadVoices() {
      const zh = window.speechSynthesis.getVoices().filter(v => /zh/i.test(v.lang));
      setChineseVoices(zh);
      // Auto-set best voice in global state if none saved yet
      if (!ttsVoiceURI && zh.length > 0) {
        const best = pickBestVoice(zh);
        if (best) act.setTtsVoice(best.voiceURI);
      }
    }
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ttsSupported]);

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
    const voice = chineseVoices.find(v => v.voiceURI === ttsVoiceURI);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'zh-CN';
    }
    utterance.rate = 0.85;
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);
    utteranceRef.current = utterance;
    setSpeakingKey(key);
    window.speechSynthesis.speak(utterance);
  }, [ttsSupported, speakingKey, chineseVoices, ttsVoiceURI]);

  // ── Vocab lookup map (click-to-define) ──────────────────────
  const vocabMap = useMemo(() => {
    const map = new Map();
    if (reader?.vocabulary) {
      for (const v of reader.vocabulary) {
        map.set(v.chinese, v);
        const stripped = v.chinese.replace(/^[^\u4e00-\u9fff]+|[^\u4e00-\u9fff]+$/g, '');
        if (stripped && stripped !== v.chinese) map.set(stripped, v);
      }
    }
    return map;
  }, [reader?.vocabulary]);

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

    let topic, level;
    if (lessonMeta) {
      topic = lessonMeta.title_zh
        ? `${lessonMeta.title_zh} — ${lessonMeta.title_en || ''}: ${lessonMeta.description || ''}`
        : lessonMeta.topic || '';
      level = lessonMeta.level || 3;
    } else if (reader) {
      // Standalone reader — use the metadata stored on the reader object
      topic = reader.topic || '';
      level = reader.level || 3;
    } else {
      return;
    }

    act.startPendingReader(lessonKey);
    act.clearError();
    try {
      const raw    = await generateReader(apiKey, topic, level, learnedVocabulary, 1200, maxTokens);
      console.log('[ReaderView] raw response (first 500 chars):', raw?.slice(0, 500));
      const parsed = parseReaderResponse(raw);
      console.log('[ReaderView] parsed.questions:', parsed.questions);
      console.log('[ReaderView] parsed.parseError:', parsed.parseError);
      act.setReader(lessonKey, { ...parsed, topic, level, lessonKey });
      if (parsed.ankiJson?.length > 0) {
        act.addVocabulary(parsed.ankiJson.map(c => ({
          chinese: c.chinese, pinyin: c.pinyin, english: c.english,
        })));
      }
      act.notify('success', `Reader ready: ${lessonMeta.title_en || topic}`);
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

  // ── Empty state ─────────────────────────────────────────────
  if (!lessonKey) {
    return (
      <div className="reader-view reader-view--empty">
        <div className="reader-view__empty-state">
          <span className="reader-view__empty-hanzi">读</span>
          <p className="font-display reader-view__empty-text">
            Select a lesson from the syllabus, or generate a standalone reader.
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
              <h2 className="text-chinese-title reader-view__lesson-title">
                {lessonMeta.title_zh}
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
              <h2 className="text-chinese-title reader-view__lesson-title">
                {lessonMeta.title_zh}
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
    const stripped = text.replace(/^[^\u4e00-\u9fff]+|[^\u4e00-\u9fff]+$/g, '');
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

  // Renders text with <ruby> pinyin annotations for Chinese characters
  function renderChars(text, keyPrefix) {
    if (!pinyinOn) return text;
    const chars = [...text];
    const pinyinArr = pinyin(text, { type: 'array', toneType: 'symbol' });
    const nodes = [];
    let nonChi = '';
    let nonChiStart = 0;
    for (let i = 0; i < chars.length; i++) {
      if (/[\u4e00-\u9fff]/.test(chars[i])) {
        if (nonChi) {
          nodes.push(<span key={`${keyPrefix}-t${nonChiStart}`}>{nonChi}</span>);
          nonChi = '';
        }
        nodes.push(<ruby key={`${keyPrefix}-r${i}`}>{chars[i]}<rt>{pinyinArr[i]}</rt></ruby>);
      } else {
        if (!nonChi) nonChiStart = i;
        nonChi += chars[i];
      }
    }
    if (nonChi) nodes.push(<span key={`${keyPrefix}-tend`}>{nonChi}</span>);
    return nodes;
  }

  return (
    <article className="reader-view fade-in" ref={scrollRef}>
      {/* Title */}
      <header className="reader-view__header">
        <div className="reader-view__meta text-subtle font-display">
          {reader.level && `HSK ${reader.level}`}
          {reader.topic && ` · ${reader.topic}`}
        </div>
        <h1 className="reader-view__title text-chinese-title">
          {reader.titleZh || lessonMeta?.title_zh || ''}
        </h1>
        {reader.titleEn && (
          <p className="reader-view__title-en font-display text-muted">{reader.titleEn}</p>
        )}
      </header>

      <hr className="divider" />

      {/* Story */}
      <div className="reader-view__story-section">
        <div className="reader-view__tts-bar">
          <button
            className={`btn btn-ghost btn-sm reader-view__tts-btn ${pinyinOn ? 'reader-view__tts-btn--active' : ''}`}
            onClick={() => setPinyinOn(v => !v)}
            title={pinyinOn ? 'Hide pinyin' : 'Show pinyin'}
          >
            拼 Pinyin
          </button>
        {ttsSupported && (
          <>
            <button
              className={`btn btn-ghost btn-sm reader-view__tts-btn ${speakingKey === 'story' ? 'reader-view__tts-btn--active' : ''}`}
              onClick={() => speakText(stripMarkdown(storyParagraphs.join('\n\n')), 'story')}
              title={speakingKey === 'story' ? 'Stop' : 'Listen to story'}
            >
              {speakingKey === 'story' ? '⏹ Stop' : '🔊 Listen'}
            </button>
            {speakingKey && speakingKey !== 'story' && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { window.speechSynthesis.cancel(); setSpeakingKey(null); }}
                title="Stop"
              >
                ⏹ Stop
              </button>
            )}
          </>
        )}
        </div>
        <div className={`reader-view__story text-chinese ${pinyinOn ? 'reader-view__story--pinyin' : ''}`}>
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
            <span className="reader-view__popover-chinese text-chinese">{activeVocab.word.chinese}</span>
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
            onClick={() => onContinueStory({ story: reader.story, topic: reader.topic || lessonMeta?.title_en || 'story', level: reader.level || lessonMeta?.level || 3 })}
          >
            Next episode →
          </button>
        </div>
      )}
    </article>
  );
}
