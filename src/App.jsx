import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { actions } from './context/actions';
import ApiKeySetup from './components/ApiKeySetup';
import SyllabusPanel from './components/SyllabusPanel';
import ReaderView from './components/ReaderView';
import Settings from './components/Settings';
import LoadingIndicator from './components/LoadingIndicator';
import './App.css';

// ── Notification toast ─────────────────────────────────────────

function Notification() {
  const { state } = useApp();
  const { notification } = state;
  if (!notification) return null;
  return (
    <div className={`app-notification app-notification--${notification.type} fade-in`}>
      <span>{notification.type === 'success' ? '✓' : '⚠'}</span>
      <span>{notification.message}</span>
    </div>
  );
}

// ── App shell ──────────────────────────────────────────────────

function AppShell() {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { apiKey, syllabi, syllabusProgress } = state;

  const [showSettings, setShowSettings]     = useState(false);
  const [sidebarOpen,  setSidebarOpen]      = useState(false);
  const [standaloneKey, setStandaloneKey]   = useState(null);
  const [activeSyllabusId, setActiveSyllabusId] = useState(() => syllabi[0]?.id || null);

  // Keep activeSyllabusId valid if the active syllabus is removed
  useEffect(() => {
    if (activeSyllabusId && !syllabi.find(s => s.id === activeSyllabusId)) {
      setActiveSyllabusId(syllabi[0]?.id || null);
    }
  }, [syllabi, activeSyllabusId]);

  // Callback for TopicForm to surface a newly-generated standalone reader
  function onStandaloneGenerated(lessonKey) {
    setStandaloneKey(lessonKey);
  }

  // Derive active lesson info from per-syllabus progress
  const currentSyllabus = syllabi.find(s => s.id === activeSyllabusId) || null;
  const progress        = syllabusProgress[activeSyllabusId] || { lessonIndex: 0, completedLessons: [] };
  const lessonIndex     = progress.lessonIndex;
  const completedSet    = new Set(progress.completedLessons);
  const lessons         = currentSyllabus?.lessons || [];
  const activeMeta      = lessons[lessonIndex] || null;
  const activeLessonKey = standaloneKey
    ? standaloneKey
    : currentSyllabus
      ? `lesson_${activeSyllabusId}_${lessonIndex}`
      : null;

  function handleSelectLesson(idx) {
    setStandaloneKey(null);
    setSidebarOpen(false);
  }

  function handleMarkComplete() {
    act.markLessonComplete(activeSyllabusId, lessonIndex);
    if (currentSyllabus && lessonIndex < lessons.length - 1) {
      act.setLessonIndex(activeSyllabusId, lessonIndex + 1);
    }
  }

  function handleUnmarkComplete() {
    act.unmarkLessonComplete(activeSyllabusId, lessonIndex);
  }

  function handleNewSyllabus(newSyllabusId) {
    setActiveSyllabusId(newSyllabusId);
    setStandaloneKey(null);
  }

  function handleSwitchSyllabus(id) {
    setActiveSyllabusId(id);
    setStandaloneKey(null);
  }

  function handleSelectStandalone(key) {
    setStandaloneKey(key);
    setSidebarOpen(false);
  }

  // Called at the START of standalone generation so lessonMeta clears immediately
  function handleStandaloneGenerating() {
    setStandaloneKey('standalone_pending');
  }

  if (!state.fsInitialized) {
    return (
      <div className="app-fs-init">
        <LoadingIndicator message="Loading…" />
      </div>
    );
  }

  if (!apiKey) return <ApiKeySetup />;

  return (
    <div className="app-layout">
      {/* ─ Mobile header ─────────────────────────────────── */}
      <header className="app-mobile-header">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <span className="app-mobile-title font-display">读书 Graded Reader</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSettings(true)} aria-label="Settings">
          ⚙
        </button>
      </header>

      {/* ─ Sidebar overlay (mobile) ──────────────────────── */}
      {sidebarOpen && (
        <div className="app-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─ Left sidebar ──────────────────────────────────── */}
      <div className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`}>
        <SyllabusPanel
          activeSyllabusId={activeSyllabusId}
          standaloneKey={standaloneKey}
          onSelectLesson={handleSelectLesson}
          onNewSyllabus={handleNewSyllabus}
          onShowSettings={() => setShowSettings(true)}
          onStandaloneGenerated={onStandaloneGenerated}
          onSwitchSyllabus={handleSwitchSyllabus}
          onSelectStandalone={handleSelectStandalone}
          onStandaloneGenerating={handleStandaloneGenerating}
        />
      </div>

      {/* ─ Main content ──────────────────────────────────── */}
      <main className="app-main">
        <ReaderView
          lessonKey={activeLessonKey}
          lessonMeta={standaloneKey ? null : (activeMeta
            ? { ...activeMeta, level: currentSyllabus?.level, lesson_number: lessonIndex + 1 }
            : null)}
          onMarkComplete={handleMarkComplete}
          onUnmarkComplete={handleUnmarkComplete}
          isCompleted={completedSet.has(lessonIndex)}
        />
      </main>

      {/* ─ Settings modal ────────────────────────────────── */}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}

      {/* ─ Toast notification ────────────────────────────── */}
      <Notification />
    </div>
  );
}

// ── Root ────────────────────────────────────────────────────────

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
