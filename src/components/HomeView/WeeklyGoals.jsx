import { useState, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '../../context/useAppSelector';
import { actions } from '../../context/actions';
import { computeWeeklyProgress } from '../../lib/stats';
import { useT } from '../../i18n';
import { Book, Layers, Pencil, Clock } from 'lucide-react';

const GOAL_ICONS = {
  lessons: Book,
  flashcards: Layers,
  quizzes: Pencil,
  minutes: Clock,
};

const GOAL_KEYS = [
  { key: 'lessons', labelKey: 'home.lessonsGoal' },
  { key: 'flashcards', labelKey: 'home.flashcardsGoal' },
  { key: 'quizzes', labelKey: 'home.quizzesGoal' },
  { key: 'minutes', labelKey: 'home.minutesGoal' },
];

const PROGRESS_KEYS = {
  lessons: 'lessonsCompleted',
  flashcards: 'flashcardReviews',
  quizzes: 'quizzesCompleted',
  minutes: 'minutesStudied',
};

export default function WeeklyGoals() {
  const t = useT();
  const dispatch = useAppDispatch();
  const act = useMemo(() => actions(dispatch), [dispatch]);
  const { weeklyGoals, learningActivity, readingTimeLog } = useAppSelector(s => ({
    weeklyGoals: s.weeklyGoals,
    learningActivity: s.learningActivity,
    readingTimeLog: s.readingTimeLog,
  }));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(weeklyGoals);

  const progress = computeWeeklyProgress(learningActivity, readingTimeLog);

  function handleSave() {
    act.setWeeklyGoals(draft);
    setEditing(false);
  }

  return (
    <div className="home-goals">
      <div className="home-goals__header">
        <h2 className="home-goals__title font-display">{t('home.weeklyGoals')}</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            if (editing) handleSave();
            else { setDraft(weeklyGoals); setEditing(true); }
          }}
        >
          {editing ? t('common.save') || 'Save' : t('home.editGoals')}
        </button>
      </div>
      <div className="home-goals__list">
        {GOAL_KEYS.map(({ key, labelKey }) => {
          const IconComponent = GOAL_ICONS[key];
          const current = progress[PROGRESS_KEYS[key]] || 0;
          const target = (editing ? draft : weeklyGoals)[key] || 1;
          const pct = Math.min(100, Math.round((current / target) * 100));
          return (
            <div key={key} className="home-goals__row">
              <span className="home-goals__icon"><IconComponent size={18} /></span>
              <div className="home-goals__info">
                <span className="home-goals__label">{t(labelKey)}</span>
                <div className="home-goals__bar">
                  <div
                    className={`home-goals__fill ${pct >= 100 ? 'home-goals__fill--done' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {editing ? (
                <input
                  type="number"
                  className="home-goals__input"
                  min={1}
                  value={draft[key]}
                  onChange={e => setDraft({ ...draft, [key]: Math.max(1, Number(e.target.value) || 1) })}
                />
              ) : (
                <span className={`home-goals__count ${pct >= 100 ? 'home-goals__count--done' : ''}`}>
                  {current}/{target}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
