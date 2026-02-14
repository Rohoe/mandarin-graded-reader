import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { actions } from '../context/actions';
import { generateAnkiExport, downloadFile } from '../lib/anki';
import './AnkiExportButton.css';

export default function AnkiExportButton({ ankiJson, topic, level, grammarNotes }) {
  const { state, dispatch } = useApp();
  const act = actions(dispatch);
  const { exportedWords } = state;

  const [exported, setExported] = useState(false);

  if (!ankiJson || ankiJson.length === 0) return null;

  // Calculate preview without triggering export
  const grammarCards = (grammarNotes || []).map(n => ({ chinese: n.pattern }));
  const allCards     = [...ankiJson, ...grammarCards];
  const newCount     = allCards.filter(c => c.chinese && !exportedWords.has(c.chinese)).length;
  const skipCount    = allCards.filter(c => c.chinese && exportedWords.has(c.chinese)).length;

  const allExported = newCount === 0;

  function handleExport() {
    const result = generateAnkiExport(ankiJson, topic, level, exportedWords, { forceAll: allExported, grammarNotes });

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
        title={allExported ? `Re-download all ${skipCount} cards` : `Export ${newCount} new Anki cards`}
      >
        {allExported ? 'Re-download Cards' : 'Export Anki Cards'}
      </button>
    </div>
  );
}
