import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { getLang, getLessonTitle } from '../lib/languages';
import TopicForm from './TopicForm';
import './SyllabusPanel.css';

export default function SyllabusPanel({
  activeSyllabusId,
  standaloneKey,
  syllabusView,
  onSelectLesson,
  onNewSyllabus,
  onShowSettings,
  onStandaloneGenerated,
  onStandaloneGenerating,
  onSwitchSyllabus,
  onSelectStandalone,
  onGoSyllabusHome,
}) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { syllabi, syllabusProgress, standaloneReaders, generatedReaders, loading, pendingReaders, cloudUser, cloudSyncing, cloudLastSynced, lastModified } = state;
  const pendingCount = Object.keys(pendingReaders).length;

  const currentSyllabus  = syllabi.find(s => s.id === activeSyllabusId) || null;
  const progress         = syllabusProgress[activeSyllabusId] || { lessonIndex: 0, completedLessons: [] };
  const lessonIndex      = progress.lessonIndex;
  const completedLessons = new Set(progress.completedLessons);

  // Form is open when no syllabi exist; resets when active syllabus changes
  const [formOpen, setFormOpen] = useState(!currentSyllabus);
  useEffect(() => { setFormOpen(!currentSyllabus); }, [activeSyllabusId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [lessonsOpen, setLessonsOpen] = useState(true);
  const [standaloneOpen, setStandaloneOpen] = useState(true);

  // Confirmation dialog state: { id, label } | null (for standalone reader deletion only)
  const [confirmPending, setConfirmPending] = useState(null);

  function requestDelete(id, label) {
    setConfirmPending({ id, label });
  }

  function confirmDelete() {
    if (!confirmPending) return;
    act.removeStandaloneReader(confirmPending.id);
    setConfirmPending(null);
  }

  function handleNewSyllabus(newSyllabusId) {
    setFormOpen(false);
    onNewSyllabus?.(newSyllabusId);
  }

  const lessons = currentSyllabus?.lessons || [];

  function handleLessonClick(idx) {
    if (loading) return;
    onSelectLesson?.(idx);
  }

  return (
    <aside className="syllabus-panel">
      {/* Header */}
      <div className="syllabus-panel__header">
        <h1 className="syllabus-panel__app-title font-display">
          <span className="syllabus-panel__hanzi">漫读</span>
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
            {syllabi.map(s => {
              const sLang = getLang(s.langId);
              return (
                <option key={s.id} value={s.id}>
                  {s.topic} · {sLang.proficiency.name} {s.level}
                </option>
              );
            })}
          </select>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFormOpen(true)}
            title="New syllabus or standalone reader"
          >
            + New
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
          <div className={`syllabus-panel__lessons-header ${syllabusView === 'home' && !standaloneKey ? 'syllabus-panel__lessons-header--active' : ''}`}>
            <button
              className="syllabus-panel__lessons-title-btn"
              onClick={() => { onGoSyllabusHome?.(); setFormOpen(false); }}
              title="Syllabus overview"
            >
              <span className="form-label">
                {currentSyllabus.topic} · {getLang(currentSyllabus.langId).proficiency.name} {currentSyllabus.level}
              </span>
              <span className="syllabus-panel__progress text-subtle">
                {completedLessons.size}/{lessons.length}
              </span>
            </button>
            <button
              className="syllabus-panel__caret-btn"
              onClick={() => setLessonsOpen(o => !o)}
              aria-label={lessonsOpen ? 'Collapse lessons' : 'Expand lessons'}
            >
              {lessonsOpen ? '▾' : '▸'}
            </button>
          </div>

          {lessonsOpen && (
          <>
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
                        {getLessonTitle(lesson, currentSyllabus?.langId)}
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
          </>
          )}
        </div>
      )}

      {/* Standalone readers list */}
      {standaloneReaders.length > 0 && (
        <div className="syllabus-panel__standalone">
          <button
            className="syllabus-panel__standalone-header"
            onClick={() => setStandaloneOpen(o => !o)}
            aria-expanded={standaloneOpen}
          >
            <span className="form-label">Standalone Readers</span>
            <span className="syllabus-panel__caret-btn">{standaloneOpen ? '▾' : '▸'}</span>
          </button>
          {standaloneOpen && (
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
                      <span className="syllabus-panel__lesson-zh text-chinese">
                        {generatedReaders[r.key]?.titleZh || r.topic}
                      </span>
                      <span className="syllabus-panel__lesson-en text-muted">
                        {generatedReaders[r.key]?.titleEn || `${getLang(r.langId).proficiency.name} ${r.level}`}
                      </span>
                    </span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                    onClick={() => requestDelete(r.key, r.topic)}
                    aria-label="Delete reader"
                    title="Delete this reader"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
          )}
        </div>
      )}

      {/* Footer: sync status + settings */}
      <div className="syllabus-panel__footer">
        <div className="syllabus-panel__sync-status">
          {cloudUser ? (
            <>
              <span className="syllabus-panel__sync-icon" title={cloudUser.email || 'Signed in'}>☁</span>
              {cloudSyncing ? (
                <span className="syllabus-panel__sync-label syllabus-panel__sync-label--syncing">Syncing…</span>
              ) : cloudLastSynced && lastModified > cloudLastSynced ? (
                <span className="syllabus-panel__sync-label syllabus-panel__sync-label--unsynced">Unsynced</span>
              ) : cloudLastSynced ? (
                <span className="syllabus-panel__sync-label syllabus-panel__sync-label--synced">Synced</span>
              ) : (
                <span className="syllabus-panel__sync-label syllabus-panel__sync-label--unsynced">Not yet synced</span>
              )}
            </>
          ) : (
            <>
              <span className="syllabus-panel__sync-icon syllabus-panel__sync-icon--off" title="Not signed in">☁</span>
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--off">Not signed in</span>
            </>
          )}
        </div>
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
              Delete reader?
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
