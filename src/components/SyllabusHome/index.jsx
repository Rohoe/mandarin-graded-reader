import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getLang } from '../../lib/languages';
import LoadingIndicator from '../LoadingIndicator';
import './SyllabusHome.css';

export default function SyllabusHome({ syllabus, progress, onSelectLesson, onDelete, onExtend }) {
  const { state } = useApp();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [additionalCount, setAdditionalCount] = useState(3);

  if (!syllabus) return null;

  const { topic, level, langId, summary, lessons = [], createdAt } = syllabus;
  const langConfig = getLang(langId);
  const completedSet = new Set(progress?.completedLessons || []);
  const completedCount = completedSet.size;

  const createdDate = createdAt
    ? new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  // First incomplete lesson index for the Continue CTA
  const firstIncompleteIdx = lessons.findIndex((_, idx) => !completedSet.has(idx));
  const continueIdx = firstIncompleteIdx === -1 ? 0 : firstIncompleteIdx;
  const allDone = completedCount === lessons.length && lessons.length > 0;

  function handleDelete() {
    setConfirmingDelete(false);
    onDelete?.();
  }

  return (
    <article className="syllabus-home">
      {/* ── Loading overlay ─────────────────────── */}
      {state.loading && (
        <div className="syllabus-home__loading">
          <LoadingIndicator message={state.loadingMessage || '正在生成…'} />
        </div>
      )}

      {/* ── Header ─────────────────────────────── */}
      <header className="syllabus-home__header">
        <div className="syllabus-home__title-row">
          <h1 className="syllabus-home__topic font-display">{topic}</h1>
          <span className="syllabus-home__level-badge">{langConfig.proficiency.name} {level}</span>
        </div>
        {createdDate && (
          <p className="syllabus-home__date text-muted">Created {createdDate}</p>
        )}
      </header>

      {/* ── Summary ────────────────────────────── */}
      {summary && (
        <section className="syllabus-home__section">
          <h2 className="syllabus-home__section-title">Summary</h2>
          <p className="syllabus-home__summary">{summary}</p>
        </section>
      )}

      {/* ── Lessons ────────────────────────────── */}
      <section className="syllabus-home__section">
        <div className="syllabus-home__lessons-header">
          <h2 className="syllabus-home__section-title">Lessons</h2>
          <span className="syllabus-home__progress-label text-muted">
            {completedCount} / {lessons.length} complete
          </span>
        </div>

        {/* Progress bar */}
        <div className="syllabus-home__progress-bar">
          <div
            className="syllabus-home__progress-fill"
            style={{ width: lessons.length > 0 ? `${(completedCount / lessons.length) * 100}%` : '0%' }}
          />
        </div>

        <ul className="syllabus-home__lesson-list" role="list">
          {lessons.map((lesson, idx) => {
            const isCompleted = completedSet.has(idx);
            return (
              <li key={idx}>
                <button
                  className={`syllabus-home__lesson-row ${isCompleted ? 'syllabus-home__lesson-row--completed' : ''}`}
                  onClick={() => onSelectLesson?.(idx)}
                >
                  <span className={`syllabus-home__lesson-status ${isCompleted ? 'syllabus-home__lesson-status--done' : ''}`}>
                    {isCompleted ? '✓' : idx + 1}
                  </span>
                  <span className="syllabus-home__lesson-titles">
                    <span className="syllabus-home__lesson-zh text-target">{lesson.title_zh || lesson.title_target}</span>
                    <span className="syllabus-home__lesson-en text-muted">{lesson.title_en}</span>
                  </span>
                  <span className="syllabus-home__lesson-cta text-muted">
                    {isCompleted ? 'Review' : 'Start'} →
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Continue CTA ───────────────────────── */}
      {lessons.length > 0 && (
        <div className="syllabus-home__cta">
          <button
            className="btn btn-primary"
            onClick={() => onSelectLesson?.(continueIdx)}
          >
            {allDone ? 'Review from the beginning →' : `Continue → Lesson ${continueIdx + 1}`}
          </button>
        </div>
      )}

      {/* ── Add more lessons ───────────────────── */}
      {onExtend && (
        <section className="syllabus-home__section syllabus-home__extend-section">
          {!extendOpen ? (
            <button
              className="btn btn-ghost syllabus-home__extend-toggle"
              onClick={() => setExtendOpen(true)}
            >
              + Add more lessons
            </button>
          ) : (
            <div className="syllabus-home__extend-panel">
              <h2 className="syllabus-home__section-title">Add more lessons</h2>
              <div className="syllabus-home__extend-controls">
                <label className="syllabus-home__extend-label">
                  Number of new lessons: <strong>{additionalCount}</strong>
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  step={1}
                  value={additionalCount}
                  onChange={e => setAdditionalCount(Number(e.target.value))}
                  className="syllabus-home__extend-slider"
                  disabled={state.loading}
                />
              </div>
              <div className="syllabus-home__extend-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExtendOpen(false)}
                  disabled={state.loading}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { onExtend(additionalCount); setExtendOpen(false); }}
                  disabled={state.loading}
                >
                  {state.loading ? state.loadingMessage || 'Generating…' : 'Generate'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Danger zone ────────────────────────── */}
      <section className="syllabus-home__danger-zone">
        <div className="syllabus-home__danger-divider">
          <span className="text-subtle">danger zone</span>
        </div>

        {confirmingDelete ? (
          <div className="syllabus-home__confirm">
            <p className="syllabus-home__confirm-text">
              Permanently delete <strong>"{topic}"</strong> and all its progress?
            </p>
            <div className="syllabus-home__confirm-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm syllabus-home__delete-confirm-btn"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn syllabus-home__delete-btn"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete Syllabus
          </button>
        )}
      </section>
    </article>
  );
}
