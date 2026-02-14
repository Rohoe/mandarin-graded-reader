import { useState } from 'react';
import './SyllabusHome.css';

export default function SyllabusHome({ syllabus, progress, onSelectLesson, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!syllabus) return null;

  const { topic, level, summary, lessons = [], createdAt } = syllabus;
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
      {/* ── Header ─────────────────────────────── */}
      <header className="syllabus-home__header">
        <div className="syllabus-home__title-row">
          <h1 className="syllabus-home__topic font-display">{topic}</h1>
          <span className="syllabus-home__level-badge">HSK {level}</span>
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
                    <span className="syllabus-home__lesson-zh text-chinese">{lesson.title_zh}</span>
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
