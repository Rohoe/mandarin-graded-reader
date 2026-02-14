import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { generateSyllabus, generateReader } from '../lib/api';
import { parseReaderResponse } from '../lib/parser';
import './TopicForm.css';

const HSK_LEVELS = [
  { value: 1, label: 'HSK 1', desc: 'Absolute beginner (~150 words)' },
  { value: 2, label: 'HSK 2', desc: 'Elementary (~300 words)' },
  { value: 3, label: 'HSK 3', desc: 'Pre-intermediate (~600 words)' },
  { value: 4, label: 'HSK 4', desc: 'Intermediate (~1,200 words)' },
  { value: 5, label: 'HSK 5', desc: 'Upper-intermediate (~2,500 words)' },
  { value: 6, label: 'HSK 6', desc: 'Advanced (~5,000 words)' },
];

export default function TopicForm({ onNewSyllabus, onStandaloneGenerated }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);

  const [topic, setTopic]       = useState('');
  const [level, setLevel]       = useState(3);
  const [mode, setMode]         = useState('syllabus'); // 'syllabus' | 'standalone'

  async function handleGenerateSyllabus(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    act.setLoading(true, '正在生成课程大纲…');
    act.clearError();
    try {
      const lessons = await generateSyllabus(state.apiKey, topic.trim(), level);
      act.setSyllabus({ topic: topic.trim(), level, lessons });
      act.notify('success', `Syllabus generated: ${lessons.length} lessons on "${topic}"`);
      onNewSyllabus?.();
    } catch (err) {
      act.setError(err.message);
    } finally {
      act.setLoading(false);
    }
  }

  async function handleGenerateStandalone(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    act.setLoading(true, '正在生成阅读材料…');
    act.clearError();
    try {
      const raw = await generateReader(state.apiKey, topic.trim(), level, state.learnedVocabulary);
      const parsed = parseReaderResponse(raw);
      const lessonKey = `standalone_${Date.now()}`;
      act.setReader(lessonKey, { ...parsed, topic: topic.trim(), level, lessonKey, isStandalone: true });
      if (parsed.ankiJson?.length > 0) {
        act.addVocabulary(parsed.ankiJson.map(c => ({
          chinese: c.chinese, pinyin: c.pinyin, english: c.english,
        })));
      }
      onStandaloneGenerated?.(lessonKey);
    } catch (err) {
      act.setError(err.message);
    } finally {
      act.setLoading(false);
    }
  }

  const onSubmit = mode === 'syllabus' ? handleGenerateSyllabus : handleGenerateStandalone;

  return (
    <form className="topic-form" onSubmit={onSubmit}>
      <div className="topic-form__modes">
        <button
          type="button"
          className={`topic-form__mode-btn ${mode === 'syllabus' ? 'active' : ''}`}
          onClick={() => setMode('syllabus')}
        >
          Course Syllabus
        </button>
        <button
          type="button"
          className={`topic-form__mode-btn ${mode === 'standalone' ? 'active' : ''}`}
          onClick={() => setMode('standalone')}
        >
          Single Reader
        </button>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="topic-input">Topic</label>
        <input
          id="topic-input"
          type="text"
          className="form-input"
          placeholder={mode === 'syllabus'
            ? 'e.g. Chinese business culture, Traditional festivals…'
            : 'e.g. A day at a Beijing market…'}
          value={topic}
          onChange={e => setTopic(e.target.value)}
          disabled={state.loading}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="level-select">HSK Level</label>
        <select
          id="level-select"
          className="form-select"
          value={level}
          onChange={e => setLevel(Number(e.target.value))}
          disabled={state.loading}
        >
          {HSK_LEVELS.map(l => (
            <option key={l.value} value={l.value}>
              {l.label} — {l.desc}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-lg topic-form__submit"
        disabled={state.loading || !topic.trim()}
      >
        {state.loading
          ? '生成中…'
          : mode === 'syllabus'
            ? 'Generate Syllabus'
            : 'Generate Reader'}
      </button>

      {mode === 'syllabus' && state.currentSyllabus && (
        <button
          type="button"
          className="btn btn-ghost btn-sm topic-form__clear"
          onClick={() => act.clearSyllabus()}
          disabled={state.loading}
        >
          Start new syllabus
        </button>
      )}
    </form>
  );
}
