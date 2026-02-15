import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { actions } from './context/actions';
import { generateReader, extendSyllabus } from './lib/api';
import { parseReaderResponse } from './lib/parser';
import ApiKeySetup from './components/ApiKeySetup';
import SyllabusPanel from './components/SyllabusPanel';
import SyllabusHome from './components/SyllabusHome';
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
  const [syllabusView, setSyllabusView]     = useState('home'); // 'home' | 'lesson'

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // Keep activeSyllabusId valid if the active syllabus is removed
  useEffect(() => {
    if (activeSyllabusId && !syllabi.find(s => s.id === activeSyllabusId)) {
      setActiveSyllabusId(syllabi[0]?.id || null);
      setSyllabusView('home');
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
    : (activeSyllabusId && syllabusView === 'lesson')
      ? `lesson_${activeSyllabusId}_${lessonIndex}`
      : null;

  function handleSelectLesson(idx) {
    act.setLessonIndex(activeSyllabusId, idx);
    setStandaloneKey(null);
    setSyllabusView('lesson');
    setSidebarOpen(false);
  }

  function handleGoSyllabusHome() {
    setSyllabusView('home');
    setStandaloneKey(null);
  }

  function handleDeleteSyllabus(id) {
    act.removeSyllabus(id);
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
    setSyllabusView('home');
  }

  function handleSwitchSyllabus(id) {
    setActiveSyllabusId(id);
    setStandaloneKey(null);
    setSyllabusView('home');
  }

  function handleSelectStandalone(key) {
    setStandaloneKey(key);
    setSidebarOpen(false);
  }

  // Called at the START of standalone generation so lessonMeta clears immediately
  function handleStandaloneGenerating() {
    setStandaloneKey('standalone_pending');
  }

  async function handleContinueStory({ story, topic, level, langId }) {
    const newKey = `standalone_${Date.now()}`;
    const continuationTopic = `Continuation: ${topic}`;
    act.addStandaloneReader({ key: newKey, topic: continuationTopic, level, langId, createdAt: Date.now() });
    act.startPendingReader(newKey);
    setStandaloneKey(newKey);
    setSidebarOpen(false);
    try {
      const raw    = await generateReader(state.apiKey, continuationTopic, level, state.learnedVocabulary, 1200, state.maxTokens, story, langId);
      const parsed = parseReaderResponse(raw, langId);
      act.setReader(newKey, { ...parsed, topic: continuationTopic, level, langId, lessonKey: newKey });
      if (parsed.ankiJson?.length > 0) {
        act.addVocabulary(parsed.ankiJson.map(c => ({ chinese: c.chinese, korean: c.korean, pinyin: c.pinyin, romanization: c.romanization, english: c.english, langId })));
      }
      act.notify('success', 'Continuation reader ready!');
    } catch (err) {
      act.removeStandaloneReader(newKey);
      act.notify('error', `Continuation failed: ${err.message.slice(0, 80)}`);
    } finally {
      act.clearPendingReader(newKey);
    }
  }

  async function handleExtendSyllabus(additionalCount) {
    if (!activeSyllabusId || !currentSyllabus) return;
    act.setLoading(true, '正在扩展课程大纲…');
    try {
      const { lessons: newLessons } = await extendSyllabus(
        state.apiKey,
        currentSyllabus.topic,
        currentSyllabus.level,
        currentSyllabus.lessons,
        additionalCount,
        currentSyllabus.langId,
      );
      act.extendSyllabusLessons(activeSyllabusId, newLessons);
      act.notify('success', `Added ${newLessons.length} new lesson${newLessons.length !== 1 ? 's' : ''}`);
    } catch (err) {
      act.notify('error', `Could not extend syllabus: ${err.message.slice(0, 80)}`);
    } finally {
      act.setLoading(false, '');
    }
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
        <span className="app-mobile-title font-display">漫读</span>
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
          syllabusView={syllabusView}
          onSelectLesson={handleSelectLesson}
          onNewSyllabus={handleNewSyllabus}
          onShowSettings={() => setShowSettings(true)}
          onStandaloneGenerated={onStandaloneGenerated}
          onSwitchSyllabus={handleSwitchSyllabus}
          onSelectStandalone={handleSelectStandalone}
          onStandaloneGenerating={handleStandaloneGenerating}
          onGoSyllabusHome={handleGoSyllabusHome}
        />
      </div>

      {/* ─ Main content ──────────────────────────────────── */}
      <main className="app-main">
        {activeSyllabusId && syllabusView === 'home' && !standaloneKey
          ? (
            <SyllabusHome
              syllabus={currentSyllabus}
              progress={progress}
              onSelectLesson={handleSelectLesson}
              onDelete={() => handleDeleteSyllabus(activeSyllabusId)}
              onArchive={() => {
                act.archiveSyllabus(activeSyllabusId);
                const nextActive = state.syllabi.find(s => !s.archived && s.id !== activeSyllabusId);
                setActiveSyllabusId(nextActive?.id || null);
                setSyllabusView('home');
              }}
              onExtend={handleExtendSyllabus}
            />
          )
          : (
            <ReaderView
              lessonKey={activeLessonKey}
              lessonMeta={standaloneKey ? null : (activeMeta
                ? { ...activeMeta, level: currentSyllabus?.level, langId: currentSyllabus?.langId, lesson_number: lessonIndex + 1 }
                : null)}
              onMarkComplete={handleMarkComplete}
              onUnmarkComplete={handleUnmarkComplete}
              isCompleted={completedSet.has(lessonIndex)}
              onContinueStory={handleContinueStory}
              onOpenSidebar={() => setSidebarOpen(true)}
            />
          )
        }
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
