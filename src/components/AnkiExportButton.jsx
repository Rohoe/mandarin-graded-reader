import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../context/useAppSelector';
import { actions } from '../context/actions';
import { generateAnkiExport, downloadFile } from '../lib/anki';
import { translateText } from '../lib/translate';
import './AnkiExportButton.css';

export default function AnkiExportButton({ ankiJson, topic, level, grammarNotes, langId, verboseVocab, romanizer, vocabTranslations, onCacheVocabTranslations }) {
  const exportedWords = useAppSelector(s => s.exportedWords);
  const dispatch = useAppDispatch();
  const act = actions(dispatch);

  const [exported, setExported] = useState(false);
  const [translating, setTranslating] = useState(false);

  if (!ankiJson || ankiJson.length === 0) return null;

  // Calculate preview without triggering export
  const grammarCards = (grammarNotes || []).map(n => ({ target: n.pattern, chinese: n.pattern }));
  const allCards     = [...ankiJson, ...grammarCards];
  const getWord = c => c.target || c.chinese || c.korean || '';
  const newCount     = allCards.filter(c => getWord(c) && !exportedWords.has(getWord(c))).length;
  const skipCount    = allCards.filter(c => getWord(c) && exportedWords.has(getWord(c))).length;

  const allExported = newCount === 0;

  async function handleExport() {
    let finalTranslations = vocabTranslations || {};

    // Batch-translate missing example sentences when verboseVocab is ON
    if (verboseVocab) {
      const missing = [];
      ankiJson.forEach((card, i) => {
        if (card.example_story && !finalTranslations[`story-${i}`] && !card.example_story_translation) {
          missing.push({ key: `story-${i}`, text: card.example_story });
        }
        if (card.example_extra && !finalTranslations[`extra-${i}`] && !card.example_extra_translation) {
          missing.push({ key: `extra-${i}`, text: card.example_extra });
        }
      });

      if (missing.length > 0) {
        setTranslating(true);
        try {
          const results = await Promise.all(
            missing.map(({ text }) => translateText(text, langId).catch(() => ''))
          );
          const newTranslations = {};
          missing.forEach(({ key }, idx) => {
            if (results[idx]) newTranslations[key] = results[idx];
          });
          finalTranslations = { ...finalTranslations, ...newTranslations };
          if (onCacheVocabTranslations) onCacheVocabTranslations(newTranslations);
        } catch {
          // Continue with export even if batch translation fails
        } finally {
          setTranslating(false);
        }
      }
    }

    const result = generateAnkiExport(ankiJson, topic, level, exportedWords, { forceAll: allExported, grammarNotes, langId, verboseVocab, romanizer, vocabTranslations: finalTranslations });

    if (result.content) {
      downloadFile(result.content, result.filename);
      act.addExportedWords(result.exportedChinese);
      setExported(true);
      act.notify('success',
        `Exported ${result.stats.exported} card${result.stats.exported !== 1 ? 's' : ''}` +
        (result.stats.skipped > 0 ? `, skipped ${result.stats.skipped} duplicate${result.stats.skipped !== 1 ? 's' : ''}` : '') +
        '.'
      );
    }
  }

  return (
    <div className="anki-export">
      <div className="anki-export__info">
        <span className="anki-export__count">
          <span className="anki-export__new">{newCount} new</span>
          {skipCount > 0 && (
            <span className="anki-export__skip text-muted"> · {skipCount} already exported</span>
          )}
        </span>
        {exported && <span className="anki-export__done text-accent">✓ Downloaded</span>}
      </div>

      <button
        className={`btn ${newCount > 0 ? 'btn-secondary' : 'btn-ghost'} btn-sm anki-export__btn`}
        onClick={handleExport}
        disabled={translating}
        title={allExported ? `Re-download all ${skipCount} cards` : `Export ${newCount} new Anki cards`}
      >
        {translating ? 'Translating…' : allExported ? 'Re-download Cards' : 'Export Anki Cards'}
      </button>
    </div>
  );
}
