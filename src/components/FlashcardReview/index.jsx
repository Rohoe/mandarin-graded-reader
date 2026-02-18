import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { actions } from '../../context/actions';
import { getAllLanguages } from '../../lib/languages';
import './FlashcardReview.css';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FlashcardReview({ onClose }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const languages = getAllLanguages();

  const [langFilter, setLangFilter] = useState('all');

  // Build card list from learnedVocabulary
  const allCards = useMemo(() => {
    return Object.entries(state.learnedVocabulary).map(([word, data]) => ({
      target: word,
      romanization: data.romanization || data.pinyin || '',
      translation: data.translation || data.english || '',
      langId: data.langId || 'zh',
    }));
  }, [state.learnedVocabulary]);

  const filteredCards = useMemo(() => {
    const cards = langFilter === 'all' ? allCards : allCards.filter(c => c.langId === langFilter);
    return shuffle(cards);
  }, [allCards, langFilter]);

  // State machine: 'front' | 'back' | 'done'
  const [phase, setPhase] = useState('front');
  const [cardIdx, setCardIdx] = useState(0);
  const [results, setResults] = useState({ got: 0, almost: 0, missed: 0 });

  const currentCard = filteredCards[cardIdx] || null;
  const totalCards = filteredCards.length;

  const handleReveal = useCallback(() => setPhase('back'), []);

  const handleJudge = useCallback((judgment) => {
    act.logActivity('flashcard_reviewed', { word: currentCard?.target, judgment });
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

  // Detect which languages have vocab
  const availableLangs = useMemo(() => {
    const langIds = new Set(allCards.map(c => c.langId));
    return languages.filter(l => langIds.has(l.id));
  }, [allCards, languages]);

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

        {/* Language filter */}
        {availableLangs.length > 1 && (
          <div className="flashcard-lang-pills">
            <button
              className={`topic-form__lang-pill ${langFilter === 'all' ? 'active' : ''}`}
              onClick={() => setLangFilter('all')}
            >
              All
            </button>
            {availableLangs.map(l => (
              <button
                key={l.id}
                className={`topic-form__lang-pill ${langFilter === l.id ? 'active' : ''}`}
                onClick={() => setLangFilter(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}

        {totalCards === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
            No cards for this language. Try a different filter.
          </p>
        ) : phase === 'done' ? (
          /* ── Done screen ── */
          <div className="flashcard-done">
            <h3 className="font-display flashcard-done__title">Session Complete</h3>
            <div className="flashcard-done__stats">
              <span className="flashcard-done__stat flashcard-done__stat--got">{results.got} correct</span>
              <span className="flashcard-done__stat flashcard-done__stat--almost">{results.almost} almost</span>
              <span className="flashcard-done__stat flashcard-done__stat--missed">{results.missed} missed</span>
            </div>
            <p className="text-muted">{totalCards} card{totalCards !== 1 ? 's' : ''} reviewed</p>
            <div className="flashcard-done__actions">
              <button className="btn btn-secondary btn-sm" onClick={handleRestart}>Review again</button>
              <button className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          /* ── Card view ── */
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
