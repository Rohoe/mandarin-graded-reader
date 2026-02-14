import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import TopicForm from './TopicForm';
import './SyllabusPanel.css';

export default function SyllabusPanel({
  activeSyllabusId,
  standaloneKey,
  onSelectLesson,
  onNewSyllabus,
  onShowSettings,
  onStandaloneGenerated,
  onStandaloneGenerating,
  onSwitchSyllabus,
  onSelectStandalone,
}) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { syllabi, syllabusProgress, standaloneReaders, loading, pendingReaders } = state;
  const pendingCount = Object.keys(pendingReaders).length;

  const currentSyllabus  = syllabi.find(s => s.id === activeSyllabusId) || null;
  const progress         = syllabusProgress[activeSyllabusId] || { lessonIndex: 0, completedLessons: [] };
  const lessonIndex      = progress.lessonIndex;
  const completedLessons = new Set(progress.completedLessons);

  // Form is open when no syllabi exist; resets when active syllabus changes
  const [formOpen, setFormOpen] = useState(!currentSyllabus);
  useEffect(() => { setFormOpen(!currentSyllabus); }, [activeSyllabusId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Confirmation dialog state: { type: 'syllabus'|'reader', id, label } | null
  const [confirmPending, setConfirmPending] = useState(null);

  function requestDelete(type, id, label) {
    setConfirmPending({ type, id, label });
  }

  function confirmDelete() {
    if (!confirmPending) return;
    if (confirmPending.type === 'syllabus') {
      act.removeSyllabus(confirmPending.id);
    } else {
      act.removeStandaloneReader(confirmPending.id);
    }
    setConfirmPending(null);
  }

  function handleNewSyllabus(newSyllabusId) {
    setFormOpen(false);
    onNewSyllabus?.(newSyllabusId);
  }

  const lessons = currentSyllabus?.lessons || [];

  function handleLessonClick(idx) {
    if (loading) return;
    act.setLessonIndex(activeSyllabusId, idx);
    onSelectLesson?.(idx);
  }

  return (
    <aside className="syllabus-panel">
      {/* Header */}
      <div className="syllabus-panel__header">
        <h1 className="syllabus-panel__app-title font-display">
          <span className="syllabus-panel__hanzi">读书</span>
          <span className="syllabus-panel__app-name">Graded Reader</span>
          {pendingCount > 0 && (
            <span className="syllabus-panel__pending-badge" title={`${pendingCount} reader${pendingCount > 1 ? 's' : ''} generating`}>
              ⟳ {pendingCount}
            </span>
          )}
        </h1>
      </div>

      {/* Syllabus switcher — shown when at least one syllabus exists */}
      {syllabi.length > 0 && (
        <div className="syllabus-panel__switcher">
          <select
            className="form-select syllabus-panel__switcher-select"
            value={activeSyllabusId || ''}
            onChange={e => { onSwitchSyllabus?.(e.target.value); setFormOpen(false); }}
            aria-label="Switch syllabus"
          >
            {syllabi.map(s => (
              <option key={s.id} value={s.id}>
                {s.topic} · HSK {s.level}
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFormOpen(true)}
            title="New syllabus or standalone reader"
          >
            + New
          </button>
          <button
            className="btn btn-ghost btn-sm syllabus-panel__delete-syllabus-btn"
            onClick={() => requestDelete('syllabus', activeSyllabusId, syllabi.find(s => s.id === activeSyllabusId)?.topic)}
            title="Delete this syllabus"
            aria-label="Delete syllabus"
          >
            ×
          </button>
        </div>
      )}

      {/* Topic form — shown when no syllabus exists or user clicked + */}
      {(!currentSyllabus || formOpen) && (
        <div className="syllabus-panel__form-section">
          <TopicForm
            onNewSyllabus={handleNewSyllabus}
            onStandaloneGenerated={onStandaloneGenerated}
            onStandaloneGenerating={onStandaloneGenerating}
            onCancel={currentSyllabus ? () => setFormOpen(false) : undefined}
          />
        </div>
      )}

      {/* Lesson list */}
      {currentSyllabus && !formOpen && lessons.length > 0 && (
        <div className="syllabus-panel__lessons">
          <div className="syllabus-panel__lessons-header">
            <span className="form-label">
              {currentSyllabus.topic} · HSK {currentSyllabus.level}
            </span>
            <span className="syllabus-panel__progress text-subtle">
              {completedLessons.size}/{lessons.length}
            </span>
          </div>

          <div className="syllabus-panel__progress-bar">
            <div
              className="syllabus-panel__progress-fill"
              style={{ width: `${(completedLessons.size / lessons.length) * 100}%` }}
            />
          </div>

          <ul className="syllabus-panel__list" role="list">
            {lessons.map((lesson, idx) => {
              const isActive    = idx === lessonIndex && !standaloneKey;
              const isCompleted = completedLessons.has(idx);

              return (
                <li key={idx}>
                  <button
                    className={`syllabus-panel__lesson-btn
                      ${isActive    ? 'syllabus-panel__lesson-btn--active'    : ''}
                      ${isCompleted ? 'syllabus-panel__lesson-btn--completed' : ''}
                    `}
                    onClick={() => handleLessonClick(idx)}
                    disabled={loading}
                  >
                    <span className="syllabus-panel__lesson-num">
                      {isCompleted ? '✓' : `${idx + 1}`}
                    </span>
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">
                        {lesson.title_zh}
                      </span>
                      <span className="syllabus-panel__lesson-en text-muted">
                        {lesson.title_en}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Standalone readers list */}
      {standaloneReaders.length > 0 && (
        <div className="syllabus-panel__standalone">
          <div className="syllabus-panel__standalone-header">
            <span className="form-label">Standalone Readers</span>
          </div>
          <ul className="syllabus-panel__list" role="list">
            {standaloneReaders.map(r => (
              <li key={r.key}>
                <div
                  className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''}`}
                >
                  <button
                    className="syllabus-panel__standalone-select"
                    onClick={() => onSelectStandalone?.(r.key)}
                    disabled={loading}
                  >
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">{r.topic}</span>
                      <span className="syllabus-panel__lesson-en text-muted">HSK {r.level}</span>
                    </span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                    onClick={() => requestDelete('reader', r.key, r.topic)}
                    aria-label="Delete reader"
                    title="Delete this reader"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings link */}
      <div className="syllabus-panel__footer">
        <button
          className="btn btn-ghost btn-sm"
          onClick={onShowSettings}
        >
          ⚙ Settings
        </button>
      </div>

      {/* Confirmation dialog */}
      {confirmPending && (
        <div className="syllabus-panel__confirm-overlay" role="dialog" aria-modal="true">
          <div className="syllabus-panel__confirm-dialog">
            <p className="syllabus-panel__confirm-title">
              Delete {confirmPending.type === 'syllabus' ? 'syllabus' : 'reader'}?
            </p>
            <p className="syllabus-panel__confirm-label text-muted">
              "{confirmPending.label}" will be permanently removed.
            </p>
            <div className="syllabus-panel__confirm-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmPending(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm syllabus-panel__confirm-delete-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
