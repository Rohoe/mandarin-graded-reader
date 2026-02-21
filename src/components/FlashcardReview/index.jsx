import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { actions } from '../../context/actions';
import { getAllLanguages, getLang } from '../../lib/languages';
import { loadFlashcardSession, saveFlashcardSession } from '../../lib/storage';
import { useRomanization } from '../../hooks/useRomanization';
import { calculateSRS, getMasteryLevel, buildDailySession } from './srs';
import './FlashcardReview.css';

function formatInterval(days) {
  if (days <= 0) return '<1d';
  if (days < 14) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

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

  // Romanization for flashcard front
  const langConfig = getLang(langFilter);
  const { renderChars: renderRomanization, romanizer } = useRomanization(langFilter, langConfig, state.romanizationOn);

  // Build card list from learnedVocabulary
  const allCards = useMemo(() => {
    return Object.entries(state.learnedVocabulary).map(([word, data]) => ({
      target: word,
      romanization: data.romanization || data.pinyin || '',
      translation: data.translation || data.english || '',
      langId: data.langId || 'zh',
      exampleSentence: data.exampleSentence || '',
      // Forward SRS fields
      interval: data.interval ?? 0,
      ease: data.ease ?? 2.5,
      nextReview: data.nextReview ?? null,
      reviewCount: data.reviewCount ?? 0,
      lapses: data.lapses ?? 0,
      // Reverse SRS fields
      reverseInterval: data.reverseInterval ?? 0,
      reverseEase: data.reverseEase ?? 2.5,
      reverseNextReview: data.reverseNextReview ?? null,
      reverseReviewCount: data.reverseReviewCount ?? 0,
      reverseLapses: data.reverseLapses ?? 0,
    }));
  }, [state.learnedVocabulary]);

  const langCards = useMemo(() => allCards.filter(c => c.langId === langFilter), [allCards, langFilter]);

  // Session management (per-language persistence)
  const [session, setSession] = useState(() => {
    const saved = loadFlashcardSession(langFilter);
    return buildDailySession(langCards, state.newCardsPerDay, saved, langFilter);
  });

  // Rebuild session when language filter changes
  useEffect(() => {
    const saved = loadFlashcardSession(langFilter);
    const newSession = buildDailySession(langCards, state.newCardsPerDay, saved, langFilter);
    setSession(newSession);
    setHistory([]);
    setPhase(newSession.index >= newSession.cardKeys.length ? 'done' : 'front');
  }, [langFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist session to localStorage on change (per-language key)
  useEffect(() => {
    saveFlashcardSession(session, session.langId);
  }, [session]);

  // State machine: 'front' | 'back' | 'done'
  const [phase, setPhase] = useState(() =>
    session.index >= session.cardKeys.length ? 'done' : 'front'
  );
  const [history, setHistory] = useState([]);

  // Current card data
  const currentCardKey = session.cardKeys[session.index] || null;
  const currentDirection = session.cardDirections[session.index] || 'forward';
  const currentCard = useMemo(() => {
    if (!currentCardKey) return null;
    return langCards.find(c => c.target === currentCardKey) || null;
  }, [currentCardKey, langCards]);

  const totalCards = session.cardKeys.length;
  const cardIdx = session.index;

  // Count due and new for display
  const { dueCount, newCount } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nowMs = now.getTime();
    let due = 0, nc = 0;
    for (const card of langCards) {
      const rc = card.reviewCount ?? 0;
      const nr = card.nextReview ? new Date(card.nextReview).getTime() : null;
      if (rc === 0 && !nr) nc++;
      else if (!nr || nr <= nowMs) due++;
    }
    return { dueCount: due, newCount: nc };
  }, [langCards]);

  // SRS interval previews for judgment buttons
  const previews = useMemo(() => {
    if (!currentCard) return {};
    return {
      got:    formatInterval(Object.values(calculateSRS('got', currentCard, currentDirection))[0]),
      almost: formatInterval(Object.values(calculateSRS('almost', currentCard, currentDirection))[0]),
      missed: formatInterval(Object.values(calculateSRS('missed', currentCard, currentDirection))[0]),
    };
  }, [currentCard, currentDirection]);

  const handleReveal = useCallback(() => setPhase('back'), []);

  const handleJudge = useCallback((judgment) => {
    if (!currentCard) return;

    const direction = currentDirection;
    const prefix = direction === 'reverse' ? 'reverse' : '';
    const key = (field) => prefix ? `${prefix}${field.charAt(0).toUpperCase()}${field.slice(1)}` : field;

    const wasRequeued = judgment !== 'got';

    // Save snapshot for undo
    setHistory(prev => [...prev, {
      word: currentCard.target,
      judgment,
      direction,
      wasRequeued,
      previousSRS: {
        [key('interval')]: currentCard[key('interval')],
        [key('ease')]: currentCard[key('ease')],
        [key('nextReview')]: currentCard[key('nextReview')],
        [key('reviewCount')]: currentCard[key('reviewCount')],
        [key('lapses')]: currentCard[key('lapses')],
      },
      previousSessionIndex: session.index,
      previousResults: { ...session.results },
    }]);

    act.logActivity('flashcard_reviewed', { word: currentCard.target, judgment, direction });

    // Calculate and persist SRS update
    const srsUpdate = calculateSRS(judgment, currentCard, direction);
    act.updateVocabSRS(currentCard.target, srsUpdate);

    const newResults = { ...session.results, [judgment]: session.results[judgment] + 1 };
    const newIndex = session.index + 1;

    setSession(prev => {
      const updated = { ...prev, index: newIndex, results: newResults };
      // Re-queue missed/almost cards at the end
      if (wasRequeued) {
        updated.cardKeys = [...prev.cardKeys, currentCardKey];
        updated.cardDirections = [...prev.cardDirections, currentDirection];
      }
      return updated;
    });

    if (newIndex >= totalCards + (wasRequeued ? 1 : 0)) {
      setPhase('done');
    } else {
      setPhase('front');
    }
  }, [cardIdx, totalCards, currentCard, currentCardKey, currentDirection, session, act]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    // Restore SRS
    act.updateVocabSRS(last.word, last.previousSRS);

    // Restore session state
    setSession(prev => {
      const updated = {
        ...prev,
        index: last.previousSessionIndex,
        results: last.previousResults,
      };
      // Remove the re-queued card from the end
      if (last.wasRequeued) {
        updated.cardKeys = prev.cardKeys.slice(0, -1);
        updated.cardDirections = prev.cardDirections.slice(0, -1);
      }
      return updated;
    });

    setPhase('back');
  }, [history, act]);

  const handleNextSession = useCallback(() => {
    const newSession = buildDailySession(langCards, state.newCardsPerDay, session, langFilter);
    setSession(newSession);
    setHistory([]);
    setPhase(newSession.cardKeys.length === 0 ? 'done' : 'front');
  }, [langCards, state.newCardsPerDay, session, langFilter]);

  const handleNewSession = useCallback(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const newSession = buildDailySession(langCards, state.newCardsPerDay, null, langFilter, { dateOverride: tomorrow });
    setSession(newSession);
    setHistory([]);
    setPhase(newSession.cardKeys.length === 0 ? 'done' : 'front');
  }, [langCards, state.newCardsPerDay, langFilter]);

  // Close on Escape, keyboard navigation for flashcards
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose?.(); return; }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && history.length > 0) {
        e.preventDefault();
        handleUndo();
        return;
      }

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
  }, [onClose, phase, handleReveal, handleJudge, handleUndo, history.length]);

  // Mastery stats for done screen
  const masteryStats = useMemo(() => {
    let mastered = 0, learning = 0, newCount = 0;
    for (const card of langCards) {
      const level = getMasteryLevel(card, 'forward');
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
  }, [langCards]);

  // Check if more cards are available beyond this session
  const hasMoreCards = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const testSession = buildDailySession(langCards, state.newCardsPerDay, session, langFilter);
    return testSession.cardKeys.length > 0 && testSession.index < testSession.cardKeys.length;
  }, [langCards, state.newCardsPerDay, session, langFilter]);

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

        {/* Session stats */}
        {phase !== 'done' && (
          <div className="flashcard-session-stats">
            <span className="flashcard-stat-badge flashcard-stat-badge--due">{dueCount} due</span>
            <span className="flashcard-stat-badge flashcard-stat-badge--new">{newCount} new</span>
            <span className="flashcard-stat-badge flashcard-stat-badge--total">{langCards.length} total</span>
            {availableLangs.length === 1 && <span className="flashcard-stat-badge">{availableLangs[0].nameNative}</span>}
          </div>
        )}

        {totalCards === 0 || (phase !== 'done' && cardIdx >= totalCards) ? (
          <div className="flashcard-done">
            <h3 className="font-display flashcard-done__title">All done for today!</h3>
            <p className="text-muted">No cards due for review right now.</p>
            {masteryStats.dueTomorrow > 0 && (
              <p className="text-muted flashcard-forecast">
                {masteryStats.dueTomorrow} card{masteryStats.dueTomorrow !== 1 ? 's' : ''} due tomorrow
              </p>
            )}
            <div className="flashcard-done__actions">
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : phase === 'done' ? (
          /* Done screen */
          <div className="flashcard-done">
            <h3 className="font-display flashcard-done__title">Session Complete</h3>
            <div className="flashcard-done__stats">
              <span className="flashcard-done__stat flashcard-done__stat--got">{session.results.got} correct</span>
              <span className="flashcard-done__stat flashcard-done__stat--almost">{session.results.almost} almost</span>
              <span className="flashcard-done__stat flashcard-done__stat--missed">{session.results.missed} missed</span>
            </div>
            <p className="text-muted">
              {session.results.got} card{session.results.got !== 1 ? 's' : ''} completed
              {totalCards > session.results.got && ` in ${totalCards} attempts`}
            </p>

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
              {history.length > 0 && (
                <button className="btn btn-ghost btn-sm flashcard-undo" onClick={handleUndo} title="Undo last judgment (Ctrl+Z)">
                  ↩ Undo
                </button>
              )}
              {hasMoreCards ? (
                <button className="btn btn-secondary btn-sm" onClick={handleNextSession}>Start next session</button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={handleNewSession}>New session</button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          /* Card view */
          <>
            <div className="flashcard-progress">
              <span className="flashcard-progress__count text-muted">
                {totalCards - cardIdx} remaining
              </span>
              {history.length > 0 && (
                <button className="btn btn-ghost btn-sm flashcard-undo" onClick={handleUndo} title="Undo last judgment (Ctrl+Z)">
                  ↩ Undo
                </button>
              )}
            </div>

            <div className="flashcard-card" data-lang={currentCard?.langId}>
              {currentDirection === 'forward' ? (
                /* Forward card: target on front */
                <>
                  <div className="flashcard-card__front">
                    <span className="flashcard-card__target text-target">
                      {state.romanizationOn && romanizer && currentCard ? renderRomanization(currentCard.target, 'fc') : currentCard?.target}
                    </span>
                  </div>

                  {phase === 'back' && (
                    <div className="flashcard-card__back">
                      {currentCard?.romanization && (
                        <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                      )}
                      <span className="flashcard-card__translation">{currentCard?.translation}</span>
                      {currentCard?.exampleSentence && (
                        <span className="flashcard-card__example text-muted">{currentCard.exampleSentence}</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Reverse card: translation on front */
                <>
                  <div className="flashcard-card__front flashcard-card__front--reverse">
                    <span className="flashcard-card__translation-front">{currentCard?.translation}</span>
                    <span className="flashcard-card__recall-hint text-muted">Recall the word</span>
                  </div>

                  {phase === 'back' && (
                    <div className="flashcard-card__back">
                      <span className="flashcard-card__target text-target">{currentCard?.target}</span>
                      {currentCard?.romanization && (
                        <span className="flashcard-card__romanization text-muted">{currentCard.romanization}</span>
                      )}
                      {currentCard?.exampleSentence && (
                        <span className="flashcard-card__example text-muted">{currentCard.exampleSentence}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {phase === 'front' ? (
              <div className="flashcard-actions">
                <button className="btn btn-secondary" onClick={handleReveal}>Show Answer</button>
              </div>
            ) : (
              <div className="flashcard-actions">
                <button className="btn btn-sm flashcard-btn--got" onClick={() => handleJudge('got')}>
                  Got it
                  <span className="flashcard-btn__interval">{previews.got}</span>
                </button>
                <button className="btn btn-sm flashcard-btn--almost" onClick={() => handleJudge('almost')}>
                  Almost
                  <span className="flashcard-btn__interval">{previews.almost}</span>
                </button>
                <button className="btn btn-sm flashcard-btn--missed" onClick={() => handleJudge('missed')}>
                  Missed it
                  <span className="flashcard-btn__interval">{previews.missed}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
