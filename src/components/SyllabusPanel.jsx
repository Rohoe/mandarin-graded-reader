import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
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
  const { syllabi, syllabusProgress, standaloneReaders, generatedReaders, loading, pendingReaders, cloudUser, cloudSyncing, cloudLastSynced, lastModified } = useAppSelector(s => ({
    syllabi: s.syllabi, syllabusProgress: s.syllabusProgress, standaloneReaders: s.standaloneReaders,
    generatedReaders: s.generatedReaders, loading: s.loading, pendingReaders: s.pendingReaders,
    cloudUser: s.cloudUser, cloudSyncing: s.cloudSyncing, cloudLastSynced: s.cloudLastSynced, lastModified: s.lastModified,
  }));
  const dispatch = useAppDispatch();
  const act = actions(dispatch);
  const pendingCount = Object.keys(pendingReaders).length;

  const activeSyllabi    = syllabi.filter(s => !s.archived);
  const archivedSyllabi  = syllabi.filter(s => s.archived);
  const archivedStandalone = standaloneReaders.filter(r => r.archived);
  const activeStandalone = standaloneReaders.filter(r => !r.archived);
  const archivedCount    = archivedSyllabi.length + archivedStandalone.length;

  const currentSyllabus  = syllabi.find(s => s.id === activeSyllabusId) || null;
  const progress         = syllabusProgress[activeSyllabusId] || { lessonIndex: 0, completedLessons: [] };
  const lessonIndex      = progress.lessonIndex;
  const completedLessons = new Set(progress.completedLessons);

  // Form is open when no syllabi exist; resets when active syllabus changes
  const [formOpen, setFormOpen] = useState(!currentSyllabus);
  useEffect(() => { setFormOpen(!currentSyllabus); }, [activeSyllabusId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [lessonsOpen, setLessonsOpen] = useState(true);
  const [standaloneOpen, setStandaloneOpen] = useState(true);
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Confirmation dialog state: { id, label, type: 'standalone' | 'syllabus' } | null
  const [confirmPending, setConfirmPending] = useState(null);

  function requestDelete(id, label, type = 'standalone') {
    setConfirmPending({ id, label, type });
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

      {/* Syllabus switcher — shown when at least one non-archived syllabus exists */}
      {activeSyllabi.length > 0 && (
        <div className="syllabus-panel__switcher">
          <select
            className="form-select syllabus-panel__switcher-select"
            value={activeSyllabusId || ''}
            onChange={e => { onSwitchSyllabus?.(e.target.value); setFormOpen(false); }}
            aria-label="Switch syllabus"
          >
            {activeSyllabi.map(s => {
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
      {activeStandalone.length > 0 && (
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
            {activeStandalone.map(r => (
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
                    className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                    onClick={() => act.archiveStandaloneReader(r.key)}
                    aria-label="Archive reader"
                    title="Archive this reader"
                  >
                    ↓
                  </button>
                  <button
                    className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                    onClick={() => requestDelete(r.key, r.topic, 'standalone')}
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

      {/* Archived section */}
      {archivedCount > 0 && (
        <div className="syllabus-panel__standalone">
          <button
            className="syllabus-panel__standalone-header"
            onClick={() => setArchivedOpen(o => !o)}
            aria-expanded={archivedOpen}
          >
            <span className="form-label text-muted">Archived ({archivedCount})</span>
            <span className="syllabus-panel__caret-btn">{archivedOpen ? '▾' : '▸'}</span>
          </button>
          {archivedOpen && (
            <ul className="syllabus-panel__list" role="list">
              {archivedSyllabi.map(s => (
                <li key={s.id}>
                  <div className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__archived-item">
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">{s.topic}</span>
                      <span className="syllabus-panel__lesson-en text-muted">
                        {getLang(s.langId).proficiency.name} {s.level} · Syllabus
                      </span>
                    </span>
                    <button
                      className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                      onClick={() => act.unarchiveSyllabus(s.id)}
                      aria-label="Unarchive syllabus"
                      title="Unarchive"
                    >
                      ↩
                    </button>
                    <button
                      className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                      onClick={() => requestDelete(s.id, s.topic, 'syllabus')}
                      aria-label="Delete syllabus"
                      title="Delete permanently"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
              {archivedStandalone.map(r => (
                <li key={r.key}>
                  <div className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__archived-item">
                    <span className="syllabus-panel__lesson-text">
                      <span className="syllabus-panel__lesson-zh text-chinese">
                        {generatedReaders[r.key]?.titleZh || r.topic}
                      </span>
                      <span className="syllabus-panel__lesson-en text-muted">
                        {getLang(r.langId).proficiency.name} {r.level}
                      </span>
                    </span>
                    <button
                      className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                      onClick={() => act.unarchiveStandaloneReader(r.key)}
                      aria-label="Unarchive reader"
                      title="Unarchive"
                    >
                      ↩
                    </button>
                    <button
                      className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                      onClick={() => requestDelete(r.key, r.topic, 'standalone')}
                      aria-label="Delete reader"
                      title="Delete permanently"
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
              <span className="syllabus-panel__sync-label syllabus-panel__sync-label--off">
                Not signed in
                <button className="syllabus-panel__sign-in-link" onClick={onShowSettings}>Sign in</button>
              </span>
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
