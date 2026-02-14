import { useState } from 'react';
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
  const { apiKey, currentSyllabus, lessonIndex } = state;

  const [showSettings, setShowSettings]     = useState(false);
  const [sidebarOpen,  setSidebarOpen]      = useState(false);
  const [completedSet, setCompletedSet]     = useState(new Set());
  const [standaloneKey, setStandaloneKey]   = useState(null);

  // Callback for TopicForm to surface a newly-generated standalone reader
  function onStandaloneGenerated(lessonKey) {
    setStandaloneKey(lessonKey);
  }

  // Derive active lesson info
  const lessons         = currentSyllabus?.lessons || [];
  const activeMeta      = lessons[lessonIndex] || null;
  const activeLessonKey = standaloneKey
    ? standaloneKey
    : currentSyllabus
      ? `lesson_${currentSyllabus.topic}_${currentSyllabus.level}_${lessonIndex}`
      : null;

  function handleSelectLesson(idx) {
    setStandaloneKey(null);   // exit standalone mode
    act.setLessonIndex(idx);
    setSidebarOpen(false);
  }

  function handleMarkComplete() {
    setCompletedSet(prev => { const s = new Set(prev); s.add(lessonIndex); return s; });
    if (currentSyllabus && lessonIndex < lessons.length - 1) {
      act.setLessonIndex(lessonIndex + 1);
    }
  }

  function handleNewSyllabus() {
    setStandaloneKey(null);
    setCompletedSet(new Set());
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
          completedLessons={completedSet}
          onSelectLesson={handleSelectLesson}
          onNewSyllabus={handleNewSyllabus}
          onShowSettings={() => setShowSettings(true)}
          onStandaloneGenerated={onStandaloneGenerated}
        />
      </div>

      {/* ─ Main content ──────────────────────────────────── */}
      <main className="app-main">
        <ReaderView
          lessonKey={activeLessonKey}
          lessonMeta={standaloneKey ? null : (activeMeta
            ? { ...activeMeta, level: currentSyllabus?.level }
            : null)}
          onMarkComplete={handleMarkComplete}
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
