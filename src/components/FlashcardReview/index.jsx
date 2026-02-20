import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { actions } from '../../context/actions';
import { getAllLanguages } from '../../lib/languages';
import { calculateSRS, sortCardsBySRS, getMasteryLevel } from './srs';
import './FlashcardReview.css';

export default function FlashcardReview({ onClose }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const languages = getAllLanguages();

  // Detect which languages have vocab
  const availableLangs = useMemo(() => {
    const langIds = new Set(
      Object.values(state.learnedVocabulary).map(d => d.langId || 'zh')
    );
    return languages.filter(l => langIds.has(l.id));
  }, [state.learnedVocabulary, languages]);

  const [langFilter, setLangFilter] = useState(() =>
    availableLangs.length > 0 ? availableLangs[0].id : 'zh'
  );
  const [reviewMode, setReviewMode] = useState('due'); // 'due' | 'all'

  // Build card list from learnedVocabulary
  const allCards = useMemo(() => {
    return Object.entries(state.learnedVocabulary).map(([word, data]) => ({
      target: word,
      romanization: data.romanization || data.pinyin || '',
      translation: data.translation || data.english || '',
      langId: data.langId || 'zh',
      // SRS fields (defaults for legacy words without them)
      interval: data.interval ?? 0,
      ease: data.ease ?? 2.5,
      nextReview: data.nextReview ?? null,
      reviewCount: data.reviewCount ?? 0,
      lapses: data.lapses ?? 0,
    }));
  }, [state.learnedVocabulary]);

  const { sortedCards, dueCount, newCount } = useMemo(() => {
    const langCards = allCards.filter(c => c.langId === langFilter);
    const { due, newCards, sorted } = sortCardsBySRS(langCards);

    if (reviewMode === 'due') {
      // Show due + new cards only
      const dueAndNew = [...due, ...newCards];
      return { sortedCards: dueAndNew, dueCount: due.length, newCount: newCards.length };
    }
    return { sortedCards: sorted, dueCount: due.length, newCount: newCards.length };
  }, [allCards, langFilter, reviewMode]);

  // State machine: 'front' | 'back' | 'done'
  const [phase, setPhase] = useState('front');
  const [cardIdx, setCardIdx] = useState(0);
  const [results, setResults] = useState({ got: 0, almost: 0, missed: 0 });

  // Reset card position when filter/mode changes
  useEffect(() => {
    setCardIdx(0);
    setResults({ got: 0, almost: 0, missed: 0 });
    setPhase('front');
  }, [langFilter, reviewMode]);

  const currentCard = sortedCards[cardIdx] || null;
  const totalCards = sortedCards.length;

  const handleReveal = useCallback(() => setPhase('back'), []);

  const handleJudge = useCallback((judgment) => {
    if (!currentCard) return;

    act.logActivity('flashcard_reviewed', { word: currentCard.target, judgment });

    // Calculate and persist SRS update
    const srsUpdate = calculateSRS(judgment, currentCard);
    act.updateVocabSRS(currentCard.target, srsUpdate);

    setResults(prev => ({ ...prev, [judgment]: prev[judgment] + 1 }));
    if (cardIdx + 1 >= totalCards) {
      setPhase('done');
    } else {
      setCardIdx(i => i + 1);
      setPhase('front');
    }
  }, [cardIdx, totalCards, currentCard, act]);

  const handleRestart = useCallback(() => {
    setCardIdx(0);
    setResults({ got: 0, almost: 0, missed: 0 });
    setPhase('front');
  }, []);

  // Close on Escape, keyboard navigation for flashcards
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (phase === 'front' && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleReveal();
      } else if (phase === 'back') {
        if (e.key === '1') handleJudge('got');
        else if (e.key === '2') handleJudge('almost');
        else if (e.key === '3') handleJudge('missed');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, phase, handleReveal, handleJudge]);

  // Mastery stats for done screen
  const masteryStats = useMemo(() => {
    const langCards = allCards.filter(c => c.langId === langFilter);
    let mastered = 0, learning = 0, newCount = 0;
    for (const card of langCards) {
      const level = getMasteryLevel(card);
      if (level === 'mastered') mastered++;
      else if (level === 'learning') learning++;
      else newCount++;
    }

    // Compute next review forecast
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const in3Days = new Date(now);
    in3Days.setDate(in3Days.getDate() + 3);

    let dueTomorrow = 0, dueIn3Days = 0;
    for (const card of langCards) {
      if (!card.nextReview) continue;
      const nr = new Date(card.nextReview).getTime();
      if (nr > now.getTime() && nr <= tomorrow.getTime()) dueTomorrow++;
      if (nr > now.getTime() && nr <= in3Days.getTime()) dueIn3Days++;
    }

    return { mastered, learning, new: newCount, total: langCards.length, dueTomorrow, dueIn3Days };
  }, [allCards, langFilter]);

  if (allCards.length === 0) {
    return (
      <div className="flashcard-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
        <div className="flashcard-modal card card-padded fade-in">
          <div className="flashcard-modal__header">
            <h2 className="font-display flashcard-modal__title">Flashcard Review</h2>
            <button className="btn btn-ghost btn-sm flashcard-modal__close" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            No vocabulary learned yet. Complete some readers to build your flashcard deck.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flashcard-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="flashcard-modal card card-padded fade-in">
        <div className="flashcard-modal__header">
          <h2 className="font-display flashcard-modal__title">Flashcard Review</h2>
          <button className="btn btn-ghost btn-sm flashcard-modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Language filter pills */}
        {availableLangs.length > 1 && (
          <div className="flashcard-lang-pills">
            {availableLangs.map(l => (
              <button
                key={l.id}
                className={`flashcard-lang-pill ${langFilter === l.id ? 'flashcard-lang-pill--active' : ''}`}
                onClick={() => setLangFilter(l.id)}
              >
                {l.nameNative}
              </button>
            ))}
          </div>
        )}

        {/* Session stats + mode toggle */}
        {phase !== 'done' && (
          <div className="flashcard-session-stats">
            <span className="flashcard-stat-badge flashcard-stat-badge--due">{dueCount} due</span>
            <span className="flashcard-stat-badge flashcard-stat-badge--new">{newCount} new</span>
            <span className="flashcard-stat-badge flashcard-stat-badge--total">{allCards.filter(c => c.langId === langFilter).length} total</span>
            {availableLangs.length === 1 && <span className="flashcard-stat-badge">{availableLangs[0].nameNative}</span>}
            <button
              className={`flashcard-mode-toggle ${reviewMode === 'all' ? 'flashcard-mode-toggle--active' : ''}`}
              onClick={() => setReviewMode(m => m === 'due' ? 'all' : 'due')}
              title={reviewMode === 'due' ? 'Showing due + new cards. Click for all.' : 'Showing all cards. Click for due only.'}
            >
              {reviewMode === 'due' ? '⚡ Due only' : '✦ All cards'}
            </button>
          </div>
        )}

        {totalCards === 0 ? (
          <div className="flashcard-done">
            <h3 className="font-display flashcard-done__title">All caught up!</h3>
            <p className="text-muted">No cards due for review right now.</p>
            {masteryStats.dueTomorrow > 0 && (
              <p className="text-muted flashcard-forecast">
                {masteryStats.dueTomorrow} card{masteryStats.dueTomorrow !== 1 ? 's' : ''} due tomorrow
              </p>
            )}
            <div className="flashcard-done__actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setReviewMode('all')}>Review all cards</button>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : phase === 'done' ? (
          /* Done screen */
          <div className="flashcard-done">
            <h3 className="font-display flashcard-done__title">Session Complete</h3>
            <div className="flashcard-done__stats">
              <span className="flashcard-done__stat flashcard-done__stat--got">{results.got} correct</span>
              <span className="flashcard-done__stat flashcard-done__stat--almost">{results.almost} almost</span>
              <span className="flashcard-done__stat flashcard-done__stat--missed">{results.missed} missed</span>
            </div>
            <p className="text-muted">{totalCards} card{totalCards !== 1 ? 's' : ''} reviewed</p>

            {/* Mastery breakdown */}
            <div className="flashcard-mastery">
              <div className="flashcard-mastery__bar">
                {masteryStats.mastered > 0 && (
                  <div
                    className="flashcard-mastery__segment flashcard-mastery__segment--mastered"
                    style={{ flex: masteryStats.mastered }}
                    title={`${masteryStats.mastered} mastered`}
                  />
                )}
                {masteryStats.learning > 0 && (
                  <div
                    className="flashcard-mastery__segment flashcard-mastery__segment--learning"
                    style={{ flex: masteryStats.learning }}
                    title={`${masteryStats.learning} learning`}
                  />
                )}
                {masteryStats.new > 0 && (
                  <div
                    className="flashcard-mastery__segment flashcard-mastery__segment--new"
                    style={{ flex: masteryStats.new }}
                    title={`${masteryStats.new} new`}
                  />
                )}
              </div>
              <div className="flashcard-mastery__labels">
                <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--mastered"></span>{masteryStats.mastered} mastered</span>
                <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--learning"></span>{masteryStats.learning} learning</span>
                <span className="flashcard-mastery__label"><span className="flashcard-dot flashcard-dot--new"></span>{masteryStats.new} new</span>
              </div>
            </div>

            {/* Next review forecast */}
            {(masteryStats.dueTomorrow > 0 || masteryStats.dueIn3Days > 0) && (
              <p className="text-muted flashcard-forecast">
                {masteryStats.dueTomorrow > 0 && `${masteryStats.dueTomorrow} due tomorrow`}
                {masteryStats.dueTomorrow > 0 && masteryStats.dueIn3Days > masteryStats.dueTomorrow && ', '}
                {masteryStats.dueIn3Days > masteryStats.dueTomorrow && `${masteryStats.dueIn3Days} in 3 days`}
              </p>
            )}

            <div className="flashcard-done__actions">
              <button className="btn btn-secondary btn-sm" onClick={handleRestart}>Review again</button>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          /* Card view */
          <>
            <div className="flashcard-progress text-muted">
              {cardIdx + 1} / {totalCards}
            </div>

            <div className="flashcard-card" data-lang={currentCard.langId}>
              <div className="flashcard-card__front">
                <span className="flashcard-card__target text-target">{currentCard.target}</span>
              </div>

              {phase === 'back' && (
                <div className="flashcard-card__back">
                  {currentCard.romanization && (
                    <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                  )}
                  <span className="flashcard-card__translation">{currentCard.translation}</span>
                </div>
              )}
            </div>

            {phase === 'front' ? (
              <div className="flashcard-actions">
                <button className="btn btn-secondary" onClick={handleReveal}>Show Answer</button>
              </div>
            ) : (
              <div className="flashcard-actions">
                <button className="btn btn-sm flashcard-btn--got" onClick={() => handleJudge('got')}>Got it</button>
                <button className="btn btn-sm flashcard-btn--almost" onClick={() => handleJudge('almost')}>Almost</button>
                <button className="btn btn-sm flashcard-btn--missed" onClick={() => handleJudge('missed')}>Missed it</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
