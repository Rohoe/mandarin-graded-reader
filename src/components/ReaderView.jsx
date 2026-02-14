import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { generateReader } from '../lib/api';
import { parseReaderResponse, parseStorySegments } from '../lib/parser';
import VocabularyList from './VocabularyList';
import ComprehensionQuestions from './ComprehensionQuestions';
import AnkiExportButton from './AnkiExportButton';
import GenerationProgress from './GenerationProgress';
import './ReaderView.css';

export default function ReaderView({ lessonKey, lessonMeta, onMarkComplete, onUnmarkComplete, isCompleted }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { generatedReaders, learnedVocabulary, error, pendingReaders, apiKey, maxTokens } = state;
  const isPending = !!(lessonKey && pendingReaders[lessonKey]);

  const reader = generatedReaders[lessonKey];
  const scrollRef = useRef(null);

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
    if (!lessonMeta || isPending) return;

    const topic = lessonMeta.title_zh
      ? `${lessonMeta.title_zh} — ${lessonMeta.title_en || ''}: ${lessonMeta.description || ''}`
      : lessonMeta.topic || '';
    const level = lessonMeta.level || 3;

    act.startPendingReader(lessonKey);
    act.clearError();
    try {
      const raw    = await generateReader(apiKey, topic, level, learnedVocabulary, 1200, maxTokens);
      const parsed = parseReaderResponse(raw);
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

  // ── Empty state ─────────────────────────────────────────────
  if (!lessonKey) {
    return (
      <div className="reader-view reader-view--empty">
        <div className="reader-view__empty-state">
          <span className="reader-view__empty-hanzi">读</span>
          <p className="font-display reader-view__empty-text">
            Select a lesson from the syllabus, or generate a standalone reader using the form on the left.
          </p>
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
      <div className="reader-view__story text-chinese">
        {storyParagraphs.map((para, pi) => (
          <p key={pi} className="reader-view__paragraph">
            {parseStorySegments(para).map((seg, i) => {
              if (seg.type === 'bold')   return <strong key={i} className="reader-view__vocab">{seg.content}</strong>;
              if (seg.type === 'italic') return <em key={i}>{seg.content}</em>;
              return <span key={i}>{seg.content}</span>;
            })}
          </p>
        ))}
      </div>

      <hr className="divider" />

      {/* Anki export */}
      {reader.ankiJson?.length > 0 && (
        <AnkiExportButton
          ankiJson={reader.ankiJson}
          topic={reader.topic || lessonMeta?.title_en || 'lesson'}
          level={reader.level || 3}
        />
      )}

      {/* Vocabulary */}
      <VocabularyList vocabulary={reader.vocabulary} />

      {/* Comprehension questions */}
      <ComprehensionQuestions
        questions={reader.questions}
        lessonKey={lessonKey}
        reader={reader}
        story={reader.story}
        level={reader.level || lessonMeta?.level || 3}
      />

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
        <button className="btn btn-ghost btn-sm" onClick={handleGenerate}>
          Regenerate reader
        </button>
      </div>
    </article>
  );
}
