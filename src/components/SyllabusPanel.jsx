import { useState, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { getLang, getLessonTitle } from '../lib/languages';
import './SyllabusPanel.css';

export default function SyllabusPanel({
  activeSyllabusId,
  standaloneKey,
  syllabusView,
  onSelectLesson,
  onShowSettings,
  onShowStats,
  onShowFlashcards,
  onSwitchSyllabus,
  onSelectStandalone,
  onGoSyllabusHome,
  onShowNewForm,
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

  // ── Toolbar state ──────────────────────────
  const [viewMode, setViewMode] = useState('all');          // 'all' | 'courses' | 'readers'
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState('all');       // 'all' | 'zh' | 'yue' | 'ko'
  const [sortBy, setSortBy] = useState('recent');             // 'recent' | 'alpha'
  const [expandedSyllabi, setExpandedSyllabi] = useState(new Set());

  // Auto-expand the active syllabus
  useEffect(() => {
    if (activeSyllabusId && !standaloneKey) {
      setExpandedSyllabi(prev => {
        if (prev.has(activeSyllabusId)) return prev;
        const next = new Set(prev);
        next.add(activeSyllabusId);
        return next;
      });
    }
  }, [activeSyllabusId, standaloneKey]);

  // Detect if content spans multiple languages
  const contentLanguages = useMemo(() => {
    const langs = new Set();
    for (const s of activeSyllabi) langs.add(s.langId || 'zh');
    for (const r of activeStandalone) langs.add(r.langId || 'zh');
    return langs;
  }, [activeSyllabi, activeStandalone]);
  const multiLang = contentLanguages.size > 1;

  // ── Filtering & sorting ────────────────────
  const { filteredSyllabi, filteredStandalone } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    let fSyllabi = activeSyllabi;
    let fStandalone = activeStandalone;

    // View mode filter
    if (viewMode === 'readers') fSyllabi = [];
    if (viewMode === 'courses') fStandalone = [];

    // Language filter
    if (langFilter !== 'all') {
      fSyllabi = fSyllabi.filter(s => (s.langId || 'zh') === langFilter);
      fStandalone = fStandalone.filter(r => (r.langId || 'zh') === langFilter);
    }

    // Search filter
    if (query) {
      fSyllabi = fSyllabi.filter(s => s.topic.toLowerCase().includes(query));
      fStandalone = fStandalone.filter(r => r.topic.toLowerCase().includes(query));
    }

    // Sort
    if (sortBy === 'alpha') {
      fSyllabi = [...fSyllabi].sort((a, b) => a.topic.localeCompare(b.topic));
      fStandalone = [...fStandalone].sort((a, b) => a.topic.localeCompare(b.topic));
    } else {
      // 'recent' — createdAt descending (already default order, but ensure it)
      fSyllabi = [...fSyllabi].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      fStandalone = [...fStandalone].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return { filteredSyllabi: fSyllabi, filteredStandalone: fStandalone };
  }, [activeSyllabi, activeStandalone, viewMode, langFilter, searchQuery, sortBy]);

  // Group standalone readers by seriesId (after filtering)
  const { ungrouped, seriesGroups } = useMemo(() => {
    const groups = {};
    const solo = [];
    for (const r of filteredStandalone) {
      if (r.seriesId) {
        if (!groups[r.seriesId]) groups[r.seriesId] = [];
        groups[r.seriesId].push(r);
      } else {
        solo.push(r);
      }
    }
    for (const g of Object.values(groups)) {
      g.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
    }
    return { ungrouped: solo, seriesGroups: groups };
  }, [filteredStandalone]);

  const [expandedSeries, setExpandedSeries] = useState({});
  const [archivedOpen, setArchivedOpen] = useState(false);

  // Confirmation dialog state
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

  function handleLessonClick(idx) {
    if (loading) return;
    onSelectLesson?.(idx);
  }

  function handleSyllabusClick(id) {
    if (id === activeSyllabusId) {
      onGoSyllabusHome?.();
    } else {
      onSwitchSyllabus?.(id);
    }
  }

  function toggleSyllabusExpand(e, id) {
    e.stopPropagation();
    setExpandedSyllabi(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasContent = activeSyllabi.length > 0 || activeStandalone.length > 0;
  const hasFilteredContent = filteredSyllabi.length > 0 || filteredStandalone.length > 0;
  const isFiltering = searchQuery || langFilter !== 'all' || viewMode !== 'all';

  // Language pill config — only show languages present in user's content
  const allLangOptions = [
    { id: 'zh', label: '中文' },
    { id: 'yue', label: '粵語' },
    { id: 'ko', label: '한국어' },
  ];
  const langOptions = [
    { id: 'all', label: 'All' },
    ...allLangOptions.filter(l => contentLanguages.has(l.id)),
  ];

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
        <button
          className="btn btn-ghost btn-sm syllabus-panel__new-btn"
          onClick={() => onShowNewForm?.()}
          title="New syllabus or standalone reader"
        >
          + New
        </button>
      </div>

      {/* Toolbar (only when there's content) */}
      {hasContent && (
        <div className="syllabus-panel__toolbar">
          {/* View toggle */}
          <div className="syllabus-panel__view-toggle" role="group" aria-label="View mode">
            {[
              { id: 'all', label: 'All' },
              { id: 'courses', label: 'Courses' },
              { id: 'readers', label: 'Readers' },
            ].map(v => (
              <button
                key={v.id}
                className={`syllabus-panel__toggle-btn ${viewMode === v.id ? 'syllabus-panel__toggle-btn--active' : ''}`}
                onClick={() => setViewMode(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="syllabus-panel__search">
            <input
              type="text"
              className="syllabus-panel__search-input"
              placeholder="Search topics…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="syllabus-panel__search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >×</button>
            )}
          </div>

          {/* Language pills + sort */}
          {(multiLang || langFilter !== 'all') && (
            <div className="syllabus-panel__filters">
              <div className="syllabus-panel__lang-pills" role="group" aria-label="Language filter">
                {langOptions.map(l => (
                  <button
                    key={l.id}
                    className={`syllabus-panel__lang-pill ${langFilter === l.id ? 'syllabus-panel__lang-pill--active' : ''}`}
                    onClick={() => setLangFilter(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <select
                className="syllabus-panel__sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                aria-label="Sort order"
              >
                <option value="recent">Recent</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>
          )}

          {/* Sort (when single language) */}
          {!multiLang && langFilter === 'all' && (
            <div className="syllabus-panel__filters">
              <div style={{ flex: 1 }} />
              <select
                className="syllabus-panel__sort-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                aria-label="Sort order"
              >
                <option value="recent">Recent</option>
                <option value="alpha">A–Z</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* Empty state (no content at all) */}
      {!hasContent && (
        <div className="syllabus-panel__empty">
          <p className="syllabus-panel__empty-text text-muted">No readers yet</p>
          <button className="btn btn-sm syllabus-panel__empty-cta" onClick={() => onShowNewForm?.()}>
            Create Reader
          </button>
        </div>
      )}

      {/* No filter results */}
      {hasContent && !hasFilteredContent && isFiltering && (
        <div className="syllabus-panel__no-results">
          <p className="text-muted">No matching readers</p>
        </div>
      )}

      {/* Unified content list */}
      {hasFilteredContent && (
        <div className="syllabus-panel__content-list">
          {/* Syllabi */}
          {filteredSyllabi.map(s => {
            const sLang = getLang(s.langId);
            const prog = syllabusProgress[s.id] || { lessonIndex: 0, completedLessons: [] };
            const completedSet = new Set(prog.completedLessons);
            const isActive = s.id === activeSyllabusId && !standaloneKey;
            const isExpanded = expandedSyllabi.has(s.id);
            const lessons = s.lessons || [];

            return (
              <div key={s.id} className="syllabus-panel__item-group">
                <button
                  className={`syllabus-panel__item-btn ${isActive ? 'syllabus-panel__item-btn--active' : ''}`}
                  onClick={() => handleSyllabusClick(s.id)}
                >
                  <span className="syllabus-panel__item-text">
                    <span className="syllabus-panel__item-title text-chinese">{s.topic}</span>
                    <span className="syllabus-panel__item-meta text-muted">
                      {sLang.proficiency.name} {s.level} · {completedSet.size}/{lessons.length}
                    </span>
                  </span>
                  {lessons.length > 0 && (
                    <span
                      className="syllabus-panel__caret-btn"
                      onClick={(e) => toggleSyllabusExpand(e, s.id)}
                      role="button"
                      aria-label={isExpanded ? 'Collapse lessons' : 'Expand lessons'}
                    >
                      {isExpanded ? '▾' : '▸'}
                    </span>
                  )}
                </button>

                {/* Always-visible progress bar */}
                {lessons.length > 0 && (
                  <div className="syllabus-panel__progress-bar syllabus-panel__progress-bar--always">
                    <div
                      className="syllabus-panel__progress-fill"
                      style={{ width: `${(completedSet.size / lessons.length) * 100}%` }}
                    />
                  </div>
                )}

                {/* Nested lessons when expanded */}
                {isExpanded && lessons.length > 0 && (
                  <div className="syllabus-panel__nested-lessons">
                    <ul className="syllabus-panel__list" role="list">
                      {lessons.map((lesson, idx) => {
                        const lessonActive = idx === prog.lessonIndex && syllabusView === 'lesson' && !standaloneKey && isActive;
                        const isCompleted = completedSet.has(idx);
                        return (
                          <li key={idx}>
                            <button
                              className={`syllabus-panel__lesson-btn
                                ${lessonActive ? 'syllabus-panel__lesson-btn--active' : ''}
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
                                  {getLessonTitle(lesson, s.langId)}
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
              </div>
            );
          })}

          {/* Divider between syllabi and standalone readers */}
          {filteredSyllabi.length > 0 && filteredStandalone.length > 0 && (
            <div className="syllabus-panel__divider" />
          )}

          {/* Standalone readers: series groups */}
          {Object.entries(seriesGroups).map(([sId, episodes]) => {
            const firstEp = episodes[0];
            const baseTopic = (firstEp.topic || '').replace(/^Continuation:\s*/i, '');
            const isExpanded = expandedSeries[sId] ?? false;
            return (
              <div key={`series-${sId}`} className="syllabus-panel__item-group">
                <button
                  className="syllabus-panel__item-btn syllabus-panel__series-header"
                  onClick={() => setExpandedSeries(prev => ({ ...prev, [sId]: !isExpanded }))}
                >
                  <span className="syllabus-panel__item-text">
                    <span className="syllabus-panel__item-title text-chinese">
                      {firstEp.titleZh || generatedReaders[firstEp.key]?.titleZh || baseTopic}
                    </span>
                    <span className="syllabus-panel__item-meta text-muted">
                      {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
                    </span>
                  </span>
                  <span className="syllabus-panel__caret-btn">{isExpanded ? '▾' : '▸'}</span>
                </button>
                {isExpanded && (
                  <ul className="syllabus-panel__nested-lessons syllabus-panel__list" role="list">
                    {episodes.map(r => (
                      <li key={r.key}>
                        <div className={`syllabus-panel__lesson-btn syllabus-panel__standalone-item ${standaloneKey === r.key ? 'syllabus-panel__lesson-btn--active' : ''}`}>
                          <button
                            className="syllabus-panel__standalone-select"
                            onClick={() => onSelectStandalone?.(r.key)}
                            disabled={loading}
                          >
                            <span className="syllabus-panel__lesson-text">
                              <span className="syllabus-panel__lesson-num">{r.episodeNumber || '·'}</span>
                              <span className="syllabus-panel__lesson-zh text-chinese">
                                {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                              </span>
                            </span>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                            onClick={() => act.archiveStandaloneReader(r.key)}
                            aria-label="Archive reader"
                            title="Archive this reader"
                          >⊟</button>
                          <button
                            className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                            onClick={() => requestDelete(r.key, r.topic, 'standalone')}
                            aria-label="Delete reader"
                            title="Delete this reader"
                          >×</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {/* Standalone readers: ungrouped */}
          {ungrouped.map(r => (
            <div key={r.key} className="syllabus-panel__item-group">
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
                      {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
                      {r.isDemo && <span className="text-muted" style={{ fontSize: 'var(--text-xs)', marginLeft: '0.35em' }}>(sample)</span>}
                    </span>
                    <span className="syllabus-panel__lesson-en text-muted">
                      {r.titleEn || generatedReaders[r.key]?.titleEn || `${getLang(r.langId).proficiency.name} ${r.level}`}
                    </span>
                  </span>
                </button>
                {!r.isDemo && (
                  <button
                    className="btn btn-ghost btn-sm syllabus-panel__archive-btn"
                    onClick={() => act.archiveStandaloneReader(r.key)}
                    aria-label="Archive reader"
                    title="Archive this reader"
                  >⊟</button>
                )}
                {!r.isDemo && (
                  <button
                    className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                    onClick={() => requestDelete(r.key, r.topic, 'standalone')}
                    aria-label="Delete reader"
                    title="Delete this reader"
                  >×</button>
                )}
              </div>
            </div>
          ))}

          {/* Archived section (inside content list so it scrolls) */}
          {archivedCount > 0 && (
            <div className="syllabus-panel__archived-section">
              <button
                className="syllabus-panel__archived-header"
                onClick={() => setArchivedOpen(o => !o)}
                aria-expanded={archivedOpen}
                aria-controls="archived-items-list"
              >
                <span className="form-label text-muted">Archived ({archivedCount})</span>
                <span className="syllabus-panel__caret-btn">{archivedOpen ? '▾' : '▸'}</span>
              </button>
              {archivedOpen && (
                <ul id="archived-items-list" className="syllabus-panel__list" role="list">
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
                        >↩</button>
                        <button
                          className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                          onClick={() => requestDelete(s.id, s.topic, 'syllabus')}
                          aria-label="Delete syllabus"
                          title="Delete permanently"
                        >×</button>
                      </div>
                    </li>
                  ))}
                  {archivedStandalone.map(r => (
                    <li key={r.key}>
                      <div className="syllabus-panel__lesson-btn syllabus-panel__standalone-item syllabus-panel__archived-item">
                        <span className="syllabus-panel__lesson-text">
                          <span className="syllabus-panel__lesson-zh text-chinese">
                            {r.titleZh || generatedReaders[r.key]?.titleZh || r.topic}
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
                        >↩</button>
                        <button
                          className="btn btn-ghost btn-sm syllabus-panel__delete-btn"
                          onClick={() => requestDelete(r.key, r.topic, 'standalone')}
                          aria-label="Delete reader"
                          title="Delete permanently"
                        >×</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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
          onClick={onShowFlashcards}
          title="Flashcard review"
        >
          ⬡ Cards
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onShowStats}
          title="Learning stats"
        >
          ▦ Stats
        </button>
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
